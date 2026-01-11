import { nanoid } from 'nanoid'
import type { VersionTimeline, VersionEvent, TimelineInfo } from '@/types/versionTimeline'
import { isVersionTimeline } from '@/types/versionTimeline'
import {
  isSupabaseConfigured,
  createChart,
  deleteChart,
  updateProjectMeta,
} from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSaveChart } from './utils'

export function createVersionTimelineActions(set: StoreSetter, get: StoreGetter) {
  return {
    getActiveVersionTimeline: () => {
      const { currentProject } = get()
      if (!currentProject?.activeRadarId) return null
      const chart = currentProject.radarCharts.find((r) => r.id === currentProject.activeRadarId)
      return chart && isVersionTimeline(chart) ? chart : null
    },

    getVersionTimelineById: (id: string) => {
      const { currentProject } = get()
      if (!currentProject) return null
      const chart = currentProject.radarCharts.find((r) => r.id === id)
      return chart && isVersionTimeline(chart) ? chart : null
    },

    addVersionTimeline: async (name?: string) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return

      const now = Date.now()
      const newTimeline: VersionTimeline = {
        id: nanoid(),
        name: name ?? `时间轴 ${currentProject.radarCharts.filter(isVersionTimeline).length + 1}`,
        order: currentProject.radarCharts.length,
        isVersionTimeline: true,
        info: { title: '大事记' },
        events: [],
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, newTimeline)
      if (!success) {
        console.error('[VersionTimeline] Failed to create in database')
        return
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newTimeline],
        activeRadarId: newTimeline.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newTimeline.id })
    },

    deleteVersionTimeline: async (id: string) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const chart = currentProject.radarCharts.find((r) => r.id === id)
      if (!chart || !isVersionTimeline(chart)) return

      // Delete from database first
      const success = await deleteChart(id)
      if (!success) {
        console.error('[VersionTimeline] Failed to delete from database')
        return
      }

      // Find deleted tab index for switching
      const deletedIndex = currentProject.radarCharts.findIndex((r) => r.id === id)
      const newRadars = currentProject.radarCharts.filter((r) => r.id !== id)

      let newActiveId = currentProject.activeRadarId
      if (currentProject.activeRadarId === id) {
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

    renameVersionTimeline: (id: string, name: string) => {
      const { currentProject } = get()
      if (!currentProject) return

      const chart = currentProject.radarCharts.find((r) => r.id === id)
      if (!chart || !isVersionTimeline(chart)) return

      const updatedChart = { ...chart, name, updatedAt: Date.now() }

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === id ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    duplicateVersionTimeline: async (id: string) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return

      const source = currentProject.radarCharts.find((r) => r.id === id)
      if (!source || !isVersionTimeline(source)) return

      const now = Date.now()
      const newTimeline: VersionTimeline = {
        ...JSON.parse(JSON.stringify(source)),
        id: nanoid(),
        name: `${source.name} (副本)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
        events: source.events.map((e) => ({ ...e, id: nanoid() })),
      }

      // Create in database first
      const success = await createChart(currentProjectId, newTimeline)
      if (!success) {
        console.error('[VersionTimeline] Failed to duplicate in database')
        return
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newTimeline],
        activeRadarId: newTimeline.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newTimeline.id })
    },

    updateTimelineInfo: (id: string, info: Partial<TimelineInfo>) => {
      const { currentProject } = get()
      if (!currentProject) return

      const chart = currentProject.radarCharts.find((r) => r.id === id)
      if (!chart || !isVersionTimeline(chart)) return

      const updatedChart = { ...chart, info: { ...chart.info, ...info }, updatedAt: Date.now() }

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === id ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    // Version event operations
    addVersionEvent: (timelineId: string, event?: Partial<VersionEvent>) => {
      const { currentProject } = get()
      if (!currentProject) return

      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isVersionTimeline(timeline)) return

      const newEvent: VersionEvent = {
        id: nanoid(),
        year: event?.year ?? new Date().getFullYear(),
        title: event?.title ?? '新事件',
        description: event?.description,
        type: event?.type ?? 'minor',
        position: 'top',
        highlight: event?.highlight,
        icon: event?.icon,
        order: timeline.events.filter((e) => e.year === (event?.year ?? new Date().getFullYear())).length,
      }

      const updatedChart = { ...timeline, events: [...timeline.events, newEvent], updatedAt: Date.now() }

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === timelineId ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    updateVersionEvent: (timelineId: string, eventId: string, updates: Partial<VersionEvent>) => {
      const { currentProject } = get()
      if (!currentProject) return

      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isVersionTimeline(timeline)) return

      const updatedChart = {
        ...timeline,
        events: timeline.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
        updatedAt: Date.now(),
      }

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === timelineId ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    deleteVersionEvent: (timelineId: string, eventId: string) => {
      const { currentProject } = get()
      if (!currentProject) return

      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isVersionTimeline(timeline)) return

      const updatedChart = {
        ...timeline,
        events: timeline.events.filter((e) => e.id !== eventId),
        updatedAt: Date.now(),
      }

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === timelineId ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    importVersionTimeline: async (data: VersionTimeline) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return

      const now = Date.now()
      const imported: VersionTimeline = {
        ...data,
        id: nanoid(),
        name: `${data.name} (导入)`,
        order: currentProject.radarCharts.length,
        isVersionTimeline: true,
        events: data.events.map((e) => ({ ...e, id: nanoid() })),
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, imported)
      if (!success) {
        console.error('[VersionTimeline] Failed to import to database')
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
  }
}
