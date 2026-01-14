/**
 * dataStore adapter for manpower module
 *
 * This adapter provides the same API as the original rd-manpower-tool's dataStore,
 * but reads/writes data through radarStore's manpowerActions.
 */

import { useMemo, useCallback, useState } from 'react'
import { useRadarStore } from '@/stores/radarStore'
import type { AllocationMatrix } from '@/types/manpower'

// Re-export types for compatibility
export type { AllocationMatrix }

export interface ValidationResult {
  id: string
  type: string
  message: string
  severity?: 'low' | 'medium' | 'high'
}

export interface SankeyNode {
  name: string
  value?: number
  itemStyle?: { color: string }
  category?: number
}

export interface SankeyLink {
  source: string
  target: string
  value: number
  teamDetails?: { [teamId: string]: { name: string; value: number; color: string } }
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

interface DataState {
  // Data
  allocations: AllocationMatrix
  validationResults: ValidationResult[]
  sankeyData: SankeyData | null
  isLoading: boolean

  // Allocation operations
  updateAllocation: (
    timePointId: string,
    projectId: string,
    teamId: string,
    data: { occupied: number; prerelease: number }
  ) => void

  updateMultipleAllocations: (
    updates: {
      timePointId: string
      projectId: string
      teamId: string
      data: { occupied: number; prerelease: number }
    }[]
  ) => void

  // Validation
  setValidationResults: (results: ValidationResult[]) => void
  clearValidationResults: () => void

  // Sankey data
  setSankeyData: (data: SankeyData | null) => void

  // Loading state
  setLoading: (isLoading: boolean) => void

  // Utility methods
  getAllocationByKeys: (
    timePointId: string,
    projectId: string,
    teamId: string
  ) => { occupied: number; prerelease: number } | undefined
  getTeamTotalAtTime: (timePointId: string, teamId: string) => number
  getProjectTotalAtTime: (timePointId: string, projectId: string) => number
  getStatistics: () => { totalCapacity: number; totalAllocated: number; totalPrerelease: number }

  // Reset operations
  resetAllocations: () => void
  importAllocations: (allocations: AllocationMatrix) => void
}

/**
 * Hook that provides dataStore-compatible API for the manpower module.
 * Reads from and writes to the active ManpowerChart in radarStore.
 */
export function useDataStore(): DataState {
  const {
    getActiveManpowerChart,
    updateAllocation: storeUpdateAllocation,
    updateMultipleAllocations: storeUpdateMultiple,
    resetAllocations: storeResetAllocations,
  } = useRadarStore()

  const chart = getActiveManpowerChart()

  // Extract data from active chart
  const allocations = useMemo(() => chart?.allocations ?? {}, [chart?.allocations])
  const teams = useMemo(() => chart?.teams ?? [], [chart?.teams])
  const timePoints = useMemo(() => chart?.timePoints ?? [], [chart?.timePoints])

  const chartId = chart?.id ?? ''

  // Allocation operations
  const updateAllocation = useCallback(
    (
      timePointId: string,
      projectId: string,
      teamId: string,
      data: { occupied: number; prerelease: number }
    ) => {
      if (!chartId) return
      storeUpdateAllocation(chartId, timePointId, projectId, teamId, data)
    },
    [chartId, storeUpdateAllocation]
  )

  const updateMultipleAllocations = useCallback(
    (
      updates: {
        timePointId: string
        projectId: string
        teamId: string
        data: { occupied: number; prerelease: number }
      }[]
    ) => {
      if (!chartId) return
      storeUpdateMultiple(chartId, updates)
    },
    [chartId, storeUpdateMultiple]
  )

  // Validation (local state - not persisted to database)
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])

  const clearValidationResults = useCallback(() => {
    setValidationResults([])
  }, [])

  // Sankey data (local state - computed on demand)
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null)

  // Loading state (local state)
  const [isLoading, setLoading] = useState<boolean>(false)

  // Utility methods
  const getAllocationByKeys = useCallback(
    (timePointId: string, projectId: string, teamId: string) => {
      return allocations[timePointId]?.[projectId]?.[teamId]
    },
    [allocations]
  )

  const getTeamTotalAtTime = useCallback(
    (timePointId: string, teamId: string) => {
      const timeData = allocations[timePointId] || {}
      return Object.values(timeData).reduce((total, projectData) => {
        const allocation = projectData[teamId]
        return total + (allocation ? allocation.occupied : 0)
      }, 0)
    },
    [allocations]
  )

  const getProjectTotalAtTime = useCallback(
    (timePointId: string, projectId: string) => {
      const projectData = allocations[timePointId]?.[projectId] || {}
      return Object.values(projectData).reduce((total, allocation) => {
        return total + allocation.occupied
      }, 0)
    },
    [allocations]
  )

  const getStatistics = useCallback(() => {
    const totalCapacity = teams.reduce((sum, t) => sum + t.capacity, 0)

    // Get configured time point IDs
    const configuredTimePointIds = timePoints.map(tp => tp.id)
    const availableTimePointIds = configuredTimePointIds.filter(id => allocations[id])

    if (availableTimePointIds.length === 0) {
      return {
        totalCapacity,
        totalAllocated: 0,
        totalPrerelease: 0,
      }
    }

    // Calculate average allocations across time points
    let totalAllocatedSum = 0
    let totalPrereleaseSum = 0

    availableTimePointIds.forEach(timePointId => {
      const timeData = allocations[timePointId]
      let timeAllocated = 0
      let timePrerelease = 0

      Object.values(timeData).forEach(projectData => {
        Object.values(projectData).forEach(allocation => {
          timeAllocated += allocation.occupied
          timePrerelease += allocation.prerelease
        })
      })

      totalAllocatedSum += timeAllocated
      totalPrereleaseSum += timePrerelease
    })

    const avgAllocated = totalAllocatedSum / availableTimePointIds.length
    const avgPrerelease = totalPrereleaseSum / availableTimePointIds.length

    return {
      totalCapacity,
      totalAllocated: avgAllocated,
      totalPrerelease: avgPrerelease,
    }
  }, [teams, timePoints, allocations])

  // Reset operations
  const resetAllocations = useCallback(() => {
    if (!chartId) return
    storeResetAllocations(chartId)
  }, [chartId, storeResetAllocations])

  const importAllocations = useCallback((newAllocations: AllocationMatrix) => {
    if (!chartId) return

    // Use updateMultipleAllocations to batch update all allocations
    const updates: {
      timePointId: string
      projectId: string
      teamId: string
      data: { occupied: number; prerelease: number }
    }[] = []

    Object.entries(newAllocations).forEach(([timePointId, projectData]) => {
      Object.entries(projectData).forEach(([projectId, teamData]) => {
        Object.entries(teamData).forEach(([teamId, allocation]) => {
          updates.push({
            timePointId,
            projectId,
            teamId,
            data: allocation,
          })
        })
      })
    })

    if (updates.length > 0) {
      storeUpdateMultiple(chartId, updates)
    }
  }, [chartId, storeUpdateMultiple])

  return {
    allocations,
    validationResults,
    sankeyData,
    isLoading,
    updateAllocation,
    updateMultipleAllocations,
    setValidationResults,
    clearValidationResults,
    setSankeyData,
    setLoading,
    getAllocationByKeys,
    getTeamTotalAtTime,
    getProjectTotalAtTime,
    getStatistics,
    resetAllocations,
    importAllocations,
  }
}
