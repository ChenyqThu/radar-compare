/**
 * PetalChart - Canvas 2D-based Petal Chart for Multi-dimensional Product Comparison
 * Each product is represented as a flower with petals representing dimensions
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Select, Button, Empty, Slider, Tooltip } from 'antd'
import { ReloadOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'
import { useDataStore, useConfigStore } from '../../stores'
import { useI18n } from '@/locales'
import type { Product, MatrixDimension } from '@/types/productMatrix'
import styles from './PetalChart.module.css'

interface PetalChartProps {
  readonly?: boolean
  onProductClick?: (product: Product) => void
}

// Petal drawing configuration
const PETAL_CONFIG = {
  baseRadius: 30,
  maxPetalLength: 80,
  petalWidth: 0.4, // radians
  centerRadius: 15,
  labelOffset: 20,
}

export function PetalChart({ readonly, onProductClick }: PetalChartProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { products } = useDataStore()
  const { vendors, dimensions } = useConfigStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Selected products to compare
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [zoom, setZoom] = useState(100)
  const [hoveredProduct, _setHoveredProduct] = useState<Product | null>(null)
  const [tooltipPos, _setTooltipPos] = useState({ x: 0, y: 0 })
  // Note: _setHoveredProduct and _setTooltipPos are prepared for future hover detection feature

  // Get usable dimensions (those with valid range or options)
  const usableDimensions = useMemo(() => {
    return dimensions.filter(d =>
      d.type === 'continuous' || (d.options && d.options.length > 0)
    )
  }, [dimensions])

  // Auto-select first few products if none selected
  useEffect(() => {
    if (selectedProductIds.length === 0 && products.length > 0) {
      setSelectedProductIds(products.slice(0, Math.min(3, products.length)).map(p => p.id))
    }
  }, [products, selectedProductIds.length])

  // Get normalized dimension value (0-1) for a product
  const getNormalizedValue = useCallback((product: Product, dimension: MatrixDimension): number => {
    const dimValue = product.dimensionValues[dimension.id]
    if (dimValue === null || dimValue === undefined) return 0

    if (dimension.type === 'continuous') {
      const numValue = typeof dimValue === 'number' ? dimValue : parseFloat(String(dimValue)) || 0
      const min = dimension.min ?? 0
      const max = dimension.max ?? 100
      if (max === min) return 0.5
      return Math.max(0, Math.min(1, (numValue - min) / (max - min)))
    } else {
      // For discrete, use option index / total options
      if (dimension.options && dimension.options.length > 0) {
        const optionIndex = dimension.options.findIndex(o => o.value === String(dimValue))
        return optionIndex >= 0 ? (optionIndex + 1) / dimension.options.length : 0
      }
      return 0
    }
  }, [])

  // Draw a single petal
  const drawPetal = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    angle: number,
    length: number,
    color: string,
    alpha: number = 0.7
  ) => {
    const petalWidth = PETAL_CONFIG.petalWidth

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    ctx.beginPath()
    ctx.moveTo(0, 0)

    // Draw petal shape using bezier curves
    const tipX = length
    const tipY = 0
    const controlX = length * 0.6
    const controlY1 = length * Math.sin(petalWidth)
    const controlY2 = -length * Math.sin(petalWidth)

    ctx.bezierCurveTo(controlX, controlY1, tipX, controlY1 * 0.3, tipX, tipY)
    ctx.bezierCurveTo(tipX, controlY2 * 0.3, controlX, controlY2, 0, 0)

    ctx.closePath()

    // Fill with gradient
    const gradient = ctx.createLinearGradient(0, 0, length, 0)
    gradient.addColorStop(0, `${color}40`)
    gradient.addColorStop(0.5, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
    gradient.addColorStop(1, `${color}${Math.round(alpha * 200).toString(16).padStart(2, '0')}`)

    ctx.fillStyle = gradient
    ctx.fill()

    // Stroke
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.restore()
  }, [])

  // Draw center circle
  const drawCenter = useCallback((
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    color: string
  ) => {
    ctx.beginPath()
    ctx.arc(cx, cy, PETAL_CONFIG.centerRadius, 0, Math.PI * 2)

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, PETAL_CONFIG.centerRadius)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.5, color)
    gradient.addColorStop(1, color)

    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()
  }, [])

  // Draw a complete flower for a product
  const drawFlower = useCallback((
    ctx: CanvasRenderingContext2D,
    product: Product,
    cx: number,
    cy: number,
    scale: number = 1
  ) => {
    const vendor = vendors.find(v => v.id === product.vendorId)
    const color = vendor?.color || '#666666'

    if (usableDimensions.length === 0) return

    const angleStep = (Math.PI * 2) / usableDimensions.length

    // Draw petals
    usableDimensions.forEach((dimension, index) => {
      const angle = index * angleStep - Math.PI / 2 // Start from top
      const value = getNormalizedValue(product, dimension)
      const petalLength = (PETAL_CONFIG.baseRadius + value * PETAL_CONFIG.maxPetalLength) * scale

      drawPetal(ctx, cx, cy, angle, petalLength, color)
    })

    // Draw center
    drawCenter(ctx, cx, cy, color)
  }, [vendors, usableDimensions, getNormalizedValue, drawPetal, drawCenter])

  // Main drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    ctx.scale(dpr, dpr)

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height)

    const selectedProducts = products.filter(p => selectedProductIds.includes(p.id))
    if (selectedProducts.length === 0 || usableDimensions.length < 3) return

    const scale = zoom / 100
    const flowerSize = (PETAL_CONFIG.baseRadius + PETAL_CONFIG.maxPetalLength) * 2 * scale
    const padding = 40

    // Calculate layout positions
    const cols = Math.ceil(Math.sqrt(selectedProducts.length))
    const rows = Math.ceil(selectedProducts.length / cols)
    const cellWidth = Math.min((rect.width - padding * 2) / cols, flowerSize + 60)
    const cellHeight = Math.min((rect.height - padding * 2) / rows, flowerSize + 80)

    const startX = (rect.width - cellWidth * cols) / 2 + cellWidth / 2
    const startY = (rect.height - cellHeight * rows) / 2 + cellHeight / 2

    selectedProducts.forEach((product, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const cx = startX + col * cellWidth
      const cy = startY + row * cellHeight - 15 // Offset for label

      drawFlower(ctx, product, cx, cy, scale)

      // Draw product name below
      const vendor = vendors.find(v => v.id === product.vendorId)
      ctx.font = '12px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text') || '#333'
      ctx.fillText(
        product.name.length > 15 ? product.name.slice(0, 15) + '...' : product.name,
        cx,
        cy + (PETAL_CONFIG.baseRadius + PETAL_CONFIG.maxPetalLength) * scale + 20
      )

      // Draw vendor tag
      if (vendor) {
        ctx.font = '10px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = vendor.color
        ctx.fillText(
          vendor.name,
          cx,
          cy + (PETAL_CONFIG.baseRadius + PETAL_CONFIG.maxPetalLength) * scale + 35
        )
      }
    })

    // Draw dimension labels around first flower if only one selected
    if (selectedProducts.length === 1) {
      const cx = rect.width / 2
      const cy = rect.height / 2 - 20
      const labelRadius = (PETAL_CONFIG.baseRadius + PETAL_CONFIG.maxPetalLength + PETAL_CONFIG.labelOffset) * scale

      ctx.font = '11px system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const angleStep = (Math.PI * 2) / usableDimensions.length
      usableDimensions.forEach((dimension, index) => {
        const angle = index * angleStep - Math.PI / 2
        const lx = cx + Math.cos(angle) * labelRadius
        const ly = cy + Math.sin(angle) * labelRadius

        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-secondary') || '#666'
        ctx.fillText(
          dimension.name.length > 10 ? dimension.name.slice(0, 10) + '...' : dimension.name,
          lx,
          ly
        )
      })
    }
  }, [products, selectedProductIds, usableDimensions, vendors, zoom, drawFlower])

  // Redraw on changes
  useEffect(() => {
    draw()

    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  // Handle canvas click
  const handleCanvasClick = useCallback((_e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readonly || !onProductClick) return
    // TODO: Implement hit detection for flower click
  }, [readonly, onProductClick])

  // Handle mouse move for hover
  const handleMouseMove = useCallback((_e: React.MouseEvent<HTMLCanvasElement>) => {
    // TODO: Implement hover detection
  }, [])

  // Product selector options
  const productOptions = useMemo(() => {
    return products.map(p => {
      const vendor = vendors.find(v => v.id === p.vendorId)
      return {
        value: p.id,
        label: `${p.name}${vendor ? ` (${vendor.name})` : ''}`,
      }
    })
  }, [products, vendors])

  // No dimensions
  if (usableDimensions.length < 3) {
    return (
      <div className={styles.container}>
        <Empty
          className={styles.empty}
          description={m.minThreeDimensionsPetal}
        />
      </div>
    )
  }

  // No products
  if (products.length === 0) {
    return (
      <div className={styles.container}>
        <Empty
          className={styles.empty}
          description={m.noProductData}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Select
            className={styles.productSelector}
            mode="multiple"
            placeholder={m.selectCompareProducts}
            value={selectedProductIds}
            onChange={setSelectedProductIds}
            options={productOptions}
            maxTagCount={3}
            size="small"
          />
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.controlGroup}>
            <Tooltip title={m.zoomOut}>
              <Button
                type="text"
                icon={<ZoomOutOutlined />}
                size="small"
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                disabled={zoom <= 50}
              />
            </Tooltip>
            <Slider
              style={{ width: 100 }}
              min={50}
              max={150}
              value={zoom}
              onChange={setZoom}
              tooltip={{ formatter: v => `${v}%` }}
            />
            <Tooltip title={m.zoomIn}>
              <Button
                type="text"
                icon={<ZoomInOutlined />}
                size="small"
                onClick={() => setZoom(z => Math.min(150, z + 10))}
                disabled={zoom >= 150}
              />
            </Tooltip>
          </div>
          <Tooltip title={m.reset}>
            <Button
              type="text"
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => {
                setZoom(100)
                setSelectedProductIds(products.slice(0, Math.min(3, products.length)).map(p => p.id))
              }}
            />
          </Tooltip>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
        />

        {/* Tooltip */}
        {hoveredProduct && (
          <div
            className={styles.tooltip}
            style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}
          >
            <div className={styles.tooltipHeader}>
              {hoveredProduct.name}
            </div>
            <div className={styles.tooltipContent}>
              {usableDimensions.slice(0, 5).map(dim => (
                <div key={dim.id} className={styles.tooltipRow}>
                  <span className={styles.tooltipLabel}>{dim.name}:</span>
                  <span className={styles.tooltipValue}>
                    {Math.round(getNormalizedValue(hoveredProduct, dim) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend - show dimensions */}
      <div className={styles.legendContainer}>
        {usableDimensions.map((dim, index) => {
          // Generate color based on angle
          const hue = (index / usableDimensions.length) * 360
          return (
            <div key={dim.id} className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ backgroundColor: `hsl(${hue}, 60%, 50%)` }}
              />
              <span className={styles.legendLabel}>{dim.name}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
