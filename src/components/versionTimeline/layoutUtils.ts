import { VersionEvent, TimeSegment, TimeScaleConfig } from '@/types/versionTimeline'

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

const MIN_GAP_PIXELS = 250 // Pixels. If visual gap > 250px, it's worth breaking.
const BREAK_WIDTH = 40 // Pixels width for the break visual.
const SEGMENT_PADDING = 1 // Years padding around connected events.

interface LayoutEvent extends VersionEvent {
    position: 'top' | 'bottom'
    offset: number
    timelinePosition: number // Percentage 0-100 relative to totalWidth
    color: string
}

// ----------------------------------------------------------------------
// Core Axis Break Logic
// ----------------------------------------------------------------------

/**
 * 1. Detect active ranges from event years.
 * Merges close years into single continuous ranges.
 */
function getActiveRanges(years: number[], pixelThresholdPerYear: number): { start: number; end: number }[] {
    if (years.length === 0) return []

    const sorted = Array.from(new Set(years)).sort((a, b) => a - b)
    const ranges: { start: number; end: number }[] = []

    if (sorted.length === 0) return []

    let currentStart = sorted[0]
    let currentEnd = sorted[0]

    for (let i = 1; i < sorted.length; i++) {
        const year = sorted[i]
        const yearDiff = year - currentEnd
        const pixelGap = yearDiff * pixelThresholdPerYear

        // If gap is visually small, merge into current range
        // We compare against MIN_GAP_PIXELS
        if (pixelGap < MIN_GAP_PIXELS) {
            currentEnd = year
        } else {
            // Gap is large, finalize current range and start new one
            ranges.push({ start: currentStart, end: currentEnd })
            currentStart = year
            currentEnd = year
        }
    }
    ranges.push({ start: currentStart, end: currentEnd })

    // Add padding to ranges
    return ranges.map(r => ({
        start: r.start - SEGMENT_PADDING,
        end: r.end + SEGMENT_PADDING
    }))
}

/**
 * 2. Generate Time Segments (The Coordinate System)
 * Maps years to pixels based on current zoom (pixels per year).
 */
