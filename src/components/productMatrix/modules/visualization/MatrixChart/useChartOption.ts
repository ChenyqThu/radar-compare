/**
 * useChartOption Hook
 * Generates ECharts configuration for MatrixChart
 */

import { useMemo, useCallback } from 'react'
import type {
  EChartsOption,
  CustomSeriesRenderItemParams,
  CustomSeriesRenderItemAPI,
  CustomSeriesRenderItemReturn
} from 'echarts'
import { useConfigStore } from '../../../stores'
import { useI18n } from '@/locales'
import type { Product } from '@/types/productMatrix'
import type { CellPetalNode, EChartsEventParams, AxisConfig } from './types'
import type { MatrixDimension } from '@/types/productMatrix'

/**
 * Format price with unit
 */
function formatPrice(price: number | undefined, unit: string = '$'): string {
  if (price === undefined || price === null) return '-'
  return `${unit}${price.toLocaleString()}`
}

interface UseChartOptionParams {
  chartData: CellPetalNode[]
  xDimension: MatrixDimension | undefined
  yDimension: MatrixDimension | undefined
  getAxisConfig: (dimension: MatrixDimension) => AxisConfig
  hoveredVendorId: string | null
}

interface UseChartOptionReturn {
  option: EChartsOption | null
  renderPetalItem: (
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
  ) => CustomSeriesRenderItemReturn
}

/**
 * Hook for generating ECharts option configuration
 */
export function useChartOption({
  chartData,
  xDimension,
  yDimension,
  getAxisConfig,
  hoveredVendorId
}: UseChartOptionParams): UseChartOptionReturn {
  const { t } = useI18n()
  const m = t.productMatrix
  const { vendors, matrixConfig } = useConfigStore()

  // Custom Series Render function for petals
  const renderPetalItem = useCallback((
    params: CustomSeriesRenderItemParams,
    api: CustomSeriesRenderItemAPI
  ): CustomSeriesRenderItemReturn => {
    const item = chartData[params.dataIndex]
    if (!item) return

    const center = api.coord([item.cellX, item.cellY])
    if (!center) return

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

  // Generate tooltip formatter
  const createTooltipFormatter = useCallback(() => {
    return (params: EChartsEventParams | EChartsEventParams[]) => {
      const p = Array.isArray(params) ? params[0] : params
      if (!p) return ''
      const item = chartData[p.dataIndex]
      if (!item || item.type !== 'petal') return ''

      const vendor = vendors.find(v => v.id === item.vendorId)
      const count = item.products.length
      const avgPrice = Math.round(
        item.products.reduce((s, prod: Product) => s + (prod.price || 0), 0) / count
      )

      const displayLimit = 20
      const displayProducts = item.products.slice(0, displayLimit)
      const remaining = count - displayLimit

      const priceUnits = item.products.map((prod: Product) => prod.priceUnit).filter(Boolean)
      const defaultUnit = priceUnits.length > 0 ? priceUnits[0] : '$'

      const productRows = displayProducts.map((prod: Product) => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; padding: 2px 0; border-bottom: 1px dashed #f0f0f0;">
          <span style="font-size:12px; color:#333; margin-right:8px; max-width: 140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${prod.model || prod.name}">
            ${prod.model || prod.name}
          </span>
          <span style="font-size:12px; font-weight:500; color:#666;">
            ${formatPrice(prod.price, prod.priceUnit || defaultUnit)}
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
    }
  }, [chartData, vendors, m])

  // Build ECharts option
  const option = useMemo<EChartsOption | null>(() => {
    if (!xDimension || !yDimension) return null

    const showTooltip = matrixConfig?.showTooltip ?? true

    return {
      tooltip: {
        show: showTooltip,
        trigger: 'item',
        enterable: true,
        confine: true,
        extraCssText: 'max-height: 300px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;',
        formatter: createTooltipFormatter() as unknown as string
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
          data: chartData,
          animationDurationUpdate: 500,
          animationEasingUpdate: 'cubicOut'
        }
      ]
    }
  }, [xDimension, yDimension, getAxisConfig, chartData, renderPetalItem, matrixConfig, createTooltipFormatter])

  return { option, renderPetalItem }
}
