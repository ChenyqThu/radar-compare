import { Product } from '@/types/productMatrix'

export type LayoutMode = 'grid' | 'stack' | 'overlap'

export interface LayoutItem {
    product: Product
    vendor: any
    x: number // Relative x offset from cell center
    y: number // Relative y offset from cell center
    width: number
    height: number
    opacity?: number
    scale?: number
}

interface LayoutConfig {
    mode: LayoutMode
    cellWidth: number
    cellHeight: number
    items: Array<{ product: Product; vendor: any }>
    itemSize: { width: number; height: number } // Base size for calculation
    showLabels: boolean
}

/**
 * Calculates layout positions for items within a single matrix cell
 */
export function calculateCellLayout(config: LayoutConfig): LayoutItem[] {
    const { mode, items, itemSize, showLabels } = config
    const count = items.length

    if (count === 0) return []

    // 1. Single Item - always centered
    if (count === 1) {
        return [{
            product: items[0].product,
            vendor: items[0].vendor,
            x: 0,
            y: 0,
            width: itemSize.width,
            height: itemSize.height,
            opacity: 1,
            scale: 1
        }]
    }

    // 2. Flow Layout (Wrap) - Primary for "Show Labels"
    // Grid mode typically means "Orderly", which Flow achieves. 
    // If we had strict column grid logic, we'd use that, but Flow handles variable alignment better.
    if (showLabels || mode === 'grid') {
        return calculateFlowLayout(config)
    }

    // 3. Stack / Overlap (for Dots)
    if (mode === 'stack') {
        return calculateStackLayout(config)
    }

    // Default: Overlap/Cluster (Smart Dot Layout)
    return calculateSunflowerLayout(config)
}

function calculateFlowLayout(config: LayoutConfig): LayoutItem[] {
    const { items, cellWidth, itemSize } = config
    const count = items.length

    // padding inside the cell
    const padding = 8
    const gapX = 4
    const gapY = 4

    const availableWidth = Math.max(cellWidth - padding * 2, itemSize.width)

    // Note: For simplified ECharts integration, we assume fixed width items for now
    // or we just use the passed itemSize. Ideally we'd measure text but that's hard in pure logic.
    // We'll rely on an estimated average width for labels.

    const itemW = itemSize.width
    const itemH = itemSize.height

    // Generic grid capacity
    const maxCols = Math.max(1, Math.floor((availableWidth + gapX) / (itemW + gapX)))

    // Simple Grid approach if maxCols > 0
    // "Flow" typically implies variable width, but here we assume relatively uniform for stability

    const cols = Math.min(count, maxCols)
    const rows = Math.ceil(count / cols)

    // Centering block
    const blockWidth = cols * itemW + (cols - 1) * gapX
    const blockHeight = rows * itemH + (rows - 1) * gapY

    const startX = -blockWidth / 2 + itemW / 2
    const startY = -blockHeight / 2 + itemH / 2

    const positions: Array<{ x: number, y: number }> = []

    items.forEach((_item, index) => {
        const col = index % cols
        const row = Math.floor(index / cols)

        positions.push({
            x: startX + col * (itemW + gapX),
            y: startY + row * (itemH + gapY)
        })
    })

    return items.map((item, i) => ({
        product: item.product,
        vendor: item.vendor,
        x: positions[i].x,
        y: positions[i].y,
        width: itemW,
        height: itemH,
        opacity: 1,
        scale: 1
    }))
}

function calculateStackLayout(config: LayoutConfig): LayoutItem[] {
    const { items, itemSize } = config
    const count = items.length
    const stackGap = itemSize.height * 0.2 // tight stack

    const totalH = (count - 1) * stackGap
    const startY = -totalH / 2

    return items.map((item, i) => ({
        product: item.product,
        vendor: item.vendor,
        x: 0,
        y: startY + i * stackGap,
        width: itemSize.width,
        height: itemSize.height,
        opacity: 1,
        scale: 1
    }))
}

function calculateSunflowerLayout(config: LayoutConfig): LayoutItem[] {
    const { items, itemSize } = config

    // Sunflower layout for organic cluster
    // c = scale factor
    const c = itemSize.width * 0.6

    return items.map((item, i) => {
        // n is index, but 0 is center. 
        // For small counts, strictly center 0 is boring? no, 0 is center is good.
        const n = i
        const r = c * Math.sqrt(n)
        const theta = n * 137.508 * (Math.PI / 180) // golden angle

        const x = r * Math.cos(theta)
        const y = r * Math.sin(theta)

        return {
            product: item.product,
            vendor: item.vendor,
            x,
            y,
            width: itemSize.width,
            height: itemSize.height,
            opacity: 1,
            scale: 1
        }
    })
}
