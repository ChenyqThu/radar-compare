import { nanoid } from 'nanoid'
import type { RadarChart, TimeMarker, TimelineRadarChart } from '@/types'
import { isTimelineRadar, isRegularRadar } from '@/types'
import {
  isSupabaseConfigured,
  createChart,
  deleteChart,
  updateProjectMeta,
} from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StoreGetter, StoreSetter, ValidationResult } from './types'
import { debouncedSaveChart } from './utils'

export function createTimelineActions(set: StoreSetter, get: StoreGetter) {
  return {
    getRegularRadars: () => {
      const { currentProject } = get()
      if (!currentProject) return []
      return currentProject.radarCharts.filter(isRegularRadar)
    },

    setRadarTimeMarker: (radarId: string, year: number, month?: number) => {
      const { currentProject } = get()
      if (!currentProject) return

      const chart = currentProject.radarCharts.find((r) => r.id === radarId)
      if (!chart || !isRegularRadar(chart)) return

      const timeMarker: TimeMarker = month !== undefined ? { year, month } : { year }
      const updatedChart = { ...chart, timeMarker, updatedAt: Date.now() }

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === radarId ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    clearRadarTimeMarker: (radarId: string) => {
      const { currentProject } = get()
      if (!currentProject) return

      const chart = currentProject.radarCharts.find((r) => r.id === radarId)
      if (!chart || !isRegularRadar(chart)) return

      const { timeMarker, ...rest } = chart
      const updatedChart = { ...rest, updatedAt: Date.now() } as RadarChart

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === radarId ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)
    },

    validateTimelineConsistency: (sourceRadarIds: string[]): ValidationResult => {
      const { currentProject } = get()
      const errors: string[] = []

      if (!currentProject) {
        return { valid: false, errors: ['timeline.noProject'] }
      }

      if (sourceRadarIds.length < 2) {
        errors.push('timeline.minSourcesRequired')
        return { valid: false, errors }
      }

      const radars = sourceRadarIds
        .map((id) => currentProject.radarCharts.find((r) => r.id === id))
        .filter((r): r is RadarChart => r !== undefined && isRegularRadar(r))

      if (radars.length !== sourceRadarIds.length) {
        errors.push('timeline.invalidSources')
        return { valid: false, errors }
      }

      const missingTimeMarker = radars.filter((r) => !r.timeMarker)
      if (missingTimeMarker.length > 0) {
        errors.push('timeline.missingTimeMarker')
      }

      const firstRadar = radars[0]
      const getDimensionSignature = (r: RadarChart) =>
        r.dimensions
          .map((d) => d.name)
          .sort()
          .join('|')

      const mismatchedDimensions = radars.filter(
        (r) => getDimensionSignature(r) !== getDimensionSignature(firstRadar)
      )
      if (mismatchedDimensions.length > 0) {
        errors.push('timeline.dimensionMismatch')
      }

      const getVendorSignature = (r: RadarChart) =>
        r.vendors
          .map((v) => v.name)
          .sort()
          .join('|')

      const mismatchedVendors = radars.filter(
        (r) => getVendorSignature(r) !== getVendorSignature(firstRadar)
      )
      if (mismatchedVendors.length > 0) {
        errors.push('timeline.vendorMismatch')
      }

      return { valid: errors.length === 0, errors }
    },

    isRadarReferencedByTimeline: (radarId: string) => {
      const { currentProject } = get()
      if (!currentProject) return false
      return currentProject.radarCharts.some(
        (r) => isTimelineRadar(r) && r.sourceRadarIds.includes(radarId)
      )
    },

    createTimelineRadar: async (name: string, sourceRadarIds: string[]): Promise<ValidationResult> => {
      const { currentProject, currentProjectId, validateTimelineConsistency } = get()
      if (!currentProject || !currentProjectId) {
        return { valid: false, errors: ['timeline.noProject'] }
      }

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) {
        return { valid: false, errors: ['timeline.notAuthenticated'] }
      }

      const validation = validateTimelineConsistency(sourceRadarIds)
      if (!validation.valid) {
        return validation
      }

      const now = Date.now()
      const newTimeline: TimelineRadarChart = {
        id: nanoid(),
        name,
        order: currentProject.radarCharts.length,
        isTimeline: true,
        sourceRadarIds,
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, newTimeline)
      if (!success) {
        return { valid: false, errors: ['timeline.createFailed'] }
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newTimeline],
        activeRadarId: newTimeline.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newTimeline.id })

      return { valid: true, errors: [] }
    },

    deleteTimelineRadar: async (timelineId: string) => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return

      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isTimelineRadar(timeline)) return

      // Delete from database first
      const success = await deleteChart(timelineId)
      if (!success) {
        console.error('[Timeline] Failed to delete timeline from database')
        return
      }

      const newRadars = currentProject.radarCharts.filter((r) => r.id !== timelineId)
      const newActiveId =
        currentProject.activeRadarId === timelineId
          ? newRadars[0]?.id ?? null
          : currentProject.activeRadarId

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
    },

    updateTimelineSources: (timelineId: string, sourceRadarIds: string[]): ValidationResult => {
      const { currentProject, validateTimelineConsistency } = get()
      if (!currentProject) {
        return { valid: false, errors: ['timeline.noProject'] }
      }

      const validation = validateTimelineConsistency(sourceRadarIds)
      if (!validation.valid) {
        return validation
      }

      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isTimelineRadar(timeline)) {
        return { valid: false, errors: ['timeline.notFound'] }
      }

      const updatedChart = { ...timeline, sourceRadarIds, updatedAt: Date.now() }

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === timelineId ? updatedChart : r)),
      }
      set({ currentProject: updated })
      debouncedSaveChart(updatedChart)

      return { valid: true, errors: [] }
    },

    getTimelineData: (timelineId: string) => {
      const { currentProject } = get()
      if (!currentProject) return null

      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isTimelineRadar(timeline)) return null

      const sourceRadars = timeline.sourceRadarIds
        .map((id) => currentProject.radarCharts.find((r) => r.id === id))
        .filter((r): r is RadarChart => r !== undefined && isRegularRadar(r) && !!r.timeMarker)
        .sort((a, b) => {
          const aTime = a.timeMarker!.year * 100 + (a.timeMarker!.month ?? 1)
          const bTime = b.timeMarker!.year * 100 + (b.timeMarker!.month ?? 1)
          return aTime - bTime
        })

      if (sourceRadars.length === 0) return null

      const firstRadar = sourceRadars[0]

      return {
        timelineId,
        timePoints: sourceRadars.map((r) => ({
          radarId: r.id,
          timeMarker: r.timeMarker!,
          name: r.name,
        })),
        dimensions: firstRadar.dimensions,
        vendors: firstRadar.vendors,
      }
    },
  }
}
