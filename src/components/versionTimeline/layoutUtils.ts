import { VersionEvent, TimeSegment, TimeScaleConfig } from '@/types/versionTimeline'

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

// 断轴相关常量
const MIN_GAP_PIXELS = 400        // 触发断轴的最小像素间距
const MIN_GAP_RATIO = 0.15        // 触发断轴的最小时间差比例（占总跨度的 15%）
const BREAK_SPACING = 96          // 断轴的实际像素间距（布局用）

// 事件布局常量
const MIN_DOT_DIST_PX = 12        // 事件点之间的最小像素距离
const MIN_EVENT_SPACING = 28      // 事件密集区域每个事件所需的最小宽度
const CARD_WIDTH_PX = 216         // 卡片宽度（含边距）
const CARD_TAIL_PADDING = 50      // 最后一个事件后的尾部留白

// 成本计算系数（基于 10% 差异阈值调优）
const COEFF_LAYER = 800           // 层级惩罚：优先使用 L0 层
const COEFF_ZIGZAG = 50           // 连续同侧惩罚：鼓励锯齿形布局
const GAP_SAFE_PX = 10            // 安全间距阈值
const COST_CROWD = 200            // 拥挤惩罚
const OVERLAP_BASE = 1000         // 重叠基础惩罚
const OVERLAP_COEFF = 30000       // 重叠系数（二次方惩罚）

// 视觉安全检查
const CONNECTOR_OBSTRUCTION_THRESHOLD = 40  // 连接线遮挡检测阈值
const CONNECTOR_OBSTRUCTION_PENALTY = 500   // 连接线遮挡惩罚

interface LayoutEvent extends VersionEvent {
    position: 'top' | 'bottom'
    offset: number
    timelinePosition: number // Percentage 0-100 relative to totalWidth
    color: string
    nodeColor?: string
    styleColor?: string
}

// ----------------------------------------------------------------------
// Core Axis Break Logic
// ----------------------------------------------------------------------

/**
 * 1. Detect active ranges from events using full timestamps (year + month).
 * Merges close time periods into single continuous ranges.
 *
 * Axis break is triggered when ALL THREE conditions are met:
 * - Timeline requires scrolling (estimatedWidth > containerWidth)
 * - Visual gap is large enough (pixelGap >= MIN_GAP_PIXELS)
 * - Time gap is significant relative to total span (timeRatio >= MIN_GAP_RATIO)
 */
function getActiveRanges(
    events: VersionEvent[],
    pixelThresholdPerYear: number,
    containerWidth: number
): { start: number; end: number }[] {
    if (events.length === 0) return []

    // Convert events to full timestamps (year + month as decimal)
    const times = events.map(e => e.year + (e.month ? (e.month - 1) / 12 : 0.5))
    const sorted = Array.from(new Set(times)).sort((a, b) => a - b)
    if (sorted.length === 0) return []

    // Calculate total time span for relative ratio check
    const totalSpan = sorted[sorted.length - 1] - sorted[0]

    // If all events are at the same time, return a single point range
    if (totalSpan === 0) {
        return [{ start: sorted[0], end: sorted[0] }]
    }

    // Quick estimate: timeline width without axis breaks (ignoring elastic expansion)
    const estimatedWidth = totalSpan * pixelThresholdPerYear

    // If timeline fits in one screen, no need for axis breaks
    // (Axis breaks are only useful when timeline requires scrolling)
    if (estimatedWidth <= containerWidth) {
        return [{ start: sorted[0], end: sorted[sorted.length - 1] }]
    }

    const ranges: { start: number; end: number }[] = []
    let currentStart = sorted[0]
    let currentEnd = sorted[0]

    for (let i = 1; i < sorted.length; i++) {
        const time = sorted[i]
        const timeDiff = time - currentEnd
        const pixelGap = timeDiff * pixelThresholdPerYear
        const timeRatio = timeDiff / totalSpan

        // Trigger axis break if BOTH conditions are met:
        // 1. Visual gap is large (screen has significant empty space)
        // 2. Time gap is significant relative to total span (not just zoomed-in spacing)
        const shouldBreak = pixelGap >= MIN_GAP_PIXELS && timeRatio >= MIN_GAP_RATIO



        if (shouldBreak) {
            // Gap is large both visually and temporally, finalize current range
            ranges.push({ start: currentStart, end: currentEnd })
            currentStart = time
            currentEnd = time
        } else {
            // Gap is small, merge into current range
            currentEnd = time
        }
    }
    ranges.push({ start: currentStart, end: currentEnd })



    return ranges
}

