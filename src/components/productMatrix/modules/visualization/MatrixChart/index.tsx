/**
 * MatrixChart Component
 * Main entry point - orchestrates data processing, chart rendering, and toolbar
 */

import { useState, useRef, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { Empty } from 'antd'
import { useI18n } from '@/locales'
import { useConfigStore } from '../../../stores'
import { useMatrixChartData } from './useMatrixChartData'
import { useChartOption } from './useChartOption'
import { AxisToolbar } from './AxisToolbar'
import type { MatrixChartProps, EChartsEventParams } from './types'
import styles from '../MatrixChart.module.css'

/**
 * MatrixChart - Petal-based product comparison visualization
 * Displays products grouped by two dimensions with petal layout
 */
export function MatrixChart({ readonly, onProductClick }: MatrixChartProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { matrixConfig } = useConfigStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const xAxisDimId = matrixConfig?.xAxisDimensionId || ''
  const yAxisDimId = matrixConfig?.yAxisDimensionId || ''

  // Data processing hook
  const {
    chartData,
    selectableDimensions,
    xDimension,
    yDimension,
    getAxisConfig,
    hiddenVendors,
    toggleVendor,
    hoveredVendorId,
    setHoveredVendorId
  } = useMatrixChartData()

  // Chart option hook
  const { option } = useChartOption({
    chartData,
    xDimension,
    yDimension,
    getAxisConfig,
    hoveredVendorId
  })

  // Chart event handlers
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
  }, [chartData, setHoveredVendorId])

  const handleChartClick = useCallback((params: EChartsEventParams) => {
    if (readonly) return
    const item = chartData[params.dataIndex]
    if (item && item.products.length > 0 && onProductClick) {
      onProductClick(item.products[0])
    }
  }, [readonly, onProductClick, chartData])

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Early return if insufficient dimensions
  if (selectableDimensions.length < 2) {
    return <Empty description={m.minTwoDimensionsMatrix} />
  }

  return (
    <div
      className={`${styles.container} ${isFullscreen ? styles.fullscreen : ''}`}
      ref={containerRef}
    >
      <AxisToolbar
        selectableDimensions={selectableDimensions}
        xAxisDimId={xAxisDimId}
        yAxisDimId={yAxisDimId}
        hiddenVendors={hiddenVendors}
        toggleVendor={toggleVendor}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

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
