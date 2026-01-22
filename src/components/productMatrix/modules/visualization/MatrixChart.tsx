import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type {
  EChartsOption,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemReturn
} from 'echarts'
import { Select, Button, Empty, Divider } from 'antd'
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  SwapOutlined
} from '@ant-design/icons'
import { useDataStore, useConfigStore } from '../../stores'
import { useI18n } from '@/locales'
import type { Product, MatrixDimension, ProductStatus } from '@/types/productMatrix'
import { PRODUCT_STATUS_CONFIG, createDefaultPetalConfig } from '@/types/productMatrix'
import styles from './MatrixChart.module.css'
import { calculatePetalLayout, PetalNode } from './petalLayout'

/**
 * Format price with unit
 * @param price - Price value
 * @param unit - Price unit (default: '$')
 * @returns Formatted price string
 */
function formatPrice(price: number | undefined, unit: string = '$'): string {
  if (price === undefined || price === null) return '-'
  return `${unit}${price.toLocaleString()}`
}

/** ECharts event params for custom series */
interface EChartsEventParams {
  componentType: string
  seriesType: string
  seriesIndex: number
  dataIndex: number
  type: string
  event?: MouseEvent
}

interface MatrixChartProps {
  readonly?: boolean
  onProductClick?: (product: Product) => void
}

