import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { Empty, Slider, Tooltip } from 'antd'
import { PlusOutlined, LeftOutlined, RightOutlined, ZoomInOutlined, ZoomOutOutlined, CompressOutlined, DisconnectOutlined, LinkOutlined } from '@ant-design/icons'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import type { VersionEvent, TimelineTheme, TimeSegment } from '@/types/versionTimeline'
import { calculateSmartLayout, generateTimeSegments } from '../layoutUtils'
import { EventTypeLegend } from '../EventTypeLegend'
import styles from './VersionTimelineView.module.css'

// Constants for layout calculation
// (See zoom constants below around line 90)

interface LayoutEvent extends VersionEvent {
  position: 'top' | 'bottom'
  offset: number
  timelinePosition: number
  color: string
  nodeColor?: string
  styleColor?: string
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

// Zoom Definition (Based on Natural Width):
// - zoom 100% = Natural Size (comfortable spacing, no overlap)
// - zoom < 100% = Compressed (may have overlap, useful for overview)
// - zoom > 100% = Enlarged (better readability, requires scroll)
//
// Natural Width = Content width at comfortable spacing (4 tracks, no overlap)
// Reference: docs/architecture/timeline-layout-proposal.md Part 2

const PARALLEL_TRACKS = 2.5          // Number of parallel layout tracks (Top/Bottom × Layer0/Layer1)
const CARD_WIDTH = 216             // Card width in pixels (from layoutUtils.ts)
const OVERLAP_TOLERANCE = 0.7      // Maximum overlap ratio (70% overlap, 30% visible)
const BASE_MAX_ZOOM = 300          // Maximum zoom level
const BASE_MIN_ZOOM = 20           // Absolute minimum zoom level

/**
 * Calculate time span in days
 */
function calculateTimeSpanDays(events: VersionEvent[]): number {
  if (events.length === 0) return 0

  const timestamps = events.map(e => {
    const year = e.year
    const month = e.month || 6  // Default to mid-year if no month
    const day = 15              // Default to mid-month
    return new Date(year, month - 1, day).getTime()
  })

  const spanMs = Math.max(...timestamps) - Math.min(...timestamps)
  return spanMs / (1000 * 60 * 60 * 24) // Convert to days
}

/**
 * Calculate zoom bounds based on Natural Width strategy
 * Reference: docs/architecture/timeline-layout-proposal.md Part 2
 *
 * Key concepts:
 * - naturalWidth: Content width at comfortable spacing (no overlap, 4 tracks parallel)
 * - zoom 100% = naturalWidth
 * - fitZoom: Zoom level that fits content in one screen
 * - limitZoom: Minimum zoom to maintain 30% visibility (70% overlap tolerance)
 */
function calculateZoomBounds(
  events: VersionEvent[],
  containerWidth: number
) {
  // Calculate available width for event content (excluding all reserved areas)
  const reservedWidth = EDGE_PADDING * 2 + TIMELINE_START_OFFSET + TIMELINE_END_OFFSET
  const availableWidth = Math.max(100, containerWidth - reservedWidth)

  const eventCount = events.length

  // Natural Width: Comfortable spacing with 4 parallel tracks, no overlap
  // Each "row" (eventCount / PARALLEL_TRACKS) needs CARD_WIDTH spacing
  const naturalWidth = Math.max(CARD_WIDTH, (eventCount / PARALLEL_TRACKS) * CARD_WIDTH)

  // Limit Width: Maximum overlap tolerance (70% overlap, 30% visible)
  // At this width, cards overlap significantly but remain identifiable
  const minVisibleRatio = 1 - OVERLAP_TOLERANCE // 0.3
  const limitWidth = Math.max(CARD_WIDTH * minVisibleRatio, (eventCount / PARALLEL_TRACKS) * (CARD_WIDTH * minVisibleRatio))

  // fitZoom: Zoom level that makes content exactly fit in one screen
  // At fitZoom, actualContentWidth = availableWidth
  // actualContentWidth = naturalWidth × (zoom / 100)
  // => fitZoom = (availableWidth / naturalWidth) × 100
  const fitZoom = Math.round((availableWidth / naturalWidth) * 100)

  // limitZoom: Minimum zoom to maintain acceptable visibility
  // At limitZoom, actualContentWidth = limitWidth
  // => limitZoom = (limitWidth / naturalWidth) × 100
  const limitZoom = Math.round((limitWidth / naturalWidth) * 100)

  // minZoom: Guard against extreme compression
  // Use limitZoom as floor, but don't go below BASE_MIN_ZOOM
  const minZoom = Math.max(BASE_MIN_ZOOM, limitZoom)

  // maxZoom: Upper bound for zoom
  const maxZoom = BASE_MAX_ZOOM

  // perfectZoom: Recommended default zoom
  // Strategy from docs:
  // - If fitZoom >= 100: Content fits comfortably in one screen, use fitZoom (no scroll needed)
  // - If fitZoom < 100: One screen would cause overlap, prefer 100% (accept scroll for comfort)
  // But also respect minZoom as absolute floor
  const perfectZoom = Math.max(minZoom, fitZoom >= 100 ? fitZoom : 100)

  return {
    minZoom,
    maxZoom,
    perfectZoom,
    fitZoom: Math.max(minZoom, fitZoom), // Ensure fitZoom respects minZoom
    naturalWidth,
    availableWidth
  }
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

  // Hover and z-index state for event interactions
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [eventZIndices, setEventZIndices] = useState<Record<string, number>>({})
  const zIndexCounterRef = useRef(1)

  // Event type filtering state for legend
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())

