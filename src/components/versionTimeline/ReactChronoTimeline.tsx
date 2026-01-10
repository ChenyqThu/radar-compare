import React, { useMemo } from 'react'
import { Chrono } from 'react-chrono'
import type { TimelineData } from '../../types/versionTimeline'
import { useUIStore } from '@/stores/uiStore'
import './ReactChronoTimeline.css'

interface ReactChronoTimelineProps {
  data: TimelineData
}

export const ReactChronoTimeline: React.FC<ReactChronoTimelineProps> = ({ data }) => {
  const { theme } = useUIStore()
  const { info, events } = data

  // 转换为 react-chrono 格式
  const items = useMemo(() => {
    // 按年份分组
    const eventsByYear = new Map<number, typeof events>()
    events.forEach(event => {
      const yearEvents = eventsByYear.get(event.year) || []
      yearEvents.push(event)
      eventsByYear.set(event.year, yearEvents)
    })

    // 转换为 react-chrono 的 items 格式
    return Array.from(eventsByYear.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, yearEvents]) => {
        // 合并同一年的事件
        const titles = yearEvents.map(e => e.title).join('\n\n')
        const descriptions = yearEvents
          .map(e => {
            if (e.description) {
              // 处理高亮
              let desc = e.description
              if (e.highlight && e.highlight.length > 0) {
                e.highlight.forEach(keyword => {
                  const regex = new RegExp(`(${keyword})`, 'gi')
                  desc = desc.replace(regex, '<span class="highlight">$1</span>')
                })
              }
              return desc
            }
            return ''
          })
          .filter(d => d)
          .join('<br/><br/>')

        return {
          title: year.toString(),
          cardTitle: titles,
          cardDetailedText: descriptions || undefined,
        }
      })
  }, [events])

  // 主题配置
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const themeConfig = {
    primary: isDark ? '#4096ff' : '#1890ff',
    secondary: isDark ? '#262626' : '#f5f5f5',
    cardBgColor: isDark ? '#262626' : '#ffffff',
    cardForeColor: isDark ? '#e0e0e0' : '#333333',
    titleColor: isDark ? '#4096ff' : '#1890ff',
    titleColorActive: isDark ? '#69b1ff' : '#0050b3',
  }

  return (
    <div className="react-chrono-timeline">
      {/* 头部 */}
      <div className="timeline-header">
        {info.logo && <img src={info.logo} alt={info.company} className="timeline-logo" />}
        <h2 className="timeline-title">{info.title}</h2>
        <span className="timeline-badge">React Chrono 方案</span>
      </div>

      {/* 时间轴 */}
      <div className="chrono-container">
        <Chrono
          items={items}
          mode="HORIZONTAL"
          theme={themeConfig}
          cardHeight={200}
          scrollable={{ scrollbar: true }}
          fontSizes={{
            title: '16px',
            cardTitle: '14px',
            cardText: '13px',
          }}
          classNames={{
            card: 'custom-card',
            cardTitle: 'custom-card-title',
            cardText: 'custom-card-text',
          }}
        />
      </div>
    </div>
  )
}
