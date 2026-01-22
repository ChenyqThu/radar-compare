import { idGenerators } from '@/utils/idGenerator'
import type {
  ProductMatrixChart,
  MatrixVendor,
  MatrixDimension,
  DimensionOption,
  Product,
  MatrixConfig,
  PetalConfig,
  DimensionValue,
} from '@/types/productMatrix'
import {
  isProductMatrixChart,
  createDefaultMatrixVendor,
  createDefaultMatrixDimension,
  createDefaultDimensionOption,
  createDefaultProduct,
  createDefaultMatrixConfig,
  createDefaultPetalConfig,
  MATRIX_VENDOR_COLORS,
} from '@/types/productMatrix'
import {
  isSupabaseConfigured,
  createChart,
  deleteChart,
  updateProjectMeta,
} from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSaveChart } from './utils'

export function createProductMatrixActions(set: StoreSetter, get: StoreGetter) {
  // Helper to update chart and trigger save
  const updateAndSaveChart = (
    chartId: string,
    updater: (chart: ProductMatrixChart) => ProductMatrixChart
  ) => {
    const { currentProject } = get()
    if (!currentProject) return null

    const chart = currentProject.radarCharts.find((r) => r.id === chartId)
    if (!chart || !isProductMatrixChart(chart)) return null

    const updatedChart = updater(chart)

    const updated = {
      ...currentProject,
      radarCharts: currentProject.radarCharts.map((r) =>
        r.id === chartId ? updatedChart : r
      ),
    }
    set({ currentProject: updated })
    debouncedSaveChart(updatedChart)

    return updatedChart
  }

  return {
    // ==================== Chart CRUD ====================

    getActiveProductMatrixChart: () => {
      const { currentProject } = get()
      if (!currentProject?.activeRadarId) return null
      const chart = currentProject.radarCharts.find(
        (r) => r.id === currentProject.activeRadarId
      )
      return chart && isProductMatrixChart(chart) ? chart : null
    },

    getProductMatrixChartById: (id: string) => {
      const { currentProject } = get()
      if (!currentProject) return null
      const chart = currentProject.radarCharts.find((r) => r.id === id)
      return chart && isProductMatrixChart(chart) ? chart : null
    },

    addProductMatrixChart: async (name?: string): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return false

      const now = Date.now()
      const existingCount = currentProject.radarCharts.filter(
        isProductMatrixChart
      ).length

      const newChart: ProductMatrixChart = {
        id: idGenerators.productMatrixChart(),
        name: name ?? `产品矩阵 ${existingCount + 1}`,
        order: currentProject.radarCharts.length,
        isProductMatrixChart: true,
        vendors: [],
        dimensions: [],
        products: [],
        matrixConfig: createDefaultMatrixConfig(),
        petalConfig: createDefaultPetalConfig(),
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, newChart)
      if (!success) {
        console.error('[ProductMatrix] Failed to create in database')
        return false
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newChart],
        activeRadarId: newChart.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newChart.id })
      return true
    },

    deleteProductMatrixChart: async (id: string): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const chart = currentProject.radarCharts.find((r) => r.id === id)
      if (!chart || !isProductMatrixChart(chart)) return false

      // Delete from database first
      const success = await deleteChart(id)
      if (!success) {
        console.error('[ProductMatrix] Failed to delete from database')
        return false
      }

      // Find deleted tab index for switching
      const deletedIndex = currentProject.radarCharts.findIndex((r) => r.id === id)
      const newRadars = currentProject.radarCharts.filter((r) => r.id !== id)

      let newActiveId = currentProject.activeRadarId
      if (currentProject.activeRadarId === id) {
        // Prefer previous tab, or current position tab
        const targetIndex = deletedIndex > 0 ? deletedIndex - 1 : 0
        newActiveId = newRadars[targetIndex]?.id ?? null
      }

      const updated = {
        ...currentProject,
        radarCharts: newRadars,
        activeRadarId: newActiveId,
      }
      set({ currentProject: updated })

      // Update active chart id if changed
      if (newActiveId && newActiveId !== currentProject.activeRadarId) {
        await updateProjectMeta(currentProjectId, { activeChartId: newActiveId })
      }
      return true
    },

    renameProductMatrixChart: (id: string, name: string) => {
      updateAndSaveChart(id, (chart) => ({
        ...chart,
        name,
        updatedAt: Date.now(),
      }))
    },

    duplicateProductMatrixChart: async (id: string): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return false

      const source = currentProject.radarCharts.find((r) => r.id === id)
      if (!source || !isProductMatrixChart(source)) return false

      const now = Date.now()
      const newChart: ProductMatrixChart = {
        ...JSON.parse(JSON.stringify(source)),
        id: idGenerators.productMatrixChart(),
        name: `${source.name} (副本)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
        // Generate new IDs for vendors, dimensions, products
        vendors: source.vendors.map((v) => ({
          ...v,
          id: idGenerators.vendor(),
        })),
        dimensions: source.dimensions.map((d) => ({
          ...d,
          id: idGenerators.dimension(),
          options: d.options?.map((o) => ({ ...o, id: idGenerators.option() })),
        })),
        products: source.products.map((p) => ({
          ...p,
          id: idGenerators.product(),
        })),
      }

      // Create in database first
      const success = await createChart(currentProjectId, newChart)
      if (!success) {
        console.error('[ProductMatrix] Failed to duplicate in database')
        return false
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newChart],
        activeRadarId: newChart.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newChart.id })
      return true
    },

    // ==================== Vendor CRUD ====================

    addMatrixVendor: (chartId: string, vendor?: Partial<MatrixVendor>) => {
      updateAndSaveChart(chartId, (chart) => {
        const colorIndex = chart.vendors.length % MATRIX_VENDOR_COLORS.length
        const newVendor = createDefaultMatrixVendor({
          ...vendor,
          color: vendor?.color ?? MATRIX_VENDOR_COLORS[colorIndex],
          order: chart.vendors.length,
        })

        return {
          ...chart,
          vendors: [...chart.vendors, newVendor],
          updatedAt: Date.now(),
        }
      })
    },

    updateMatrixVendor: (
      chartId: string,
      vendorId: string,
      updates: Partial<MatrixVendor>
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        vendors: chart.vendors.map((v) =>
          v.id === vendorId ? { ...v, ...updates } : v
        ),
        updatedAt: Date.now(),
      }))
    },

    deleteMatrixVendor: (chartId: string, vendorId: string) => {
      updateAndSaveChart(chartId, (chart) => {
        // Remove vendor from list
        const newVendors = chart.vendors.filter((v) => v.id !== vendorId)

        // Remove products associated with this vendor
        const newProducts = chart.products.filter((p) => p.vendorId !== vendorId)

        return {
          ...chart,
          vendors: newVendors,
          products: newProducts,
          updatedAt: Date.now(),
        }
      })
    },

    reorderMatrixVendors: (chartId: string, fromIndex: number, toIndex: number) => {
      updateAndSaveChart(chartId, (chart) => {
        const vendors = [...chart.vendors]
        const [removed] = vendors.splice(fromIndex, 1)
        vendors.splice(toIndex, 0, removed)

        // Update order field
        const reorderedVendors = vendors.map((v, index) => ({
          ...v,
          order: index,
        }))

        return {
          ...chart,
          vendors: reorderedVendors,
          updatedAt: Date.now(),
        }
      })
    },

    // ==================== Dimension CRUD ====================

    addMatrixDimension: (chartId: string, dimension?: Partial<MatrixDimension>) => {
      updateAndSaveChart(chartId, (chart) => {
        const newDimension = createDefaultMatrixDimension({
          ...dimension,
          order: chart.dimensions.length,
        })

        return {
          ...chart,
          dimensions: [...chart.dimensions, newDimension],
          updatedAt: Date.now(),
        }
      })
    },

    updateMatrixDimension: (
      chartId: string,
      dimensionId: string,
      updates: Partial<MatrixDimension>
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        dimensions: chart.dimensions.map((d) =>
          d.id === dimensionId ? { ...d, ...updates } : d
        ),
        updatedAt: Date.now(),
      }))
    },

    deleteMatrixDimension: (chartId: string, dimensionId: string) => {
      updateAndSaveChart(chartId, (chart) => {
        // Remove dimension from list
        const newDimensions = chart.dimensions.filter((d) => d.id !== dimensionId)

        // Clear axis reference if deleted dimension was used
        let newMatrixConfig = { ...chart.matrixConfig }
        if (chart.matrixConfig.xAxisDimensionId === dimensionId) {
          newMatrixConfig = { ...newMatrixConfig, xAxisDimensionId: null }
        }
        if (chart.matrixConfig.yAxisDimensionId === dimensionId) {
          newMatrixConfig = { ...newMatrixConfig, yAxisDimensionId: null }
        }

        // Clean up dimension values in products
        const newProducts = chart.products.map((p) => {
          const newDimensionValues = { ...p.dimensionValues }
          delete newDimensionValues[dimensionId]
          return { ...p, dimensionValues: newDimensionValues }
        })

        return {
          ...chart,
          dimensions: newDimensions,
          matrixConfig: newMatrixConfig,
          products: newProducts,
          updatedAt: Date.now(),
        }
      })
    },

    reorderMatrixDimensions: (chartId: string, fromIndex: number, toIndex: number) => {
      updateAndSaveChart(chartId, (chart) => {
        const dimensions = [...chart.dimensions]
        const [removed] = dimensions.splice(fromIndex, 1)
        dimensions.splice(toIndex, 0, removed)

        // Update order field
        const reorderedDimensions = dimensions.map((d, index) => ({
          ...d,
          order: index,
        }))

        return {
          ...chart,
          dimensions: reorderedDimensions,
          updatedAt: Date.now(),
        }
      })
    },

    // ==================== Dimension Option CRUD ====================

    addDimensionOption: (
      chartId: string,
      dimensionId: string,
      option?: Partial<DimensionOption>
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        dimensions: chart.dimensions.map((d) => {
          if (d.id !== dimensionId) return d
          const currentOptions = d.options || []
          const newOption = createDefaultDimensionOption({
            ...option,
            order: currentOptions.length,
          })
          return { ...d, options: [...currentOptions, newOption] }
        }),
        updatedAt: Date.now(),
      }))
    },

    updateDimensionOption: (
      chartId: string,
      dimensionId: string,
      optionId: string,
      updates: Partial<DimensionOption>
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        dimensions: chart.dimensions.map((d) => {
          if (d.id !== dimensionId) return d
          return {
            ...d,
            options: d.options?.map((o) =>
              o.id === optionId ? { ...o, ...updates } : o
            ),
          }
        }),
        updatedAt: Date.now(),
      }))
    },

    deleteDimensionOption: (chartId: string, dimensionId: string, optionId: string) => {
      updateAndSaveChart(chartId, (chart) => {
        // Find the option value before deleting
        const dimension = chart.dimensions.find((d) => d.id === dimensionId)
        const option = dimension?.options?.find((o) => o.id === optionId)
        const deletedValue = option?.value

        return {
          ...chart,
          dimensions: chart.dimensions.map((d) => {
            if (d.id !== dimensionId) return d
            return {
              ...d,
              options: d.options?.filter((o) => o.id !== optionId),
            }
          }),
          // Clear product dimension values that reference deleted option
          products: chart.products.map((p) => {
            if (p.dimensionValues[dimensionId] === deletedValue) {
              const newDimensionValues = { ...p.dimensionValues }
              delete newDimensionValues[dimensionId]
              return { ...p, dimensionValues: newDimensionValues }
            }
            return p
          }),
          updatedAt: Date.now(),
        }
      })
    },

    reorderDimensionOptions: (
      chartId: string,
      dimensionId: string,
      fromIndex: number,
      toIndex: number
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        dimensions: chart.dimensions.map((d) => {
          if (d.id !== dimensionId || !d.options) return d
          const options = [...d.options]
          const [removed] = options.splice(fromIndex, 1)
          options.splice(toIndex, 0, removed)

          return {
            ...d,
            options: options.map((o, index) => ({ ...o, order: index })),
          }
        }),
        updatedAt: Date.now(),
      }))
    },

    // ==================== Product CRUD ====================

    addMatrixProduct: (chartId: string, vendorId: string, product?: Partial<Product>) => {
      updateAndSaveChart(chartId, (chart) => {
        const newProduct = createDefaultProduct(vendorId, product)

        return {
          ...chart,
          products: [...chart.products, newProduct],
          updatedAt: Date.now(),
        }
      })
    },

    updateMatrixProduct: (
      chartId: string,
      productId: string,
      updates: Partial<Product>
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        products: chart.products.map((p) =>
          p.id === productId
            ? { ...p, ...updates, updatedAt: Date.now() }
            : p
        ),
        updatedAt: Date.now(),
      }))
    },

    deleteMatrixProduct: (chartId: string, productId: string) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        products: chart.products.filter((p) => p.id !== productId),
        updatedAt: Date.now(),
      }))
    },

    deleteMatrixProducts: (chartId: string, productIds: string[]) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        products: chart.products.filter((p) => !productIds.includes(p.id)),
        updatedAt: Date.now(),
      }))
    },

    setProductDimensionValue: (
      chartId: string,
      productId: string,
      dimensionId: string,
      value: DimensionValue
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        products: chart.products.map((p) => {
          if (p.id !== productId) return p
          return {
            ...p,
            dimensionValues: { ...p.dimensionValues, [dimensionId]: value },
            updatedAt: Date.now(),
          }
        }),
        updatedAt: Date.now(),
      }))
    },

    // ==================== Matrix Config ====================

    updateMatrixConfig: (chartId: string, updates: Partial<MatrixConfig>) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        matrixConfig: { ...chart.matrixConfig, ...updates },
        updatedAt: Date.now(),
      }))
    },

    setMatrixAxes: (
      chartId: string,
      xAxisDimensionId: string | null,
      yAxisDimensionId: string | null
    ) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        matrixConfig: {
          ...chart.matrixConfig,
          xAxisDimensionId,
          yAxisDimensionId,
        },
        updatedAt: Date.now(),
      }))
    },

    swapMatrixAxes: (chartId: string) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        matrixConfig: {
          ...chart.matrixConfig,
          xAxisDimensionId: chart.matrixConfig.yAxisDimensionId,
          yAxisDimensionId: chart.matrixConfig.xAxisDimensionId,
        },
        updatedAt: Date.now(),
      }))
    },

    // ==================== Petal Config ====================

    updatePetalConfig: (chartId: string, updates: Partial<PetalConfig>) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        petalConfig: { ...chart.petalConfig, ...updates },
        updatedAt: Date.now(),
      }))
    },

    // ==================== Import ====================

    importProductMatrixChart: async (data: ProductMatrixChart): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return false

      const now = Date.now()
      const imported: ProductMatrixChart = {
        ...data,
        id: idGenerators.productMatrixChart(),
        name: `${data.name} (导入)`,
        order: currentProject.radarCharts.length,
        isProductMatrixChart: true,
        vendors: data.vendors.map((v) => ({ ...v, id: idGenerators.vendor() })),
        dimensions: data.dimensions.map((d) => ({
          ...d,
          id: idGenerators.dimension(),
          options: d.options?.map((o) => ({ ...o, id: idGenerators.option() })),
        })),
        products: data.products.map((p) => ({ ...p, id: idGenerators.product() })),
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, imported)
      if (!success) {
        console.error('[ProductMatrix] Failed to import to database')
        return false
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, imported],
        activeRadarId: imported.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: imported.id })
      return true
    },

    importProductsFromData: (
      chartId: string,
      products: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
    ) => {
      updateAndSaveChart(chartId, (chart) => {
        const now = Date.now()
        const newProducts = products.map((p) => ({
          ...p,
          id: idGenerators.product(),
          createdAt: now,
          updatedAt: now,
        }))

        return {
          ...chart,
          products: [...chart.products, ...newProducts],
          updatedAt: now,
        }
      })
    },
  }
}
