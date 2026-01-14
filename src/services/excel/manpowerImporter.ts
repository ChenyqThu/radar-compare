import * as XLSX from 'xlsx'
import { idGenerators } from '@/utils/idGenerator'
import type { Team, Project, TimePoint, AllocationMatrix } from '@/components/manpower/types/data'
import type { ValidationResult } from '@/types'

interface ManpowerData {
  teams: Team[]
  projects: Project[]
  timePoints: TimePoint[]
  allocations: AllocationMatrix
}

interface ManpowerImportResult extends ValidationResult {
  data?: ManpowerData
  configOnly?: boolean
}

/**
 * Detect if the file contains manpower data
 */
export function isManpowerData(workbook: XLSX.WorkBook): boolean {
  const sheetNames = workbook.SheetNames

  // Check for manpower-specific sheet names
  const hasTeamSheet = sheetNames.some(name =>
    name.includes('团队') || name.includes('Team') || name.toLowerCase().includes('team')
  )
  const hasProjectSheet = sheetNames.some(name =>
    name.includes('项目') || name.includes('Project') || name.toLowerCase().includes('project')
  )
  const hasTimePointSheet = sheetNames.some(name =>
    name.includes('时间点') || name.includes('TimePoint') || name.toLowerCase().includes('timepoint')
  )
  const hasAllocationSheet = sheetNames.some(name =>
    name.includes('人力分配') || name.includes('Allocation') || name.toLowerCase().includes('allocation')
  )

  // If it has team/project/timepoint sheets, it's likely manpower data
  return (hasTeamSheet && hasProjectSheet) || hasTimePointSheet || hasAllocationSheet
}

/**
 * Import manpower data from Excel
 */
