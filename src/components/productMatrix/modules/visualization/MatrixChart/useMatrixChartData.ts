/**
 * useMatrixChartData Hook
 * Handles data processing for MatrixChart: filtering, grouping, and petal layout
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDataStore, useConfigStore } from '../../../stores'
import { PRODUCT_STATUS_CONFIG, createDefaultPetalConfig } from '@/types/productMatrix'
import { calculatePetalLayout } from '../petalLayout'
import type { Product, MatrixDimension, ProductStatus } from '@/types/productMatrix'
import type { ProductFilters, CellPetalNode, AxisConfig, MatrixChartData } from './types'

/**
 * Hook for processing MatrixChart data
 * @returns Processed chart data and helper functions
 */
export function useMatrixChartData(): MatrixChartData {
  const { products } = useDataStore()
  const { vendors, dimensions, matrixConfig, petalConfig, updateMatrixConfig } = useConfigStore()

  const xAxisDimId = matrixConfig?.xAxisDimensionId || ''
  const yAxisDimId = matrixConfig?.yAxisDimensionId || ''

  const [hiddenVendors, setHiddenVendors] = useState<Set<string>>(new Set())
  const [hoveredVendorId, setHoveredVendorId] = useState<string | null>(null)

  // Filters State - Reserved for Toolbar implementation
  const [filters] = useState<ProductFilters>({
    status: new Set(Object.keys(PRODUCT_STATUS_CONFIG) as ProductStatus[]),
    priceRange: null,
    tags: {}
  })

  // Get selectable dimensions (continuous or with options)
  const selectableDimensions = useMemo(() => {
    return dimensions.filter(d => d.type === 'continuous' || (d.options && d.options.length > 0))
  }, [dimensions])

  // Auto-select axes when none selected
  useEffect(() => {
    if (selectableDimensions.length >= 2 && (!xAxisDimId || !yAxisDimId)) {
      const updates: { xAxisDimensionId?: string; yAxisDimensionId?: string } = {}
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
        return optionIndex >= 0 ? optionIndex : 0
      }
      return 0
    }
  }, [])

  // Filter products based on visibility and filters
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

  // Generate axis configuration
  const getAxisConfig = useCallback((dimension: MatrixDimension): AxisConfig => {
    const showGrid = matrixConfig?.showGrid ?? true
    if (dimension.type === 'continuous') {
      return {
        type: 'value' as const,
        name: dimension.name,
        nameLocation: 'middle' as const,
        nameGap: 30,
        scale: true,
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
        boundaryGap: true
      }
    }
  }, [matrixConfig?.showGrid])

  // Calculate petal layout for each cell
  const chartData = useMemo<CellPetalNode[]>(() => {
    if (!xDimension || !yDimension) return []

    // Group products into cells
    const cells: Record<string, { products: Product[], x: number, y: number }> = {}

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
    const allPetals: CellPetalNode[] = []

    Object.values(cells).forEach(cell => {
      const pConfig = petalConfig || createDefaultPetalConfig()

      const petals = calculatePetalLayout({
        vendors: vendors,
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

  // Toggle vendor visibility
  const toggleVendor = useCallback((vendorId: string) => {
    setHiddenVendors(prev => {
      const next = new Set(prev)
      if (next.has(vendorId)) next.delete(vendorId)
      else next.add(vendorId)
      return next
    })
  }, [])

  return {
    filteredProducts,
    chartData,
    selectableDimensions,
    xDimension,
    yDimension,
    getAxisConfig,
    hiddenVendors,
    toggleVendor,
    hoveredVendorId,
    setHoveredVendorId
  }
}
