import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, useMotionValue, useSpring, useAnimationFrame } from 'framer-motion'
import styles from './styles.module.css'

export function InvertedCursor() {
    const [isHovering, setIsHovering] = useState(false)

    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const [cursorVariant, setCursorVariant] = useState('default')
    const [targetBounds, setTargetBounds] = useState({ width: 32, height: 32, x: 0, y: 0, borderRadius: '50%' })
    const isMagneticRef = useRef(false)
    const currentMagneticTargetRef = useRef<HTMLElement | null>(null)
    const lastBoundsRef = useRef({ width: 0, height: 0, borderRadius: '' })

    const springConfig = cursorVariant === 'magnetic'
        ? { stiffness: 800, damping: 50, mass: 1 } // Stiff and damped (no bounce)
        : { stiffness: 1500, damping: 60, mass: 0.1 } // Fast follow

    const cursorX = useSpring(mouseX, springConfig)
    const cursorY = useSpring(mouseY, springConfig)

    useEffect(() => {
        // Hide default cursor
        document.body.style.cursor = 'none'

        const moveCursor = (e: MouseEvent) => {
            if (!isMagneticRef.current) {
                mouseX.set(e.clientX - 16)
                mouseY.set(e.clientY - 16)
            }
        }

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const magneticTarget = target.closest('[data-magnetic]') as HTMLElement

            if (magneticTarget) {
                // If already locked to this target, skip updates to prevent jitter
                if (currentMagneticTargetRef.current === magneticTarget) return

                const bounds = magneticTarget.getBoundingClientRect()
                const style = getComputedStyle(magneticTarget)

                const newBounds = {
                    width: bounds.width,
                    height: bounds.height,
                    x: bounds.left,
                    y: bounds.top,
                    borderRadius: style.borderRadius
                }
                setTargetBounds(newBounds)
                lastBoundsRef.current = {
                    width: bounds.width,
                    height: bounds.height,
                    borderRadius: style.borderRadius
                }

                setCursorVariant('magnetic')
                isMagneticRef.current = true
                currentMagneticTargetRef.current = magneticTarget

                // Snap to target position
                mouseX.set(bounds.left)
                mouseY.set(bounds.top)
            } else {
                // Only reset if we were previously magnetic
                if (currentMagneticTargetRef.current) {
                    setCursorVariant('default')
                    isMagneticRef.current = false
                    currentMagneticTargetRef.current = null

                    // Update position immediately to ensure smooth return
                    mouseX.set(e.clientX - 16)
                    mouseY.set(e.clientY - 16)
                }
            }

            // Check if hovering over clickable elements (for scale effect if not magnetic)
            const isClickable =
                target.tagName === 'BUTTON' ||
                target.tagName === 'A' ||
                target.closest('button') ||
                target.closest('a') ||
                target.classList.contains('clickable')

            setIsHovering(!!isClickable && !magneticTarget)
        }

        window.addEventListener('mousemove', moveCursor)
        window.addEventListener('mouseover', handleMouseOver)
        window.addEventListener('scroll', () => { }, { passive: true })

        return () => {
            document.body.style.cursor = 'auto'
            window.removeEventListener('mousemove', moveCursor)
            window.removeEventListener('mouseover', handleMouseOver)
        }
    }, [])

    useAnimationFrame(() => {
        if (isMagneticRef.current && currentMagneticTargetRef.current) {
            const target = currentMagneticTargetRef.current
            const bounds = target.getBoundingClientRect()
            const style = getComputedStyle(target)

            // Update position continuously to handle scroll/animation
            mouseX.set(bounds.left)
            mouseY.set(bounds.top)

            // Check if dimensions or style changed
            if (
                Math.abs(bounds.width - lastBoundsRef.current.width) > 0.5 ||
                Math.abs(bounds.height - lastBoundsRef.current.height) > 0.5 ||
                style.borderRadius !== lastBoundsRef.current.borderRadius
            ) {
                const newBounds = {
                    width: bounds.width,
                    height: bounds.height,
                    x: bounds.left,
                    y: bounds.top,
                    borderRadius: style.borderRadius
                }
                setTargetBounds(newBounds)
                lastBoundsRef.current = {
                    width: bounds.width,
                    height: bounds.height,
                    borderRadius: style.borderRadius
                }
            }
        }
    })

    return createPortal(
        <motion.div
            className={styles.cursor}
            style={{
                x: cursorX,
                y: cursorY,
            }}
            animate={{
                width: cursorVariant === 'magnetic' ? targetBounds.width : 32,
                height: cursorVariant === 'magnetic' ? targetBounds.height : 32,
                borderRadius: cursorVariant === 'magnetic' ? targetBounds.borderRadius : '50%',
                scale: isHovering ? 2.5 : 1,
            }}
            transition={{
                width: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                borderRadius: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                scale: { duration: 0.2 }
            }}
        />,
        document.body
    )
}
