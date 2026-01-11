import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { Empty, Slider, Tooltip } from 'antd'
import { PlusOutlined, LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined, CompressOutlined, DisconnectOutlined, LinkOutlined } from '@ant-design/icons'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import type { VersionEvent, TimelineTheme, TimeSegment } from '@/types/versionTimeline'
import { calculateSmartLayout, generateTimeSegments } from '../layoutUtils'
import styles from './VersionTimelineView.module.css'

// Constants for layout calculation
const DEFAULT_ZOOM = 100 // Default zoom percentage
const MAX_ZOOM = 300 // Maximum zoom

interface LayoutEvent extends VersionEvent {
  position: 'top' | 'bottom'
  offset: number
  timelinePosition: number
  color: string
}

// Format event time (e.g., "Mar 2025" or "2025")
function formatEventTime(year: number, month?: number): string {
  if (month) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[month - 1] || ''
    return `${monthName} ${year}`
  }
  return String(year)
}

// Theme color configurations
const THEME_COLORS: Record<TimelineTheme, { base: number; saturation: number; lightness: number }> = {
  teal: { base: 170, saturation: 60, lightness: 45 },
  blue: { base: 210, saturation: 70, lightness: 50 },
  purple: { base: 270, saturation: 60, lightness: 50 },
  orange: { base: 25, saturation: 80, lightness: 50 },
  green: { base: 140, saturation: 60, lightness: 45 },
  rainbow: { base: 0, saturation: 70, lightness: 50 },
  monochrome: { base: 0, saturation: 0, lightness: 50 },
}

// Generate color palette for timeline segments based on theme
function generateTimelineColors(count: number, theme: TimelineTheme = 'teal'): string[] {
  const colors: string[] = []
  const config = THEME_COLORS[theme] || THEME_COLORS.teal

  for (let i = 0; i < count; i++) {
    if (theme === 'rainbow') {
      const hue = (i * 360 / count) % 360
      colors.push(`hsl(${hue}, ${config.saturation}%, ${config.lightness}%)`)
    } else if (theme === 'monochrome') {
      const lightness = 30 + (i * 40 / count)
      colors.push(`hsl(0, 0%, ${lightness}%)`)
    } else {
      const hueVariation = (i % 3) * 10 - 10
      const hue = (config.base + hueVariation) % 360
      const satVariation = (i % 2) * 10
      const lightVariation = (i % 2) * 8
      colors.push(`hsl(${hue}, ${config.saturation + satVariation}%, ${config.lightness + lightVariation}%)`)
    }
  }

  return colors
}

// [Removed old calculateSmartLayout]

interface VersionTimelineViewProps {
  onEventClick?: (event: VersionEvent) => void
  onAddEvent?: () => void
}

// Layout constants
// ----------------------------------------------------------------------
// Constants & Helpers
// ----------------------------------------------------------------------

const EDGE_PADDING = 50 // Padding at left and right edges
const TIMELINE_START_OFFSET = 200 // Space before first event for logo/orb
const TIMELINE_END_OFFSET = 100 // Space after last event

// Zoom Constants derived from "4-Track Capacity"
// Comfort: ~180px card / 3 tracks = 60px per event (Increased for better spacing)
const PIXELS_PER_EVENT_COMFORT = 90
// Limit: ~54px card (70% overlap) / 4 tracks = 13.5px per event
const PIXELS_PER_EVENT_LIMIT = 13.5

function calculatePerfectZoom(
  eventsCount: number,
  totalYears: number,
  containerWidth: number
) {
  const contentWidth = containerWidth - EDGE_PADDING * 2
  const fitZoom = totalYears > 0 ? contentWidth / totalYears : 100

  const comfortZoom = totalYears > 0 ? (eventsCount * PIXELS_PER_EVENT_COMFORT) / totalYears : 0
  const limitZoom = totalYears > 0 ? (eventsCount * PIXELS_PER_EVENT_LIMIT) / totalYears : 0

  // MinZoom: Ensure we don't go beyond 70% overlap
  const minZoom = Math.ceil(Math.max(fitZoom, limitZoom))

  // PerfectZoom: Ensure we default to Comfort if Fit is too crowded
  const perfectZoom = Math.ceil(Math.max(fitZoom, comfortZoom))

  return { minZoom, perfectZoom }
}

