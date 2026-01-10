import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { debounce } from 'lodash-es'
import type { Project, RadarChart, Vendor, Dimension, SubDimension, UUID } from '@/types'
import { PRESET_COLORS, PRESET_MARKERS } from '@/types'
import { db, getAllProjects, getProject, saveProject } from '@/services/db'

interface RadarState {
  currentProject: Project | null
  projectList: Pick<Project, 'id' | 'name'>[]
  isLoading: boolean
  lastSavedAt: number | null

  getActiveRadar: () => RadarChart | null

  // 项目操作
  loadProject: (projectId: UUID) => Promise<void>
  createProject: (name: string) => Promise<UUID>
  deleteProject: (projectId: UUID) => Promise<void>
  renameProject: (projectId: UUID, name: string) => void
  refreshProjectList: () => Promise<void>

  // 雷达图操作
  setActiveRadar: (radarId: UUID) => void
  addRadarChart: (name?: string) => void
  deleteRadarChart: (radarId: UUID) => void
  duplicateRadarChart: (radarId: UUID) => void
  renameRadarChart: (radarId: UUID, name: string) => void
  reorderRadarCharts: (fromIndex: number, toIndex: number) => void

  // Vendor 操作
  addVendor: (vendor?: Partial<Vendor>) => void
  updateVendor: (vendorId: UUID, updates: Partial<Vendor>) => void
  deleteVendor: (vendorId: UUID) => void
  reorderVendors: (fromIndex: number, toIndex: number) => void
  toggleVendorVisibility: (vendorId: UUID) => void

  // 维度操作
  addDimension: (dimension?: Partial<Dimension>) => void
  updateDimension: (dimensionId: UUID, updates: Partial<Dimension>) => void
  deleteDimension: (dimensionId: UUID) => void
  reorderDimensions: (fromIndex: number, toIndex: number) => void

  // 子维度操作
  addSubDimension: (dimensionId: UUID, subDimension?: Partial<SubDimension>) => void
  updateSubDimension: (dimensionId: UUID, subDimensionId: UUID, updates: Partial<SubDimension>) => void
  deleteSubDimension: (dimensionId: UUID, subDimensionId: UUID) => void
  reorderSubDimensions: (dimensionId: UUID, fromIndex: number, toIndex: number) => void

  // 高级拖拽操作
  moveSubToOtherParent: (fromParentId: UUID, subId: UUID, toParentId: UUID, toIndex: number) => void
  promoteSubToDimension: (parentId: UUID, subId: UUID, toDimensionIndex: number) => void
  demoteDimensionToSub: (dimensionId: UUID, toParentId: UUID, toIndex: number) => void

  // 分数操作
  setDimensionScore: (dimensionId: UUID, vendorId: UUID, score: number) => void
  setSubDimensionScore: (dimensionId: UUID, subDimensionId: UUID, vendorId: UUID, score: number) => void

  // 导入
  importRadarChart: (data: RadarChart) => void
}

const debouncedSave = debounce(async (project: Project) => {
  await saveProject(project)
  useRadarStore.setState({ lastSavedAt: Date.now() })
}, 500)

