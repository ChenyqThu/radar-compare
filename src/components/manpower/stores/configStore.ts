/**
 * configStore adapter for manpower module
 *
 * This adapter provides the same API as the original rd-manpower-tool's configStore,
 * but reads/writes data through radarStore's manpowerActions.
 */

import { useMemo, useCallback } from 'react'
import { useRadarStore } from '@/stores/radarStore'
import type { ManpowerTeam, ManpowerProject, ManpowerTimePoint } from '@/types/manpower'

// Re-export types for compatibility
export type Team = ManpowerTeam
export type Project = ManpowerProject
export type TimePoint = ManpowerTimePoint

interface ConfigState {
  // Data
  teams: Team[]
  projects: Project[]
  timePoints: TimePoint[]

  // Team operations
  addTeam: (team: Omit<Team, 'id'>) => void
  updateTeam: (id: string, updates: Partial<Team>) => void
  removeTeam: (id: string) => void

  // Project operations
  addProject: (project: Omit<Project, 'id'>) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void

  // TimePoint operations
  addTimePoint: (timePoint: Omit<TimePoint, 'id'>) => void
  updateTimePoint: (id: string, updates: Partial<TimePoint>) => void
  removeTimePoint: (id: string) => void

  // Utility methods
  getTeamById: (id: string) => Team | undefined
  getProjectById: (id: string) => Project | undefined
  getTimePointById: (id: string) => TimePoint | undefined
  getTotalCapacity: () => number

  // Reset operations
  resetAll: () => void
  importConfig: (config: { teams: Team[]; projects: Project[]; timePoints: TimePoint[] }) => void
}

/**
 * Hook that provides configStore-compatible API for the manpower module.
 * Reads from and writes to the active ManpowerChart in radarStore.
 */
export function useConfigStore(): ConfigState {
  const {
    getActiveManpowerChart,
    addManpowerTeam,
    updateManpowerTeam,
    deleteManpowerTeam,
    addManpowerProject,
    updateManpowerProject,
    deleteManpowerProject,
    addManpowerTimePoint,
    updateManpowerTimePoint,
    deleteManpowerTimePoint,
  } = useRadarStore()

  const chart = getActiveManpowerChart()

  // Extract data from active chart
  const teams = useMemo(() => chart?.teams ?? [], [chart?.teams])
  const projects = useMemo(() => chart?.projects ?? [], [chart?.projects])
  const timePoints = useMemo(() => chart?.timePoints ?? [], [chart?.timePoints])

  const chartId = chart?.id ?? ''

  // Team operations
  const addTeam = useCallback((team: Omit<Team, 'id'>) => {
    if (!chartId) return
    addManpowerTeam(chartId, team as Partial<Team>)
  }, [chartId, addManpowerTeam])

  const updateTeam = useCallback((id: string, updates: Partial<Team>) => {
    if (!chartId) return
    updateManpowerTeam(chartId, id, updates)
  }, [chartId, updateManpowerTeam])

  const removeTeam = useCallback((id: string) => {
    if (!chartId) return
    deleteManpowerTeam(chartId, id)
  }, [chartId, deleteManpowerTeam])

  // Project operations
  const addProject = useCallback((project: Omit<Project, 'id'>) => {
    if (!chartId) return
    addManpowerProject(chartId, project as Partial<Project>)
  }, [chartId, addManpowerProject])

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    if (!chartId) return
    updateManpowerProject(chartId, id, updates)
  }, [chartId, updateManpowerProject])

  const removeProject = useCallback((id: string) => {
    if (!chartId) return
    deleteManpowerProject(chartId, id)
  }, [chartId, deleteManpowerProject])

  // TimePoint operations
  const addTimePoint = useCallback((timePoint: Omit<TimePoint, 'id'>) => {
    if (!chartId) return
    addManpowerTimePoint(chartId, timePoint as Partial<TimePoint>)
  }, [chartId, addManpowerTimePoint])

  const updateTimePoint = useCallback((id: string, updates: Partial<TimePoint>) => {
    if (!chartId) return
    updateManpowerTimePoint(chartId, id, updates)
  }, [chartId, updateManpowerTimePoint])

  const removeTimePoint = useCallback((id: string) => {
    if (!chartId) return
    deleteManpowerTimePoint(chartId, id)
  }, [chartId, deleteManpowerTimePoint])

  // Utility methods
  const getTeamById = useCallback((id: string) => {
    return teams.find(t => t.id === id)
  }, [teams])

  const getProjectById = useCallback((id: string) => {
    return projects.find(p => p.id === id)
  }, [projects])

  const getTimePointById = useCallback((id: string) => {
    return timePoints.find(tp => tp.id === id)
  }, [timePoints])

  const getTotalCapacity = useCallback(() => {
    return teams.reduce((sum, t) => sum + t.capacity, 0)
  }, [teams])

  // Reset operations (not commonly used in integrated mode)
  const resetAll = useCallback(() => {
    console.warn('[configStore adapter] resetAll is not supported in integrated mode')
  }, [])

  const importConfig = useCallback((_config: { teams: Team[]; projects: Project[]; timePoints: TimePoint[] }) => {
    console.warn('[configStore adapter] importConfig is not supported in integrated mode')
  }, [])

  return {
    teams,
    projects,
    timePoints,
    addTeam,
    updateTeam,
    removeTeam,
    addProject,
    updateProject,
    removeProject,
    addTimePoint,
    updateTimePoint,
    removeTimePoint,
    getTeamById,
    getProjectById,
    getTimePointById,
    getTotalCapacity,
    resetAll,
    importConfig,
  }
}
