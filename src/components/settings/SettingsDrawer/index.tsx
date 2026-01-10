import { useState, useEffect } from 'react'
import { Drawer, Tabs } from 'antd'
import { AppstoreOutlined, TeamOutlined } from '@ant-design/icons'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { VendorManager } from '../VendorManager'
import { DimensionManager } from '../DimensionManager'
import { ScoreSummary } from '../ScoreSummary'
import styles from './SettingsDrawer.module.css'

const MIN_WIDTH = 480
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 600
const STORAGE_KEY = 'radar-settings-drawer-width'

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

export function SettingsDrawer() {
  const { settingsDrawerVisible, closeSettingsDrawer, activeSettingsTab, setActiveSettingsTab } = useUIStore()
  const { t } = useI18n()
  const [width, setWidth] = useState(getStoredWidth)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth))
      setWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      // 保存宽度到 localStorage
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
      key: 'dimension',
      label: <span><AppstoreOutlined /> {t.settings.dimensionTab}</span>,
      children: (
        <div className={styles.tabContent}>
          <DimensionManager />
        </div>
      ),
    },
    {
      key: 'vendor',
      label: <span><TeamOutlined /> {t.settings.vendorTab}</span>,
      children: (
        <div className={styles.tabContent}>
          <VendorManager />
        </div>
      ),
    },
  ]

  return (
    <Drawer
      title={t.settings.title}
      placement="right"
      width={width}
      open={settingsDrawerVisible}
      onClose={closeSettingsDrawer}
      className={styles.drawer}
      extra={<ScoreSummary />}
    >
      <div
        className={styles.resizeHandle}
        onMouseDown={() => setIsResizing(true)}
      />
      <Tabs
        activeKey={activeSettingsTab}
        onChange={(key) => setActiveSettingsTab(key as 'vendor' | 'dimension')}
        items={items}
        className={styles.tabs}
      />
    </Drawer>
  )
}