export const VersionTimelineView: React.FC<VersionTimelineViewProps> = ({
  onEventClick,
  onAddEvent,
}) => {
  const { t } = useI18n()
  const timeline = useRadarStore(state => state.getActiveVersionTimeline())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1000)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Initialize with null to detect first load
  const [zoom, setZoom] = useState<number | null>(null)

  // Observe container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setContainerWidth(entry.contentRect.width - 80)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Calculate dynamic zoom bounds
  const { totalYears, eventCount } = useMemo(() => {
    if (!timeline?.events.length) return { totalYears: 0, eventCount: 0 }
    // Estimate unique years span roughly
    const years = timeline.events.map(e => e.year)
    const span = Math.max(...years) - Math.min(...years) || 1
    return { totalYears: span, eventCount: timeline.events.length }
  }, [timeline])

  const { minZoom, perfectZoom } = useMemo(() => {
    return calculatePerfectZoom(eventCount, totalYears, containerWidth)
  }, [eventCount, totalYears, containerWidth])

  // Initialize Zoom - MOVED to legacy effect below to support localStorage

  // Update scroll state
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // Add a small buffer for float precision issues
    const TOLERANCE = 5

    setCanScrollLeft(container.scrollLeft > TOLERANCE)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - TOLERANCE
    )
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollState()
    container.addEventListener('scroll', updateScrollState)
    return () => container.removeEventListener('scroll', updateScrollState)
  }, [updateScrollState])

  // Scroll functions
  const scrollTo = useCallback((position: 'start' | 'end' | 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    const scrollAmount = containerWidth * 0.6

    switch (position) {
      case 'start':
        container.scrollTo({ left: 0, behavior: 'smooth' })
        break
      case 'end':
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' })
        break
      case 'left':
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
        break
      case 'right':
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        break
    }
  }, [containerWidth])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        scrollTo('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        scrollTo('right')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scrollTo])

  /* Axis Break Icon Component */
  const AxisBreakIcon = () => (
    <div className={styles.axisBreak}>
      <div className={styles.breakLine} />
      <div className={styles.breakLine} />
    </div>
  )

  // Axis Break Toggle State
  const [enableAxisBreak, setEnableAxisBreak] = useState(true)

  const { layoutEvents, timelineGradient, themeColor, totalWidth, timeSegments, hasPossibleBreaks } = useMemo(() => {
    if (!timeline || timeline.events.length === 0) {
      return {
        layoutEvents: [] as LayoutEvent[],
        timelineGradient: '',
        themeColor: '#0A7171',
        totalWidth: containerWidth,
        timeSegments: [] as TimeSegment[],
        hasPossibleBreaks: false
      }
    }

    const eventYears = timeline.events.map(e => e.year)



    // Check if breaks are possible (for showing warning/button state)
    // We check if the NEW layout logic detects any breaks at the CURRENT zoom level.
    // If we disable breaks, we still want to know if we *could* enable them.
    const potentialZoom = zoom || DEFAULT_ZOOM
    const potentialPixelsPerYear = (potentialZoom / 100) * 100

    // We can use the utility to check, but we need to force enableBreaks=true to see if it *would* generate breaks
    // This is cheap to calculation.
    const potentialScale = generateTimeSegments(timeline.events, potentialPixelsPerYear, true)
    const hasPossibleBreaks = potentialScale.segments.some((s: TimeSegment) => s.type === 'break')

    // Theme colors
    const theme = timeline.info?.theme || 'teal'
    const customThemeColor = timeline.info?.themeColor || '#0A7171'
    const colors = generateTimelineColors(eventYears.length, theme)

    let gradient: string
    if (colors.length === 1) {
      gradient = colors[0]
    } else {
      const gradientStops = colors.map((color, index) => {
        const position = (index / (colors.length - 1)) * 100
        return `${color} ${position}%`
      }).join(', ')
      gradient = `linear-gradient(to right, ${gradientStops})`
    }

    // Calculate layout with Non-Linear Axis support
    const currentZoom = zoom || DEFAULT_ZOOM
    const pixelsPerYear = (currentZoom / 100) * 100

    const { layoutEvents: layout, totalWidth: eventsWidth, timeScale } = calculateSmartLayout(
      timeline.events, colors, pixelsPerYear, enableAxisBreak
    )

    // Total width
    const totalWidth = EDGE_PADDING + TIMELINE_START_OFFSET + eventsWidth + TIMELINE_END_OFFSET + EDGE_PADDING

    return {
      layoutEvents: layout,
      timelineGradient: gradient,
      themeColor: customThemeColor,
      totalWidth,
      timeSegments: timeScale.segments,
      hasPossibleBreaks
    }
  }, [timeline, containerWidth, zoom, enableAxisBreak])

  // Initialize zoom to perfectZoom once calculated, or load from storage
  useEffect(() => {
    if (zoom === null && perfectZoom > 0) {
      // Check for saved preference
      if (timeline && timeline.id) {
        const savedZoom = localStorage.getItem(`timeline_zoom_${timeline.id}`)
        if (savedZoom) {
          const parsed = parseInt(savedZoom, 10)
          if (!isNaN(parsed)) {
            // Respect user's saved choice but ensure it meets hard minimum
            setZoom(Math.max(parsed, minZoom))
            return
          }
        }
      }
      // Fallback to perfect default if no preference
      setZoom(perfectZoom)
    }
  }, [perfectZoom, zoom, timeline, minZoom])

  useEffect(() => {
    updateScrollState()
  }, [totalWidth, updateScrollState])

  const highlightText = useCallback((text: string, highlights?: string[]) => {
    if (!highlights || highlights.length === 0) return text

    let result = text
    highlights.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi')
      result = result.replace(regex, `<span class="${styles.highlight}">$1</span>`)
    })

    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }, [])

  const handleEventClick = useCallback((event: VersionEvent) => {
    onEventClick?.(event)
  }, [onEventClick])

  // Handle zoom change - must be before early return to maintain hooks order
  const handleZoomChange = useCallback((value: number) => {
    // Save user preference
    if (timeline && timeline.id) {
      localStorage.setItem(`timeline_zoom_${timeline.id}`, String(value))
    }
    setZoom(Math.max(value, minZoom))
  }, [minZoom, timeline])

  // Empty state
  if (!timeline || timeline.events.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Empty
            description={t.versionTimeline.empty}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {onAddEvent && (
              <button className={styles.addButton} onClick={onAddEvent}>
                <PlusOutlined /> {t.versionTimeline.addEvent}
              </button>
            )}
          </Empty>
        </div>
      </div>
    )
  }

  const topLayer0 = layoutEvents.filter(e => e.position === 'top' && e.offset === 0)
  const topLayer1 = layoutEvents.filter(e => e.position === 'top' && e.offset === 1)
  const bottomLayer0 = layoutEvents.filter(e => e.position === 'bottom' && e.offset === 0)
  const bottomLayer1 = layoutEvents.filter(e => e.position === 'bottom' && e.offset === 1)

  // Check if we have multiple layers (need to use reduced card height)
  const hasMultipleLayers = topLayer1.length > 0 || bottomLayer1.length > 0



  // Calculate pixel position for events
  const getEventPosition = (timelinePercent: number) => {
    // Events start after edge padding + start offset
    const eventsAreaStart = EDGE_PADDING + TIMELINE_START_OFFSET
    const eventsAreaWidth = totalWidth - EDGE_PADDING * 2 - TIMELINE_START_OFFSET - TIMELINE_END_OFFSET
    return eventsAreaStart + (timelinePercent / 100) * eventsAreaWidth
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ '--theme-color': themeColor } as React.CSSProperties}
    >
      {/* Company badge - top right */}
      {timeline.info?.company && (
        <span className={styles.companyBadge}>{timeline.info.company}</span>
      )}

      {/* Controls - top left */}
      <div className={styles.controls}>
        {/* Navigation buttons */}


        {/* Zoom slider */}
        {/* Zoom slider */}
        <div className={styles.zoomControl}>
          <ZoomOutOutlined className={styles.zoomIcon} onClick={() => handleZoomChange(Math.max(minZoom, (zoom || minZoom) - 10))} />
          <Slider
            className={styles.zoomSlider}
            min={minZoom}
            max={MAX_ZOOM}
            value={zoom || minZoom}
            onChange={handleZoomChange}
            tooltip={{ formatter: (v) => `${v}%` }}
          />
          <ZoomInOutlined className={styles.zoomIcon} onClick={() => handleZoomChange(Math.min(MAX_ZOOM, (zoom || minZoom) + 10))} />

          {/* Fit Button */}
          <button
            className={styles.fitButton}
            onClick={() => setZoom(perfectZoom)}
            title="Fit to view (Perfect Zoom)"
          >
            <CompressOutlined />
          </button>
        </div>

        {/* Axis Break Toggle - Independent Button */}
        {hasPossibleBreaks && (
          <Tooltip title={enableAxisBreak ? t.versionTimeline.disableAxisBreak : t.versionTimeline.enableAxisBreak}>
            <button
              className={`${styles.toggleButton} ${enableAxisBreak ? styles.active : ''}`}
              onClick={() => setEnableAxisBreak(!enableAxisBreak)}
              style={{ marginLeft: 8 }}
            >
              {enableAxisBreak ? <DisconnectOutlined /> : <LinkOutlined />}
            </button>
          </Tooltip>
        )}
      </div>

      {/* Floating Navigation Buttons */}
      <button
        className={`${styles.floatingNavBtn} ${styles.floatingNavBtnLeft} ${canScrollLeft ? styles.visible : ''}`}
        onClick={() => scrollTo('left')}
        title="Scroll Left"
      >
        <LeftOutlined />
      </button>

      <button
        className={`${styles.floatingNavBtn} ${styles.floatingNavBtnRight} ${canScrollRight ? styles.visible : ''}`}
        onClick={() => scrollTo('right')}
        title="Scroll Right"
      >
        <RightOutlined />
      </button>

      {/* Left gradient mask */}
      <div className={`${styles.scrollMask} ${styles.scrollMaskLeft} ${canScrollLeft ? styles.visible : ''}`} />

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className={styles.scrollContainer}
      >
        {/* Timeline content with fixed width */}
        <div
          className={styles.timelineContent}
          style={{ width: `${totalWidth}px` }}
        >
          {/* Start section - logo and title at left */}
          <div className={styles.startSection} style={{ left: `${EDGE_PADDING}px` }}>
            {/* Glowing orb - multi-layer breathing effect */}
            <div className={styles.glowOrbContainer}>
              <div className={styles.glowCore} />
              <div className={styles.glowBreathing} />
              <div className={styles.glowStreak} />
              <div className={styles.glowVertical} />
            </div>

            {/* Logo */}
            {timeline.info?.logo && (
              <img src={timeline.info.logo} alt={timeline.info?.title || ''} className={styles.logo} />
            )}

            {/* Title */}
            <h2 className={styles.title}>{timeline.info?.title || '大事记'}</h2>
          </div>

          {/* Timeline axis */}
          <div className={styles.timelineAxis}>
            {/* Timeline line - from logo area center to beyond last event */}
            {/* Timeline Axis - Single Continuous Line */}
            <div
              className={styles.timelineLine}
              style={{
                left: `${EDGE_PADDING + 60}px`,
                width: `${totalWidth - (EDGE_PADDING + 60) - EDGE_PADDING}px`,
                background: timelineGradient,
                backgroundRepeat: 'no-repeat',
                borderRadius: '2px'
              }}
            />

            {/* Render Break Icons as overlays */}
            {timeSegments.map((segment, index) => {
              if (segment.type !== 'break') return null

              const startLeft = EDGE_PADDING + TIMELINE_START_OFFSET + segment.pixelStart
              return (
                <div
                  key={`break-${index}`}
                  className={styles.axisBreak}
                  style={{
                    left: `${startLeft + segment.pixelWidth}px`
                  }}
                >
                  <AxisBreakIcon />
                </div>
              )
            })}

            {/* Timeline edge fades */}
            <div
              className={styles.timelineEdgeFadeLeft}
              style={{ left: `${EDGE_PADDING + 60}px` }}
            />
            <div
              className={styles.timelineEdgeFadeRight}
              style={{ right: `${EDGE_PADDING}px` }}
            />

            {/* Event node markers */}
            {layoutEvents.map(event => (
              <div
                key={`node-${event.id}`}
                className={`${styles.eventNode} ${event.position === 'bottom' ? styles.eventNodeBottom : ''}`}
                style={{ left: `${getEventPosition(event.timelinePosition)}px` }}
              >
                <div className={styles.eventDot} style={{ backgroundColor: event.color }} />
                <div className={styles.eventTimeLabel}>
                  {formatEventTime(event.year, event.month)}
                </div>
              </div>
            ))}

            {/* Top events layer 1 */}
            <div className={`${styles.eventsLayer} ${styles.eventsLayerTop} ${styles.layer1}`}>
              {topLayer1.map(event => (
                <div
                  key={event.id}
                  className={`${styles.eventCard} ${styles.eventCardTop}`}
                  style={{ left: `${getEventPosition(event.timelinePosition)}px` }}
                  onClick={() => handleEventClick(event)}
                >
                  <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                    <div className={styles.eventTitle}>
                      {highlightText(event.title, event.highlight)}
                    </div>
                    {event.description && (
                      <div className={styles.eventDescription}>
                        {highlightText(event.description, event.highlight)}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.eventConnector} ${styles.eventConnectorTop} ${styles.connectorLong}`} />
                </div>
              ))}
            </div>

            {/* Top events layer 0 */}
            <div className={`${styles.eventsLayer} ${styles.eventsLayerTop} ${styles.layer0}`}>
              {topLayer0.map(event => (
                <div
                  key={event.id}
                  className={`${styles.eventCard} ${styles.eventCardTop}`}
                  style={{ left: `${getEventPosition(event.timelinePosition)}px` }}
                  onClick={() => handleEventClick(event)}
                >
                  <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                    <div className={styles.eventTitle}>
                      {highlightText(event.title, event.highlight)}
                    </div>
                    {event.description && (
                      <div className={styles.eventDescription}>
                        {highlightText(event.description, event.highlight)}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.eventConnector} ${styles.eventConnectorTop}`} />
                </div>
              ))}
            </div>

            {/* Bottom events layer 0 */}
            <div className={`${styles.eventsLayer} ${styles.eventsLayerBottom} ${styles.layer0}`}>
              {bottomLayer0.map(event => (
                <div
                  key={event.id}
                  className={`${styles.eventCard} ${styles.eventCardBottom}`}
                  style={{ left: `${getEventPosition(event.timelinePosition)}px` }}
                  onClick={() => handleEventClick(event)}
                >
                  <div className={`${styles.eventConnector} ${styles.eventConnectorBottom}`} />
                  <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                    <div className={styles.eventTitle}>
                      {highlightText(event.title, event.highlight)}
                    </div>
                    {event.description && (
                      <div className={styles.eventDescription}>
                        {highlightText(event.description, event.highlight)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom events layer 1 */}
            <div className={`${styles.eventsLayer} ${styles.eventsLayerBottom} ${styles.layer1}`}>
              {bottomLayer1.map(event => (
                <div
                  key={event.id}
                  className={`${styles.eventCard} ${styles.eventCardBottom}`}
                  style={{ left: `${getEventPosition(event.timelinePosition)}px` }}
                  onClick={() => handleEventClick(event)}
                >
                  <div className={`${styles.eventConnector} ${styles.eventConnectorBottom} ${styles.connectorLong}`} />
                  <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                    <div className={styles.eventTitle}>
                      {highlightText(event.title, event.highlight)}
                    </div>
                    {event.description && (
                      <div className={styles.eventDescription}>
                        {highlightText(event.description, event.highlight)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right gradient mask */}
      <div className={`${styles.scrollMask} ${styles.scrollMaskRight} ${canScrollRight ? styles.visible : ''}`} />
    </div>
  )
}

export default VersionTimelineView
