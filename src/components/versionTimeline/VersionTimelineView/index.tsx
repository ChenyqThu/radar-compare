import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { Empty, Slider } from 'antd'
import { PlusOutlined, LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined, CompressOutlined } from '@ant-design/icons'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import type { VersionEvent, TimelineTheme } from '@/types/versionTimeline'
import styles from './VersionTimelineView.module.css'

// Constants for layout calculation
const CARD_WIDTH = 200 // px - card width
const CARD_MIN_GAP = 16 // px - minimum gap between cards
const MIN_CARD_SPACING = CARD_WIDTH + CARD_MIN_GAP // 216px per event minimum
const DEFAULT_ZOOM = 100 // Default zoom percentage
const MIN_ZOOM = 50 // Minimum zoom (will be adjusted dynamically)
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

// Calculate smart layout with zoom support
function calculateSmartLayout(
  events: VersionEvent[],
  years: number[],
  startYear: number,
  endYear: number,
  colors: string[],
  baseWidth: number,
  zoomPercent: number
): { layoutEvents: LayoutEvent[]; requiredWidth: number; minZoom: number; perfectZoom: number } {
  const totalYears = endYear - startYear
  const yearRange = totalYears || 1

  // Calculate positions based on time
  const eventsWithPosition = events.map(event => {
    const eventTime = event.year + (event.month ? (event.month - 1) / 12 : 0.5)
    // Avoid division by zero if yearRange is 0 (should already be handled but safe check)
    const effectiveRange = Math.max(yearRange, 0.1)
    const timelinePosition = ((eventTime - startYear) / effectiveRange) * 100
    const yearIndex = years.indexOf(event.year)
    const color = colors[yearIndex] || colors[0]
    return { ...event, timelinePosition, color }
  })

  eventsWithPosition.sort((a, b) => a.timelinePosition - b.timelinePosition)

  // OPTIMIZATION 3: Axis Dot Collision Avoidance (Nudging)
  // Ensure no two event dots are perfectly overlapping or too close on the axis.
  // If they are too close, nudge the later one slightly to the right.
  const MIN_DOT_DIST = 0.5 // % of total width (approx 5-10px depending on zoom)

  for (let i = 1; i < eventsWithPosition.length; i++) {
    const prev = eventsWithPosition[i - 1]
    const curr = eventsWithPosition[i]

    if (curr.timelinePosition - prev.timelinePosition < MIN_DOT_DIST) {
      // Nudge current forward to maintain min distance
      curr.timelinePosition = prev.timelinePosition + MIN_DOT_DIST
    }
  }

  // Calcluate required width based on local density (sliding window)
  let maxRequiredWidthForMin = 0
  let maxRequiredWidthForPerfect = 0

  // Basic volume constraint (global average)
  const minWidthGlobal = Math.ceil(events.length / 4) * MIN_CARD_SPACING + 20
  maxRequiredWidthForMin = minWidthGlobal
  maxRequiredWidthForPerfect = minWidthGlobal

  // B. Local density constraint: Sliding window of size 5 (indices i and i+4)
  // We only run this if we have enough events to potentially overlap
  if (eventsWithPosition.length >= 5) {
    for (let i = 0; i < eventsWithPosition.length - 4; i++) {
      const startEvent = eventsWithPosition[i]
      const endEvent = eventsWithPosition[i + 4]

      const timePercentDiff = endEvent.timelinePosition - startEvent.timelinePosition

      // OPTIMIZATION: Relaxed constraints (Hybrid Strategy)
      // Instead of forcing 100% gap (no overlap), we allow some overlap (e.g., 15% overlap / 0.85 factor).
      // This creates a "stacked cards" look in high density areas instead of exploding the timeline width.

      if (timePercentDiff > 0.05) {
        // 1. Calculate for Hard Minimum (0.85 factor / 15% overlap)
        const neededWidthMin = (MIN_CARD_SPACING * 0.85 * 100) / timePercentDiff
        if (neededWidthMin > maxRequiredWidthForMin) {
          maxRequiredWidthForMin = neededWidthMin
        }

        // 2. Calculate for Perfect View (1.05 factor / Clear separation)
        const neededWidthPerfect = (MIN_CARD_SPACING * 1.05 * 100) / timePercentDiff
        if (neededWidthPerfect > maxRequiredWidthForPerfect) {
          maxRequiredWidthForPerfect = neededWidthPerfect
        }
      }
    }
  }

  // Calculate zooms
  let calculatedMinZoom = Math.ceil((maxRequiredWidthForMin / baseWidth) * 100)
  let calculatedPerfectZoom = Math.ceil((maxRequiredWidthForPerfect / baseWidth) * 100)

  // STRATEGY: Hybrid Density Cap
  // We cap the algorithm's ability to stretch the timeline purely for density reasons.
  // If a cluster is EXTREMELY dense, we stop stretching at 180% zoom and just let them overlap.
  // This prevents one busy month from making the other 11 months look empty.
  const MAX_DENSITY_INDUCED_ZOOM = 180

  if (calculatedPerfectZoom > MAX_DENSITY_INDUCED_ZOOM) {
    calculatedPerfectZoom = MAX_DENSITY_INDUCED_ZOOM
    // Min zoom must be <= perfect zoom
    if (calculatedMinZoom > calculatedPerfectZoom) {
      calculatedMinZoom = calculatedPerfectZoom
    }
  }

  // Clamp to reasonable bounds (min 50%)
  const minZoom = Math.max(MIN_ZOOM, calculatedMinZoom)
  const perfectZoom = Math.max(minZoom, calculatedPerfectZoom)

  // Apply zoom to get actual width
  const effectiveZoom = Math.max(zoomPercent, minZoom)
  const requiredWidth = Math.max(baseWidth, (baseWidth * effectiveZoom) / 100)

  const layoutEvents: LayoutEvent[] = []
  // Track the side of the last placed event for Zig-Zag effect
  let lastPlacedSide: 'top' | 'bottom' = 'bottom' // Start opposite to prefer 'top' first

  const topLayers: Array<{ start: number; end: number }[]> = [[], []]
  const bottomLayers: Array<{ start: number; end: number }[]> = [[], []]

  // Add extra margin for collision detection (1.2x card spacing)
  const minDistancePercent = (MIN_CARD_SPACING * 1.2 / requiredWidth) * 100

  eventsWithPosition.forEach(event => {
    const eventStart = event.timelinePosition - minDistancePercent / 2
    const eventEnd = event.timelinePosition + minDistancePercent / 2

    let placed = false
    let position: 'top' | 'bottom' = 'top'
    let layerIndex = 0

    // OPTIMIZATION 1: Zig-Zag Strategy
    // Instead of balancing total counts, we alternate sides to create a visual rhythm.
    // This reduces "bunching" and makes the timeline look more dynamic.
    const preferTop = lastPlacedSide === 'bottom'

    const sidesToTry: Array<'top' | 'bottom'> = preferTop ? ['top', 'bottom'] : ['bottom', 'top']

    // First try to place in layer 0 of preferred side, then layer 0 of other side
    // Only use layer 1 when layer 0 on both sides are blocked
    for (const side of sidesToTry) {
      const layers = side === 'top' ? topLayers : bottomLayers
      const layer = layers[0]
      const hasOverlap = layer.some(occupied =>
        !(eventEnd < occupied.start || eventStart > occupied.end)
      )

      if (!hasOverlap) {
        position = side
        layerIndex = 0
        layers[0].push({ start: eventStart, end: eventEnd })
        placed = true
        break
      }
    }

    // PHASE 2: Try Layer 1 (Preferred -> Other) with Visual Safety Check
    if (!placed) {
      for (const side of sidesToTry) {
        const layers = side === 'top' ? topLayers : bottomLayers
        // When placing in Layer 1, we must check:
        // 1. Collision with other Layer 1 cards (Standard)
        // 2. Visual interference with Layer 0 connector path (Optimization 2)

        const layer1 = layers[1]
        const hasLayer1Overlap = layer1.some(occupied =>
          !(eventEnd < occupied.start || eventStart > occupied.end)
        )

        // OPTIMIZATION 2: Lead Line Safety
        // If we place in Layer 1, our connector goes through Layer 0 space.
        // We should avoid cases where the connector "cuts" a Layer 0 card near its edge.
        // If it hits the center (stacking), it's fine. If it hits the edge, it's messy.
        let isVisuallySafe = true
        const layer0 = layers[0]

        // check obstruction in layer 0
        const obstructingLayer0Card = layer0.find(occupied =>
          event.timelinePosition >= occupied.start && event.timelinePosition <= occupied.end
        )

        if (obstructingLayer0Card) {
          // We are obstructed. Is it a "clean stack" or a "messy cut"?
          const occupiedCenter = (obstructingLayer0Card.start + obstructingLayer0Card.end) / 2
          const dist = Math.abs(event.timelinePosition - occupiedCenter)

          // Convert percent distance back to pixels roughly to check alignment
          const distPx = (dist / 100) * requiredWidth

          // If distance is NOT small enough to be a stack, consider it a bad overlap
          if (distPx > 40) {
            isVisuallySafe = false
          }
        }

        if (!hasLayer1Overlap && isVisuallySafe) {
          position = side
          layerIndex = 1
          layers[1].push({ start: eventStart, end: eventEnd })
          placed = true
          break
        }
      }
    }

    // Fallback: force into least crowded layer
    if (!placed) {
      const layers = preferTop ? topLayers : bottomLayers
      const leastCrowdedIndex = layers[0].length <= layers[1].length ? 0 : 1
      layers[leastCrowdedIndex].push({ start: eventStart, end: eventEnd })
      position = preferTop ? 'top' : 'bottom'
      layerIndex = leastCrowdedIndex
    }

    lastPlacedSide = position
    layoutEvents.push({ ...event, position, offset: layerIndex })
  })

  return { layoutEvents, requiredWidth, minZoom, perfectZoom }
}

