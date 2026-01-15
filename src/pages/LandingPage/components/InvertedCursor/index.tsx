import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion'
import styles from './styles.module.css'

// 统一的 spring 配置，确保所有属性动画曲线一致
const SPRING_CONFIG = {
    stiffness: 300,
    damping: 28,
    mass: 0.8,
}

// 快速跟随配置（用于普通鼠标跟随）
const FOLLOW_CONFIG = {
    stiffness: 800,
    damping: 40,
    mass: 0.2,
}

// 默认光标尺寸
const DEFAULT_SIZE = 32
const DEFAULT_RADIUS = 16

export function InvertedCursor() {
    // 目标位置（中心点坐标）
    const targetX = useMotionValue(0)
    const targetY = useMotionValue(0)

    // 目标尺寸
    const targetWidth = useMotionValue(DEFAULT_SIZE)
    const targetHeight = useMotionValue(DEFAULT_SIZE)
    const targetRadius = useMotionValue(DEFAULT_RADIUS)

    // 当前是否为 magnetic 模式
    const isMagneticRef = useRef(false)
    const currentTargetRef = useRef<HTMLElement | null>(null)

    // 使用 spring 实现平滑动画
    // 位置 spring - 根据模式动态切换配置
    const springConfigRef = useRef(FOLLOW_CONFIG)

    // 中心点位置的 spring 动画
    const centerX = useSpring(targetX, springConfigRef.current)
    const centerY = useSpring(targetY, springConfigRef.current)

    // 尺寸和圆角也使用 spring，保证动画曲线统一
    const cursorWidth = useSpring(targetWidth, SPRING_CONFIG)
    const cursorHeight = useSpring(targetHeight, SPRING_CONFIG)
    const cursorRadius = useSpring(targetRadius, SPRING_CONFIG)

    // 动态计算左上角位置：中心点 - 尺寸/2
    // 这样无论尺寸如何变化，光标始终以中心点为基准
    const cursorX = useTransform(
        [centerX, cursorWidth],
        ([x, w]: number[]) => x - w / 2
    )
    const cursorY = useTransform(
        [centerY, cursorHeight],
        ([y, h]: number[]) => y - h / 2
    )

    // 将数字圆角转换为 CSS 字符串
    const borderRadiusStyle = useTransform(cursorRadius, (v) => `${v}px`)

    // 更新 spring 配置
    const updateSpringConfig = useCallback((config: typeof SPRING_CONFIG) => {
        springConfigRef.current = config
        // Framer Motion 的 spring 会自动响应配置变化
        centerX.set(targetX.get())
        centerY.set(targetY.get())
    }, [centerX, centerY, targetX, targetY])

    // 进入 magnetic 模式
    const enterMagnetic = useCallback((element: HTMLElement) => {
        if (currentTargetRef.current === element) return

        const bounds = element.getBoundingClientRect()
        const style = getComputedStyle(element)

        // 计算元素中心点
        const elCenterX = bounds.left + bounds.width / 2
        const elCenterY = bounds.top + bounds.height / 2

        // 解析 border-radius（可能是 "12px" 或 "50%" 等）
        let radius = DEFAULT_RADIUS
        const radiusStr = style.borderRadius
        if (radiusStr.includes('%')) {
            // 百分比转换为像素（取较小边的百分比）
            const percent = parseFloat(radiusStr) / 100
            radius = Math.min(bounds.width, bounds.height) * percent / 2
        } else {
            radius = parseFloat(radiusStr) || DEFAULT_RADIUS
        }

        // 设置目标值（spring 会自动平滑过渡）
        targetX.set(elCenterX)
        targetY.set(elCenterY)
        targetWidth.set(bounds.width)
        targetHeight.set(bounds.height)
        targetRadius.set(radius)

        // 切换到 magnetic spring 配置
        updateSpringConfig(SPRING_CONFIG)

        isMagneticRef.current = true
        currentTargetRef.current = element
    }, [targetX, targetY, targetWidth, targetHeight, targetRadius, updateSpringConfig])

    // 退出 magnetic 模式
    const exitMagnetic = useCallback((mouseX: number, mouseY: number) => {
        if (!isMagneticRef.current) return

        // 设置回默认尺寸，位置跟随鼠标
        targetX.set(mouseX)
        targetY.set(mouseY)
        targetWidth.set(DEFAULT_SIZE)
        targetHeight.set(DEFAULT_SIZE)
        targetRadius.set(DEFAULT_RADIUS)

        // 切换回快速跟随配置
        updateSpringConfig(FOLLOW_CONFIG)

        isMagneticRef.current = false
        currentTargetRef.current = null
    }, [targetX, targetY, targetWidth, targetHeight, targetRadius, updateSpringConfig])

    useEffect(() => {
        // 隐藏默认光标
        document.body.style.cursor = 'none'

        // 鼠标移动处理
        const handleMouseMove = (e: MouseEvent) => {
            if (isMagneticRef.current && currentTargetRef.current) {
                // Magnetic 模式：持续追踪元素位置（处理滚动等情况）
                const bounds = currentTargetRef.current.getBoundingClientRect()
                const elCenterX = bounds.left + bounds.width / 2
                const elCenterY = bounds.top + bounds.height / 2
                targetX.set(elCenterX)
                targetY.set(elCenterY)
            } else {
                // 普通模式：跟随鼠标（使用中心点坐标）
                targetX.set(e.clientX)
                targetY.set(e.clientY)
            }
        }

        // 鼠标悬停检测
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const magneticTarget = target.closest('[data-magnetic]') as HTMLElement

            if (magneticTarget) {
                enterMagnetic(magneticTarget)
            } else if (isMagneticRef.current) {
                exitMagnetic(e.clientX, e.clientY)
            }
        }

        // 鼠标离开元素检测（防止快速移动时遗漏）
        const handleMouseOut = (e: MouseEvent) => {
            const relatedTarget = e.relatedTarget as HTMLElement
            if (!relatedTarget?.closest('[data-magnetic]') && isMagneticRef.current) {
                exitMagnetic(e.clientX, e.clientY)
            }
        }

        // 滚动时更新 magnetic 元素位置
        const handleScroll = () => {
            if (isMagneticRef.current && currentTargetRef.current) {
                const bounds = currentTargetRef.current.getBoundingClientRect()
                const elCenterX = bounds.left + bounds.width / 2
                const elCenterY = bounds.top + bounds.height / 2
                targetX.set(elCenterX)
                targetY.set(elCenterY)
            }
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseover', handleMouseOver)
        window.addEventListener('mouseout', handleMouseOut)
        window.addEventListener('scroll', handleScroll, { passive: true })

        return () => {
            document.body.style.cursor = 'auto'
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseover', handleMouseOver)
            window.removeEventListener('mouseout', handleMouseOut)
            window.removeEventListener('scroll', handleScroll)
        }
    }, [targetX, targetY, enterMagnetic, exitMagnetic])

    return createPortal(
        <motion.div
            className={styles.cursor}
            style={{
                x: cursorX,
                y: cursorY,
                width: cursorWidth,
                height: cursorHeight,
                borderRadius: borderRadiusStyle,
            }}
        />,
        document.body
    )
}