export function generateTimeSegments(
    events: VersionEvent[],
    zoomPixelsPerYear: number,
    enableBreaks: boolean = true
): TimeScaleConfig {
    const years = events.map(e => e.year)
    // Pass zoomPixelsPerYear to detection logic
    const ranges = enableBreaks ? getActiveRanges(years, zoomPixelsPerYear) : [{ start: Math.min(...years) - SEGMENT_PADDING, end: Math.max(...years) + SEGMENT_PADDING }]

    const segments: TimeSegment[] = []
    let currentPixel = 0

    ranges.forEach((range, index) => {
        // Add Break Segment if not the first range
        if (index > 0) {
            const prevRange = ranges[index - 1]
            // The gap is between prev.end and range.start
            segments.push({
                startYear: prevRange.end,
                endYear: range.start,
                pixelStart: currentPixel,
                pixelWidth: BREAK_WIDTH,
                scale: 0, // No timeline scale in break
                type: 'break'
            })
            currentPixel += BREAK_WIDTH
        }

        // Add Continuous Segment
        const yearsSpan = range.end - range.start
        // Ensure span is positive
        const validSpan = Math.max(0, yearsSpan)
        const segmentWidth = validSpan * zoomPixelsPerYear

        segments.push({
            startYear: range.start,
            endYear: range.end,
            pixelStart: currentPixel,
            pixelWidth: segmentWidth,
            scale: zoomPixelsPerYear,
            type: 'continuous'
        })
        currentPixel += segmentWidth
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
    const segment = config.segments.find(
        s => time >= s.startYear && time <= s.endYear
    )

    // Edge case: Time is inside a break (shouldn't happen with valid logic, but safe fallback)
    if (!segment) {
        // Check if it's in a break gap
        const breakSegment = config.segments.find(
            s => s.type === 'break' && time >= s.startYear && time <= s.endYear
        )
        if (breakSegment) {
            return breakSegment.pixelStart + BREAK_WIDTH / 2
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
// Layout Algorithm (Refactored)
// ----------------------------------------------------------------------

export function calculateSmartLayout(
    events: VersionEvent[],
    colors: string[], // Pre-generated colors map
    zoomPixelsPerYear: number,
    enableBreaks: boolean = true
): {
    layoutEvents: LayoutEvent[],
    totalWidth: number,
    timeScale: TimeScaleConfig
} {
    // 1. New Coordinate System
    const timeScale = generateTimeSegments(events, zoomPixelsPerYear, enableBreaks)

    // 2. Map Events to Positions
    const eventsWithPosition = events.map(event => {
        const px = mapDateToPixel(event.year, event.month, timeScale)

        // Find color based on year index (approximation for compatibility)
        // In real scenario we might want a better color mapping strategy
        // For now, we reuse the index-based color passed from parent
        const uniqueYears = Array.from(new Set(events.map(e => e.year))).sort((a, b) => a - b)
        const yearIndex = uniqueYears.indexOf(event.year)
        const color = colors[yearIndex % colors.length] || colors[0]

        return {
            ...event,
            pixelOriginal: px,
            pixelAdjusted: px, // Will be nudged
            color
        }
    })

    // Sort by pixel position
    eventsWithPosition.sort((a, b) => a.pixelOriginal - b.pixelOriginal)

    // 3. Collision Avoidance (Nudging Dots)
    const MIN_DOT_DIST_PX = 24 // Minimum pixels between dots

    for (let i = 1; i < eventsWithPosition.length; i++) {
        const prev = eventsWithPosition[i - 1]
        const curr = eventsWithPosition[i]

        if (curr.pixelAdjusted - prev.pixelAdjusted < MIN_DOT_DIST_PX) {
            curr.pixelAdjusted = prev.pixelAdjusted + MIN_DOT_DIST_PX
        }
    }

    // 4. Calculate Final Layout (Zig-Zag Stacking)
    // We need to convert pixels back to % for the view if the view expects %, 
    // BUT the view is now scrolling a fixed pixel width. 
    // Let's use Pixels for `left` in the view to be precise.

    // NOTE: The original component uses percentages. 
    // To minimize Refactor Shock, let's keep `timelinePosition` as "Percentage of Total Width"
    // But we must calculate it AFTER we know the Total Width (which might have expanded due to Nudging).

    const originalTotalWidth = timeScale.totalWidth
    // Check if nudging expanded the width
    const lastEvent = eventsWithPosition[eventsWithPosition.length - 1]
    const nudgedTotalWidth = lastEvent ? Math.max(originalTotalWidth, lastEvent.pixelAdjusted + 50) : originalTotalWidth

    const finalTotalWidth = nudgedTotalWidth

    const layoutEvents: LayoutEvent[] = []

    // Stacking Logic
    let lastPlacedSide: 'top' | 'bottom' = 'bottom'
    const topLayers: Array<{ start: number; end: number }[]> = [[], []]
    const bottomLayers: Array<{ start: number; end: number }[]> = [[], []]

    const MIN_CARD_SPACING_PX = 216 // Approx card width + gap

    eventsWithPosition.forEach(event => {
        const centerPx = event.pixelAdjusted
        const startPx = centerPx - MIN_CARD_SPACING_PX / 2
        const endPx = centerPx + MIN_CARD_SPACING_PX / 2

        let placed = false
        let position: 'top' | 'bottom' = 'top'
        let layerIndex = 0

        // Zig-Zag Logic
        const preferTop = lastPlacedSide === 'bottom'
        const sidesToTry: Array<'top' | 'bottom'> = preferTop ? ['top', 'bottom'] : ['bottom', 'top']

        // Try Layer 0
        for (const side of sidesToTry) {
            const layers = side === 'top' ? topLayers : bottomLayers
            const layer0 = layers[0]
            const hasOverlap = layer0.some(occ => !(endPx < occ.start || startPx > occ.end))

            if (!hasOverlap) {
                position = side
                layerIndex = 0
                layer0.push({ start: startPx, end: endPx })
                placed = true
                break
            }
        }

        // Try Layer 1
        if (!placed) {
            for (const side of sidesToTry) {
                const layers = side === 'top' ? topLayers : bottomLayers
                const layer1 = layers[1]
                const hasOverlap = layer1.some(occ => !(endPx < occ.start || startPx > occ.end))

                // Visual Safety Check (Connector cutting through layer 0)
                let isVisuallySafe = true
                const layer0 = layers[0]
                const obstruct = layer0.find(occ => centerPx >= occ.start && centerPx <= occ.end)

                if (obstruct) {
                    const obsCenter = (obstruct.start + obstruct.end) / 2
                    if (Math.abs(centerPx - obsCenter) > 40) isVisuallySafe = false
                }

                if (!hasOverlap && isVisuallySafe) {
                    position = side
                    layerIndex = 1
                    layers[1].push({ start: startPx, end: endPx })
                    placed = true
                    break
                }
            }
        }

        // Fallback
        if (!placed) {
            const layers = preferTop ? topLayers : bottomLayers
            // Simple heuristic: pick side with fewer items in layer 0/1
            position = preferTop ? 'top' : 'bottom'
            layerIndex = 1 // Force to outer layer or just overlap
            layers[1].push({ start: startPx, end: endPx })
        }

        lastPlacedSide = position

        layoutEvents.push({
            ...event,
            position,
            offset: layerIndex,
            timelinePosition: (centerPx / finalTotalWidth) * 100, // Convert to % for CSS
            color: event.color
        })
    })

    // Update total width in config if it grew
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
