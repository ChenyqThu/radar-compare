import { nanoid } from 'nanoid'
import type { RadarChart, AnyRadarChart } from '@/types'
import { isRegularRadar } from '@/types'
import {
  isSupabaseConfigured,
  createChart,
  deleteChart,
  reorderCharts,
  updateProjectMeta,
} from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSaveChart, debouncedSaveActiveChart } from './utils'

export function createRadarChartActions(set: StoreSetter, get: StoreGetter) {
  return {
    setActiveRadar: (radarId: string) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const chart = currentProject.radarCharts.find(c => c.id === radarId)
      if (!chart) return

      const updated = { ...currentProject, activeRadarId: radarId }
      set({ currentProject: updated })
      debouncedSaveActiveChart(currentProjectId, radarId)
    },

    addRadarChart: async (name?: string) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return

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

      // Create in database first
      const success = await createChart(currentProjectId, newRadar)
      if (!success) {
        console.error('[RadarChart] Failed to create chart in database')
        return
      }

      // Update local state
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newRadar],
        activeRadarId: newRadar.id,
      }
      set({ currentProject: updated })

      // Update active chart id in project meta
      await updateProjectMeta(currentProjectId, { activeChartId: newRadar.id })
    },

    deleteRadarChart: async (radarId: string) => {
      const { currentProject, currentProjectId, isRadarReferencedByTimeline } = get()
      if (!currentProject || !currentProjectId) return

      // Check if referenced by timeline
      if (isRadarReferencedByTimeline(radarId)) {
        return // Cannot delete radar referenced by timeline
      }

      // Count regular radars (exclude timelines)
      const regularRadars = currentProject.radarCharts.filter(isRegularRadar)
      if (regularRadars.length <= 1 && regularRadars.some((r) => r.id === radarId)) {
        return // Keep at least one regular radar
      }

      // Delete from database first
      const success = await deleteChart(radarId)
      if (!success) {
        console.error('[RadarChart] Failed to delete chart from database')
        return
      }

      // Find deleted tab index for switching
      const deletedIndex = currentProject.radarCharts.findIndex((r) => r.id === radarId)
      const newRadars = currentProject.radarCharts.filter((r) => r.id !== radarId)

      let newActiveId = currentProject.activeRadarId
      if (currentProject.activeRadarId === radarId) {
        // Prefer previous tab, or current position tab (originally next)
        const targetIndex = deletedIndex > 0 ? deletedIndex - 1 : 0
        newActiveId = newRadars[targetIndex]?.id ?? null
      }

      const updated = { ...currentProject, radarCharts: newRadars, activeRadarId: newActiveId }
      set({ currentProject: updated })

      // Update active chart id if changed
      if (newActiveId && newActiveId !== currentProject.activeRadarId) {
        await updateProjectMeta(currentProjectId, { activeChartId: newActiveId })
      }
    },

    duplicateRadarChart: async (radarId: string) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return

      const source = currentProject.radarCharts.find((r) => r.id === radarId)
      if (!source) return

      const now = Date.now()
      const newRadar: AnyRadarChart = {
        ...JSON.parse(JSON.stringify(source)),
        id: nanoid(),
        name: `${source.name} (副本)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
      }

      // Regenerate IDs for vendors and update score references
      if (isRegularRadar(newRadar)) {
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
      }

      // Create in database first
      const success = await createChart(currentProjectId, newRadar)
      if (!success) {
        console.error('[RadarChart] Failed to duplicate chart in database')
        return
      }

      // Update local state
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newRadar],
        activeRadarId: newRadar.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newRadar.id })
    },

    renameRadarChart: (radarId: string, name: string) => {
      const { currentProject } = get()
      if (!currentProject) return

      const chart = currentProject.radarCharts.find(c => c.id === radarId)
      if (!chart) return

      const updatedChart = { ...chart, name, updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === radarId ? updatedChart : r
        ),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    reorderRadarCharts: (fromIndex: number, toIndex: number) => {
      const { currentProject } = get()
      if (!currentProject) return

      const radars = [...currentProject.radarCharts]
      const [removed] = radars.splice(fromIndex, 1)
      radars.splice(toIndex, 0, removed)
      radars.forEach((r, i) => (r.order = i))

      const updated = { ...currentProject, radarCharts: radars }
      set({ currentProject: updated })

      // Batch update order in database
      const orderUpdates = radars.map(r => ({ id: r.id, orderIndex: r.order }))
      reorderCharts(orderUpdates)
    },

    importRadarChart: async (data: RadarChart) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return

      const now = Date.now()
      const imported: RadarChart = {
        ...data,
        id: nanoid(),
        name: `${data.name} (导入)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, imported)
      if (!success) {
        console.error('[RadarChart] Failed to import chart to database')
        return
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, imported],
        activeRadarId: imported.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: imported.id })
    },

    importMultipleRadarCharts: async (data: RadarChart[]) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId || data.length === 0) return

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return

      const now = Date.now()
      const importedRadars: RadarChart[] = data.map((radar, idx) => ({
        ...radar,
        id: nanoid(),
        name: radar.name,
        order: currentProject.radarCharts.length + idx,
        createdAt: now,
        updatedAt: now,
      }))

      // Create all charts in database
      for (const chart of importedRadars) {
        const success = await createChart(currentProjectId, chart)
        if (!success) {
          console.error('[RadarChart] Failed to import chart:', chart.name)
        }
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, ...importedRadars],
        activeRadarId: importedRadars[0].id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: importedRadars[0].id })
    },
  }
}