export async function importManpowerFromExcel(file: File, t: any): Promise<ManpowerImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const m = t.manpower

        let teams: Team[] = []
        let projects: Project[] = []
        let timePoints: TimePoint[] = []
        const allocations: AllocationMatrix = {}
        const errors: Array<{ message: string; row?: number; field: string }> = []
        const warnings: Array<{ message: string; row?: number; field: string }> = []

        // Import team config
        const teamSheetName = workbook.SheetNames.find(
          (name) => name.includes(m.teamSheet) || name.toLowerCase().includes('team')
        )

        if (teamSheetName) {
          const teamSheet = workbook.Sheets[teamSheetName]
          const teamRows = XLSX.utils.sheet_to_json<any[]>(teamSheet, { header: 1 })

          if (teamRows.length > 1) {
            const teamHeader = teamRows[0]
            const nameIndex = teamHeader.indexOf(m.columnTeamName)
            const capacityIndex = teamHeader.indexOf(m.columnCapacity)
            const descriptionIndex = teamHeader.indexOf(m.columnResponsibility)
            const colorIndex = teamHeader.indexOf(m.columnColor)
            const badgeIndex = teamHeader.indexOf(m.columnBadge)

            if (nameIndex !== -1 && capacityIndex !== -1) {
              for (let i = 1; i < teamRows.length; i++) {
                const row = teamRows[i]
                if (row[nameIndex]) {
                  teams.push({
                    id: idGenerators.team(),
                    name: row[nameIndex],
                    capacity: parseFloat(row[capacityIndex]) || 0,
                    description: row[descriptionIndex] || '',
                    color: row[colorIndex] || '#3498db',
                    badge: row[badgeIndex] || '',
                  })
                }
              }
            }
          }
        }

        // Import project config
        const projectSheetName = workbook.SheetNames.find(
          (name) => name.includes(m.projectSheet) || name.toLowerCase().includes('project')
        )

        if (projectSheetName) {
          const projectSheet = workbook.Sheets[projectSheetName]
          const projectRows = XLSX.utils.sheet_to_json<any[]>(projectSheet, { header: 1 })

          if (projectRows.length > 1) {
            const projectHeader = projectRows[0]
            const nameIndex = projectHeader.indexOf(m.columnProjectName)
            const statusIndex = projectHeader.indexOf(m.columnStatus)
            const descriptionIndex = projectHeader.indexOf(m.columnDescription)
            const colorIndex = projectHeader.indexOf(m.columnColor)
            const patternIndex = projectHeader.indexOf(m.columnPattern)
            const releaseDateIndex = projectHeader.indexOf(m.columnReleaseDate)
            const teamsIndex = projectHeader.indexOf(m.columnRelatedTeams)

            if (nameIndex !== -1) {
              for (let i = 1; i < projectRows.length; i++) {
                const row = projectRows[i]
                if (row[nameIndex]) {
                  projects.push({
                    id: idGenerators.project(),
                    name: row[nameIndex],
                    status: row[statusIndex] || 'planning',
                    description: row[descriptionIndex] || '',
                    color: row[colorIndex] || '#3498db',
                    pattern: row[patternIndex] || 'solid',
                    releaseDate: row[releaseDateIndex] || '',
                    teams: row[teamsIndex] ? String(row[teamsIndex]).split(',') : [],
                  })
                }
              }
            }
          }
        }

        // Import time point config
        const timePointSheetName = workbook.SheetNames.find(
          (name) => name.includes(m.timePointSheet) || name.toLowerCase().includes('timepoint')
        )

        if (timePointSheetName) {
          const timePointSheet = workbook.Sheets[timePointSheetName]
          const timePointRows = XLSX.utils.sheet_to_json<any[]>(timePointSheet, { header: 1 })

          if (timePointRows.length > 1) {
            const timePointHeader = timePointRows[0]
            const nameIndex = timePointHeader.indexOf(m.columnTimePointName)
            const dateIndex = timePointHeader.indexOf(m.columnDate)
            const typeIndex = timePointHeader.indexOf(m.columnType)
            const descriptionIndex = timePointHeader.indexOf(m.columnDescription)

            if (nameIndex !== -1 && dateIndex !== -1) {
              for (let i = 1; i < timePointRows.length; i++) {
                const row = timePointRows[i]
                if (row[nameIndex] && row[dateIndex]) {
                  timePoints.push({
                    id: idGenerators.timePoint(),
                    name: row[nameIndex],
                    date: row[dateIndex],
                    type: row[typeIndex] || 'current',
                    description: row[descriptionIndex] || '',
                  })
                }
              }
            }
          }
        }

        const configOnly = teams.length > 0 || projects.length > 0 || timePoints.length > 0

        // Import allocation data
        const allocationSheetName = workbook.SheetNames.find(
          (name) =>
            name.includes(m.allocationSheet) ||
            name.toLowerCase().includes('allocation') ||
            name === 'Sheet1'
        )

        if (allocationSheetName && teams.length > 0 && projects.length > 0 && timePoints.length > 0) {
          const allocationSheet = workbook.Sheets[allocationSheetName]
          const allocationRows = XLSX.utils.sheet_to_json<any[]>(allocationSheet, { header: 1 })

          if (allocationRows.length >= 2) {
            const headerRow = allocationRows[0]
            const projectIndex = headerRow.indexOf(m.columnProject)
            const teamIndex = headerRow.indexOf(m.columnTeam)

            if (projectIndex !== -1 && teamIndex !== -1) {
              // Find time point columns
              const timePointColumns: { [key: string]: { occupied: number; prerelease: number } } = {}
              const sortedTimePoints = timePoints.slice().sort((a, b) => a.date.localeCompare(b.date))

              sortedTimePoints.forEach((timePoint) => {
                const occupiedIndex = headerRow.findIndex(
                  (header: string) =>
                    header && header.includes(timePoint.name) && header.includes(m.columnOccupied)
                )
                const prereleaseIndex = headerRow.findIndex(
                  (header: string) =>
                    header && header.includes(timePoint.name) && header.includes(m.columnPrerelease)
                )

                if (occupiedIndex !== -1 && prereleaseIndex !== -1) {
                  timePointColumns[timePoint.id] = {
                    occupied: occupiedIndex,
                    prerelease: prereleaseIndex,
                  }
                }
              })

              // Initialize allocation structure
              Object.keys(timePointColumns).forEach((timePointId) => {
                allocations[timePointId] = {}
                projects.forEach((project) => {
                  allocations[timePointId][project.id] = {}
                })
              })

              // Parse data rows
              for (let i = 1; i < allocationRows.length; i++) {
                const row = allocationRows[i]
                const projectName = row[projectIndex]
                const teamName = row[teamIndex]

                if (!projectName || !teamName) continue

                const project = projects.find((p) => p.name === projectName)
                const team = teams.find((t) => t.name === teamName)

                if (!project || !team) {
                  warnings.push({
                    message: `${t.toolbar.row || '第'} ${i + 1} ${t.toolbar.rowSuffix || '行'}: 未知的项目 "${projectName}" 或团队 "${teamName}"`,
                    row: i + 1,
                    field: 'content',
                  })
                  continue
                }

                Object.entries(timePointColumns).forEach(([timePointId, columns]) => {
                  const occupied = parseFloat(row[columns.occupied]) || 0
                  const prerelease = parseFloat(row[columns.prerelease]) || 0

                  if (occupied > 0 || prerelease > 0) {
                    allocations[timePointId][project.id][team.id] = {
                      occupied,
                      prerelease,
                    }
                  }
                })
              }
            } else {
              warnings.push({ message: m.missingColumns, field: 'header' })
            }
          }
        }

        // Validation
        if (teams.length === 0 && projects.length === 0 && timePoints.length === 0) {
          errors.push({ message: t.toolbar.importFailed + ': ' + m.noValidData, field: 'content' })
        }

        const isValid = errors.length === 0

        resolve({
          isValid,
          errors,
          warnings,
          data: {
            teams,
            projects,
            timePoints,
            allocations,
          },
          configOnly,
          preview: null,
        })
      } catch (error) {
        resolve({
          isValid: false,
          errors: [{ message: error instanceof Error ? error.message : 'Unknown error', field: 'excel' }] as any,
          warnings: [],
          preview: null,
        })
      }
    }

    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: [{ message: 'Failed to read file', field: 'file' }] as any,
        warnings: [],
        preview: null,
      })
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Import manpower config from JSON
 */
