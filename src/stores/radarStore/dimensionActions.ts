import { nanoid } from 'nanoid'
import type { Dimension, SubDimension } from '@/types'
import { isRegularRadar } from '@/types'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSave } from './utils'

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
      const updatedRadar = { ...activeRadar, dimensions: [...activeRadar.dimensions, newDimension], updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    updateDimension: (dimensionId: string, updates: Partial<Dimension>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) => (d.id === dimensionId ? { ...d, ...updates } : d)),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteDimension: (dimensionId: string) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.filter((d) => d.id !== dimensionId),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    reorderDimensions: (fromIndex: number, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const dimensions = [...activeRadar.dimensions]
      const [removed] = dimensions.splice(fromIndex, 1)
      dimensions.splice(toIndex, 0, removed)
      dimensions.forEach((d, i) => (d.order = i))
      const updatedRadar = { ...activeRadar, dimensions, updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
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
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) =>
          d.id === dimensionId ? { ...d, subDimensions: [...d.subDimensions, newSubDimension] } : d
        ),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    updateSubDimension: (dimensionId: string, subDimensionId: string, updates: Partial<SubDimension>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) =>
          d.id === dimensionId
            ? { ...d, subDimensions: d.subDimensions.map((sub) => (sub.id === subDimensionId ? { ...sub, ...updates } : sub)) }
            : d
        ),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteSubDimension: (dimensionId: string, subDimensionId: string) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) =>
          d.id === dimensionId ? { ...d, subDimensions: d.subDimensions.filter((sub) => sub.id !== subDimensionId) } : d
        ),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    reorderSubDimensions: (dimensionId: string, fromIndex: number, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const dimension = activeRadar.dimensions.find((d) => d.id === dimensionId)
      if (!dimension) return
      const subDimensions = [...dimension.subDimensions]
      const [removed] = subDimensions.splice(fromIndex, 1)
      subDimensions.splice(toIndex, 0, removed)
      subDimensions.forEach((s, i) => (s.order = i))
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) => (d.id === dimensionId ? { ...d, subDimensions } : d)),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    // 高级拖拽操作
    moveSubToOtherParent: (fromParentId: string, subId: string, toParentId: string, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return

      const fromParent = activeRadar.dimensions.find((d) => d.id === fromParentId)
      const subDim = fromParent?.subDimensions.find((s) => s.id === subId)
      if (!fromParent || !subDim) return

      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) => {
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
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
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

      let newDimensions = activeRadar.dimensions.map((d) => {
        if (d.id === parentId) {
          return { ...d, subDimensions: d.subDimensions.filter((s) => s.id !== subId) }
        }
        return d
      })

      newDimensions.splice(toDimensionIndex, 0, newDimension)
      newDimensions.forEach((d, i) => (d.order = i))

      const updatedRadar = { ...activeRadar, dimensions: newDimensions, updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
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

      let newDimensions = activeRadar.dimensions
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

      const updatedRadar = { ...activeRadar, dimensions: newDimensions, updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    // 分数操作
    setDimensionScore: (dimensionId: string, vendorId: string, score: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const clampedScore = Math.max(0, Math.min(10, Math.round(score)))
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) =>
          d.id === dimensionId ? { ...d, scores: { ...d.scores, [vendorId]: clampedScore } } : d
        ),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    setSubDimensionScore: (dimensionId: string, subDimensionId: string, vendorId: string, score: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const clampedScore = Math.max(0, Math.min(10, Math.round(score)))
      const updatedRadar = {
        ...activeRadar,
        dimensions: activeRadar.dimensions.map((d) =>
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
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },
  }
}