interface VersionTimelineViewProps {
  onEventClick?: (event: VersionEvent) => void
  onAddEvent?: () => void
}

// Layout constants
const EDGE_PADDING = 50 // Padding at left and right edges
const TIMELINE_START_OFFSET = 200 // Space before first event for logo/orb
const TIMELINE_END_OFFSET = 160 // Space after last event

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

  // Update scroll state
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
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

  const { layoutEvents, timelineGradient, themeColor, totalWidth, minZoom, perfectZoom } = useMemo(() => {
    if (!timeline || timeline.events.length === 0) {
      return {
        layoutEvents: [] as LayoutEvent[],
        timelineGradient: '',
        themeColor: '#0A7171',
        totalWidth: containerWidth,
        minZoom: MIN_ZOOM,
        perfectZoom: DEFAULT_ZOOM
      }
    }

    const eventYears = timeline.events.map(e => e.year)
    const start = Math.min(...eventYears)
    const end = Math.max(...eventYears)

    const yearList: number[] = []
    for (let year = start; year <= end; year++) {
      yearList.push(year)
    }

    const theme = timeline.info.theme || 'teal'
    const customThemeColor = timeline.info.themeColor || '#0A7171'
    const colors = generateTimelineColors(yearList.length, theme)

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

    // Calculate timeline width (the area where events are distributed)
    // Use current zoom if set, otherwise use a temporary safe value
    const currentZoom = zoom || DEFAULT_ZOOM
    const baseEventsAreaWidth = containerWidth - EDGE_PADDING * 2 - TIMELINE_START_OFFSET - TIMELINE_END_OFFSET
    const { layoutEvents: layout, requiredWidth: eventsWidth, minZoom: calculatedMinZoom, perfectZoom: calculatedPerfectZoom } = calculateSmartLayout(
      timeline.events, yearList, start, end, colors, baseEventsAreaWidth, currentZoom
    )

    // Total width = edge padding + start offset + events area + end offset + edge padding
    const totalWidth = EDGE_PADDING + TIMELINE_START_OFFSET + eventsWidth + TIMELINE_END_OFFSET + EDGE_PADDING

    return {
      layoutEvents: layout,
      timelineGradient: gradient,
      themeColor: customThemeColor,
      totalWidth,
      minZoom: calculatedMinZoom,
      perfectZoom: calculatedPerfectZoom
    }
  }, [timeline, containerWidth, zoom])

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
      {timeline.info.company && (
        <span className={styles.companyBadge}>{timeline.info.company}</span>
      )}

      {/* Controls - top left */}
      <div className={styles.controls}>
        {/* Navigation buttons */}


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
            {timeline.info.logo && (
              <img src={timeline.info.logo} alt={timeline.info.title} className={styles.logo} />
            )}

            {/* Title */}
            <h2 className={styles.title}>{timeline.info.title}</h2>
          </div>

          {/* Timeline axis */}
          <div className={styles.timelineAxis}>
            {/* Timeline line - from logo area center to beyond last event */}
            <div
              className={styles.timelineLine}
              style={{
                left: `${EDGE_PADDING + 60}px`,
                right: `${EDGE_PADDING}px`,
                background: timelineGradient
              }}
            />

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
