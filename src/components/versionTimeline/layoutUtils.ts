import { VersionEvent, TimeSegment, TimeScaleConfig } from '@/types/versionTimeline'

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

const MIN_GAP_PIXELS = 400
const BREAK_WIDTH = 48
const MIN_GAP_YEARS = 1 // Minimum years required to trigger a break. Prevents breaking adjacent years at high zoom.

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

        // If gap is visually small OR the time difference is too short, merge into current range
        if (pixelGap < MIN_GAP_PIXELS || yearDiff < MIN_GAP_YEARS) {
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
        start: r.start,
        end: r.end
    }))
}

/**
 * 2. Generate Time Segments (The Coordinate System)
 * Maps years to pixels based on current zoom (pixels per year).
 * NOW ELASTIC: Expands segments if event density requires it.
 */
export function generateTimeSegments(
    events: VersionEvent[],
    zoomPixelsPerYear: number,
    enableBreaks: boolean = true
): TimeScaleConfig {
    const years = events.map(e => e.year)
    const ranges = enableBreaks ? getActiveRanges(years, zoomPixelsPerYear) : [{ start: Math.min(...years), end: Math.max(...years) }]

    const segments: TimeSegment[] = []
    let currentPixel = 0
    const MIN_EVENT_SPACING = 28 // Pixels needed per event in a cluster

    ranges.forEach((range, index) => {
        // Add Break Segment if not the first range
        if (index > 0) {
            const prevRange = ranges[index - 1]
            segments.push({
                startYear: prevRange.end,
                endYear: range.start,
                pixelStart: currentPixel,
                pixelWidth: BREAK_WIDTH,
                scale: 0,
                type: 'break'
            })
            currentPixel += BREAK_WIDTH
        }

        // Add Continuous Segment (Elastic)
        const yearsSpan = range.end - range.start
        const validSpan = Math.max(0.001, yearsSpan) // Avoid division by zero

        // 1. Calculate ideal width based on global zoom
        const naturalWidth = validSpan * zoomPixelsPerYear

        // 2. Calculate required width based on event density
        // Find events in this range
        const eventsInRange = events.filter(e => e.year >= range.start && e.year <= range.end)
        // Group by year (assume collisions happen mostly on same year)
        // Actually, we just need enough total width to spread them out? 
        // Simple heuristic: Total Events * Spacing
        // Better heuristic: Max events in any single year * Spacing? No, we nudge laterally.
        // Let's use (Count - 1) * Spacing + Padding
        const requiredWidth = eventsInRange.length > 1
            ? (eventsInRange.length - 0.5) * MIN_EVENT_SPACING
            : MIN_EVENT_SPACING

        // 3. Compare and expand
        const finalWidth = Math.max(naturalWidth, requiredWidth)

        // 4. Calculate effective scale for this segment
        const segmentScale = finalWidth / validSpan

        segments.push({
            startYear: range.start,
            endYear: range.end,
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

// ----------------------------------------------------------------------
// Layout Algorithm (Refactored: Cost-Based Best-Fit)
// ----------------------------------------------------------------------

// Tuned coefficients based on "10% difference threshold"
const COEFF_LAYER = 800
const COEFF_ZIGZAG = 50
const GAP_SAFE_PX = 10
const COST_CROWD = 200

const OVERLAP_BASE = 1000
const OVERLAP_COEFF = 30000

// Track definitions
// 0: Top-L0, 1: Bot-L0, 2: Top-L1, 3: Bot-L1
const TRACKS = [
    { id: 0, position: 'top' as const, layer: 0 },
    { id: 1, position: 'bottom' as const, layer: 0 },
    { id: 2, position: 'top' as const, layer: 1 },
    { id: 3, position: 'bottom' as const, layer: 1 },
]

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

        // Color logic
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
    const MIN_DOT_DIST_PX = 12

    for (let i = 1; i < eventsWithPosition.length; i++) {
        const prev = eventsWithPosition[i - 1]
        const curr = eventsWithPosition[i]

        if (curr.pixelAdjusted - prev.pixelAdjusted < MIN_DOT_DIST_PX) {
            curr.pixelAdjusted = prev.pixelAdjusted + MIN_DOT_DIST_PX
        }
    }

    // 4. Calculate Final Layout (Cost-Based Best-Fit)
    const originalTotalWidth = timeScale.totalWidth
    const lastEvent = eventsWithPosition[eventsWithPosition.length - 1]
    const nudgedTotalWidth = lastEvent ? Math.max(originalTotalWidth, lastEvent.pixelAdjusted + 50) : originalTotalWidth
    const finalTotalWidth = nudgedTotalWidth

    const layoutEvents: LayoutEvent[] = []

    // Store occupied ranges for each track: { start, end }[]
    const trackOccupancy: Array<{ start: number; end: number }[]> = [[], [], [], []]

    // Using approx card width + gap. 
    // Ideally this should match CSS. Let's assume ~180px visual + margin
    const CARD_WIDTH_PX = 216

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

            // Calculate Gap Cost
            if (maxOverlapRatio === 0) {
                if (minGap < gap_not_found_fallback(minGap)) {
                    // Helper: if minGap is Infinity, it means track is empty or far away -> safe
                }
                if (minGap >= 0 && minGap <= GAP_SAFE_PX) {
                    cost += COST_CROWD
                }
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

                // If the connector (vertical line at centerPx) hits a card in Layer 0
                // We should penalize this to avoid "visual collision" of the line
                if (obstruct) {
                    const obsCenter = (obstruct.start + obstruct.end) / 2
                    // If it hits right in the middle of a card below/above it
                    if (Math.abs(centerPx - obsCenter) < 40) {
                        cost += 500 // Soft penalty, can be overridden if overlap cost is huge
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

// Helper to handle Infinity
function gap_not_found_fallback(val: number) {
    return val === Infinity ? Infinity : val
}
