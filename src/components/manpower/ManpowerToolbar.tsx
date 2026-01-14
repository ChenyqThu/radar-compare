import { useRef } from 'react'
import { Button, Space, Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { useConfigStore, useDataStore } from './stores'
import { useI18n } from '@/locales'
import {
  exportManpowerToExcel,
  exportManpowerToJson,
  downloadManpowerTemplateExcel,
  downloadManpowerTemplateJson,
} from '@/services/excel/manpowerExporter'
import {
  importManpowerFromExcel,
  importManpowerFromJson,
} from '@/services/excel/manpowerImporter'
import styles from './ManpowerToolbar.module.css'

export function ManpowerToolbar() {
  const { t } = useI18n()
  const m = t.manpower
  const { teams, projects, timePoints, importConfig } = useConfigStore()
  const { allocations, importAllocations, getStatistics } = useDataStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Export Excel
  const handleExportExcel = () => {
    exportManpowerToExcel({ teams, projects, timePoints, allocations, t, getStatistics })
  }

  // Export JSON
  const handleExportJson = () => {
    exportManpowerToJson({ teams, projects, timePoints, allocations, t })
  }

  // Download Excel Template
  const handleDownloadExcelTemplate = () => {
    downloadManpowerTemplateExcel({ teams, projects, timePoints, t })
  }

  // Download JSON Template
  const handleDownloadJsonTemplate = () => {
    downloadManpowerTemplateJson({ t })
  }

  // Import file
  const handleImport = async (file: File) => {
    try {
      let result

      if (file.name.endsWith('.json')) {
        result = await importManpowerFromJson(file, t)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        result = await importManpowerFromExcel(file, t)
      } else {
        message.error(t.toolbar.importFailed + ': ' + m.invalidFileFormat)
        return
      }

      // Handle import result
      if (!result.isValid) {
        const errorMessages = result.errors.map(e => e.message).join('\n')
        message.error(t.toolbar.importFailed + ': ' + errorMessages)
        return
      }

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(w => {
          message.warning(w.message)
        })
      }

      // Import data
      if (result.data) {
        const { teams: importedTeams, projects: importedProjects, timePoints: importedTimePoints, allocations: importedAllocations } = result.data

        // Import configuration
        if (importedTeams.length > 0 || importedProjects.length > 0 || importedTimePoints.length > 0) {
          importConfig({
            teams: importedTeams,
            projects: importedProjects,
            timePoints: importedTimePoints,
          })
        }

        // Import allocations
        if (Object.keys(importedAllocations).length > 0) {
          importAllocations(importedAllocations)
        }

        message.success(t.toolbar.importSuccess)
      }
    } catch (error) {
      console.error('Import error:', error)
      message.error(`${t.toolbar.importFailed}: ${error instanceof Error ? error.message : ''}`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImport(file)
    }
    // Reset input
    if (e.target) {
      e.target.value = ''
    }
  }

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: t.toolbar.exportExcel,
      onClick: handleExportExcel,
    },
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: t.toolbar.exportJSON,
      onClick: handleExportJson,
    },
    {
      type: 'divider',
    },
    {
      key: 'excelTemplate',
      icon: <FileExcelOutlined />,
      label: `${t.toolbar.downloadTemplate} (Excel)`,
      onClick: handleDownloadExcelTemplate,
    },
    {
      key: 'jsonTemplate',
      icon: <FileTextOutlined />,
      label: `${t.toolbar.downloadTemplate} (JSON)`,
      onClick: handleDownloadJsonTemplate,
    },
  ]

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <div className={styles.container}>
        <Space>
          <Dropdown menu={{ items: exportMenuItems }}>
            <Button icon={<DownloadOutlined />}>
              {t.toolbar.export}
            </Button>
          </Dropdown>
          <Button
            icon={<UploadOutlined />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t.toolbar.import}
          </Button>
        </Space>
      </div>
    </>
  )
}
