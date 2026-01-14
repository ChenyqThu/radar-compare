import { useCallback, useMemo } from 'react'
import type { ManpowerTeam, ManpowerProject, ManpowerTimePoint } from '@/types/manpower'

interface CellData {
  occupied: number
  prerelease: number
}

interface Allocations {
  [timePointId: string]: {
    [projectId: string]: {
      [teamId: string]: CellData
    }
  }
}

interface UseAllocationDataOptions {
  teams: ManpowerTeam[]
  projects: ManpowerProject[]
  timePoints: ManpowerTimePoint[]
  allocations: Allocations
  updateAllocation: (timePointId: string, projectId: string, teamId: string, data: CellData) => void
}

/**
 * 管理分配数据的读写操作
 */
export function useAllocationData({
  teams,
  projects,
  timePoints,
  allocations,
  updateAllocation,
}: UseAllocationDataOptions) {
  // 按日期排序时间点
  const sortedTimePoints = useMemo(
    () => [...timePoints].sort((a, b) => a.date.localeCompare(b.date)),
    [timePoints]
  )

  // 获取单元格值
  const getCellValue = useCallback(
    (timePointId: string, projectId: string, teamId: string): CellData => {
      return allocations[timePointId]?.[projectId]?.[teamId] || { occupied: 0, prerelease: 0 }
    },
    [allocations]
  )

  // 设置单元格值（包含自动计算逻辑）
  const setCellValue = useCallback(
    (
      timePointId: string,
      projectId: string,
      teamId: string,
      field: 'occupied' | 'prerelease',
      value: number
    ) => {
      const currentValue = getCellValue(timePointId, projectId, teamId)

      // 对于预释值，限制不能超过当前投入
      let finalValue = Math.max(0, value)
      if (field === 'prerelease') {
        finalValue = Math.min(finalValue, currentValue.occupied)
      }

      const newValue = {
        ...currentValue,
        [field]: finalValue,
      }
      updateAllocation(timePointId, projectId, teamId, newValue)

      // 自动计算逻辑
      const currentTimeIndex = sortedTimePoints.findIndex((tp) => tp.id === timePointId)

      if (field === 'prerelease') {
        if (currentTimeIndex < sortedTimePoints.length - 1) {
          const nextTimePoint = sortedTimePoints[currentTimeIndex + 1]
          const currentOccupied = newValue.occupied
          const nextOccupied = Math.max(0, currentOccupied - finalValue)

          const nextValue = getCellValue(nextTimePoint.id, projectId, teamId)
          updateAllocation(nextTimePoint.id, projectId, teamId, {
            ...nextValue,
            occupied: nextOccupied,
          })
        }
      } else if (field === 'occupied') {
        if (currentTimeIndex > 0) {
          const prevTimePoint = sortedTimePoints[currentTimeIndex - 1]
          const prevValue = getCellValue(prevTimePoint.id, projectId, teamId)

          if (finalValue < prevValue.occupied) {
            const prerelease = prevValue.occupied - finalValue
            updateAllocation(prevTimePoint.id, projectId, teamId, {
              ...prevValue,
              prerelease: prerelease,
            })
          } else if (finalValue === prevValue.occupied && prevValue.prerelease > 0) {
            updateAllocation(prevTimePoint.id, projectId, teamId, {
              ...prevValue,
              prerelease: 0,
            })
          }
        }

        if (currentValue.prerelease > finalValue) {
          updateAllocation(timePointId, projectId, teamId, {
            ...newValue,
            prerelease: Math.min(currentValue.prerelease, finalValue),
          })
        }
      }
    },
    [getCellValue, sortedTimePoints, updateAllocation]
  )

  // 获取团队利用率
  const getTeamUtilization = useCallback(
    (teamId: string, timePointId: string) => {
      const team = teams.find((t) => t.id === teamId)
      if (!team) return { used: 0, capacity: 0, percentage: 0 }

      let totalUsed = 0
      for (const project of projects) {
        const cellValue = getCellValue(timePointId, project.id, teamId)
        totalUsed += cellValue.occupied
      }

      return {
        used: totalUsed,
        capacity: team.capacity,
        percentage: team.capacity > 0 ? (totalUsed / team.capacity) * 100 : 0,
      }
    },
    [teams, projects, getCellValue]
  )

  // 获取总体团队占用情况
  const getOverallUtilization = useCallback(
    (timePointId: string) => {
      let totalUsed = 0
      let totalCapacity = 0

      for (const team of teams) {
        const utilization = getTeamUtilization(team.id, timePointId)
        totalUsed += utilization.used
        totalCapacity += utilization.capacity
      }

      return {
        used: totalUsed,
        capacity: totalCapacity,
        percentage: totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0,
      }
    },
    [teams, getTeamUtilization]
  )

  // 获取项目在某个时间点的投入和预释汇总
  const getProjectSummary = useCallback(
    (projectId: string, timePointId: string, projectTeams: ManpowerTeam[]) => {
      let totalOccupied = 0
      let totalPrerelease = 0
      const teamBreakdown: { teamId: string; teamName: string; teamColor: string; occupied: number }[] = []

      for (const team of projectTeams) {
        const cellValue = getCellValue(timePointId, projectId, team.id)
        totalOccupied += cellValue.occupied
        totalPrerelease += cellValue.prerelease

        if (cellValue.occupied > 0) {
          teamBreakdown.push({
            teamId: team.id,
            teamName: team.name,
            teamColor: team.color,
            occupied: cellValue.occupied,
          })
        }
      }

      return { totalOccupied, totalPrerelease, teamBreakdown }
    },
    [getCellValue]
  )

  // 人力预释自动校准功能
  const autoCalculatePrerelease = useCallback(() => {
    let updatedCount = 0

    for (let i = 0; i < sortedTimePoints.length - 1; i++) {
      const currentTimePoint = sortedTimePoints[i]
      const nextTimePoint = sortedTimePoints[i + 1]

      for (const project of projects) {
        for (const team of teams) {
          const currentAllocation = getCellValue(currentTimePoint.id, project.id, team.id)
          const nextAllocation = getCellValue(nextTimePoint.id, project.id, team.id)

          const calculatedPrerelease = Math.max(0, currentAllocation.occupied - nextAllocation.occupied)

          if (calculatedPrerelease !== currentAllocation.prerelease) {
            updateAllocation(currentTimePoint.id, project.id, team.id, {
              ...currentAllocation,
              prerelease: calculatedPrerelease,
            })
            updatedCount++
          }
        }
      }
    }

    return updatedCount
  }, [sortedTimePoints, projects, teams, getCellValue, updateAllocation])

  return {
    sortedTimePoints,
    getCellValue,
    setCellValue,
    getTeamUtilization,
    getOverallUtilization,
    getProjectSummary,
    autoCalculatePrerelease,
  }
}

export type { CellData }