export function MatrixChart({ readonly, onProductClick }: MatrixChartProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { products } = useDataStore()
  const { vendors, dimensions, matrixConfig, petalConfig, updateMatrixConfig } = useConfigStore()

  const containerRef = useRef<HTMLDivElement>(null)

  const xAxisDimId = matrixConfig?.xAxisDimensionId || ''
  const yAxisDimId = matrixConfig?.yAxisDimensionId || ''

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hiddenVendors, setHiddenVendors] = useState<Set<string>>(new Set())
  const [hoveredVendorId, setHoveredVendorId] = useState<string | null>(null)

  // View Mode: 'petal' vs 'list' (reusing showLabels config or new state?)
  // matrixConfig.showLabels handles text visibility. 
  // Let's assume showLabels=false means Petal View, showLabels=true means List View (or Chips).
  // But plan says "Petal Matrix" is default.
  // Let's use 'cellLayout' = 'petal' (new enum value) vs 'grid'/'stack'.
  // If 'petal', use Petal Layout.

  // Filters State
  // Filters State - Reserved for Toolbar implementation (simplified here for Petal focus)
  const [filters] = useState<{
    status: Set<ProductStatus>,
    priceRange: number[] | null,
    tags: Record<string, Set<string>>
  }>({
    status: new Set(Object.keys(PRODUCT_STATUS_CONFIG) as ProductStatus[]),
    priceRange: null,
    tags: {}
  })

  // Measure chart size for responsiveness if needed
  // ...



  // Get selectable dimensions
  const selectableDimensions = useMemo(() => {
    return dimensions.filter(d => d.type === 'continuous' || (d.options && d.options.length > 0))
  }, [dimensions])

  // Auto-select axes
  useEffect(() => {
    if (selectableDimensions.length >= 2 && (!xAxisDimId || !yAxisDimId)) {
      const updates: Partial<{ xAxisDimensionId: string; yAxisDimensionId: string }> = {}
      if (!xAxisDimId && selectableDimensions[0]) {
        updates.xAxisDimensionId = selectableDimensions[0].id
      }
      if (!yAxisDimId && selectableDimensions[1]) {
        updates.yAxisDimensionId = selectableDimensions[1].id
      }
      if (Object.keys(updates).length > 0) {
        updateMatrixConfig(updates)
      }
    }
  }, [selectableDimensions, xAxisDimId, yAxisDimId, updateMatrixConfig])

  const xDimension = dimensions.find(d => d.id === xAxisDimId)
  const yDimension = dimensions.find(d => d.id === yAxisDimId)

  // Get dimension value helper
  const getDimensionValue = useCallback((product: Product, dimension: MatrixDimension): number => {
    const dimValue = product.dimensionValues[dimension.id]
    if (dimValue === null || dimValue === undefined) return 0

    if (dimension.type === 'continuous') {
      return typeof dimValue === 'number' ? dimValue : parseFloat(String(dimValue)) || 0
    } else {
      if (dimension.options) {
        const optionIndex = dimension.options.findIndex(o => o.value === String(dimValue))
        // Maintain 0-based index for coordinate system
        return optionIndex >= 0 ? optionIndex : 0
      }
      return 0
    }
  }, [])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (hiddenVendors.has(p.vendorId)) return false
      if (!filters.status.has(p.status)) return false
      if (filters.priceRange) {
        const price = p.price ?? 0
        if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false
      }
      for (const [dimId, allowedOptions] of Object.entries(filters.tags)) {
        if (allowedOptions.size === 0) continue
        const val = p.dimensionValues[dimId]
        const valStr = val == null ? '' : String(val)
        if (!allowedOptions.has(valStr)) return false
      }
      return true
    })
  }, [products, hiddenVendors, filters])

  // Axis Config & Counts
  const { getAxisConfig } = useMemo(() => {
    if (!xDimension || !yDimension) return { getAxisConfig: () => ({}) }

    // For Petal Grid, it's best suited for Discrete x Discrete.
    // If Continuous, we rely on ECharts 'value' axis but need to define "Cell size" conceptually?
    // ECharts Custom Series uses data coordinates.
    // If we use discrete, it maps to indices 0, 1, 2... 

    // ECharts Custom Series uses data coordinates.
    // If we use discrete, it maps to indices 0, 1, 2...

    const axisConfigFunc = (dimension: MatrixDimension) => {
      const showGrid = matrixConfig?.showGrid ?? true
      if (dimension.type === 'continuous') {
        return {
          type: 'value' as const,
          name: dimension.name,
          nameLocation: 'middle' as const,
          nameGap: 30,
          scale: true, // Don't start at 0 necessarily
          splitLine: { show: showGrid, lineStyle: { type: 'dashed' } }
        }
      } else {
        return {
          type: 'category' as const,
          name: dimension.name,
          nameLocation: 'middle' as const,
          nameGap: 30,
          data: dimension.options?.map(o => o.label) ?? [],
          splitLine: { show: showGrid, lineStyle: { type: 'dashed' } },
          boundaryGap: true // Important for cells to be centered
        }
      }
    }

    return { getAxisConfig: axisConfigFunc }
  }, [xDimension, yDimension, matrixConfig?.showGrid])

  // Prepare Data for ECharts
  const chartData = useMemo(() => {
    if (!xDimension || !yDimension) return []

    // Group products into cells
    const cells: Record<string, { products: Product[], x: number, y: number }> = {}

    // Collect all unique coordinates
    filteredProducts.forEach(p => {
      const xVal = getDimensionValue(p, xDimension)
      const yVal = getDimensionValue(p, yDimension)
      const key = `${xVal}-${yVal}`

      if (!cells[key]) {
        cells[key] = { products: [], x: xVal, y: yVal }
      }
      cells[key].products.push(p)
    })

    // Calculate Petals for each cell
    const allPetals: Array<PetalNode & { cellX: number, cellY: number }> = []

    Object.values(cells).forEach(cell => {
      // Use store config
      const pConfig = petalConfig || createDefaultPetalConfig()

      const petals = calculatePetalLayout({
        vendors: vendors, // Passed in order
        products: cell.products,
        config: pConfig
      })

      petals.forEach(petal => {
        allPetals.push({
          ...petal,
          cellX: cell.x,
          cellY: cell.y
        })
      })
    })

    return allPetals

  }, [filteredProducts, xDimension, yDimension, getDimensionValue, vendors, petalConfig])

  // Custom Series Render
  // Need to handle coordinate mapping carefully.
  // api.coord([cellX, cellY]) gives pixel center of the cell.

  const renderPetalItem = useCallback((
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
  ): CustomSeriesRenderItemReturn => {
    const item = chartData[params.dataIndex]
    if (!item) return

    const center = api.coord([item.cellX, item.cellY])
    if (!center) return

    // Interaction Logic:
    const isHovered = hoveredVendorId === item.vendorId
    const isAnyHovered = hoveredVendorId !== null

    let opacity = 0.8
    if (isAnyHovered) {
      opacity = isHovered ? 1.0 : 0.1
    }

    return {
      type: 'group',
      x: center[0],
      y: center[1],
      rotation: (item.angle * Math.PI) / 180,
      children: [
        {
          type: 'path',
          shape: {
            pathData: item.path
          },
          style: {
            fill: item.color,
            stroke: isHovered ? '#fff' : 'none',
            lineWidth: isHovered ? 2 : 0,
            opacity: opacity,
            shadowBlur: isHovered ? 10 : 0,
            shadowColor: 'rgba(0,0,0,0.3)'
          }
        }
      ]
    }
  }, [chartData, hoveredVendorId])

  // Chart Events
  const onChartEvent = useCallback((params: EChartsEventParams) => {
    if (params.componentType === 'series' && params.seriesType === 'custom') {
      const item = chartData[params.dataIndex]
      if (item && item.vendorId) {
        if (params.type === 'mouseover') {
          setHoveredVendorId(item.vendorId)
        } else if (params.type === 'mouseout') {
          setHoveredVendorId(null)
        }
      }
    }
  }, [chartData])

  const handleChartClick = useCallback((params: EChartsEventParams) => {
    if (readonly) return
    const item = chartData[params.dataIndex]
    if (item && item.products.length > 0 && onProductClick) {
      onProductClick(item.products[0])
    }
  }, [readonly, onProductClick, chartData])

  // ECharts Option
  const option = useMemo<EChartsOption | null>(() => {
    if (!xDimension || !yDimension) return null

    const showTooltip = matrixConfig?.showTooltip ?? true

    return {
      tooltip: {
        show: showTooltip,
        trigger: 'item',
        enterable: true, // Allow hovering into tooltip to scroll
        confine: true, // Keep inside chart
        extraCssText: 'max-height: 300px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;',
        formatter: ((params: EChartsEventParams | EChartsEventParams[]) => {
          const p = Array.isArray(params) ? params[0] : params
          if (!p) return ''
          const item = chartData[p.dataIndex]
          if (!item || item.type !== 'petal') return ''

          const vendor = vendors.find(v => v.id === item.vendorId)
          const count = item.products.length
          const avgPrice = Math.round(item.products.reduce((s, p) => s + (p.price || 0), 0) / count)

          // Show more products, allow scrolling
          const displayLimit = 20
          const displayProducts = item.products.slice(0, displayLimit)
          const remaining = count - displayLimit

          // Get the most common price unit from products, default to '$'
          const priceUnits = item.products.map(p => p.priceUnit).filter(Boolean)
          const defaultUnit = priceUnits.length > 0 ? priceUnits[0] : '$'

          const productRows = displayProducts.map(p => `
             <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding: 2px 0; border-bottom: 1px dashed #f0f0f0;">
                <span style="font-size:12px; color:#333; margin-right:8px; max-width: 140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.model || p.name}">
                    ${p.model || p.name}
                </span>
                <span style="font-size:12px; font-weight:500; color:#666;">
                    ${formatPrice(p.price, p.priceUnit || defaultUnit)}
                </span>
             </div>
           `).join('')

          return `
             <div style="min-width:200px; padding: 4px;">
               <div style="font-weight:bold; color:${vendor?.color || '#333'}; font-size:14px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">
                 <span>${vendor?.name}</span>
                 <span style="font-size:12px; font-weight:normal; background:#f5f5f5; padding:2px 6px; border-radius:4px;">${count} ${m.itemsCount}</span>
               </div>
               <div style="font-size:12px; color:#888; margin-bottom:8px;">${m.avgPrice}: ${formatPrice(avgPrice, defaultUnit)}</div>
               <div style="max-height: 200px; overflow-y: auto;">
                 ${productRows}
                 ${remaining > 0 ? `<div style="text-align:center; font-size:11px; color:#999; margin-top:4px;">+${remaining} ${m.moreItems}</div>` : ''}
               </div>
             </div>
           `
        }) as unknown as string
      },
      grid: {
        left: 60, right: 40, top: 40, bottom: 60,
        containLabel: true
      },
      xAxis: getAxisConfig(xDimension) as EChartsOption['xAxis'],
      yAxis: getAxisConfig(yDimension) as EChartsOption['yAxis'],
      series: [
        {
          type: 'custom',
          renderItem: renderPetalItem,
          data: chartData, // We pass flattened array of Petals
          animationDurationUpdate: 500,
          animationEasingUpdate: 'cubicOut'
        }
      ]
    }
  }, [xDimension, yDimension, getAxisConfig, chartData, renderPetalItem, matrixConfig, vendors])


  // Handlers ...
  const toggleVendor = useCallback((vendorId: string) => {
    setHiddenVendors(prev => {
      const next = new Set(prev)
      if (next.has(vendorId)) next.delete(vendorId)
      else next.add(vendorId)
      return next
    })
  }, [])

  if (selectableDimensions.length < 2) {
    return <Empty description={m.minTwoDimensionsMatrix} />
  }

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`} ref={containerRef}>
      <div className={styles.toolbar}>
        {/* Axis Selectors ... reuse previous code structure */}
        <div className={styles.axisSelectors}>
          <Select value={xAxisDimId} onChange={v => updateMatrixConfig({ xAxisDimensionId: v })} options={selectableDimensions.map(d => ({ label: d.name, value: d.id }))} size="small" className={styles.axisSelect} />
          <SwapOutlined onClick={() => updateMatrixConfig({ xAxisDimensionId: yAxisDimId, yAxisDimensionId: xAxisDimId })} />
          <Select value={yAxisDimId} onChange={v => updateMatrixConfig({ yAxisDimensionId: v })} options={selectableDimensions.map(d => ({ label: d.name, value: d.id }))} size="small" className={styles.axisSelect} />
          <Divider type="vertical" />
          {/* Legend Toggles */}
          {vendors.map(v => (
            <div key={v.id} onClick={() => toggleVendor(v.id)}
              style={{ opacity: hiddenVendors.has(v.id) ? 0.3 : 1, cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: 8 }}>
              <span style={{ width: 8, height: 8, background: v.color, borderRadius: '50%', marginRight: 4 }}></span>
              <span style={{ fontSize: 12 }}>{v.name}</span>
            </div>
          ))}
        </div>
        <div className={styles.controls}>
          <Button icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} type="text" onClick={() => setIsFullscreen(!isFullscreen)} />
        </div>
      </div>

      {option ? (
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          className={styles.chart}
          onEvents={{
            mouseover: onChartEvent,
            mouseout: onChartEvent,
            click: handleChartClick
          }}
        />
      ) : <Empty />}
    </div>
  )
}

