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
import { useI18n } from '@/locales'
import { exportToExcel, exportMultipleToExcel, exportToJson, downloadTemplate } from '@/services/excel/exporter'
import { isRegularRadar } from '@/types'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  hideTimeCompare?: boolean
  hideImport?: boolean
}

export function Toolbar({ hideTimeCompare = false, hideImport = false }: ToolbarProps) {
  const { setImportModalVisible, setCreateTimelineModalVisible } = useUIStore()
  const { getActiveRadar, currentProject, getRegularRadars } = useRadarStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()

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
    if (!currentProject) {
      message.warning(t.common.noData)
      return
    }
    exportToJson(currentProject)
    message.success(t.toolbar.exportSuccess)
  }

  const handleDownloadTemplate = () => {
    downloadTemplate()
    message.success(t.toolbar.templateDownloadSuccess)
  }

  const exportMenuItems: MenuProps['items'] = [
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
        {!hideTimeCompare && (
          <Button icon={<HistoryOutlined />} onClick={handleCreateTimeline}>
            {t.timeline.timeCompare}
          </Button>
        )}
        <Dropdown menu={{ items: exportMenuItems }}>
          <Button icon={<DownloadOutlined />}>{t.toolbar.export}</Button>
        </Dropdown>
        {!hideImport && (
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            {t.toolbar.import}
          </Button>
        )}
      </Space>
    </div>
  )
}