/**
 * 2. Generate Time Segments (The Coordinate System)
 * Maps years to pixels based on current zoom (pixels per year).
 * NOW ELASTIC: Expands segments if event density requires it.
 */
export function generateTimeSegments(
    events: VersionEvent[],
    zoomPixelsPerYear: number,
    enableBreaks: boolean = true,
    containerWidth: number = 1000 // Default fallback for backward compatibility
): TimeScaleConfig {
    // Calculate full timestamps (year + month as decimal)
    const times = events.map(e => e.year + (e.month ? (e.month - 1) / 12 : 0.5))

    const ranges = enableBreaks
        ? getActiveRanges(events, zoomPixelsPerYear, containerWidth)
        : [{ start: Math.min(...times), end: Math.max(...times) }]

    const segments: TimeSegment[] = []
    let currentPixel = 0

    ranges.forEach((range, index) => {
        // Add Break Segment if not the first range
        if (index > 0) {
            const prevRange = ranges[index - 1]
            const breakSeg = {
                startYear: prevRange.end,
                endYear: range.start,
                pixelStart: currentPixel,
                pixelWidth: BREAK_SPACING,
                scale: 0,
                type: 'break' as const
            }
            segments.push(breakSeg)

            currentPixel += BREAK_SPACING
        }

        // Add Continuous Segment (Elastic)
        const yearsSpan = range.end - range.start

        // Special case: If all events in this range have the same timestamp (span = 0),
        // we need to give it a virtual span based on event density
        let virtualSpan = yearsSpan

        // Filter events using full timestamps (range now contains year + month)
        const eventsInRange = events.filter(e => {
            const time = e.year + (e.month ? (e.month - 1) / 12 : 0.5)
            return time >= range.start && time <= range.end
        })

        if (yearsSpan === 0 && eventsInRange.length > 0) {
            // User requested NO width expansion for simultaneous events
            // We keep virtualSpan as 0 (or effectively 0 via validSpan)
            // so that all events map to the same point.
            virtualSpan = 0
        }

        const validSpan = Math.max(0.001, virtualSpan) // Avoid division by zero

        // 1. Calculate ideal width based on global zoom
        const naturalWidth = validSpan * zoomPixelsPerYear

        // 2. Calculate required width based on event density
        // Skip expansion for single-point ranges (simultaneous events)
        const requiredWidth = (yearsSpan > 0 && eventsInRange.length > 1)
            ? (eventsInRange.length - 0.5) * MIN_EVENT_SPACING
            : (yearsSpan > 0 ? MIN_EVENT_SPACING : 0)

        // 3. Compare and expand
        const finalWidth = Math.max(naturalWidth, requiredWidth)

        // 4. Calculate effective scale for this segment
        const segmentScale = finalWidth / validSpan



        segments.push({
            startYear: range.start,
            endYear: range.end, // Keep original range boundaries (don't add virtualSpan)
            pixelStart: currentPixel,
            pixelWidth: finalWidth,
            scale: segmentScale, // Localized elastic scale
            type: 'continuous'
        })
        currentPixel += finalWidth
    })

    return {
        segments,
        totalWidth: currentPixel
    }
}

/**
 * 3. Map Date (Year + Month) to Pixel Position
 */
