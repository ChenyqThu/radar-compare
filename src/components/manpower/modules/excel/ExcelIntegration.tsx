import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Card, Button, Space, Typography, message, Row, Col, Tooltip } from 'antd'
import { FolderOpenOutlined, DownloadOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useConfigStore } from '../../stores'
import { useDataStore } from '../../stores'
import { useI18n } from '@/locales'
import type { AllocationMatrix } from '../../types/data'

const { Title, Text } = Typography

export const ExcelIntegration: React.FC = () => {
  const { teams, projects, timePoints, importConfig } = useConfigStore()
  const { allocations, importAllocations, getStatistics } = useDataStore()
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()
  const m = t.manpower

  // 按日期排序时间点
  const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date))

  // 导出到Excel
  const handleExport = () => {
    try {
      setIsLoading(true)

      // 创建工作簿
      const workbook = XLSX.utils.book_new()

      // 准备数据：创建人力分配表
      const allocationData: (string | number)[][] = []

      // 表头
      const header = [
        m.columnProject,
        m.columnTeam,
        ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnOccupied})`),
        ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnPrerelease})`),
      ]
      allocationData.push(header)

      // 数据行
      projects.forEach((project) => {
        teams.forEach((team) => {
          const row: (string | number)[] = [project.name, team.name]

          // 投入人力
          sortedTimePoints.forEach((timePoint) => {
            const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
            row.push(allocation?.occupied || 0)
          })

          // 预释人力
          sortedTimePoints.forEach((timePoint) => {
            const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
            row.push(allocation?.prerelease || 0)
          })

          // 只添加有数据的行
          const hasData = row.slice(2).some((value) => typeof value === 'number' && value > 0)
          if (hasData) {
            allocationData.push(row)
          }
        })
      })

      // 创建工作表
      const allocationSheet = XLSX.utils.aoa_to_sheet(allocationData)
      XLSX.utils.book_append_sheet(workbook, allocationSheet, m.allocationSheet)

      // 创建团队配置表 - 包含更完整的信息
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

      // 创建项目配置表 - 包含更完整的信息
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

      // 创建时间点配置表
      const timePointData = [
        [m.columnTimePointId, m.columnTimePointName, m.columnDate, m.columnType, m.columnDescription],
        ...sortedTimePoints.map((tp) => [tp.id, tp.name, tp.date, tp.type, tp.description || '']),
      ]
      const timePointSheet = XLSX.utils.aoa_to_sheet(timePointData)
      XLSX.utils.book_append_sheet(workbook, timePointSheet, m.timePointSheet)

      // 创建统计汇总表
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
        [
          m.allocationRecords,
          Object.keys(allocations).reduce((sum, timeId) => {
            return (
              sum +
              Object.keys(allocations[timeId]).reduce((projectSum, projectId) => {
                return projectSum + Object.keys(allocations[timeId][projectId]).length
              }, 0)
            )
          }, 0),
          m.allocationRecordsNote,
        ],
        [''],
        [m.exportInfo, '', ''],
        [m.exportTime, new Date().toLocaleString(), ''],
        [m.systemVersion, '1.0', ''],
      ]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, m.summarySheet)

      // 下载文件
      const fileName = `${m.excelFileName}_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, fileName)

      message.success(`${t.toolbar.exportSuccess}: ${fileName}`)
    } catch (error) {
      console.error('Export error:', error)
      message.error(t.toolbar.importFailed)
    } finally {
      setIsLoading(false)
    }
  }

  // 从Excel导入
  const handleImport = (file: File) => {
    try {
      setIsLoading(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })

          // 首先尝试导入基础配置（如果存在）
          let configImported = false
          let importedTeams = teams
          let importedProjects = projects
          let importedTimePoints = timePoints

          // 导入团队配置
          const teamSheetName = workbook.SheetNames.find(
            (name) => name.includes(m.teamSheet) || name.includes('team')
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

              if (nameIndex !== -1 && capacityIndex !== -1) {
                const newTeams = []
                for (let i = 1; i < teamRows.length; i++) {
                  const row = teamRows[i]
                  if (row[nameIndex]) {
                    newTeams.push({
                      id: `team-${i}`,
                      name: row[nameIndex],
                      capacity: parseFloat(row[capacityIndex]) || 0,
                      description: row[descriptionIndex] || '',
                      color: row[colorIndex] || '#3498db',
                      badge: '',
                    })
                  }
                }
                if (newTeams.length > 0) {
                  importedTeams = newTeams
                  configImported = true
                }
              }
            }
          }

          // 导入项目配置
          const projectSheetName = workbook.SheetNames.find(
            (name) => name.includes(m.projectSheet) || name.includes('project')
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

              if (nameIndex !== -1) {
                const newProjects = []
                for (let i = 1; i < projectRows.length; i++) {
                  const row = projectRows[i]
                  if (row[nameIndex]) {
                    newProjects.push({
                      id: `project-${i}`,
                      name: row[nameIndex],
                      status: row[statusIndex] || 'planning',
                      description: row[descriptionIndex] || '',
                      color: row[colorIndex] || '#3498db',
                    })
                  }
                }
                if (newProjects.length > 0) {
                  importedProjects = newProjects
                  configImported = true
                }
              }
            }
          }

          // 导入时间点配置
          const timePointSheetName = workbook.SheetNames.find(
            (name) => name.includes(m.timePointSheet) || name.includes('timepoint')
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
                const newTimePoints = []
                for (let i = 1; i < timePointRows.length; i++) {
                  const row = timePointRows[i]
                  if (row[nameIndex] && row[dateIndex]) {
                    newTimePoints.push({
                      id: `time-${i}`,
                      name: row[nameIndex],
                      date: row[dateIndex],
                      type: row[typeIndex] || 'current',
                      description: row[descriptionIndex] || '',
                    })
                  }
                }
                if (newTimePoints.length > 0) {
                  importedTimePoints = newTimePoints
                  configImported = true
                }
              }
            }
          }

          // 如果有基础配置数据，则导入
          if (configImported) {
            importConfig({
              teams: importedTeams,
              projects: importedProjects,
              timePoints: importedTimePoints,
            })
          }

          // 读取人力分配表
          const allocationSheetName = workbook.SheetNames.find(
            (name) =>
              name.includes(m.allocationSheet) || name.includes('allocation') || name === 'Sheet1'
          )

          if (!allocationSheetName) {
            if (configImported) {
              message.success(t.toolbar.importSuccess)
              return
            } else {
              throw new Error(m.noAllocationSheet)
            }
          }

          const allocationSheet = workbook.Sheets[allocationSheetName]
          const allocationRows = XLSX.utils.sheet_to_json<any[]>(allocationSheet, { header: 1 })

          if (allocationRows.length < 2) {
            if (configImported) {
              message.success(t.toolbar.importSuccess)
              return
            } else {
              throw new Error(m.insufficientData)
            }
          }

          // 解析表头
          const headerRow = allocationRows[0]
          const projectIndex = headerRow.indexOf(m.columnProject)
          const teamIndex = headerRow.indexOf(m.columnTeam)

          if (projectIndex === -1 || teamIndex === -1) {
            if (configImported) {
              message.success(t.toolbar.importSuccess)
              return
            } else {
              throw new Error(m.missingColumns)
            }
          }

          // 找到时间点列的位置
          const timePointColumns: { [key: string]: { occupied: number; prerelease: number } } = {}
          const currentTimePoints = importedTimePoints
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))

          currentTimePoints.forEach((timePoint) => {
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

          // 解析数据
          const newAllocations: AllocationMatrix = {}

          // 初始化结构
          Object.keys(timePointColumns).forEach((timePointId) => {
            newAllocations[timePointId] = {}
            importedProjects.forEach((project) => {
              newAllocations[timePointId][project.id] = {}
            })
          })

          // 处理数据行
          for (let i = 1; i < allocationRows.length; i++) {
            const row = allocationRows[i]
            const projectName = row[projectIndex]
            const teamName = row[teamIndex]

            if (!projectName || !teamName) continue

            // 找到对应的项目和团队ID
            const project = importedProjects.find((p) => p.name === projectName)
            const team = importedTeams.find((t) => t.name === teamName)

            if (!project || !team) {
              console.warn(`Skipping unknown project "${projectName}" or team "${teamName}"`)
              continue
            }

            // 提取每个时间点的数据
            Object.entries(timePointColumns).forEach(([timePointId, columns]) => {
              const occupied = parseFloat(row[columns.occupied]) || 0
              const prerelease = parseFloat(row[columns.prerelease]) || 0

              if (occupied > 0 || prerelease > 0) {
                newAllocations[timePointId][project.id][team.id] = {
                  occupied,
                  prerelease,
                }
              }
            })
          }

          // 导入数据
          importAllocations(newAllocations)

          const messages = []
          if (configImported) messages.push(m.config)
          if (Object.keys(newAllocations).length > 0)
            messages.push(`${allocationRows.length - 1} ${m.allocationGrid}`)

          message.success(`${t.toolbar.importSuccess}: ${messages.join(', ')}`)
        } catch (error) {
          console.error('Parse error:', error)
          message.error(`${t.toolbar.importFailed}: ${error instanceof Error ? error.message : ''}`)
        } finally {
          setIsLoading(false)
        }
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('Import error:', error)
      message.error(t.toolbar.importFailed)
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        message.error(t.toolbar.importFailed)
        return
      }
      handleImport(file)
    }
    // Reset input value
    if (e.target) {
      e.target.value = ''
    }
  }

  // 下载模板
  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new()

      // 创建模板数据
      const templateData: (string | number)[][] = []

      // 表头
      const header = [
        m.columnProject,
        m.columnTeam,
        ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnOccupied})`),
        ...sortedTimePoints.map((tp) => `${tp.name}(${m.columnPrerelease})`),
      ]
      templateData.push(header)

      // 示例数据
      if (projects.length > 0 && teams.length > 0) {
        const exampleRow: (string | number)[] = [projects[0].name, teams[0].name]
        sortedTimePoints.forEach(() => {
          exampleRow.push(0) // 投入
        })
        sortedTimePoints.forEach(() => {
          exampleRow.push(0) // 预释
        })
        templateData.push(exampleRow)
      }

      const templateSheet = XLSX.utils.aoa_to_sheet(templateData)
      XLSX.utils.book_append_sheet(workbook, templateSheet, m.allocationSheet)

      // 下载模板
      XLSX.writeFile(workbook, `${m.templateFileName}.xlsx`)
      message.success(t.toolbar.templateDownloadSuccess)
    } catch (error) {
      console.error('Template download error:', error)
      message.error(t.toolbar.importFailed)
    }
  }

  const recordCount = Object.keys(allocations).reduce((sum, timeId) => {
    return (
      sum +
      Object.keys(allocations[timeId]).reduce((projectSum, projectId) => {
        return projectSum + Object.keys(allocations[timeId][projectId]).length
      }, 0)
    )
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            {m.excelIntegration}
          </Title>
          <Space size="large">
            {/* 统计信息 */}
            <Space style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              <span>{m.teamConfig}: {teams.length}</span>
              <span>|</span>
              <span>{m.projectConfig}: {projects.length}</span>
              <span>|</span>
              <span>{m.records}: {recordCount}</span>
            </Space>
            {/* 操作按钮 */}
            <Space>
              <Tooltip title={t.toolbar.import}>
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  loading={isLoading}
                />
              </Tooltip>
              <Tooltip title={t.toolbar.export}>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  loading={isLoading}
                />
              </Tooltip>
              <Tooltip title={t.toolbar.downloadTemplate}>
                <Button
                  icon={<FileTextOutlined />}
                  onClick={handleDownloadTemplate}
                />
              </Tooltip>
            </Space>
          </Space>
        </div>

        {/* 格式说明 */}
        <Card
          size="small"
          style={{ backgroundColor: 'var(--color-bg-container-secondary, #fafafa)' }}
        >
          <Title level={5} style={{ marginBottom: 12, fontSize: 14 }}>
            {m.excelFormatGuide}
          </Title>
          <Row gutter={[24, 16]}>
            <Col xs={24} lg={12}>
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <CheckCircleOutlined style={{ color: 'var(--ant-color-success)' }} />
                  <Text strong>{m.exportFormat}</Text>
                </Space>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.allocationSheet}</strong>: {m.allocationSheetDesc}
                </div>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.teamSheet}</strong>: {m.teamSheetDesc}
                </div>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.projectSheet}</strong>: {m.projectSheetDesc}
                </div>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.timePointSheet}</strong>: {m.timePointSheetDesc}
                </div>
                <div>• <strong>{m.summarySheet}</strong>: {m.summarySheetDesc}</div>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div style={{ marginBottom: 8 }}>
                <Space>
                  <CloseCircleOutlined style={{ color: 'var(--ant-color-primary)' }} />
                  <Text strong>{m.importRequirements}</Text>
                </Space>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.requiredColumns}</strong>: {m.requiredColumnsDesc}
                </div>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.timePointFormat}</strong>: {m.timePointFormatDesc}
                </div>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.nameMatching}</strong>: {m.nameMatchingDesc}
                </div>
                <div style={{ marginBottom: 4 }}>
                  • <strong>{m.numberFormat}</strong>: {m.numberFormatDesc}
                </div>
                <div>• <strong>{m.smartImport}</strong>: {m.smartImportDesc}</div>
              </div>
            </Col>
          </Row>
        </Card>
      </Card>
    </div>
  )
}
