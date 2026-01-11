import { nanoid } from 'nanoid'
import type { RadarChart, TimeMarker, TimelineRadarChart } from '@/types'
import { isTimelineRadar, isRegularRadar } from '@/types'
import type { StoreGetter, StoreSetter, ValidationResult } from './types'
import { debouncedSave } from './utils'

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
      const timeMarker: TimeMarker = month !== undefined ? { year, month } : { year }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => {
          if (r.id === radarId && isRegularRadar(r)) {
            return { ...r, timeMarker, updatedAt: Date.now() }
          }
          return r
        }),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    clearRadarTimeMarker: (radarId: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => {
          if (r.id === radarId && isRegularRadar(r)) {
            const { timeMarker, ...rest } = r
            return { ...rest, updatedAt: Date.now() } as RadarChart
          }
          return r
        }),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
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

    createTimelineRadar: (name: string, sourceRadarIds: string[]): ValidationResult => {
      const { currentProject, validateTimelineConsistency } = get()
      if (!currentProject) {
        return { valid: false, errors: ['timeline.noProject'] }
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

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newTimeline],
        activeRadarId: newTimeline.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)

      return { valid: true, errors: [] }
    },

    deleteTimelineRadar: (timelineId: string) => {
      const { currentProject } = get()
      if (!currentProject) return

      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isTimelineRadar(timeline)) return

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
      debouncedSave(updated)
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

      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => {
          if (r.id === timelineId && isTimelineRadar(r)) {
            return { ...r, sourceRadarIds, updatedAt: Date.now() }
          }
          return r
        }),
      }
      set({ currentProject: updated })
      debouncedSave(updated)

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
