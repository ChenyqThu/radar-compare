import { useMemo, useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import styles from './DemoTimeline.module.css'

interface TimelineEvent {
  id: string
  year: number
  month?: number
  title: string
  titleZh: string
  position: 'top' | 'bottom'
  color: string
}

const DEMO_EVENTS: TimelineEvent[] = [
  { id: '1', year: 2023, month: 3, title: 'v1.0 Release', titleZh: 'v1.0 发布', position: 'top', color: '#5470c6' },
  { id: '2', year: 2023, month: 6, title: 'Cloud Sync', titleZh: '云端同步', position: 'bottom', color: '#91cc75' },
  { id: '3', year: 2023, month: 9, title: 'Team Collab', titleZh: '团队协作', position: 'top', color: '#fac858' },
  { id: '4', year: 2024, month: 1, title: 'Timeline View', titleZh: '时间轴视图', position: 'bottom', color: '#ee6666' },
  { id: '5', year: 2024, month: 5, title: 'v2.0 Launch', titleZh: 'v2.0 上线', position: 'top', color: '#73c0de' },
]

function formatEventTime(year: number, month?: number): string {
  if (month) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[month - 1]} ${year}`
  }
  return String(year)
}

export function DemoTimeline() {
  const { theme } = useUIStore()
  const { language } = useI18n()
  const [mounted, setMounted] = useState(false)
  const isZh = language === 'zh-CN'
  const isDark = theme === 'dark'

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const gradientColors = useMemo(() => {
    return DEMO_EVENTS.map(e => e.color).join(', ')
  }, [])

  if (!mounted) return <div className={styles.container} />

  return (
    <div className={styles.container} data-theme={isDark ? 'dark' : 'light'}>
      {/* Timeline axis */}
      <div className={styles.timelineAxis}>
        {/* Glow orb at start */}
        <div className={styles.glowOrb}>
          <div className={styles.glowCore} />
          <div className={styles.glowRing} />
        </div>

        {/* Timeline line */}
        <div
          className={styles.timelineLine}
          style={{ background: `linear-gradient(to right, ${gradientColors})` }}
        />

        {/* Event nodes */}
        {DEMO_EVENTS.map((event, index) => {
          const position = ((index + 0.5) / DEMO_EVENTS.length) * 85 + 10
          return (
            <div
              key={event.id}
              className={`${styles.eventNode} ${event.position === 'bottom' ? styles.nodeBottom : ''}`}
              style={{ left: `${position}%` }}
            >
              <div className={styles.eventDot} style={{ backgroundColor: event.color }} />
              <div className={styles.eventTime}>{formatEventTime(event.year, event.month)}</div>
            </div>
          )
        })}

        {/* Event cards - top */}
        <div className={styles.topEvents}>
          {DEMO_EVENTS.filter(e => e.position === 'top').map((event) => {
            const eventIndex = DEMO_EVENTS.findIndex(e => e.id === event.id)
            const position = ((eventIndex + 0.5) / DEMO_EVENTS.length) * 85 + 10
            return (
              <div
                key={event.id}
                className={styles.eventCard}
                style={{ left: `${position}%`, '--event-color': event.color } as React.CSSProperties}
                data-magnetic
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardTitle}>{isZh ? event.titleZh : event.title}</div>
                </div>
                <div className={styles.connector} />
              </div>
            )
          })}
        </div>

        {/* Event cards - bottom */}
        <div className={styles.bottomEvents}>
          {DEMO_EVENTS.filter(e => e.position === 'bottom').map((event) => {
            const eventIndex = DEMO_EVENTS.findIndex(e => e.id === event.id)
            const position = ((eventIndex + 0.5) / DEMO_EVENTS.length) * 85 + 10
            return (
              <div
                key={event.id}
                className={`${styles.eventCard} ${styles.eventCardBottom}`}
                style={{ left: `${position}%`, '--event-color': event.color } as React.CSSProperties}
                data-magnetic
              >
                <div className={styles.connectorBottom} />
                <div className={styles.cardContent}>
                  <div className={styles.cardTitle}>{isZh ? event.titleZh : event.title}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