export function mapDateToPixel(
    year: number,
    month: number | undefined,
    config: TimeScaleConfig
): number {
    const time = year + (month ? (month - 1) / 12 : 0.5)

    // Find segment
    // Find segment (prioritize continuous segments)
    const segment = config.segments.find(
        s => s.type === 'continuous' && time >= s.startYear && time <= s.endYear
    )

    // Edge case: Time is inside a break (shouldn't happen with valid logic, but safe fallback)
    if (!segment) {
        // Check if it's in a break gap
        const breakSegment = config.segments.find(
            s => s.type === 'break' && time >= s.startYear && time <= s.endYear
        )
        if (breakSegment) {
            return breakSegment.pixelStart + BREAK_SPACING / 2
        }

        // If out of bounds/before first
        if (time < config.segments[0].startYear) return 0
        // If after last
        const last = config.segments[config.segments.length - 1]
        if (time > last.endYear) return last.pixelStart + last.pixelWidth

        return 0
    }



    // Linear interpolation within continuous segment
    const offsetYears = time - segment.startYear
    return segment.pixelStart + (offsetYears * segment.scale)
}

// ----------------------------------------------------------------------
// Layout Algorithm (Cost-Based Best-Fit)
// ----------------------------------------------------------------------

// Track definitions
// 0: Top-L0, 1: Bot-L0, 2: Top-L1, 3: Bot-L1
const TRACKS = [
    { id: 0, position: 'top' as const, layer: 0 },
    { id: 1, position: 'bottom' as const, layer: 0 },
    { id: 2, position: 'top' as const, layer: 1 },
    { id: 3, position: 'bottom' as const, layer: 1 },
]

