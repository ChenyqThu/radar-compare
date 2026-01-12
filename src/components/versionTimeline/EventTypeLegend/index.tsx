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
}

export const EventTypeLegend: React.FC<EventTypeLegendProps> = ({
  timeline,
  hiddenTypes,
  onToggleType,
  onShowAll,
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

  // Get all types sorted by order, only show types with events
  const types = useMemo(() => {
    return Object.entries(timeline.info.eventTypes || {})
      .sort((a, b) => a[1].order - b[1].order)
      .filter(([typeId]) => typeCounts[typeId] > 0)
  }, [timeline.info.eventTypes, typeCounts])

  const hasHiddenTypes = hiddenTypes.size > 0

  if (types.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
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

      {hasHiddenTypes && onShowAll && (
        <Button size="small" onClick={onShowAll}>
          {t.versionTimeline.showAll || '显示全部'}
        </Button>
      )}
    </div>
  )
}

export default EventTypeLegend
