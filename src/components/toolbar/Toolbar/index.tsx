import { Button, Space, Dropdown, message } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import { exportToExcel, exportToJson, downloadTemplate } from '@/services/excel/exporter'
import styles from './Toolbar.module.css'

export function Toolbar() {
  const { setExportModalVisible, setImportModalVisible } = useUIStore()
  const { getActiveRadar, currentProject } = useRadarStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()

  const handleExportExcel = () => {
    if (!activeRadar) {
      message.warning(t.toolbar.pleaseSelectRadar)
      return
    }
    exportToExcel(activeRadar)
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

  return (
    <div className={styles.container}>
      <Space>
        <Dropdown menu={{ items: exportMenuItems }}>
          <Button icon={<DownloadOutlined />}>{t.toolbar.export}</Button>
        </Dropdown>
        <Button icon={<UploadOutlined />} onClick={handleImport}>
          {t.toolbar.import}
        </Button>
      </Space>
    </div>
  )
}