  // Load z-index preferences from localStorage
  useEffect(() => {
    if (timeline && timeline.id) {
      const saved = localStorage.getItem(`timeline_zindex_${timeline.id}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Record<string, number>
          setEventZIndices(parsed)
          // Update counter to max + 1
          const maxZ = Math.max(0, ...Object.values(parsed))
          zIndexCounterRef.current = maxZ + 1
        } catch (e) {
          console.error('Failed to parse z-index from localStorage', e)
        }
      }
    }
  }, [timeline?.id])

  // Save z-index preferences to localStorage
  const saveZIndices = useCallback((indices: Record<string, number>) => {
    if (timeline && timeline.id) {
      localStorage.setItem(`timeline_zindex_${timeline.id}`, JSON.stringify(indices))
    }
  }, [timeline?.id])

  // Timer ref for distinguishing single-click vs double-click
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle double-click to bring card to front (adjust z-index)
  const handleEventCardDoubleClick = useCallback((event: VersionEvent) => {
    // Clear single-click timer to prevent opening edit modal
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }

    // Update z-index
    const newZIndices = { ...eventZIndices }
    newZIndices[event.id] = zIndexCounterRef.current++

    // Normalize if counter gets too large (prevent overflow and keep below modal z-index)
    // Keep z-index in range 0-99 (well below modal's 1000)
    if (zIndexCounterRef.current > 100) {
      const entries = Object.entries(newZIndices)
      entries.sort((a, b) => a[1] - b[1])
      const normalized: Record<string, number> = {}
      entries.forEach(([id], index) => {
        normalized[id] = index + 1
      })
      setEventZIndices(normalized)
      zIndexCounterRef.current = entries.length + 1
      saveZIndices(normalized)
    } else {
      setEventZIndices(newZIndices)
      saveZIndices(newZIndices)
    }
  }, [eventZIndices, saveZIndices])

  // Handle single-click to open edit modal (with delay to allow double-click detection)
  const handleEventCardClick = useCallback((event: VersionEvent) => {
    // Clear any existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    // Delay single-click action to allow double-click detection
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
      onEventClick?.(event)
    }, 250) // 250ms delay to detect double-click
  }, [onEventClick])

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

  // Calculate dynamic zoom bounds based on Natural Width strategy
  const { minZoom, maxZoom, perfectZoom, naturalWidth } = useMemo(() => {
    if (!timeline?.events.length) {
      return {
        minZoom: BASE_MIN_ZOOM,
        maxZoom: BASE_MAX_ZOOM,
        perfectZoom: 100,
        naturalWidth: 1000
      }
    }

    return calculateZoomBounds(timeline.events, containerWidth)
  }, [timeline, containerWidth])

  // Initialize Zoom - MOVED to effect below to support localStorage

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

    // Use double requestAnimationFrame to ensure DOM is fully laid out
    // First rAF schedules after current frame, second rAF ensures layout is complete
    // This fixes the issue where scroll arrows don't update correctly after switching app modes
    let rafId1: number
    let rafId2: number

    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        updateScrollState()
      })
    })

    container.addEventListener('scroll', updateScrollState)
    return () => {
      cancelAnimationFrame(rafId1)
      cancelAnimationFrame(rafId2)
      container.removeEventListener('scroll', updateScrollState)
    }
  }, [updateScrollState, timeline?.id])

  // Scroll functions
  const scrollTo = useCallback((position: 'start' | 'end' | 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return

    // Reduced scroll amount for smoother, more controlled scrolling
    const scrollAmount = containerWidth * 0.4

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



  // Axis Break Toggle State
  const [enableAxisBreak, setEnableAxisBreak] = useState(true)

  // Track previous zoom to detect user-initiated zoom changes
  const prevZoomRef = useRef<number | null>(null)

  // Auto-disable axis break when zoom changes (user interaction)
  useEffect(() => {
    // Skip initial zoom setup (null -> perfectZoom)
    if (prevZoomRef.current === null && zoom !== null) {
      prevZoomRef.current = zoom
      return
    }

    // Detect zoom change after initialization
    if (prevZoomRef.current !== null && zoom !== null && prevZoomRef.current !== zoom) {
      // User changed zoom - reset axis break to recalculate at new zoom level
      setEnableAxisBreak(false)
      prevZoomRef.current = zoom
    }
  }, [zoom])

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

    // Calculate actual content width based on zoom
    // New semantics: zoom 100% = naturalWidth (comfortable spacing, no overlap)
    // actualContentWidth = naturalWidth × (zoom / 100)
    const currentZoom = zoom ?? perfectZoom
    const actualContentWidth = naturalWidth * (currentZoom / 100)

    // Calculate time span for proper scaling
    const spanDays = calculateTimeSpanDays(timeline.events)
    const totalYears = spanDays / 365.25

    /**
     * Convert zoom (content-based scaling) to pixelsPerYear (time-based scaling)
     *
     * The layoutUtils expects pixelsPerYear, which controls:
     * 1. Gap detection for axis breaks (MIN_GAP_PIXELS threshold)
     * 2. Time segment width calculation
     *
     * Strategy:
     * - If totalYears >= 0.1 (~36 days): Direct conversion actualContentWidth / totalYears
     * - Very short time span: Use large value to prevent meaningless axis breaks
     */
    const pixelsPerYear = totalYears >= 0.1
      ? actualContentWidth / totalYears
      : actualContentWidth * 100 // Very short span - prevent axis breaks

    // Check if breaks are possible (for showing toggle button)
    const potentialPixelsPerYear = pixelsPerYear // Use same calculation as above
    const potentialScale = generateTimeSegments(timeline.events, potentialPixelsPerYear, true, containerWidth)
    const hasPossibleBreaks = potentialScale.segments.some((s: TimeSegment) => s.type === 'break')

    // Theme colors
    const theme = timeline.info?.theme || 'teal'
    const customThemeColor = timeline.info?.themeColor || '#0A7171'

    // Filter out hidden types first
    const visibleRawEvents = timeline.events.filter(event => !hiddenTypes.has(event.type))

    // If all events are hidden, return empty state
    if (visibleRawEvents.length === 0) {
      return {
        layoutEvents: [] as LayoutEvent[],
        timelineGradient: '',
        themeColor: customThemeColor,
        totalWidth: containerWidth,
        timeSegments: [] as TimeSegment[],
        hasPossibleBreaks: false
      }
    }

    // Generate gradient colors based on visible count (for timeline axis)
    const axisColors = generateTimelineColors(visibleRawEvents.length, theme)

    // Attach color to each event
    // Logic:
    // 1. Node (Dot): Typed = Type Color; Untyped = Axis Gradient Color (position-based)
    // 2. Card/Connector: Typed = Type Color; Untyped = Theme Color
    const visibleEvents = visibleRawEvents.map((event, index) => {
      const typeConfig = timeline.info.eventTypes?.[event.type]
      const typeColor = typeConfig?.color

      const nodeColor = typeColor || axisColors[index]
      // For style color (Card/Connector), if no type color, we leave it undefined 
      // so CSS falls back to var(--theme-color)
      const styleColor = typeColor

      return {
        ...event,
        nodeColor,
        styleColor,
        color: nodeColor // Pass color (used by layout engine and also as fallback)
      }
    })

    // Generate gradient string
    let gradient: string
    if (axisColors.length === 1) {
      gradient = axisColors[0]
    } else {
      const gradientStops = axisColors.map((color, index) => {
        const position = (index / (axisColors.length - 1)) * 100
        return `${color} ${position}%`
      }).join(', ')
      gradient = `linear-gradient(to right, ${gradientStops})`
    }

    // Calculate layout with Non-Linear Axis support (using filtered visible events)
    const { layoutEvents: layout, totalWidth: eventsWidth, timeScale } = calculateSmartLayout(
      visibleEvents, pixelsPerYear, enableAxisBreak, containerWidth
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
  }, [timeline, containerWidth, zoom, enableAxisBreak, naturalWidth, perfectZoom, hiddenTypes])

  // Initialize zoom to perfectZoom once calculated, or load from storage
  useEffect(() => {
    if (zoom === null && perfectZoom > 0) {
      // Check for saved preference
      if (timeline && timeline.id) {
        const savedZoom = localStorage.getItem(`timeline_zoom_${timeline.id}`)
        if (savedZoom) {
          const parsed = parseInt(savedZoom, 10)
          if (!isNaN(parsed)) {
            // Respect user's saved choice but ensure it's within bounds
            setZoom(Math.max(minZoom, Math.min(maxZoom, parsed)))
            return
          }
        }
      }
      // Fallback to perfectZoom if no preference
      setZoom(perfectZoom)
    }
  }, [perfectZoom, zoom, timeline, minZoom, maxZoom])

  useEffect(() => {
    // Use double requestAnimationFrame to ensure DOM has fully updated
    let rafId1: number
    let rafId2: number

    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        updateScrollState()
      })
    })

    return () => {
      cancelAnimationFrame(rafId1)
      cancelAnimationFrame(rafId2)
    }
  }, [totalWidth, containerWidth, updateScrollState])

  // Update scroll state when zoom changes
  useEffect(() => {
    // Small delay to ensure DOM has updated after zoom change
    const timer = setTimeout(() => {
      updateScrollState()
    }, 100)
    return () => clearTimeout(timer)
  }, [zoom, updateScrollState])

  const highlightText = useCallback((text: string, highlights?: string[], color?: string) => {
    // First, convert newlines to <br /> tags to preserve line breaks
    let result = text.replace(/\n/g, '<br />')

    // Then apply highlighting if keywords exist
    if (highlights && highlights.length > 0) {
      const highlightColor = color || themeColor
      highlights.forEach(keyword => {
        const regex = new RegExp(`(${keyword})`, 'gi')
        result = result.replace(regex, `<span class="${styles.highlight}" style="color: ${highlightColor}">$1</span>`)
      })
    }

    return <span dangerouslySetInnerHTML={{ __html: result }} />
  }, [styles.highlight, themeColor])

  // Get z-index style for an event
  // Keep all z-indices below modal (1000) to prevent cards appearing above edit modal
  const getEventZIndex = useCallback((eventId: string, isNode: boolean = false): number => {
    // Hover always wins (highest priority, but still below modal)
    if (hoveredEventId === eventId) {
      return isNode ? 300 : 200 // Node above card (300 > 200), both below modal (1000)
    }
    // Node elements should always be above their corresponding cards
    // Base z-index range: 0-99 (from clicks)
    // Node z-index range: 100-199 (base + 100)
    const baseZ = eventZIndices[eventId] || 0
    return isNode ? baseZ + 100 : baseZ
  }, [hoveredEventId, eventZIndices])

  // Handle zoom change - must be before early return to maintain hooks order
  const handleZoomChange = useCallback((value: number) => {
    // Save user preference
    if (timeline && timeline.id) {
      localStorage.setItem(`timeline_zoom_${timeline.id}`, String(value))
    }
    setZoom(Math.max(value, minZoom))
  }, [minZoom, timeline])

  // Handle event type filtering (for legend)
  const handleToggleType = useCallback((typeId: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) {
        next.delete(typeId)
      } else {
        next.add(typeId)
      }
      return next
    })
  }, [])

  // Handle show all types (reset filter)
  const handleShowAll = useCallback(() => {
    setHiddenTypes(new Set())
  }, [])

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
      {/* Main content area */}
      <div className={styles.mainContent}>
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
            <ZoomOutOutlined className={styles.zoomIcon} onClick={() => handleZoomChange(Math.max(minZoom, (zoom ?? minZoom) - 10))} />
            <Slider
              className={styles.zoomSlider}
              min={minZoom}
              max={maxZoom}
              value={zoom ?? minZoom}
              onChange={handleZoomChange}
              tooltip={{ formatter: (v) => v != null ? `${v}%` : `${minZoom}%` }}
            />
            <ZoomInOutlined className={styles.zoomIcon} onClick={() => handleZoomChange(Math.min(maxZoom, (zoom ?? minZoom) + 10))} />

            {/* Fit Button - Reset to perfect zoom */}
            <button
              className={styles.fitButton}
              onClick={() => setZoom(perfectZoom)}
              title={`Reset to perfect zoom (${perfectZoom}%)`}
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
                // Position at the center of the break spacing
                // User adjustment: Shift left by half of MIN_DOT_DIST_PX (12px) to account for visual balance
                const centerLeft = startLeft + segment.pixelWidth / 2
                return (
                  <div
                    key={`break-${index}`}
                    className={styles.axisBreak}
                    style={{
                      left: `${centerLeft}px`
                    }}
                  >
                    <div className={styles.breakLine} />
                    <div className={styles.breakLine} />
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
              {layoutEvents.map(event => {
                const zIndex = getEventZIndex(event.id, true) // isNode = true
                const isHovered = hoveredEventId === event.id
                return (
                  <div
                    key={`node-${event.id}`}
                    className={`${styles.eventNode} ${event.position === 'bottom' ? styles.eventNodeBottom : ''} ${isHovered ? styles.hovered : ''}`}
                    style={{
                      left: `${getEventPosition(event.timelinePosition)}px`,
                      zIndex,
                    } as React.CSSProperties}
                  >
                    <div className={styles.eventDot} style={{ backgroundColor: event.nodeColor || event.color }} />
                    <div className={styles.eventTimeLabel}>
                      {formatEventTime(event.year, event.month)}
                    </div>
                  </div>
                )
              })}

              {/* Top events layer 1 */}
              <div className={`${styles.eventsLayer} ${styles.eventsLayerTop} ${styles.layer1}`}>
                {topLayer1.map(event => {
                  const zIndex = getEventZIndex(event.id)
                  const isHovered = hoveredEventId === event.id
                  // Use event.styleColor if present, otherwise CSS will use fallback
                  const style: React.CSSProperties & { '--event-color'?: string } = {
                    left: `${getEventPosition(event.timelinePosition)}px`,
                    zIndex,
                  }
                  if (event.styleColor) {
                    style['--event-color'] = event.styleColor
                  }

                  return (
                    <div
                      key={event.id}
                      className={`${styles.eventCard} ${styles.eventCardTop} ${isHovered ? styles.hovered : ''}`}
                      style={style as React.CSSProperties}
                      onClick={() => handleEventCardClick(event)}
                      onDoubleClick={() => handleEventCardDoubleClick(event)}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      title={t.versionTimeline.doubleClickToReorder}
                    >
                      <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                        <div className={styles.eventTitle}>
                          {highlightText(event.title, event.highlight, event.styleColor || themeColor)}
                        </div>
                        {event.description && (
                          <div className={styles.eventDescription}>
                            {highlightText(event.description, event.highlight, event.styleColor || themeColor)}
                          </div>
                        )}
                      </div>
                      <div className={`${styles.eventConnector} ${styles.eventConnectorTop} ${styles.connectorLong}`} />
                    </div>
                  )
                })}
              </div>

              {/* Top events layer 0 */}
              <div className={`${styles.eventsLayer} ${styles.eventsLayerTop} ${styles.layer0}`}>
                {topLayer0.map(event => {
                  const zIndex = getEventZIndex(event.id)
                  const isHovered = hoveredEventId === event.id
                  // Use event.styleColor if present, otherwise CSS will use fallback
                  const style: React.CSSProperties & { '--event-color'?: string } = {
                    left: `${getEventPosition(event.timelinePosition)}px`,
                    zIndex,
                  }
                  if (event.styleColor) {
                    style['--event-color'] = event.styleColor
                  }

                  return (
                    <div
                      key={event.id}
                      className={`${styles.eventCard} ${styles.eventCardTop} ${isHovered ? styles.hovered : ''}`}
                      style={style as React.CSSProperties}
                      onClick={() => handleEventCardClick(event)}
                      onDoubleClick={() => handleEventCardDoubleClick(event)}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      title={t.versionTimeline.doubleClickToReorder}
                    >
                      <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                        <div className={styles.eventTitle}>
                          {highlightText(event.title, event.highlight, event.styleColor || themeColor)}
                        </div>
                        {event.description && (
                          <div className={styles.eventDescription}>
                            {highlightText(event.description, event.highlight, event.styleColor || themeColor)}
                          </div>
                        )}
                      </div>
                      <div className={`${styles.eventConnector} ${styles.eventConnectorTop}`} />
                    </div>
                  )
                })}
              </div>

              {/* Bottom events layer 0 */}
              <div className={`${styles.eventsLayer} ${styles.eventsLayerBottom} ${styles.layer0}`}>
                {bottomLayer0.map(event => {
                  const zIndex = getEventZIndex(event.id)
                  const isHovered = hoveredEventId === event.id
                  // Use event.styleColor if present, otherwise CSS will use fallback
                  const style: React.CSSProperties & { '--event-color'?: string } = {
                    left: `${getEventPosition(event.timelinePosition)}px`,
                    zIndex,
                  }
                  if (event.styleColor) {
                    style['--event-color'] = event.styleColor
                  }

                  return (
                    <div
                      key={event.id}
                      className={`${styles.eventCard} ${styles.eventCardBottom} ${isHovered ? styles.hovered : ''}`}
                      style={style as React.CSSProperties}
                      onClick={() => handleEventCardClick(event)}
                      onDoubleClick={() => handleEventCardDoubleClick(event)}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    >
                      <div className={`${styles.eventConnector} ${styles.eventConnectorBottom}`} />
                      <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                        <div className={styles.eventTitle}>
                          {highlightText(event.title, event.highlight, event.styleColor || themeColor)}
                        </div>
                        {event.description && (
                          <div className={styles.eventDescription}>
                            {highlightText(event.description, event.highlight, event.styleColor || themeColor)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom events layer 1 */}
              <div className={`${styles.eventsLayer} ${styles.eventsLayerBottom} ${styles.layer1}`}>
                {bottomLayer1.map(event => {
                  const zIndex = getEventZIndex(event.id)
                  const isHovered = hoveredEventId === event.id
                  // Use event.styleColor if present, otherwise CSS will use fallback
                  const style: React.CSSProperties & { '--event-color'?: string } = {
                    left: `${getEventPosition(event.timelinePosition)}px`,
                    zIndex,
                  }
                  if (event.styleColor) {
                    style['--event-color'] = event.styleColor
                  }

                  return (
                    <div
                      key={event.id}
                      className={`${styles.eventCard} ${styles.eventCardBottom} ${isHovered ? styles.hovered : ''}`}
                      style={style as React.CSSProperties}
                      onClick={() => handleEventCardClick(event)}
                      onDoubleClick={() => handleEventCardDoubleClick(event)}
                      onMouseEnter={() => setHoveredEventId(event.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                    >
                      <div className={`${styles.eventConnector} ${styles.eventConnectorBottom} ${styles.connectorLong}`} />
                      <div className={`${styles.eventContent} ${hasMultipleLayers ? styles.eventContentLayered : ''}`}>
                        <div className={styles.eventTitle}>
                          {highlightText(event.title, event.highlight, event.styleColor || themeColor)}
                        </div>
                        {event.description && (
                          <div className={styles.eventDescription}>
                            {highlightText(event.description, event.highlight, event.styleColor || themeColor)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right gradient mask */}
        <div className={`${styles.scrollMask} ${styles.scrollMaskRight} ${canScrollRight ? styles.visible : ''}`} />
      </div>

      {/* Event Type Legend */}
      <EventTypeLegend
        timeline={timeline}
        hiddenTypes={hiddenTypes}
        onToggleType={handleToggleType}
        onShowAll={handleShowAll}
      />
    </div>
  )
}

export default VersionTimelineView
