import { nanoid } from 'nanoid'
import type { Dimension, SubDimension } from '@/types'
import { isRegularRadar } from '@/types'
import type { StoreGetter, StoreSetter } from './types'
import { updateAndSaveChart } from './utils'

export function createDimensionActions(set: StoreSetter, get: StoreGetter) {
  return {
    addDimension: (dimension?: Partial<Dimension>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const newDimension: Dimension = {
        id: nanoid(),
        name: dimension?.name ?? `维度 ${activeRadar.dimensions.length + 1}`,
        description: dimension?.description ?? '',
        weight: dimension?.weight ?? 20,
        order: activeRadar.dimensions.length,
        scores: {},
        subDimensions: [],
        ...dimension,
      }

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return { ...chart, dimensions: [...chart.dimensions, newDimension], updatedAt: Date.now() }
      })
    },

    updateDimension: (dimensionId: string, updates: Partial<Dimension>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) => (d.id === dimensionId ? { ...d, ...updates } : d)),
          updatedAt: Date.now(),
        }
      })
    },

    deleteDimension: (dimensionId: string) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.filter((d) => d.id !== dimensionId),
          updatedAt: Date.now(),
        }
      })
    },

    reorderDimensions: (fromIndex: number, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        const dimensions = [...chart.dimensions]
        const [removed] = dimensions.splice(fromIndex, 1)
        dimensions.splice(toIndex, 0, removed)
        dimensions.forEach((d, i) => (d.order = i))
        return { ...chart, dimensions, updatedAt: Date.now() }
      })
    },

    addSubDimension: (dimensionId: string, subDimension?: Partial<SubDimension>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const dimension = activeRadar.dimensions.find((d) => d.id === dimensionId)
      if (!dimension) return

      const newSubDimension: SubDimension = {
        id: nanoid(),
        name: subDimension?.name ?? `子维度 ${dimension.subDimensions.length + 1}`,
        description: subDimension?.description ?? '',
        weight: subDimension?.weight ?? 50,
        order: dimension.subDimensions.length,
        scores: {},
        ...subDimension,
      }

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) =>
            d.id === dimensionId ? { ...d, subDimensions: [...d.subDimensions, newSubDimension] } : d
          ),
          updatedAt: Date.now(),
        }
      })
    },

    updateSubDimension: (dimensionId: string, subDimensionId: string, updates: Partial<SubDimension>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) =>
            d.id === dimensionId
              ? { ...d, subDimensions: d.subDimensions.map((sub) => (sub.id === subDimensionId ? { ...sub, ...updates } : sub)) }
              : d
          ),
          updatedAt: Date.now(),
        }
      })
    },

    deleteSubDimension: (dimensionId: string, subDimensionId: string) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) =>
            d.id === dimensionId ? { ...d, subDimensions: d.subDimensions.filter((sub) => sub.id !== subDimensionId) } : d
          ),
          updatedAt: Date.now(),
        }
      })
    },

    reorderSubDimensions: (dimensionId: string, fromIndex: number, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const dimension = activeRadar.dimensions.find((d) => d.id === dimensionId)
      if (!dimension) return

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        const dim = chart.dimensions.find((d) => d.id === dimensionId)
        if (!dim) return chart
        const subDimensions = [...dim.subDimensions]
        const [removed] = subDimensions.splice(fromIndex, 1)
        subDimensions.splice(toIndex, 0, removed)
        subDimensions.forEach((s, i) => (s.order = i))
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) => (d.id === dimensionId ? { ...d, subDimensions } : d)),
          updatedAt: Date.now(),
        }
      })
    },

    // Advanced drag operations
    moveSubToOtherParent: (fromParentId: string, subId: string, toParentId: string, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const fromParent = activeRadar.dimensions.find((d) => d.id === fromParentId)
      const subDim = fromParent?.subDimensions.find((s) => s.id === subId)
      if (!fromParent || !subDim) return

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) => {
            if (d.id === fromParentId) {
              return { ...d, subDimensions: d.subDimensions.filter((s) => s.id !== subId) }
            }
            if (d.id === toParentId) {
              const newSubs = [...d.subDimensions]
              newSubs.splice(toIndex, 0, { ...subDim, order: toIndex })
              newSubs.forEach((s, i) => (s.order = i))
              return { ...d, subDimensions: newSubs }
            }
            return d
          }),
          updatedAt: Date.now(),
        }
      })
    },

    promoteSubToDimension: (parentId: string, subId: string, toDimensionIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const parent = activeRadar.dimensions.find((d) => d.id === parentId)
      const subDim = parent?.subDimensions.find((s) => s.id === subId)
      if (!parent || !subDim) return

      const newDimension: Dimension = {
        id: subDim.id,
        name: subDim.name,
        description: subDim.description,
        weight: subDim.weight,
        order: toDimensionIndex,
        scores: subDim.scores,
        subDimensions: [],
      }

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        let newDimensions = chart.dimensions.map((d) => {
          if (d.id === parentId) {
            return { ...d, subDimensions: d.subDimensions.filter((s) => s.id !== subId) }
          }
          return d
        })
        newDimensions.splice(toDimensionIndex, 0, newDimension)
        newDimensions.forEach((d, i) => (d.order = i))
        return { ...chart, dimensions: newDimensions, updatedAt: Date.now() }
      })
    },

    demoteDimensionToSub: (dimensionId: string, toParentId: string, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      if (dimensionId === toParentId) return

      const dimension = activeRadar.dimensions.find((d) => d.id === dimensionId)
      if (!dimension) return

      const promotedDimensions: Dimension[] = dimension.subDimensions.map((sub) => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        weight: sub.weight,
        order: 0,
        scores: sub.scores,
        subDimensions: [],
      }))

      const newSubDimension: SubDimension = {
        id: dimension.id,
        name: dimension.name,
        description: dimension.description,
        weight: dimension.weight,
        order: toIndex,
        scores: dimension.scores,
      }

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        let newDimensions = chart.dimensions
          .filter((d) => d.id !== dimensionId)
          .map((d) => {
            if (d.id === toParentId) {
              const newSubs = [...d.subDimensions]
              newSubs.splice(toIndex, 0, newSubDimension)
              newSubs.forEach((s, i) => (s.order = i))
              return { ...d, subDimensions: newSubs }
            }
            return d
          })

        const parentIndex = newDimensions.findIndex((d) => d.id === toParentId)
        promotedDimensions.forEach((pd, idx) => {
          newDimensions.splice(parentIndex + 1 + idx, 0, pd)
        })
        newDimensions.forEach((d, i) => (d.order = i))

        return { ...chart, dimensions: newDimensions, updatedAt: Date.now() }
      })
    },

    // Score operations
    setDimensionScore: (dimensionId: string, vendorId: string, score: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const clampedScore = Math.max(0, Math.min(10, Math.round(score)))

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) =>
            d.id === dimensionId ? { ...d, scores: { ...d.scores, [vendorId]: clampedScore } } : d
          ),
          updatedAt: Date.now(),
        }
      })
    },

    setSubDimensionScore: (dimensionId: string, subDimensionId: string, vendorId: string, score: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const clampedScore = Math.max(0, Math.min(10, Math.round(score)))

      updateAndSaveChart(get, set, activeRadar.id, (chart) => {
        if (!isRegularRadar(chart)) return chart
        return {
          ...chart,
          dimensions: chart.dimensions.map((d) =>
            d.id === dimensionId
              ? {
                  ...d,
                  subDimensions: d.subDimensions.map((sub) =>
                    sub.id === subDimensionId ? { ...sub, scores: { ...sub.scores, [vendorId]: clampedScore } } : sub
                  ),
                }
              : d
          ),
          updatedAt: Date.now(),
        }
      })
    },
  }
}
