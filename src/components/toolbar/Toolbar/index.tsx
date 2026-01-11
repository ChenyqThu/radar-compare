import { useState } from 'react'
import { Button, Space, Dropdown, message } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  HistoryOutlined,
  FolderOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/locales'
import { exportToExcel, exportMultipleToExcel, exportToJson, downloadTemplate } from '@/services/excel/exporter'
import { isRegularRadar } from '@/types'
import { ShareModal } from '@/components/share'
import styles from './Toolbar.module.css'

export function Toolbar() {
  const { setImportModalVisible, setCreateTimelineModalVisible } = useUIStore()
  const { getActiveRadar, currentProject, getRegularRadars } = useRadarStore()
  const { user } = useAuthStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()
  const [shareModalOpen, setShareModalOpen] = useState(false)

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

  const handleShare = () => {
    setShareModalOpen(true)
  }

  return (
    <div className={styles.container}>
      <Space>
        <Button icon={<HistoryOutlined />} onClick={handleCreateTimeline}>
          {t.timeline.timeCompare}
        </Button>
        <Dropdown menu={{ items: exportMenuItems }}>
          <Button icon={<DownloadOutlined />}>{t.toolbar.export}</Button>
        </Dropdown>
        <Button icon={<UploadOutlined />} onClick={handleImport}>
          {t.toolbar.import}
        </Button>
        <Button
          icon={<ShareAltOutlined />}
          onClick={handleShare}
          type={user ? 'default' : 'dashed'}
        >
          {t.share?.title || '分享'}
        </Button>
      </Space>

      {currentProject && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          projectId={currentProject.id}
          projectName={currentProject.name}
        />
      )}
    </div>
  )
}
