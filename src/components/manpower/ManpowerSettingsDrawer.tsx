import { useState, useEffect } from 'react'
import { Drawer, Tabs, Typography, Space } from 'antd'
import { TeamOutlined, ProjectOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { TeamConfig } from './modules/config/TeamConfig'
import { ProjectConfig } from './modules/config/ProjectConfig'
import { TimeConfig } from './modules/config/TimeConfig'
import { useConfigStore } from './stores'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import styles from './ManpowerSettingsDrawer.module.css'

const { Text } = Typography

const MIN_WIDTH = 480
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 600
const STORAGE_KEY = 'manpower-settings-drawer-width'

function getStoredWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const width = parseInt(stored, 10)
      if (!isNaN(width) && width >= MIN_WIDTH && width <= MAX_WIDTH) {
        return width
      }
    }
  } catch {}
  return DEFAULT_WIDTH
}

export function ManpowerSettingsDrawer() {
  const { t } = useI18n()
  const m = t.manpower
  const { teams, projects, timePoints } = useConfigStore()
  const { settingsDrawerVisible, closeSettingsDrawer, appMode } = useUIStore()
  const [width, setWidth] = useState(getStoredWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('team')

  // Only render when in manpower mode
  const visible = settingsDrawerVisible && appMode === 'manpower'

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth))
      setWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      try {
        localStorage.setItem(STORAGE_KEY, width.toString())
      } catch {}
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, width])

  const items = [
    {
      key: 'team',
      label: <span><TeamOutlined /> {m.teamConfig}</span>,
      children: (
        <div className={styles.tabContent}>
          <TeamConfig />
        </div>
      ),
    },
    {
      key: 'project',
      label: <span><ProjectOutlined /> {m.projectConfig}</span>,
      children: (
        <div className={styles.tabContent}>
          <ProjectConfig />
        </div>
      ),
    },
    {
      key: 'time',
      label: <span><ClockCircleOutlined /> {m.timePointConfig}</span>,
      children: (
        <div className={styles.tabContent}>
          <TimeConfig />
        </div>
      ),
    },
  ]

  return (
    <Drawer
      title={m.config}
      placement="right"
      width={width}
      open={visible}
      onClose={closeSettingsDrawer}
      className={styles.drawer}
      extra={
        <Space size="large" style={{ fontSize: 14 }}>
          <Text type="secondary">{m.teamConfig}: <Text strong>{teams.length}</Text></Text>
          <Text type="secondary">{m.projectConfig}: <Text strong>{projects.length}</Text></Text>
          <Text type="secondary">{m.timePointConfig}: <Text strong>{timePoints.length}</Text></Text>
        </Space>
      }
    >
      <div
        className={styles.resizeHandle}
        onMouseDown={() => setIsResizing(true)}
      />
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        className={styles.tabs}
      />
    </Drawer>
  )
}
