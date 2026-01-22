/**
 * configStore adapter for product matrix module
 *
 * Provides access to vendors, dimensions, and configuration
 */

import { useMemo, useCallback } from 'react'
import { useRadarStore } from '@/stores/radarStore'
import type {
  MatrixVendor,
  MatrixDimension,
  DimensionOption,
  MatrixConfig,
  PetalConfig,
} from '@/types/productMatrix'

interface ConfigState {
  // Data
  vendors: MatrixVendor[]
  dimensions: MatrixDimension[]
  matrixConfig: MatrixConfig | null
  petalConfig: PetalConfig | null
  chartId: string | null

  // Vendor operations
  addVendor: (vendor?: Partial<MatrixVendor>) => void
  updateVendor: (id: string, updates: Partial<MatrixVendor>) => void
  removeVendor: (id: string) => void
  reorderVendors: (fromIndex: number, toIndex: number) => void

  // Dimension operations
  addDimension: (dimension?: Partial<MatrixDimension>) => void
  updateDimension: (id: string, updates: Partial<MatrixDimension>) => void
  removeDimension: (id: string) => void
  reorderDimensions: (fromIndex: number, toIndex: number) => void

  // Dimension option operations
  addOption: (dimensionId: string, option?: Partial<DimensionOption>) => void
  updateOption: (dimensionId: string, optionId: string, updates: Partial<DimensionOption>) => void
  removeOption: (dimensionId: string, optionId: string) => void
  reorderOptions: (dimensionId: string, fromIndex: number, toIndex: number) => void

  // Config operations
  updateMatrixConfig: (updates: Partial<MatrixConfig>) => void
  updatePetalConfig: (updates: Partial<PetalConfig>) => void
  setAxes: (xAxisId: string | null, yAxisId: string | null) => void
  swapAxes: () => void

  // Utility
  getVendorById: (id: string) => MatrixVendor | undefined
  getDimensionById: (id: string) => MatrixDimension | undefined
}

export function useConfigStore(): ConfigState {
  const {
    getActiveProductMatrixChart,
    addMatrixVendor,
    updateMatrixVendor,
    deleteMatrixVendor,
    reorderMatrixVendors,
    addMatrixDimension,
    updateMatrixDimension,
    deleteMatrixDimension,
    reorderMatrixDimensions,
    addDimensionOption,
    updateDimensionOption,
    deleteDimensionOption,
    reorderDimensionOptions,
    updateMatrixConfig: updateConfig,
    updatePetalConfig: updatePetal,
    setMatrixAxes,
    swapMatrixAxes,
  } = useRadarStore()

  const chart = getActiveProductMatrixChart()

  // Extract data from active chart
  const vendors = useMemo(() => chart?.vendors ?? [], [chart?.vendors])
  const dimensions = useMemo(() => chart?.dimensions ?? [], [chart?.dimensions])
  const matrixConfig = useMemo(() => chart?.matrixConfig ?? null, [chart?.matrixConfig])
  const petalConfig = useMemo(() => chart?.petalConfig ?? null, [chart?.petalConfig])
  const chartId = chart?.id ?? null

  // Vendor operations
  const addVendor = useCallback((vendor?: Partial<MatrixVendor>) => {
    if (!chartId) return
    addMatrixVendor(chartId, vendor)
  }, [chartId, addMatrixVendor])

  const updateVendor = useCallback((id: string, updates: Partial<MatrixVendor>) => {
    if (!chartId) return
    updateMatrixVendor(chartId, id, updates)
  }, [chartId, updateMatrixVendor])

  const removeVendor = useCallback((id: string) => {
    if (!chartId) return
    deleteMatrixVendor(chartId, id)
  }, [chartId, deleteMatrixVendor])

  const reorderVendors = useCallback((fromIndex: number, toIndex: number) => {
    if (!chartId) return
    reorderMatrixVendors(chartId, fromIndex, toIndex)
  }, [chartId, reorderMatrixVendors])

  // Dimension operations
  const addDimension = useCallback((dimension?: Partial<MatrixDimension>) => {
    if (!chartId) return
    addMatrixDimension(chartId, dimension)
  }, [chartId, addMatrixDimension])

  const updateDimension = useCallback((id: string, updates: Partial<MatrixDimension>) => {
    if (!chartId) return
    updateMatrixDimension(chartId, id, updates)
  }, [chartId, updateMatrixDimension])

  const removeDimension = useCallback((id: string) => {
    if (!chartId) return
    deleteMatrixDimension(chartId, id)
  }, [chartId, deleteMatrixDimension])

  const reorderDimensions = useCallback((fromIndex: number, toIndex: number) => {
    if (!chartId) return
    reorderMatrixDimensions(chartId, fromIndex, toIndex)
  }, [chartId, reorderMatrixDimensions])

  // Dimension option operations
  const addOption = useCallback((dimensionId: string, option?: Partial<DimensionOption>) => {
    if (!chartId) return
    addDimensionOption(chartId, dimensionId, option)
  }, [chartId, addDimensionOption])

  const updateOption = useCallback((dimensionId: string, optionId: string, updates: Partial<DimensionOption>) => {
    if (!chartId) return
    updateDimensionOption(chartId, dimensionId, optionId, updates)
  }, [chartId, updateDimensionOption])

  const removeOption = useCallback((dimensionId: string, optionId: string) => {
    if (!chartId) return
    deleteDimensionOption(chartId, dimensionId, optionId)
  }, [chartId, deleteDimensionOption])

  const reorderOptions = useCallback((dimensionId: string, fromIndex: number, toIndex: number) => {
    if (!chartId) return
    reorderDimensionOptions(chartId, dimensionId, fromIndex, toIndex)
  }, [chartId, reorderDimensionOptions])

  // Config operations
  const updateMatrixConfig = useCallback((updates: Partial<MatrixConfig>) => {
    if (!chartId) return
    updateConfig(chartId, updates)
  }, [chartId, updateConfig])

  const updatePetalConfig = useCallback((updates: Partial<PetalConfig>) => {
    if (!chartId) return
    updatePetal(chartId, updates)
  }, [chartId, updatePetal])

  const setAxes = useCallback((xAxisId: string | null, yAxisId: string | null) => {
    if (!chartId) return
    setMatrixAxes(chartId, xAxisId, yAxisId)
  }, [chartId, setMatrixAxes])

  const swapAxes = useCallback(() => {
    if (!chartId) return
    swapMatrixAxes(chartId)
  }, [chartId, swapMatrixAxes])

  // Utility
  const getVendorById = useCallback((id: string) => {
    return vendors.find(v => v.id === id)
  }, [vendors])

  const getDimensionById = useCallback((id: string) => {
    return dimensions.find(d => d.id === id)
  }, [dimensions])

  return {
    vendors,
    dimensions,
    matrixConfig,
    petalConfig,
    chartId,
    addVendor,
    updateVendor,
    removeVendor,
    reorderVendors,
    addDimension,
    updateDimension,
    removeDimension,
    reorderDimensions,
    addOption,
    updateOption,
    removeOption,
    reorderOptions,
    updateMatrixConfig,
    updatePetalConfig,
    setAxes,
    swapAxes,
    getVendorById,
    getDimensionById,
  }
}
