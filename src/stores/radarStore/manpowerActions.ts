import { idGenerators, generateId } from '@/utils/idGenerator'
import type {
  ManpowerChart,
  ManpowerTeam,
  ManpowerProject,
  ManpowerTimePoint,
  AllocationEntry,
  ManpowerValidationResult,
  ManpowerValidationError,
  ManpowerValidationWarning,
  TeamUtilization,
  ManpowerStatistics,
} from '@/types/manpower'
import {
  isManpowerChart,
  createDefaultTeam,
  createDefaultProject,
  createDefaultTimePoint,
  createDefaultAllocationEntry,
  MANPOWER_TEAM_COLORS,
  MANPOWER_PROJECT_COLORS,
} from '@/types/manpower'
import {
  isSupabaseConfigured,
  createChart,
  deleteChart,
  updateProjectMeta,
} from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSaveChart } from './utils'

export function createManpowerActions(set: StoreSetter, get: StoreGetter) {
  // Helper to update chart and trigger save
  const updateAndSaveChart = (chartId: string, updater: (chart: ManpowerChart) => ManpowerChart) => {
    const { currentProject } = get()
    if (!currentProject) return null

    const chart = currentProject.radarCharts.find((r) => r.id === chartId)
    if (!chart || !isManpowerChart(chart)) return null

    const updatedChart = updater(chart)

    const updated = {
      ...currentProject,
      radarCharts: currentProject.radarCharts.map((r) => (r.id === chartId ? updatedChart : r)),
    }
    set({ currentProject: updated })
    debouncedSaveChart(updatedChart)

    return updatedChart
  }

  return {
    // ==================== Chart CRUD ====================

    getActiveManpowerChart: () => {
      const { currentProject } = get()
      if (!currentProject?.activeRadarId) return null
      const chart = currentProject.radarCharts.find((r) => r.id === currentProject.activeRadarId)
      return chart && isManpowerChart(chart) ? chart : null
    },

    getManpowerChartById: (id: string) => {
      const { currentProject } = get()
      if (!currentProject) return null
      const chart = currentProject.radarCharts.find((r) => r.id === id)
      return chart && isManpowerChart(chart) ? chart : null
    },

    addManpowerChart: async (name?: string): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return false

      const now = Date.now()
      const existingCount = currentProject.radarCharts.filter(isManpowerChart).length

      const newChart: ManpowerChart = {
        id: idGenerators.manpowerChart(),
        name: name ?? `人力排布 ${existingCount + 1}`,
        order: currentProject.radarCharts.length,
        isManpowerChart: true,
        metadata: {
          title: '研发人力排布',
          version: '1.0.0',
          totalPersons: 0,
        },
        teams: [],
        projects: [],
        timePoints: [],
        allocations: {},
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, newChart)
      if (!success) {
        console.error('[Manpower] Failed to create in database')
        return false
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newChart],
        activeRadarId: newChart.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newChart.id })
      return true
    },

    deleteManpowerChart: async (id: string): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const chart = currentProject.radarCharts.find((r) => r.id === id)
      if (!chart || !isManpowerChart(chart)) return false

      // Delete from database first
      const success = await deleteChart(id)
      if (!success) {
        console.error('[Manpower] Failed to delete from database')
        return false
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
      return true
    },

    renameManpowerChart: (id: string, name: string) => {
      updateAndSaveChart(id, (chart) => ({
        ...chart,
        name,
        updatedAt: Date.now(),
      }))
    },

    duplicateManpowerChart: async (id: string): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return false

      const source = currentProject.radarCharts.find((r) => r.id === id)
      if (!source || !isManpowerChart(source)) return false

      const now = Date.now()
      const newChart: ManpowerChart = {
        ...JSON.parse(JSON.stringify(source)),
        id: idGenerators.manpowerChart(),
        name: `${source.name} (副本)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
        // Generate new IDs for teams, projects, timePoints
        teams: source.teams.map((t) => ({ ...t, id: idGenerators.team() })),
        projects: source.projects.map((p) => ({ ...p, id: idGenerators.project() })),
        timePoints: source.timePoints.map((tp) => ({ ...tp, id: idGenerators.timePoint() })),
      }

      // Create in database first
      const success = await createChart(currentProjectId, newChart)
      if (!success) {
        console.error('[Manpower] Failed to duplicate in database')
        return false
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newChart],
        activeRadarId: newChart.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: newChart.id })
      return true
    },

    // ==================== Team CRUD ====================

    addManpowerTeam: (chartId: string, team?: Partial<ManpowerTeam>) => {
      updateAndSaveChart(chartId, (chart) => {
        const colorIndex = chart.teams.length % MANPOWER_TEAM_COLORS.length
        const newTeam = createDefaultTeam({
          ...team,
          color: team?.color ?? MANPOWER_TEAM_COLORS[colorIndex],
        })

        return {
          ...chart,
          teams: [...chart.teams, newTeam],
          updatedAt: Date.now(),
        }
      })
    },

    updateManpowerTeam: (chartId: string, teamId: string, updates: Partial<ManpowerTeam>) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        teams: chart.teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t)),
        updatedAt: Date.now(),
      }))
    },

    deleteManpowerTeam: (chartId: string, teamId: string) => {
      updateAndSaveChart(chartId, (chart) => {
        // Remove team from list
        const newTeams = chart.teams.filter((t) => t.id !== teamId)

        // Clean up allocations referencing this team
        const newAllocations = { ...chart.allocations }
        for (const tpId of Object.keys(newAllocations)) {
          for (const projId of Object.keys(newAllocations[tpId] || {})) {
            if (newAllocations[tpId][projId]?.[teamId]) {
              delete newAllocations[tpId][projId][teamId]
            }
          }
        }

        return {
          ...chart,
          teams: newTeams,
          allocations: newAllocations,
          updatedAt: Date.now(),
        }
      })
    },

    reorderManpowerTeams: (chartId: string, fromIndex: number, toIndex: number) => {
      updateAndSaveChart(chartId, (chart) => {
        const teams = [...chart.teams]
        const [removed] = teams.splice(fromIndex, 1)
        teams.splice(toIndex, 0, removed)

        return {
          ...chart,
          teams,
          updatedAt: Date.now(),
        }
      })
    },

    // ==================== Project CRUD ====================

    addManpowerProject: (chartId: string, project?: Partial<ManpowerProject>) => {
      updateAndSaveChart(chartId, (chart) => {
        const colorIndex = chart.projects.length % MANPOWER_PROJECT_COLORS.length
        const newProject = createDefaultProject({
          ...project,
          color: project?.color ?? MANPOWER_PROJECT_COLORS[colorIndex],
        })

        return {
          ...chart,
          projects: [...chart.projects, newProject],
          updatedAt: Date.now(),
        }
      })
    },

    updateManpowerProject: (chartId: string, projectId: string, updates: Partial<ManpowerProject>) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        projects: chart.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p)),
        updatedAt: Date.now(),
      }))
    },

    deleteManpowerProject: (chartId: string, projectId: string) => {
      updateAndSaveChart(chartId, (chart) => {
        // Remove project from list
        const newProjects = chart.projects.filter((p) => p.id !== projectId)

        // Clean up allocations referencing this project
        const newAllocations = { ...chart.allocations }
        for (const tpId of Object.keys(newAllocations)) {
          if (newAllocations[tpId]?.[projectId]) {
            delete newAllocations[tpId][projectId]
          }
        }

        return {
          ...chart,
          projects: newProjects,
          allocations: newAllocations,
          updatedAt: Date.now(),
        }
      })
    },

    reorderManpowerProjects: (chartId: string, fromIndex: number, toIndex: number) => {
      updateAndSaveChart(chartId, (chart) => {
        const projects = [...chart.projects]
        const [removed] = projects.splice(fromIndex, 1)
        projects.splice(toIndex, 0, removed)

        return {
          ...chart,
          projects,
          updatedAt: Date.now(),
        }
      })
    },

    // ==================== TimePoint CRUD ====================

    addManpowerTimePoint: (chartId: string, timePoint?: Partial<ManpowerTimePoint>) => {
      updateAndSaveChart(chartId, (chart) => {
        const newTimePoint = createDefaultTimePoint(timePoint)

        return {
          ...chart,
          timePoints: [...chart.timePoints, newTimePoint],
          updatedAt: Date.now(),
        }
      })
    },

    updateManpowerTimePoint: (chartId: string, timePointId: string, updates: Partial<ManpowerTimePoint>) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        timePoints: chart.timePoints.map((tp) => (tp.id === timePointId ? { ...tp, ...updates } : tp)),
        updatedAt: Date.now(),
      }))
    },

    deleteManpowerTimePoint: (chartId: string, timePointId: string) => {
      updateAndSaveChart(chartId, (chart) => {
        // Remove time point from list
        const newTimePoints = chart.timePoints.filter((tp) => tp.id !== timePointId)

        // Clean up allocations referencing this time point
        const newAllocations = { ...chart.allocations }
        delete newAllocations[timePointId]

        return {
          ...chart,
          timePoints: newTimePoints,
          allocations: newAllocations,
          updatedAt: Date.now(),
        }
      })
    },

    reorderManpowerTimePoints: (chartId: string, fromIndex: number, toIndex: number) => {
      updateAndSaveChart(chartId, (chart) => {
        const timePoints = [...chart.timePoints]
        const [removed] = timePoints.splice(fromIndex, 1)
        timePoints.splice(toIndex, 0, removed)

        return {
          ...chart,
          timePoints,
          updatedAt: Date.now(),
        }
      })
    },

    // ==================== Allocation Operations ====================

    updateAllocation: (
      chartId: string,
      timePointId: string,
      projectId: string,
      teamId: string,
      data: Partial<AllocationEntry>
    ) => {
      updateAndSaveChart(chartId, (chart) => {
        const newAllocations = { ...chart.allocations }

        // Ensure nested structure exists
        if (!newAllocations[timePointId]) {
          newAllocations[timePointId] = {}
        }
        if (!newAllocations[timePointId][projectId]) {
          newAllocations[timePointId][projectId] = {}
        }

        const current = newAllocations[timePointId][projectId][teamId] || createDefaultAllocationEntry()
        newAllocations[timePointId][projectId][teamId] = {
          ...current,
          ...data,
        }

        // Update total persons in metadata
        const totalPersons = calculateTotalPersons(chart.teams)

        return {
          ...chart,
          allocations: newAllocations,
          metadata: { ...chart.metadata, totalPersons },
          updatedAt: Date.now(),
        }
      })
    },

    updateMultipleAllocations: (
      chartId: string,
      updates: Array<{
        timePointId: string
        projectId: string
        teamId: string
        data: Partial<AllocationEntry>
      }>
    ) => {
      updateAndSaveChart(chartId, (chart) => {
        const newAllocations = { ...chart.allocations }

        for (const update of updates) {
          const { timePointId, projectId, teamId, data } = update

          if (!newAllocations[timePointId]) {
            newAllocations[timePointId] = {}
          }
          if (!newAllocations[timePointId][projectId]) {
            newAllocations[timePointId][projectId] = {}
          }

          const current = newAllocations[timePointId][projectId][teamId] || createDefaultAllocationEntry()
          newAllocations[timePointId][projectId][teamId] = {
            ...current,
            ...data,
          }
        }

        const totalPersons = calculateTotalPersons(chart.teams)

        return {
          ...chart,
          allocations: newAllocations,
          metadata: { ...chart.metadata, totalPersons },
          updatedAt: Date.now(),
        }
      })
    },

    resetAllocations: (chartId: string) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        allocations: {},
        updatedAt: Date.now(),
      }))
    },

    // Auto calculate pre-release based on adjacent time points
    autoCalculatePrerelease: (chartId: string) => {
      updateAndSaveChart(chartId, (chart) => {
        const { timePoints, allocations, projects, teams } = chart
        if (timePoints.length < 2) return chart

        const newAllocations = JSON.parse(JSON.stringify(allocations))

        // Sort time points by date
        const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date))

        // For each time point (except the last one)
        for (let i = 0; i < sortedTimePoints.length - 1; i++) {
          const currentTp = sortedTimePoints[i]
          const nextTp = sortedTimePoints[i + 1]

          // For each project
          for (const project of projects) {
            // For each team
            for (const team of teams) {
              const currentOccupied = newAllocations[currentTp.id]?.[project.id]?.[team.id]?.occupied || 0
              const nextOccupied = newAllocations[nextTp.id]?.[project.id]?.[team.id]?.occupied || 0

              // Pre-release = current occupied - next occupied (if positive)
              const prerelease = Math.max(0, currentOccupied - nextOccupied)

              // Ensure structure exists
              if (!newAllocations[currentTp.id]) {
                newAllocations[currentTp.id] = {}
              }
              if (!newAllocations[currentTp.id][project.id]) {
                newAllocations[currentTp.id][project.id] = {}
              }
              if (!newAllocations[currentTp.id][project.id][team.id]) {
                newAllocations[currentTp.id][project.id][team.id] = { occupied: currentOccupied, prerelease: 0 }
              }

              newAllocations[currentTp.id][project.id][team.id].prerelease = prerelease
            }
          }
        }

        return {
          ...chart,
          allocations: newAllocations,
          updatedAt: Date.now(),
        }
      })
    },

    // ==================== Validation ====================

    validateManpowerChart: (chartId: string): ManpowerValidationResult => {
      const { currentProject } = get()
      if (!currentProject) {
        return { isValid: true, errors: [], warnings: [] }
      }

      const chart = currentProject.radarCharts.find((r) => r.id === chartId)
      if (!chart || !isManpowerChart(chart)) {
        return { isValid: true, errors: [], warnings: [] }
      }

      const errors: ManpowerValidationError[] = []
      const warnings: ManpowerValidationWarning[] = []

      const { teams, projects, timePoints, allocations } = chart

      // Check for team overallocation at each time point
      for (const tp of timePoints) {
        for (const team of teams) {
          let totalAllocated = 0

          for (const project of projects) {
            const allocation = allocations[tp.id]?.[project.id]?.[team.id]
            if (allocation) {
              totalAllocated += allocation.occupied
            }
          }

          const utilizationRate = team.capacity > 0 ? (totalAllocated / team.capacity) * 100 : 0

          if (totalAllocated > team.capacity) {
            errors.push({
              id: idGenerators.chart(),
              type: 'team_overallocation',
              message: `${team.name} 在 ${tp.name} 超配`,
              details: {
                teamId: team.id,
                timePointId: tp.id,
                expected: team.capacity,
                actual: totalAllocated,
              },
            })
          } else if (utilizationRate > 90 && utilizationRate <= 100) {
            warnings.push({
              id: idGenerators.chart(),
              type: 'capacity_warning',
              message: `${team.name} 在 ${tp.name} 接近满载 (${utilizationRate.toFixed(0)}%)`,
              severity: 'medium',
              details: {
                teamId: team.id,
                timePointId: tp.id,
                value: utilizationRate,
                threshold: 90,
              },
            })
          } else if (utilizationRate < 50 && totalAllocated > 0) {
            warnings.push({
              id: generateId('warning'),
              type: 'resource_inefficiency',
              message: `${team.name} 在 ${tp.name} 利用率较低 (${utilizationRate.toFixed(0)}%)`,
              severity: 'low',
              details: {
                teamId: team.id,
                timePointId: tp.id,
                value: utilizationRate,
                threshold: 50,
              },
            })
          }
        }
      }

      // Check for prerelease exceeding occupied
      for (const tp of timePoints) {
        for (const project of projects) {
          for (const team of teams) {
            const allocation = allocations[tp.id]?.[project.id]?.[team.id]
            if (allocation && allocation.prerelease > allocation.occupied) {
              warnings.push({
                id: generateId('warning'),
                type: 'prerelease_exceeds',
                message: `${team.name} 在 ${project.name}/${tp.name} 预释放超过投入`,
                severity: 'high',
                details: {
                  teamId: team.id,
                  projectId: project.id,
                  timePointId: tp.id,
                },
              })
            }
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      }
    },

    // ==================== Statistics ====================

    getTeamUtilization: (chartId: string, teamId: string, timePointId: string): TeamUtilization | null => {
      const { currentProject } = get()
      if (!currentProject) return null

      const chart = currentProject.radarCharts.find((r) => r.id === chartId)
      if (!chart || !isManpowerChart(chart)) return null

      const team = chart.teams.find((t) => t.id === teamId)
      if (!team) return null

      let allocated = 0
      for (const project of chart.projects) {
        const allocation = chart.allocations[timePointId]?.[project.id]?.[teamId]
        if (allocation) {
          allocated += allocation.occupied
        }
      }

      return {
        teamId: team.id,
        teamName: team.name,
        capacity: team.capacity,
        allocated,
        utilizationRate: team.capacity > 0 ? (allocated / team.capacity) * 100 : 0,
        isOverallocated: allocated > team.capacity,
      }
    },

    getManpowerStatistics: (chartId: string): ManpowerStatistics | null => {
      const { currentProject } = get()
      if (!currentProject) return null

      const chart = currentProject.radarCharts.find((r) => r.id === chartId)
      if (!chart || !isManpowerChart(chart)) return null

      const { teams, projects, timePoints, allocations } = chart

      const totalPersons = teams.reduce((sum, t) => sum + t.capacity, 0)
      const timePointStats = timePoints.map((tp) => {
        const teamUtilizations: TeamUtilization[] = teams.map((team) => {
          let allocated = 0
          for (const project of projects) {
            const allocation = allocations[tp.id]?.[project.id]?.[team.id]
            if (allocation) {
              allocated += allocation.occupied
            }
          }
          return {
            teamId: team.id,
            teamName: team.name,
            capacity: team.capacity,
            allocated,
            utilizationRate: team.capacity > 0 ? (allocated / team.capacity) * 100 : 0,
            isOverallocated: allocated > team.capacity,
          }
        })

        const totalAllocated = teamUtilizations.reduce((sum, tu) => sum + tu.allocated, 0)
        const totalCapacity = teamUtilizations.reduce((sum, tu) => sum + tu.capacity, 0)

        return {
          timePointId: tp.id,
          timePointName: tp.name,
          totalAllocated,
          totalCapacity,
          overallUtilization: totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0,
          teamUtilizations,
        }
      })

      const averageUtilization =
        timePointStats.length > 0
          ? timePointStats.reduce((sum, ts) => sum + ts.overallUtilization, 0) / timePointStats.length
          : 0

      return {
        totalPersons,
        totalTeams: teams.length,
        totalProjects: projects.length,
        totalTimePoints: timePoints.length,
        timePointStats,
        averageUtilization,
      }
    },

    // ==================== Import ====================

    importManpowerChart: async (data: ManpowerChart): Promise<boolean> => {
      const { currentProject, currentProjectId } = get()
      if (!currentProject || !currentProjectId) return false

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) return false

      const now = Date.now()
      const imported: ManpowerChart = {
        ...data,
        id: idGenerators.manpowerChart(),
        name: `${data.name} (导入)`,
        order: currentProject.radarCharts.length,
        isManpowerChart: true,
        teams: data.teams.map((t) => ({ ...t, id: idGenerators.team() })),
        projects: data.projects.map((p) => ({ ...p, id: idGenerators.project() })),
        timePoints: data.timePoints.map((tp) => ({ ...tp, id: idGenerators.timePoint() })),
        createdAt: now,
        updatedAt: now,
      }

      // Create in database first
      const success = await createChart(currentProjectId, imported)
      if (!success) {
        console.error('[Manpower] Failed to import to database')
        return false
      }

      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, imported],
        activeRadarId: imported.id,
      }
      set({ currentProject: updated })

      // Update active chart id
      await updateProjectMeta(currentProjectId, { activeChartId: imported.id })
      return true
    },

    // ==================== Metadata ====================

    updateManpowerMetadata: (chartId: string, updates: Partial<ManpowerChart['metadata']>) => {
      updateAndSaveChart(chartId, (chart) => ({
        ...chart,
        metadata: { ...chart.metadata, ...updates },
        updatedAt: Date.now(),
      }))
    },
  }
}

// Helper function to calculate total persons
function calculateTotalPersons(teams: ManpowerTeam[]): number {
  return teams.reduce((sum, team) => sum + team.capacity, 0)
}
