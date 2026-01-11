import { debounce } from 'lodash-es'
import type { AnyRadarChart } from '@/types'
import { isSupabaseConfigured, updateChart, updateProjectMeta } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import type { RadarState } from './types'

// Store reference for debouncedSave to update lastSavedAt
let storeRef: { setState: (partial: Partial<RadarState>) => void } | null = null

export function setStoreRef(ref: { setState: (partial: Partial<RadarState>) => void }) {
  storeRef = ref
}

/**
 * Debounced save for a single chart
 * This is the primary save method for chart-level storage
 */
export const debouncedSaveChart = debounce(async (chart: AnyRadarChart) => {
  const { shareMode, shareInfo } = useUIStore.getState()
  const user = useAuthStore.getState().user

  // Must be logged in to save
  if (!user) {
    console.warn('[Save] User not authenticated, skipping save')
    return
  }

  // Check if Supabase is configured
  if (!isSupabaseConfigured) {
    console.warn('[Save] Supabase not configured, skipping save')
    return
  }

  // In readonly share mode, don't save
  if (shareMode && shareInfo?.shareType === 'readonly') {
    return
  }

  // Save the chart
  const success = await updateChart(chart)
  if (success && storeRef) {
    storeRef.setState({ lastSavedAt: Date.now() })
  }
  if (!success) {
    console.error('[Save] Failed to save chart:', chart.id)
  }
}, 500)

/**
 * Debounced save for active chart ID
 */
export const debouncedSaveActiveChart = debounce(async (projectId: string, chartId: string) => {
  const user = useAuthStore.getState().user
  if (!user || !isSupabaseConfigured) return

  await updateProjectMeta(projectId, { activeChartId: chartId })
}, 1000)

/**
 * Helper to update project and save the changed chart
 */
export function updateAndSaveChart(
  get: () => RadarState,
  set: (partial: Partial<RadarState>) => void,
  chartId: string,
  updater: (chart: AnyRadarChart) => AnyRadarChart
) {
  const { currentProject } = get()
  if (!currentProject) return

  const chartIndex = currentProject.radarCharts.findIndex(c => c.id === chartId)
  if (chartIndex === -1) return

  const updatedChart = updater(currentProject.radarCharts[chartIndex])
  const updatedCharts = [...currentProject.radarCharts]
  updatedCharts[chartIndex] = updatedChart

  const updatedProject = {
    ...currentProject,
    radarCharts: updatedCharts,
    updatedAt: Date.now(),
  }

  set({ currentProject: updatedProject })
  debouncedSaveChart(updatedChart)
}
