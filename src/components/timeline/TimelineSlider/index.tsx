import { useState, useCallback, useRef, useEffect } from 'react'
import { useI18n } from '@/locales'
import styles from './TimelineSlider.module.css'

interface TimePoint {
  label: string
  value: number | 'all'
}

interface TimelineSliderProps {
  timePoints: TimePoint[]
  value: number | 'all'
  onChange: (value: number | 'all') => void
}

export function TimelineSlider({ timePoints, value, onChange }: TimelineSliderProps) {
  const { t } = useI18n()
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [animKey, setAnimKey] = useState(0)

  // 所有选项：时间点 + 最后是"全部"
  const allPoints: TimePoint[] = [
    ...timePoints,
    { label: t.timeline.allYears, value: 'all' },
  ]

  const currentIndex = allPoints.findIndex((p) => p.value === value)
  const currentLabel = allPoints[currentIndex]?.label ?? ''

  // 左侧标签（第一个时间点）
  const startLabel = timePoints[0]?.label ?? ''
  // 右侧标签（全部）
  const endLabel = t.timeline.allYears

  // 计算滑块位置百分比
  const getSliderPosition = useCallback(() => {
    if (allPoints.length <= 1) return 0
    return (currentIndex / (allPoints.length - 1)) * 100
  }, [currentIndex, allPoints.length])

  // 从位置百分比计算索引
  const getIndexFromPosition = useCallback(
    (percent: number) => {
      const index = Math.round((percent / 100) * (allPoints.length - 1))
      return Math.max(0, Math.min(allPoints.length - 1, index))
    },
    [allPoints.length]
  )

  // 鼠标/触摸事件处理
  const handleTrackInteraction = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const percent = ((clientX - rect.left) / rect.width) * 100
      const newIndex = getIndexFromPosition(percent)
      const newValue = allPoints[newIndex]?.value
      if (newValue !== undefined && newValue !== value) {
        // 判断方向
        const oldIndex = allPoints.findIndex((p) => p.value === value)
        setDirection(newIndex > oldIndex ? 'right' : 'left')
        setAnimKey((k) => k + 1)
        onChange(newValue)
      }
    },
    [allPoints, getIndexFromPosition, onChange, value]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      handleTrackInteraction(e.clientX)
    },
    [handleTrackInteraction]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      handleTrackInteraction(e.clientX)
    },
    [isDragging, handleTrackInteraction]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true)
      handleTrackInteraction(e.touches[0].clientX)
    },
    [handleTrackInteraction]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return
      handleTrackInteraction(e.touches[0].clientX)
    },
    [isDragging, handleTrackInteraction]
  )

  // 全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const animClass = direction === 'left' ? styles.slideFromLeft : direction === 'right' ? styles.slideFromRight : ''

  return (
    <div className={styles.container}>
      {/* 当前时间标签 */}
      <div className={styles.labelContainer}>
        <div key={animKey} className={`${styles.label} ${animClass}`}>
          {currentLabel}
        </div>
      </div>

      {/* 滑块区域 */}
      <div className={styles.sliderRow}>
        {/* 左侧起始标签 */}
        <span className={styles.edgeLabel}>{startLabel}</span>

        {/* 滑块轨道 */}
        <div
          ref={trackRef}
          className={`${styles.track} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          {/* 渐变进度条 */}
          <div className={styles.trackBg} />

          {/* 滑块手柄 */}
          <div
            className={`${styles.slider} ${isDragging ? styles.sliderDragging : ''}`}
            style={{ left: `${getSliderPosition()}%` }}
          />
        </div>

        {/* 右侧全部标签 */}
        <span className={styles.edgeLabel}>{endLabel}</span>
      </div>
    </div>
  )
}
