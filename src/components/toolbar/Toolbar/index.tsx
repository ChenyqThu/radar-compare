import { Button, Space, Dropdown, message } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  HistoryOutlined,
  FolderOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useConfigStore as useManpowerConfigStore, useDataStore as useManpowerDataStore } from '@/components/manpower/stores'
import { useI18n } from '@/locales'
import { exportToExcel, exportMultipleToExcel, exportCurrentTabToJson, downloadTemplate } from '@/services/excel/exporter'
import {
  exportManpowerToExcel,
  exportManpowerToJson,
  downloadManpowerTemplateExcel,
  downloadManpowerTemplateJson,
} from '@/services/excel/manpowerExporter'
import { isRegularRadar } from '@/types'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  hideTimeCompare?: boolean
  hideImport?: boolean
  hideExport?: boolean
}

export function Toolbar({ hideTimeCompare = false, hideImport = false, hideExport = false }: ToolbarProps) {
  const { setImportModalVisible, setCreateTimelineModalVisible, appMode } = useUIStore()
  const { getActiveRadar, currentProject, getRegularRadars } = useRadarStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()

  // Manpower stores
  const manpowerConfig = useManpowerConfigStore()
  const manpowerData = useManpowerDataStore()

  const isManpowerMode = appMode === 'manpower'

  // Radar mode export handlers
  const handleExportExcel = () => {
    if (!activeRadar || !isRegularRadar(activeRadar)) {
      message.warning(t.toolbar.pleaseSelectRadar)
      return
    }
    exportToExcel(activeRadar)
    message.success(t.toolbar.exportSuccess)
  }

  const handleExportAllExcel = () => {
    const radars = getRegularRadars()
    if (radars.length === 0) {
      message.warning(t.common.noData)
      return
    }
    exportMultipleToExcel(radars, `${currentProject?.name || '竞品对比'}.xlsx`)
    message.success(t.toolbar.exportSuccess)
  }

  const handleExportJson = () => {
    if (!activeRadar || !isRegularRadar(activeRadar)) {
      message.warning(t.toolbar.pleaseSelectRadar)
      return
    }
    exportCurrentTabToJson(activeRadar)
    message.success(t.toolbar.exportSuccess)
  }

  const handleDownloadTemplate = () => {
    downloadTemplate()
    message.success(t.toolbar.templateDownloadSuccess)
  }

  // Manpower mode export handlers
  const handleManpowerExportExcel = () => {
    const activeManpowerChart = getActiveRadar()
    const fileName = activeManpowerChart?.name || t.manpower.excelFileName

    exportManpowerToExcel({
      teams: manpowerConfig.teams,
      projects: manpowerConfig.projects,
      timePoints: manpowerConfig.timePoints,
      allocations: manpowerData.allocations,
      t,
      fileName,
      getStatistics: manpowerData.getStatistics,
    })
  }

  const handleManpowerExportJson = () => {
    const activeManpowerChart = getActiveRadar()
    const fileName = activeManpowerChart?.name || t.manpower.config

    exportManpowerToJson({
      teams: manpowerConfig.teams,
      projects: manpowerConfig.projects,
      timePoints: manpowerConfig.timePoints,
      allocations: manpowerData.allocations,
      t,
      fileName,
    })
  }

  const handleManpowerDownloadExcelTemplate = () => {
    downloadManpowerTemplateExcel({
      teams: manpowerConfig.teams,
      projects: manpowerConfig.projects,
      timePoints: manpowerConfig.timePoints,
      t,
    })
  }

  const handleManpowerDownloadJsonTemplate = () => {
    downloadManpowerTemplateJson({ t })
  }

  // Export menu items based on mode
  const exportMenuItems: MenuProps['items'] = isManpowerMode
    ? [
      {
        key: 'excel',
        icon: <FileExcelOutlined />,
        label: t.toolbar.exportExcel,
        onClick: handleManpowerExportExcel,
      },
      {
        key: 'json',
        icon: <FileTextOutlined />,
        label: t.toolbar.exportJSON,
        onClick: handleManpowerExportJson,
      },
      {
        type: 'divider',
      },
      {
        key: 'excelTemplate',
        icon: <FileExcelOutlined />,
        label: `${t.toolbar.downloadTemplate} (Excel)`,
        onClick: handleManpowerDownloadExcelTemplate,
      },
      {
        key: 'jsonTemplate',
        icon: <FileTextOutlined />,
        label: `${t.toolbar.downloadTemplate} (JSON)`,
        onClick: handleManpowerDownloadJsonTemplate,
      },
    ]
    : [
      {
        key: 'excel',
        icon: <FileExcelOutlined />,
        label: t.toolbar.exportExcel,
        onClick: handleExportExcel,
      },
      {
        key: 'excelAll',
        icon: <FolderOutlined />,
        label: t.toolbar.exportAllTabs,
        onClick: handleExportAllExcel,
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
        key: 'template',
        icon: <FileExcelOutlined />,
        label: t.toolbar.downloadTemplate,
        onClick: handleDownloadTemplate,
      },
    ]

  const handleImport = () => {
    setImportModalVisible(true)
  }

  const handleCreateTimeline = () => {
    setCreateTimelineModalVisible(true)
  }

  return (
    <div className={styles.container}>
      <Space>
        {!hideTimeCompare && !isManpowerMode && (
          <Button icon={<HistoryOutlined />} onClick={handleCreateTimeline}>
            {t.timeline.timeCompare}
          </Button>
        )}
        {!hideExport && (
          <Dropdown menu={{ items: exportMenuItems }}>
            <Button icon={<DownloadOutlined />}>{t.toolbar.export}</Button>
          </Dropdown>
        )}
        {!hideImport && (
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            {t.toolbar.import}
          </Button>
        )}
      </Space>
    </div>
  )
}
