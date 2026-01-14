import React, { useState, useRef } from 'react'
import { Card, Button, Space, Typography, message } from 'antd'
import { FolderOpenOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import { useConfigStore } from '../../stores'
import { useI18n } from '@/locales'
import type { Team, Project, TimePoint } from '../../types/data'

const { Title, Text } = Typography

interface ConfigData {
  teams: Team[]
  projects: Project[]
  timePoints: TimePoint[]
  metadata: {
    exportTime: string
    version: string
  }
}

export const ConfigImportExport: React.FC = () => {
  const { t } = useI18n()
  const m = t.manpower
  const { teams, projects, timePoints, importConfig } = useConfigStore()
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 导出基础配置到JSON
  const handleExportConfig = () => {
    try {
      setIsLoading(true)

      const configData: ConfigData = {
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
      link.download = `${m.config}_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      message.success(t.toolbar.exportSuccess)
    } catch (error) {
      console.error('Export error:', error)
      message.error(t.toolbar.importFailed)
    } finally {
      setIsLoading(false)
    }
  }

  // 从JSON导入基础配置
  const handleImportConfig = (file: File) => {
    try {
      setIsLoading(true)

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const jsonString = e.target?.result as string
          const configData: ConfigData = JSON.parse(jsonString)

          // 验证数据格式
          if (!configData.teams || !configData.projects || !configData.timePoints) {
            throw new Error(t.toolbar.importFailed)
          }

          // 验证团队数据
          const validTeams = configData.teams.filter(
            (team) => team.name && typeof team.capacity === 'number' && team.color
          )

          // 验证项目数据
          const validProjects = configData.projects.filter(
            (project) => project.name && project.status && project.color
          )

          // 验证时间点数据
          const validTimePoints = configData.timePoints.filter(
            (timePoint) => timePoint.name && timePoint.date && timePoint.type
          )

          if (validTeams.length === 0 && validProjects.length === 0 && validTimePoints.length === 0) {
            throw new Error(t.toolbar.importFailed)
          }

          // 确保必要的属性存在
          const importedTeams = validTeams.map((team) => ({
            ...team,
            description: team.description || '',
            badge: team.badge || '',
          }))

          const importedProjects = validProjects.map((project) => ({
            ...project,
            description: project.description || '',
            teams: project.teams || [],
            releaseDate: project.releaseDate || '',
            pattern: project.pattern || ('solid' as const),
          }))

          const importedTimePoints = validTimePoints.map((timePoint) => ({
            ...timePoint,
            description: timePoint.description || '',
          }))

          // 导入配置
          importConfig({
            teams: importedTeams,
            projects: importedProjects,
            timePoints: importedTimePoints,
          })

          const importedItems = []
          if (importedTeams.length > 0) importedItems.push(`${m.teamConfig} ${importedTeams.length}`)
          if (importedProjects.length > 0) importedItems.push(`${m.projectConfig} ${importedProjects.length}`)
          if (importedTimePoints.length > 0) importedItems.push(`${m.timePointConfig} ${importedTimePoints.length}`)

          message.success(`${t.toolbar.importSuccess}: ${importedItems.join(', ')}`)
        } catch (error) {
          console.error('Parse error:', error)
          message.error(`${t.toolbar.importFailed}: ${error instanceof Error ? error.message : ''}`)
        } finally {
          setIsLoading(false)
        }
      }

      reader.readAsText(file, 'utf-8')
    } catch (error) {
      console.error('Import error:', error)
      message.error(t.toolbar.importFailed)
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.json')) {
        message.error(t.toolbar.importFailed)
        return
      }
      handleImportConfig(file)
    }
    // Reset input value so same file can be selected again
    if (e.target) {
      e.target.value = ''
    }
  }

  // 下载配置模板
  const handleDownloadTemplate = () => {
    try {
      const templateData: ConfigData = {
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
          {
            id: 'team-3',
            name: '测试团队',
            capacity: 8,
            description: '负责质量保证',
            color: '#2ecc71',
            badge: '③',
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
          {
            id: 'project-2',
            name: '项目B',
            status: 'planning',
            color: '#e74c3c',
            description: '计划中项目B',
            teams: ['team-2', 'team-3'],
            releaseDate: '2024-11',
            pattern: 'stripes',
          },
          {
            id: 'project-3',
            name: '项目C',
            status: 'completed',
            color: '#2ecc71',
            description: '已完成项目C',
            teams: ['team-1'],
            releaseDate: '2024-07',
            pattern: 'dots',
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
          {
            id: 'time-2',
            name: '第二阶段',
            date: '2024-09',
            description: '版本发布',
            type: 'release',
          },
          {
            id: 'time-3',
            name: '第三阶段',
            date: '2024-11',
            description: '后续规划',
            type: 'planning',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>{m.config}</Title>
            <Space style={{ marginTop: 8 }}>
              <Text type="secondary">{m.teamConfig}: {teams.length}</Text>
              <Text type="secondary">|</Text>
              <Text type="secondary">{m.projectConfig}: {projects.length}</Text>
              <Text type="secondary">|</Text>
              <Text type="secondary">{m.timePointConfig}: {timePoints.length}</Text>
            </Space>
          </div>
          <Space>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => fileInputRef.current?.click()}
              loading={isLoading}
            >
              {t.toolbar.import}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportConfig}
              loading={isLoading}
            >
              {t.toolbar.export}
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={handleDownloadTemplate}
            >
              {t.toolbar.downloadTemplate}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}
