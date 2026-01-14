import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AnyRadarChart } from '@/types'
import type { RadarState } from './types'
import { setStoreRef } from './utils'
import { createProjectActions } from './projectActions'
import { createRadarChartActions } from './radarChartActions'
import { createVendorActions } from './vendorActions'
import { createDimensionActions } from './dimensionActions'
import { createTimelineActions } from './timelineActions'
import { createVersionTimelineActions } from './versionTimelineActions'
import { createManpowerActions } from './manpowerActions'

export type { RadarState, ValidationResult, TimelineData, ProjectListItem } from './types'

export const useRadarStore = create<RadarState>()(
  subscribeWithSelector((set, get) => {
    // Set up store reference for debouncedSave
    setTimeout(() => setStoreRef(useRadarStore), 0)

    const projectActions = createProjectActions(set, get)
    const radarChartActions = createRadarChartActions(set, get)
    const vendorActions = createVendorActions(set, get)
    const dimensionActions = createDimensionActions(set, get)
    const timelineActions = createTimelineActions(set, get)
    const versionTimelineActions = createVersionTimelineActions(set, get)
    const manpowerActions = createManpowerActions(set, get)

    return {
      // Project state - assembled from projects + radar_charts tables
      currentProject: null,

      // Convenience getters for project metadata
      currentProjectId: null,
      currentProjectName: '',

      projectList: [],
      isLoading: true,
      lastSavedAt: null,

      getActiveRadar: (): AnyRadarChart | null => {
        const { currentProject } = get()
        if (!currentProject?.activeRadarId) return null
        return currentProject.radarCharts.find((r) => r.id === currentProject.activeRadarId) ?? null
      },

      // Project actions
      ...projectActions,

      // Radar chart actions
      ...radarChartActions,

      // Vendor actions
      ...vendorActions,

      // Dimension actions
      ...dimensionActions,

      // Timeline actions
      ...timelineActions,

      // Version timeline actions
      ...versionTimelineActions,

      // Manpower actions
      ...manpowerActions,
    }
  })
)
