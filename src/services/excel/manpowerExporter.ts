/**
 * Manpower data export service
 */

import * as XLSX from 'xlsx'
import { message } from 'antd'
import type { Team, Project, TimePoint, AllocationMatrix } from '@/components/manpower/types/data'

interface ExportOptions {
  teams: Team[]
  projects: Project[]
  timePoints: TimePoint[]
  allocations: AllocationMatrix
  t: any // i18n translate function
  fileName?: string
  getStatistics: () => {
    totalCapacity: number
    totalAllocated: number
    totalPrerelease: number
  }
}

export function exportManpowerToExcel(options: ExportOptions) {
  const { teams, projects, timePoints, allocations, t, getStatistics, fileName } = options
  const m = t.manpower

  try {
    const workbook = XLSX.utils.book_new()
    const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date))

    // 1. 人力分配表
    const allocationData: (string | number)[][] = []
    const header = [
      m.columnProject,
      m.columnTeam,
      ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnOccupied})`),
      ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnPrerelease})`),
    ]
    allocationData.push(header)

    projects.forEach((project) => {
      teams.forEach((team) => {
        const row: (string | number)[] = [project.name, team.name]
        sortedTimePoints.forEach((timePoint) => {
          const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
          row.push(allocation?.occupied || 0)
        })
        sortedTimePoints.forEach((timePoint) => {
          const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
          row.push(allocation?.prerelease || 0)
        })
        const hasData = row.slice(2).some((value) => typeof value === 'number' && value > 0)
        if (hasData) {
          allocationData.push(row)
        }
      })
    })

    const allocationSheet = XLSX.utils.aoa_to_sheet(allocationData)
    XLSX.utils.book_append_sheet(workbook, allocationSheet, m.allocationSheet)

    // 2. 团队配置表
    const teamData = [
      [m.columnTeamId, m.columnTeamName, m.columnCapacity, m.columnResponsibility, m.columnColor, m.columnBadge],
      ...teams.map((team) => [
        team.id,
        team.name,
        team.capacity,
        team.description || '',
        team.color,
        team.badge || '',
      ]),
    ]
    const teamSheet = XLSX.utils.aoa_to_sheet(teamData)
    XLSX.utils.book_append_sheet(workbook, teamSheet, m.teamSheet)

    // 3. 项目配置表
    const projectData = [
      [m.columnProjectId, m.columnProjectName, m.columnStatus, m.columnDescription, m.columnColor, m.columnPattern, m.columnReleaseDate, m.columnRelatedTeams],
      ...projects.map((project) => [
        project.id,
        project.name,
        project.status,
        project.description || '',
        project.color,
        project.pattern || 'solid',
        project.releaseDate || '',
        Array.isArray(project.teams) ? project.teams.join(',') : '',
      ]),
    ]
    const projectSheet = XLSX.utils.aoa_to_sheet(projectData)
    XLSX.utils.book_append_sheet(workbook, projectSheet, m.projectSheet)

    // 4. 时间点配置表
    const timePointData = [
      [m.columnTimePointId, m.columnTimePointName, m.columnDate, m.columnType, m.columnDescription],
      ...sortedTimePoints.map((tp) => [tp.id, tp.name, tp.date, tp.type, tp.description || '']),
    ]
    const timePointSheet = XLSX.utils.aoa_to_sheet(timePointData)
    XLSX.utils.book_append_sheet(workbook, timePointSheet, m.timePointSheet)

    // 5. 统计汇总表
    const { totalCapacity, totalAllocated, totalPrerelease } = getStatistics()
    const summaryData = [
      [m.statisticsItem, m.value, m.note],
      [m.totalCapacity, totalCapacity, m.totalCapacityNote],
      [m.avgAllocated, totalAllocated.toFixed(1), m.avgAllocatedNote],
      [m.avgPrerelease, totalPrerelease.toFixed(1), m.avgPrereleaseNote],
      [
        m.avgUtilization,
        `${((totalAllocated / totalCapacity) * 100).toFixed(1)}%`,
        m.avgUtilizationNote,
      ],
      [''],
      [m.configStats, '', ''],
      [m.teamsCountLabel, teams.length, ''],
      [m.projectsCountLabel, projects.length, ''],
      [m.timePointsCountLabel, timePoints.length, ''],
      [''],
      [m.exportInfo, '', ''],
      [m.exportTime, new Date().toLocaleString(), ''],
      [m.systemVersion, '1.0', ''],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, m.summarySheet)

    const finalFileName = fileName ? `${fileName}.xlsx` : `${m.excelFileName}_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, finalFileName)

    message.success(t.toolbar.exportSuccess)
  } catch (error) {
    console.error('Export Excel error:', error)
    message.error(t.toolbar.importFailed)
  }
}

export function exportManpowerToJson(options: Omit<ExportOptions, 'getStatistics'>) {
  const { teams, projects, timePoints, t, fileName } = options
  const m = t.manpower

  try {
    const configData = {
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        capacity: team.capacity,
        description: team.description || '',
        color: team.color,
        badge: team.badge || '',
      })),
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        color: project.color,
        description: project.description || '',
        teams: project.teams || [],
        releaseDate: project.releaseDate || '',
        pattern: project.pattern || 'solid',
      })),
      timePoints: timePoints.map((timePoint) => ({
        id: timePoint.id,
        name: timePoint.name,
        date: timePoint.date,
        description: timePoint.description || '',
        type: timePoint.type,
      })),
      allocations: options.allocations,
      metadata: {
        exportTime: new Date().toISOString(),
        version: '1.0',
      },
    }

    const jsonString = JSON.stringify(configData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName ? `${fileName}.json` : `${m.config}_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success(t.toolbar.exportSuccess)
  } catch (error) {
    console.error('Export JSON error:', error)
    message.error(t.toolbar.importFailed)
  }
}

