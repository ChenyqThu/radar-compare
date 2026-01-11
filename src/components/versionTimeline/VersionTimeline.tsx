import React, { useMemo } from 'react'
import type { TimelineData, VersionEvent } from '../../types/versionTimeline'
import './VersionTimeline.css'

interface VersionTimelineProps {
  data: TimelineData
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({ data }) => {
  const { info, events } = data

  // 计算年份范围
  const { years } = useMemo(() => {
    const eventYears = events.map(e => e.year)
    const start = data.startYear || Math.min(...eventYears)
    const end = data.endYear || Math.max(...eventYears)

    const yearList: number[] = []
    for (let year = start; year <= end; year++) {
      yearList.push(year)
    }

    return { years: yearList }
  }, [events, data.startYear, data.endYear])

  // 分组事件（按年份和位置）
  const eventsByYear = useMemo(() => {
    const map = new Map<number, { top: VersionEvent[], bottom: VersionEvent[] }>()

    years.forEach(year => {
      map.set(year, { top: [], bottom: [] })
    })

    events.forEach(event => {
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
  }, [events, years])

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
    <div className="version-timeline">
      {/* 头部 */}
      <div className="timeline-header">
        {info.logo && <img src={info.logo} alt={info.company} className="timeline-logo" />}
        <h2 className="timeline-title">{info.title}</h2>
      </div>

      {/* 上层事件区域 */}
      <div className="events-layer events-layer-top">
        {years.map(year => {
          const yearEvents = eventsByYear.get(year)
          const topEvents = yearEvents?.top || []

          return (
            <div key={`top-${year}`} className="event-column">
              {topEvents.map(event => (
                <div key={event.id} className="event-card event-card-top">
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
          const yearEvents = eventsByYear.get(year)
          const bottomEvents = yearEvents?.bottom || []

          return (
            <div key={`bottom-${year}`} className="event-column">
              {bottomEvents.map(event => (
                <div key={event.id} className="event-card event-card-bottom">
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
          )
        })}
      </div>
    </div>
  )
}
