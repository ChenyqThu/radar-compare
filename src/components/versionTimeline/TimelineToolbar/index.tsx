import { Button, Space, Dropdown, message } from 'antd'
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  EditOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import styles from './TimelineToolbar.module.css'

interface TimelineToolbarProps {
  onAddEvent: () => void
  onEditInfo: () => void
  onImport: () => void
}

export function TimelineToolbar({ onAddEvent, onEditInfo, onImport }: TimelineToolbarProps) {
  const { t } = useI18n()
  const timeline = useRadarStore(state => state.getActiveVersionTimeline())

  const handleExportJson = () => {
    if (!timeline) {
      message.warning(t.versionTimeline.noTimeline)
      return
    }

    const jsonData = JSON.stringify(timeline, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${timeline.name}.json`
    link.click()
    URL.revokeObjectURL(url)
    message.success(t.toolbar.exportSuccess)
  }

  const handleDownloadTemplate = () => {
    // TODO: Implement template download
    message.info(t.common.featureComingSoon)
  }

  const exportMenuItems: MenuProps['items'] = [
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

  return (
    <div className={styles.container}>
      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAddEvent}>
          {t.versionTimeline.addEvent}
        </Button>
        <Button icon={<EditOutlined />} onClick={onEditInfo}>
          {t.versionTimeline.editInfo}
        </Button>
        <Dropdown menu={{ items: exportMenuItems }}>
          <Button icon={<DownloadOutlined />}>{t.toolbar.export}</Button>
        </Dropdown>
        <Button icon={<UploadOutlined />} onClick={onImport}>
          {t.toolbar.import}
        </Button>
      </Space>
    </div>
  )
}

export default TimelineToolbar
