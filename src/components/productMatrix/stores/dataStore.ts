/**
 * dataStore adapter for product matrix module
 *
 * Provides access to products and filtering operations
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { useRadarStore } from '@/stores/radarStore'
import type { Product, ProductStatus, DimensionValue } from '@/types/productMatrix'

interface ProductFilters {
  vendorIds: string[]
  statuses: ProductStatus[]
  searchText: string
}

interface DataState {
  // Data
  products: Product[]
  chartId: string | null

  // Filters
  filters: ProductFilters
  setFilters: (filters: Partial<ProductFilters>) => void
  resetFilters: () => void
  filteredProducts: Product[]

  // Product operations
  addProduct: (vendorId: string, product?: Partial<Product>) => void
  updateProduct: (id: string, updates: Partial<Product>) => void
  removeProduct: (id: string) => void
  removeProducts: (ids: string[]) => void
  setDimensionValue: (productId: string, dimensionId: string, value: DimensionValue) => void

  // Utility
  getProductById: (id: string) => Product | undefined
  getProductsByVendor: (vendorId: string) => Product[]
  getProductsByStatus: (status: ProductStatus) => Product[]
  getProductCount: () => number
  getProductCountByVendor: (vendorId: string) => number
}

const DEFAULT_FILTERS: ProductFilters = {
  vendorIds: [],
  statuses: [],
  searchText: '',
}

export function useDataStore(): DataState {
  const {
    getActiveProductMatrixChart,
    addMatrixProduct,
    updateMatrixProduct,
    deleteMatrixProduct,
    deleteMatrixProducts,
    setProductDimensionValue,
  } = useRadarStore()

  const chart = getActiveProductMatrixChart()

  // Local filter state
  const [filters, setFiltersState] = useState<ProductFilters>(DEFAULT_FILTERS)

  // Extract data from active chart
  const products = useMemo(() => chart?.products ?? [], [chart?.products])
  const chartId = chart?.id ?? null

  // Track previous chartId to detect changes
  const prevChartIdRef = useRef<string | null>(chartId)

  // Reset filters when switching to a different chart
  useEffect(() => {
    if (prevChartIdRef.current !== chartId && prevChartIdRef.current !== null) {
      // Chart changed, reset filters
      setFiltersState(DEFAULT_FILTERS)
    }
    prevChartIdRef.current = chartId
  }, [chartId])

  // Filtered products
  const filteredProducts = useMemo(() => {
    let result = products

    // Filter by vendor
    if (filters.vendorIds.length > 0) {
      result = result.filter(p => filters.vendorIds.includes(p.vendorId))
    }

    // Filter by status
    if (filters.statuses.length > 0) {
      result = result.filter(p => filters.statuses.includes(p.status))
    }

    // Filter by search text
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.model?.toLowerCase().includes(searchLower) ||
        p.brand?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [products, filters])

  // Filter operations
  const setFilters = useCallback((updates: Partial<ProductFilters>) => {
    setFiltersState(prev => ({ ...prev, ...updates }))
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
  }, [])

  // Product operations
  const addProduct = useCallback((vendorId: string, product?: Partial<Product>) => {
    if (!chartId) return
    addMatrixProduct(chartId, vendorId, product)
  }, [chartId, addMatrixProduct])

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    if (!chartId) return
    updateMatrixProduct(chartId, id, updates)
  }, [chartId, updateMatrixProduct])

  const removeProduct = useCallback((id: string) => {
    if (!chartId) return
    deleteMatrixProduct(chartId, id)
  }, [chartId, deleteMatrixProduct])

  const removeProducts = useCallback((ids: string[]) => {
    if (!chartId) return
    deleteMatrixProducts(chartId, ids)
  }, [chartId, deleteMatrixProducts])

  const setDimensionValue = useCallback((productId: string, dimensionId: string, value: DimensionValue) => {
    if (!chartId) return
    setProductDimensionValue(chartId, productId, dimensionId, value)
  }, [chartId, setProductDimensionValue])

  // Utility
  const getProductById = useCallback((id: string) => {
    return products.find(p => p.id === id)
  }, [products])

  const getProductsByVendor = useCallback((vendorId: string) => {
    return products.filter(p => p.vendorId === vendorId)
  }, [products])

  const getProductsByStatus = useCallback((status: ProductStatus) => {
    return products.filter(p => p.status === status)
  }, [products])

  const getProductCount = useCallback(() => {
    return products.length
  }, [products])

  const getProductCountByVendor = useCallback((vendorId: string) => {
    return products.filter(p => p.vendorId === vendorId).length
  }, [products])

  return {
    products,
    chartId,
    filters,
    setFilters,
    resetFilters,
    filteredProducts,
    addProduct,
    updateProduct,
    removeProduct,
    removeProducts,
    setDimensionValue,
    getProductById,
    getProductsByVendor,
    getProductsByStatus,
    getProductCount,
    getProductCountByVendor,
  }
}
