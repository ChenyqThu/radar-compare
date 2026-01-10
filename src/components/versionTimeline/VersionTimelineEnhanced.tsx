import React, { useMemo } from 'react'
import type { TimelineData, VersionEvent } from '../../types/versionTimeline'
import './VersionTimelineEnhanced.css'

interface VersionTimelineEnhancedProps {
  data: TimelineData
}

// 智能布局算法
interface LayoutEvent extends VersionEvent {
  position: 'top' | 'bottom'
  offset: number  // 纵向偏移量（用于错开显示）
}

function calculateSmartLayout(events: VersionEvent[], years: number[]): LayoutEvent[] {
  // 按年份分组
  const eventsByYear = new Map<number, VersionEvent[]>()
  events.forEach(event => {
    const yearEvents = eventsByYear.get(event.year) || []
    yearEvents.push(event)
    eventsByYear.set(event.year, yearEvents)
  })

  const layoutEvents: LayoutEvent[] = []
  let topCount = 0
  let bottomCount = 0

  // 为每年的事件分配位置
  years.forEach(year => {
    const yearEvents = eventsByYear.get(year) || []

    yearEvents.forEach((event, index) => {
      // 交替分配上下位置，保持平衡
      const shouldPlaceTop = topCount <= bottomCount
      const position = shouldPlaceTop ? 'top' : 'bottom'

      if (position === 'top') {
        topCount++
      } else {
        bottomCount++
      }

      // 计算纵向偏移量（同一年的多个事件错开显示）
      const offset = index * 30 // 每个事件错开30px

      layoutEvents.push({
        ...event,
        position,
        offset,
      })
    })
  })

  return layoutEvents
}

export const VersionTimelineEnhanced: React.FC<VersionTimelineEnhancedProps> = ({ data }) => {
  const { info, events } = data

  // 计算年份范围
  const { startYear, endYear, years } = useMemo(() => {
    const eventYears = events.map(e => e.year)
    const start = data.startYear || Math.min(...eventYears)
    const end = data.endYear || Math.max(...eventYears)

    const yearList: number[] = []
    for (let year = start; year <= end; year++) {
      yearList.push(year)
    }

    return { startYear: start, endYear: end, years: yearList }
  }, [events, data.startYear, data.endYear])

  // 智能布局
  const layoutEvents = useMemo(() => {
    return calculateSmartLayout(events, years)
  }, [events, years])

  // 按年份和位置分组
  const eventsByYearAndPosition = useMemo(() => {
    const map = new Map<number, { top: LayoutEvent[], bottom: LayoutEvent[] }>()

    years.forEach(year => {
      map.set(year, { top: [], bottom: [] })
    })

    layoutEvents.forEach(event => {
      const group = map.get(event.year)
      if (group) {
        if (event.position === 'top') {
          group.top.push(event)
        } else {
          group.bottom.push(event)
        }
      }
    })

    return map
  }, [layoutEvents, years])

  // 高亮文本
  const highlightText = (text: string, highlights?: string[]) => {
    if (!highlights || highlights.length === 0) {
      return text
    }

    let result = text
    highlights.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi')
      result = result.replace(regex, '<span class="highlight">$1</span>')
    })

    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }

  return (
    <div className="version-timeline-enhanced">
      {/* 头部 */}
      <div className="timeline-header">
        {info.logo && <img src={info.logo} alt={info.company} className="timeline-logo" />}
        <h2 className="timeline-title">{info.title}</h2>
        <span className="timeline-badge">智能布局方案</span>
      </div>

      {/* 上层事件区域 */}
      <div className="events-layer events-layer-top">
        {years.map(year => {
          const yearEvents = eventsByYearAndPosition.get(year)
          const topEvents = yearEvents?.top || []

          return (
            <div key={`top-${year}`} className="event-column">
              <div className="event-stack">
                {topEvents.map(event => (
                  <div
                    key={event.id}
                    className="event-card event-card-top"
                    style={{ marginBottom: `${event.offset}px` }}
                  >
                    <div className="event-content">
                      <div className="event-title">
                        {highlightText(event.title, event.highlight)}
                      </div>
                      {event.description && (
                        <div className="event-description">
                          {highlightText(event.description, event.highlight)}
                        </div>
                      )}
                    </div>
                    <div className="event-connector event-connector-top"></div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 时间轴 */}
      <div className="timeline-axis">
        <div className="timeline-line"></div>
        {years.map(year => (
          <div key={year} className="year-marker">
            <div className="year-dot"></div>
            <div className="year-label">{year}</div>
          </div>
        ))}
      </div>

      {/* 下层事件区域 */}
      <div className="events-layer events-layer-bottom">
        {years.map(year => {
          const yearEvents = eventsByYearAndPosition.get(year)
          const bottomEvents = yearEvents?.bottom || []

          return (
            <div key={`bottom-${year}`} className="event-column">
              <div className="event-stack">
                {bottomEvents.map(event => (
                  <div
                    key={event.id}
                    className="event-card event-card-bottom"
                    style={{ marginTop: `${event.offset}px` }}
                  >
                    <div className="event-connector event-connector-bottom"></div>
                    <div className="event-content">
                      <div className="event-title">
                        {highlightText(event.title, event.highlight)}
                      </div>
                      {event.description && (
                        <div className="event-description">
                          {highlightText(event.description, event.highlight)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
