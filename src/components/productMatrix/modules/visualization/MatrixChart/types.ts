/**
 * MatrixChart Types
 * Shared type definitions for MatrixChart modules
 */

import type { Product, MatrixDimension, ProductStatus } from '@/types/productMatrix'
import type { PetalNode } from '../petalLayout'

/** ECharts event params for custom series */
export interface EChartsEventParams {
  componentType: string
  seriesType: string
  seriesIndex: number
  dataIndex: number
  type: string
  event?: MouseEvent
}

/** Props for MatrixChart component */
export interface MatrixChartProps {
  readonly?: boolean
  onProductClick?: (product: Product) => void
}

/** Filter state for products */
export interface ProductFilters {
  status: Set<ProductStatus>
  priceRange: number[] | null
  tags: Record<string, Set<string>>
}

/** Extended petal node with cell coordinates */
export interface CellPetalNode extends PetalNode {
  cellX: number
  cellY: number
}

/** Axis configuration for ECharts */
export interface AxisConfig {
  type: 'value' | 'category'
  name: string
  nameLocation: 'middle'
  nameGap: number
  scale?: boolean
  data?: string[]
  splitLine: {
    show: boolean
    lineStyle: { type: string }
  }
  boundaryGap?: boolean
}

/** Return type for useMatrixChartData hook */
export interface MatrixChartData {
  filteredProducts: Product[]
  chartData: CellPetalNode[]
  selectableDimensions: MatrixDimension[]
  xDimension: MatrixDimension | undefined
  yDimension: MatrixDimension | undefined
  getAxisConfig: (dimension: MatrixDimension) => AxisConfig
  hiddenVendors: Set<string>
  toggleVendor: (vendorId: string) => void
  hoveredVendorId: string | null
  setHoveredVendorId: (id: string | null) => void
}