export function calculateSmartLayout(
    events: Array<VersionEvent & { color: string; nodeColor?: string; styleColor?: string }>, // Events must have color field
    zoomPixelsPerYear: number,
    enableBreaks: boolean = true,
    containerWidth: number = 1000 // Default fallback for backward compatibility
): {
    layoutEvents: LayoutEvent[],
    totalWidth: number,
    timeScale: TimeScaleConfig
} {
    // 1. New Coordinate System
    const timeScale = generateTimeSegments(events, zoomPixelsPerYear, enableBreaks, containerWidth)

    // 2. Map Events to Positions (color is already attached to each event)
    const eventsWithPosition = events.map(event => {
        const px = mapDateToPixel(event.year, event.month, timeScale)

        return {
            ...event,
            pixelOriginal: px,
            pixelAdjusted: px, // Will be nudged
            color: event.color, // Use event's own color
        }
    })

    // Sort by pixel position
    eventsWithPosition.sort((a, b) => a.pixelOriginal - b.pixelOriginal)

    // 4. Collision Avoidance (Nudging Dots)
    // Only nudge events with different timestamps
    // Events at the same time should remain aligned (same node position)
    for (let i = 1; i < eventsWithPosition.length; i++) {
        const prev = eventsWithPosition[i - 1]
        const curr = eventsWithPosition[i]

        // Calculate timestamps for comparison
        const prevTime = prev.year + (prev.month ? (prev.month - 1) / 12 : 0.5)
        const currTime = curr.year + (curr.month ? (curr.month - 1) / 12 : 0.5)

        // Only apply collision avoidance if events have different timestamps
        // (Events at same time will be separated by track layout, not horizontal nudging)
        const isDifferentTime = Math.abs(currTime - prevTime) > 0.001

        if (isDifferentTime && curr.pixelAdjusted - prev.pixelAdjusted < MIN_DOT_DIST_PX) {
            curr.pixelAdjusted = prev.pixelAdjusted + MIN_DOT_DIST_PX
        }
    }

    // 5. Calculate Final Layout (Cost-Based Best-Fit)
    const originalTotalWidth = timeScale.totalWidth
    const lastEvent = eventsWithPosition[eventsWithPosition.length - 1]
    const nudgedTotalWidth = lastEvent
        ? Math.max(originalTotalWidth, lastEvent.pixelAdjusted + CARD_TAIL_PADDING)
        : originalTotalWidth
    const finalTotalWidth = nudgedTotalWidth

    const layoutEvents: LayoutEvent[] = []

    // 每个轨道的占用区域记录
    const trackOccupancy: Array<{ start: number; end: number }[]> = [[], [], [], []]

    let lastPlacedPosition: 'top' | 'bottom' | null = null

    eventsWithPosition.forEach(event => {
        const centerPx = event.pixelAdjusted
        const startPx = centerPx - CARD_WIDTH_PX / 2
        const endPx = centerPx + CARD_WIDTH_PX / 2

        let bestTrackId = 0
        let minCost = Infinity

        // Evaluate all 4 tracks
        TRACKS.forEach((track, trackId) => {
            const occupancy = trackOccupancy[trackId]

            // 1. Layer/Distance Penalty
            let cost = track.layer * COEFF_LAYER

            // 2. ZigZag Penalty
            if (lastPlacedPosition && track.position === lastPlacedPosition) {
                cost += COEFF_ZIGZAG
            }

            // 3. Overlap & Crowd Penalty
            // Find the closest previous event in this track that might conflict
            // Since events are sorted by time, we mainly check the last few items.
            // But strict overlap check needs to be precise.

            let maxOverlapRatio = 0
            let minGap = Infinity

            occupancy.forEach(occ => {
                // Check overlap
                const overlapStart = Math.max(startPx, occ.start)
                const overlapEnd = Math.min(endPx, occ.end)

                if (overlapEnd > overlapStart) {
                    const overlapWidth = overlapEnd - overlapStart
                    const ratio = overlapWidth / CARD_WIDTH_PX // relative to this card
                    if (ratio > maxOverlapRatio) maxOverlapRatio = ratio
                } else {
                    // No overlap, calculating gap
                    // occ is strictly before or after. Since we iterate in time order,
                    // occ is likely before 'startPx'.
                    const gap = startPx - occ.end
                    if (gap >= 0 && gap < minGap) minGap = gap
                }
            })

            // Calculate Gap Cost (only when no overlap)
            if (maxOverlapRatio === 0 && minGap >= 0 && minGap <= GAP_SAFE_PX) {
                cost += COST_CROWD
            }

            // Calculate Overlap Cost (Quadratic)
            // P = Base + Coeff * r^2
            if (maxOverlapRatio > 0) {
                cost += OVERLAP_BASE + OVERLAP_COEFF * Math.pow(maxOverlapRatio, 2)
            }

            // 4. Visual Safety Check for Layer 1 (Connector cutting through Layer 0)
            if (track.layer === 1) {
                const innerTrackId = track.position === 'top' ? 0 : 1
                const innerOccupancy = trackOccupancy[innerTrackId]
                const obstruct = innerOccupancy.find(occ => centerPx >= occ.start && centerPx <= occ.end)

                // 如果连接线穿过 L0 层的卡片中心区域，添加惩罚
                if (obstruct) {
                    const obsCenter = (obstruct.start + obstruct.end) / 2
                    if (Math.abs(centerPx - obsCenter) < CONNECTOR_OBSTRUCTION_THRESHOLD) {
                        cost += CONNECTOR_OBSTRUCTION_PENALTY
                    }
                }
            }

            if (cost < minCost) {
                minCost = cost
                bestTrackId = trackId
            }
        })

        // Commit to best track
        const chosenTrack = TRACKS[bestTrackId]
        trackOccupancy[bestTrackId].push({ start: startPx, end: endPx })
        lastPlacedPosition = chosenTrack.position

        layoutEvents.push({
            ...event,
            position: chosenTrack.position,
            offset: chosenTrack.layer,
            timelinePosition: (centerPx / finalTotalWidth) * 100,
            color: event.color
        })
    })

    const finalConfig = {
        ...timeScale,
        totalWidth: finalTotalWidth
    }

    return {
        layoutEvents,
        totalWidth: finalTotalWidth,
        timeScale: finalConfig
    }
}