export const useRadarStore = create<RadarState>()(
  subscribeWithSelector((set, get) => ({
    currentProject: null,
    projectList: [],
    isLoading: true,
    lastSavedAt: null,

    getActiveRadar: () => {
      const { currentProject } = get()
      if (!currentProject?.activeRadarId) return null
      return currentProject.radarCharts.find((r) => r.id === currentProject.activeRadarId) ?? null
    },

    refreshProjectList: async () => {
      const list = await getAllProjects()
      set({ projectList: list })
    },

    loadProject: async (projectId) => {
      set({ isLoading: true })
      const project = await getProject(projectId)
      const list = await getAllProjects()
      set({ currentProject: project ?? null, projectList: list, isLoading: false })
    },

    createProject: async (name) => {
      const now = Date.now()
      const radarId = nanoid()
      const newProject: Project = {
        id: nanoid(),
        name,
        description: '',
        radarCharts: [{
          id: radarId,
          name: '竞品对比',
          order: 0,
          dimensions: [],
          vendors: [],
          createdAt: now,
          updatedAt: now,
        }],
        activeRadarId: radarId,
        createdAt: now,
        updatedAt: now,
      }
      await db.projects.add(newProject)
      await get().refreshProjectList()
      return newProject.id
    },

    deleteProject: async (projectId) => {
      await db.projects.delete(projectId)
      const { currentProject } = get()
      if (currentProject?.id === projectId) {
        const list = await getAllProjects()
        if (list.length > 0) {
          await get().loadProject(list[0].id)
        } else {
          set({ currentProject: null, projectList: [] })
        }
      } else {
        await get().refreshProjectList()
      }
    },

    renameProject: (projectId, name) => {
      const { currentProject, projectList } = get()
      if (currentProject?.id === projectId) {
        const updated = { ...currentProject, name }
        set({
          currentProject: updated,
          projectList: projectList.map((p) => (p.id === projectId ? { ...p, name } : p)),
        })
        debouncedSave(updated)
      }
    },

    setActiveRadar: (radarId) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = { ...currentProject, activeRadarId: radarId }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    addRadarChart: (name) => {
      const { currentProject } = get()
      if (!currentProject) return
      const now = Date.now()
      const newRadar: RadarChart = {
        id: nanoid(),
        name: name ?? `对比图 ${currentProject.radarCharts.length + 1}`,
        order: currentProject.radarCharts.length,
        dimensions: [],
        vendors: [],
        createdAt: now,
        updatedAt: now,
      }
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newRadar],
        activeRadarId: newRadar.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteRadarChart: (radarId) => {
      const { currentProject } = get()
      if (!currentProject || currentProject.radarCharts.length <= 1) return
      const newRadars = currentProject.radarCharts.filter((r) => r.id !== radarId)
      const newActiveId = currentProject.activeRadarId === radarId ? newRadars[0]?.id : currentProject.activeRadarId
      const updated = { ...currentProject, radarCharts: newRadars, activeRadarId: newActiveId }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    duplicateRadarChart: (radarId) => {
      const { currentProject } = get()
      if (!currentProject) return
      const source = currentProject.radarCharts.find((r) => r.id === radarId)
      if (!source) return
      const now = Date.now()
      const newRadar: RadarChart = {
        ...JSON.parse(JSON.stringify(source)),
        id: nanoid(),
        name: `${source.name} (副本)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
      }
      const vendorIdMap: Record<string, string> = {}
      newRadar.vendors = newRadar.vendors.map((v) => {
        const newId = nanoid()
        vendorIdMap[v.id] = newId
        return { ...v, id: newId }
      })
      newRadar.dimensions = newRadar.dimensions.map((d) => {
        const newScores: Record<string, number> = {}
        Object.entries(d.scores).forEach(([oldId, score]) => {
          const newId = vendorIdMap[oldId]
          if (newId) newScores[newId] = score
        })
        return {
          ...d,
          id: nanoid(),
          scores: newScores,
          subDimensions: d.subDimensions.map((sub) => {
            const newSubScores: Record<string, number> = {}
            Object.entries(sub.scores).forEach(([oldId, score]) => {
              const newId = vendorIdMap[oldId]
              if (newId) newSubScores[newId] = score
            })
            return { ...sub, id: nanoid(), scores: newSubScores }
          }),
        }
      })
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newRadar],
        activeRadarId: newRadar.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    renameRadarChart: (radarId, name) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === radarId ? { ...r, name, updatedAt: Date.now() } : r
        ),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    reorderRadarCharts: (fromIndex, toIndex) => {
      const { currentProject } = get()
      if (!currentProject) return
      const radars = [...currentProject.radarCharts]
      const [removed] = radars.splice(fromIndex, 1)
      radars.splice(toIndex, 0, removed)
      radars.forEach((r, i) => (r.order = i))
      const updated = { ...currentProject, radarCharts: radars }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    addVendor: (vendor) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
      const usedColors = activeRadar.vendors.map((v) => v.color)
      const availableColor = PRESET_COLORS.find((c) => !usedColors.includes(c)) ?? PRESET_COLORS[0]
      const usedMarkers = activeRadar.vendors.map((v) => v.markerType)
      const availableMarker = PRESET_MARKERS.find((m) => !usedMarkers.includes(m)) ?? PRESET_MARKERS[0]
      const newVendor: Vendor = {
        id: nanoid(),
        name: vendor?.name ?? `Vendor ${activeRadar.vendors.length + 1}`,
        color: vendor?.color ?? availableColor,
        markerType: vendor?.markerType ?? availableMarker,
        order: activeRadar.vendors.length,
        visible: true,
        ...vendor,
      }
      const updatedRadar = { ...activeRadar, vendors: [...activeRadar.vendors, newVendor], updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    updateVendor: (vendorId, updates) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
      const updatedRadar = {
        ...activeRadar,
        vendors: activeRadar.vendors.map((v) => (v.id === vendorId ? { ...v, ...updates } : v)),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteVendor: (vendorId) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
      const updatedRadar = {
        ...activeRadar,
        vendors: activeRadar.vendors.filter((v) => v.id !== vendorId),
        dimensions: activeRadar.dimensions.map((d) => {
          const newScores = { ...d.scores }
          delete newScores[vendorId]
          return {
            ...d,
            scores: newScores,
            subDimensions: d.subDimensions.map((sub) => {
              const newSubScores = { ...sub.scores }
              delete newSubScores[vendorId]
              return { ...sub, scores: newSubScores }
            }),
          }
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

    reorderVendors: (fromIndex, toIndex) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
      const vendors = [...activeRadar.vendors]
      const [removed] = vendors.splice(fromIndex, 1)
      vendors.splice(toIndex, 0, removed)
      vendors.forEach((v, i) => (v.order = i))
      const updatedRadar = { ...activeRadar, vendors, updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    toggleVendorVisibility: (vendorId) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
      const updatedRadar = {
        ...activeRadar,
        vendors: activeRadar.vendors.map((v) => (v.id === vendorId ? { ...v, visible: !v.visible } : v)),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    addDimension: (dimension) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    updateDimension: (dimensionId, updates) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    deleteDimension: (dimensionId) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    reorderDimensions: (fromIndex, toIndex) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    addSubDimension: (dimensionId, subDimension) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    updateSubDimension: (dimensionId, subDimensionId, updates) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    deleteSubDimension: (dimensionId, subDimensionId) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    reorderSubDimensions: (dimensionId, fromIndex, toIndex) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    // 子维度移动到另一个父维度
    moveSubToOtherParent: (fromParentId, subId, toParentId, toIndex) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return

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

    // 子维度提升为主维度
    promoteSubToDimension: (parentId, subId, toDimensionIndex) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return

      const parent = activeRadar.dimensions.find((d) => d.id === parentId)
      const subDim = parent?.subDimensions.find((s) => s.id === subId)
      if (!parent || !subDim) return

      // 将子维度转换为主维度
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

      // 插入到指定位置
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

    // 主维度降级为子维度
    demoteDimensionToSub: (dimensionId, toParentId, toIndex) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
      if (dimensionId === toParentId) return // 不能把自己变成自己的子维度

      const dimension = activeRadar.dimensions.find((d) => d.id === dimensionId)
      if (!dimension) return

      // 如果有子维度，先把它们提升为主维度
      const promotedDimensions: Dimension[] = dimension.subDimensions.map((sub, idx) => ({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        weight: sub.weight,
        order: 0,
        scores: sub.scores,
        subDimensions: [],
      }))

      // 将主维度转换为子维度
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

      // 把原来的子维度加入为主维度
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

    setDimensionScore: (dimensionId, vendorId, score) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    setSubDimensionScore: (dimensionId, subDimensionId, vendorId, score) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar) return
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

    importRadarChart: (data) => {
      const { currentProject } = get()
      if (!currentProject) return
      const now = Date.now()
      const imported: RadarChart = {
        ...data,
        id: nanoid(),
        name: `${data.name} (导入)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
      }
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, imported],
        activeRadarId: imported.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },
  }))
)
