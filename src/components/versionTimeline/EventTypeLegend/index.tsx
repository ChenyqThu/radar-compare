import React, { useMemo } from 'react'
import { Button } from 'antd'
import { useI18n } from '@/locales'
import type { VersionTimeline } from '@/types/versionTimeline'
import styles from './EventTypeLegend.module.css'

interface EventTypeLegendProps {
  timeline: VersionTimeline
  hiddenTypes: Set<string>
  onToggleType: (typeId: string) => void
  onShowAll?: () => void
  // Year filtering props (optional for backwards compatibility)
  years?: number[]
  hiddenYears?: Set<number>
  onToggleYear?: (year: number) => void
  onShowAllYears?: () => void
}

export const EventTypeLegend: React.FC<EventTypeLegendProps> = ({
  timeline,
  hiddenTypes,
  onToggleType,
  onShowAll,
  years = [],
  hiddenYears = new Set(),
  onToggleYear,
  onShowAllYears,
}) => {
  const { t } = useI18n()

  // Count events by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    timeline.events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1
    })
    return counts
  }, [timeline.events])

  // Count events by year
  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    timeline.events.forEach(event => {
      counts[event.year] = (counts[event.year] || 0) + 1
    })
    return counts
  }, [timeline.events])

  // Get all types sorted by order, only show types with events
  const types = useMemo(() => {
    return Object.entries(timeline.info.eventTypes || {})
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
      .filter(([typeId]) => typeCounts[typeId] > 0)
  }, [timeline.info.eventTypes, typeCounts])

  const hasHiddenTypes = hiddenTypes.size > 0
  const hasHiddenYears = hiddenYears.size > 0
  const showYearFilter = years.length > 1 // Only show year filter when span > 1 year

  if (types.length === 0 && !showYearFilter) {
    return null
  }

  return (
    <div className={styles.container}>
      {/* Type filter */}
      {types.length > 0 && (
        <div className={styles.legendItems}>
          {types.map(([typeId, config]) => {
            const isHidden = hiddenTypes.has(typeId)
            const count = typeCounts[typeId] || 0

            return (
              <div
                key={typeId}
                className={`${styles.legendItem} ${isHidden ? styles.legendItemHidden : ''}`}
                onClick={() => onToggleType(typeId)}
                title={isHidden ? t.versionTimeline.showType : t.versionTimeline.hideType}
              >
                <span
                  className={styles.colorDot}
                  style={{ backgroundColor: config.color }}
                />
                <span className={styles.label}>{config.label}</span>
                <span className={styles.count}>({count})</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Divider between types and years */}
      {types.length > 0 && showYearFilter && (
        <div className={styles.divider} />
      )}

      {/* Year filter */}
      {showYearFilter && (
        <div className={styles.legendItems}>
          {years.map(year => {
            const isHidden = hiddenYears.has(year)
            const count = yearCounts[year] || 0

            return (
              <div
                key={year}
                className={`${styles.yearItem} ${isHidden ? styles.yearItemHidden : ''}`}
                onClick={() => onToggleYear?.(year)}
                title={isHidden ? t.versionTimeline.showYear : t.versionTimeline.hideYear}
              >
                <span>{year}</span>
                <span className={styles.yearCount}>({count})</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Show All button(s) */}
      {(hasHiddenTypes || hasHiddenYears) && (
        <>
          {hasHiddenTypes && onShowAll && (
            <Button size="small" onClick={onShowAll}>
              {t.versionTimeline.showAll || '显示全部'}
            </Button>
          )}
          {hasHiddenYears && onShowAllYears && (
            <Button size="small" onClick={onShowAllYears}>
              {t.versionTimeline.showAllYears || '显示全部年份'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

export default EventTypeLegend