export async function importManpowerFromJson(file: File, t: any): Promise<ManpowerImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string
        const configData = JSON.parse(jsonString)
        const m = t.manpower

        const errors: Array<{ message: string; field?: string }> = []
        const warnings: Array<{ message: string; field?: string }> = []

        // Validate structure
        if (!configData.teams || !configData.projects || !configData.timePoints) {
          // Check if it's radar data instead
          if (configData.dimensions || configData.vendors) {
            errors.push({ message: t.toolbar.importFailed + ': This is radar data, not manpower data', field: 'format' })
            resolve({
              isValid: false,
              errors: errors as any,
              warnings: warnings as any,
              preview: null,
            })
            return
          }

          errors.push({ message: t.toolbar.importFailed + ': ' + m.noValidData, field: 'content' })
          resolve({
            isValid: false,
            errors: errors as any,
            warnings: warnings as any,
            preview: null,
          })
          return
        }

        // Validate and sanitize teams
        const validTeams = configData.teams
          .filter((team: any) => team.name && typeof team.capacity === 'number' && team.color)
          .map((team: any) => ({
            id: team.id || idGenerators.team(),
            name: team.name,
            capacity: team.capacity,
            description: team.description || '',
            color: team.color,
            badge: team.badge || '',
          }))

        // Validate and sanitize projects
        const validProjects = configData.projects
          .filter((project: any) => project.name && project.status && project.color)
          .map((project: any) => ({
            id: project.id || idGenerators.project(),
            name: project.name,
            status: project.status,
            description: project.description || '',
            color: project.color,
            pattern: project.pattern || 'solid',
            releaseDate: project.releaseDate || '',
            teams: project.teams || [],
          }))

        // Validate and sanitize time points
        const validTimePoints = configData.timePoints
          .filter((timePoint: any) => timePoint.name && timePoint.date && timePoint.type)
          .map((timePoint: any) => ({
            id: timePoint.id || idGenerators.timePoint(),
            name: timePoint.name,
            date: timePoint.date,
            type: timePoint.type,
            description: timePoint.description || '',
          }))

        if (validTeams.length === 0 && validProjects.length === 0 && validTimePoints.length === 0) {
          errors.push({ message: t.toolbar.importFailed + ': ' + m.noValidData, field: 'content' })
        }

        const isValid = errors.length === 0

        resolve({
          isValid,
          errors: errors as any,
          warnings: warnings as any,
          data: {
            teams: validTeams,
            projects: validProjects,
            timePoints: validTimePoints,
            allocations: configData.allocations || {},
          },
          configOnly: true,
          preview: null,
        })
      } catch (error) {
        resolve({
          isValid: false,
          errors: [{ message: error instanceof Error ? error.message : 'Invalid JSON format', field: 'json' }] as any,
          warnings: [],
          preview: null,
        })
      }
    }

    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: [{ message: 'Failed to read file', field: 'file' }] as any,
        warnings: [],
        preview: null,
      })
    }

    reader.readAsText(file, 'utf-8')
  })
}
