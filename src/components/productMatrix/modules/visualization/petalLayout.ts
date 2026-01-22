
import { Product, MatrixVendor, PetalConfig, PetalShape } from '@/types/productMatrix'

export interface PetalNode {
    type: 'petal'
    vendorId: string
    products: Product[]
    shape: PetalShape
    path: string // SVG Path Data
    color: string
    opacity: number
    x: number // Relative Center X
    y: number // Relative Center Y
    angle: number // Rotation in degrees
    scale: number // Size scale (0.5 - 1.5 etc based on config)
}

export type PetalLayoutResult = PetalNode[]

interface LayoutContext {
    vendors: MatrixVendor[] // All vendors, ordered
    products: Product[] // Products in this cell
    config: PetalConfig
}

/**
 * Calculates the Petal Matrix layout for a single cell.
 */
export function calculatePetalLayout(context: LayoutContext): PetalLayoutResult {
    const { vendors, products, config } = context

    if (vendors.length === 0) return []

    const result: PetalNode[] = []

    // 1. Group products by vendor
    const productMap = new Map<string, Product[]>()
    vendors.forEach(v => productMap.set(v.id, []))
    products.forEach(p => {
        if (productMap.has(p.vendorId)) {
            productMap.get(p.vendorId)?.push(p)
        }
    })

    // 2. Global Max Count (for normalization across the whole chart? 
    // Ideally this should be passed in, but for now we normalize relative to fixed sizes or cell max?
    // User req: "Instant perception". Absolute size encoding is better than relative-per-cell.
    // But we don't have global stats here.
    // Let's use a semi-absolute scale: 0 items = 0 size, 10 items = max size.
    // Better: use sqrt scale.

    // 3. Geometry Constants
    const cx = 0 // Relative center
    const cy = 0
    const angleStep = 360 / vendors.length
    // Start angle: 12 o'clock is -90deg in Cartesian?
    // Let's say Vendor 0 is at 12 o'clock (-90 + 90 = 0? No.)
    // 0 deg in canvas usually 3 o'clock.
    // We want 12 o'clock. That is -90 degrees.
    const startAngleOffset = -90

    vendors.forEach((vendor, index) => {
        const vendorProducts = productMap.get(vendor.id) || []
        const count = vendorProducts.length

        // Even if count is 0, we might want to reserve the space or show a ghost slot?
        // Requirement says: "Assign fixed location... even if empty, leave blank".
        // So we calculate position but maybe render nothing or a tiny dot?
        // Let's render nothing if empty, but position is reserved by index.

        if (count === 0) return

        // Calculate Angle
        // vendor.order is used for sorting vendors list before passing here?
        // Assuming 'vendors' array is already sorted by order.
        const angle = startAngleOffset + index * angleStep

        // Calculate Size
        // We normalize against a "Reference Max Count" to ensure reasonable spread.
        // If we don't know the global max, we assume a reasonable upper bound for a cell (e.g., 20 items).
        const referenceMax = 20
        let normalized = 0

        if (config.sizeScale === 'linear') {
            normalized = count / referenceMax
        } else if (config.sizeScale === 'log') {
            normalized = Math.log(count + 1) / Math.log(referenceMax + 1)
        } else {
            // Sqrt (Default)
            normalized = Math.sqrt(count) / Math.sqrt(referenceMax)
        }

        // Clamp at 1.0
        normalized = Math.min(1, normalized)

        // Map to range [Min, Max]
        // Note: We want 1 item to be at least visible, so we start at min + step?
        // Actually, let's strictly map:
        // Size = Min + normalized * (Max - Min)
        // This ensures 0 items = Min (but we filtered 0). 1 item will be Min + small. 
        // If Min is distinct (e.g. 20), it's fine.

        const size = config.minPetalSize + normalized * (config.maxPetalSize - config.minPetalSize)

        // Generate Shape Path
        const path = generatePetalPath(config.shape, size, 0) // Path is generated at 0,0 unrotated preferably? 
        // Or we modify coordinate system in ECharts. 
        // ECharts Custom Series allow rotation of the group. 
        // So we just generate a standard shape pointing "UP" or "RIGHT" and rotate group.

        // Let's define "Standard" shape pointing right (0 deg).

        result.push({
            type: 'petal',
            vendorId: vendor.id,
            products: vendorProducts,
            shape: config.shape,
            path: path,
            color: vendor.color,
            opacity: 0.8, // Static for now, can be dynamic
            x: cx, // All clustered at center
            y: cy,
            angle: angle,
            scale: 1, // Size is baked into path or scaling group? 
            // If we bake size into path, 'scale' is 1. If we reuse path, scale is variable.
            // Baking size is easier for irregular shapes.
        })
    })

    return result
}

/**
 * Generates SVG Path Data for a petal shapes.
 * Shape is centered at (0,0) and points to 0 degrees (Right) by default for rotation.
 * Accessing ECharts rotation usually assumes standard cartesian.
 */
function generatePetalPath(shape: PetalShape, size: number, _rotationOffset: number): string {
    const l = size
    const w = size * 0.5 // Width ratio

    switch (shape) {
        case 'diamond':
            // Diamond pointing Right
            //      + (0, -w/2)
            // (0,0) <-------+ (l, 0)
            //      + (0, w/2)
            // Wait, we want it to radiaate FROM center.
            // So P0 is (0,0), P1 is tip (l, 0).
            return `M0,0 L${l / 2},${-w / 2} L${l},0 L${l / 2},${w / 2} Z`

        case 'sector':
            // Pie slice
            return `M0,0 L${l},${-w / 2} A${l},${l} 0 0,1 ${l},${w / 2} Z`
        // Simplified line-arc approximation, real arc needed?
        // ECharts path supports standard SVG path commands.

        case 'petal':
            // Organic Leaf/Drop
            // M0,0 Q...
            return `M0,0 Q${l / 2},${-w} ${l},0 Q${l / 2},${w} 0,0`

        case 'circle':
            // Circle at distance? Or just a circle? 
            // "Petal" implies directional. 
            // If circle, maybe purely distance based or just a circle offset?
            // Let's make it a circle at (l/2, 0) with radius l/2.
            const r = l / 2
            return `M ${r},0 m -${r},0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`

        default:
            return `M0,0 L${l},0`
    }
}