export function downloadManpowerTemplateExcel(options: Omit<ExportOptions, 'allocations' | 'getStatistics'>) {
  const { teams, projects, timePoints, t } = options
  const m = t.manpower

  try {
    const workbook = XLSX.utils.book_new()
    const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date))

    const templateData: (string | number)[][] = []
    const header = [
      m.columnProject,
      m.columnTeam,
      ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnOccupied})`),
      ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnPrerelease})`),
    ]
    templateData.push(header)

    if (projects.length > 0 && teams.length > 0) {
      const exampleRow: (string | number)[] = [projects[0].name, teams[0].name]
      sortedTimePoints.forEach(() => {
        exampleRow.push(0)
      })
      sortedTimePoints.forEach(() => {
        exampleRow.push(0)
      })
      templateData.push(exampleRow)
    }

    const templateSheet = XLSX.utils.aoa_to_sheet(templateData)
    XLSX.utils.book_append_sheet(workbook, templateSheet, m.allocationSheet)

    XLSX.writeFile(workbook, `${m.templateFileName}.xlsx`)
    message.success(t.toolbar.templateDownloadSuccess)
  } catch (error) {
    console.error('Template download error:', error)
    message.error(t.toolbar.importFailed)
  }
}

export function downloadManpowerTemplateJson(options: Pick<ExportOptions, 't'>) {
  const { t } = options
  const m = t.manpower

  try {
    const templateData = {
      teams: [
        {
          id: 'team-1',
          name: '前端团队',
          capacity: 10,
          description: '负责前端开发',
          color: '#3498db',
          badge: '①',
        },
        {
          id: 'team-2',
          name: '后端团队',
          capacity: 12,
          description: '负责后端开发',
          color: '#e74c3c',
          badge: '②',
        },
      ],
      projects: [
        {
          id: 'project-1',
          name: '项目A',
          status: 'development',
          color: '#3498db',
          description: '重要项目A',
          teams: ['team-1', 'team-2'],
          releaseDate: '2024-09',
          pattern: 'solid',
        },
      ],
      timePoints: [
        {
          id: 'time-1',
          name: '第一阶段',
          date: '2024-07',
          description: '项目启动',
          type: 'current',
        },
      ],
      metadata: {
        exportTime: new Date().toISOString(),
        version: '1.0',
      },
    }

    const jsonString = JSON.stringify(templateData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${m.config}_template.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success(t.toolbar.templateDownloadSuccess)
  } catch (error) {
    console.error('Template download error:', error)
    message.error(t.toolbar.importFailed)
  }
}
