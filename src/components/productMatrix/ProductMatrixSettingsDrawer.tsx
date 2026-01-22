/**
 * ProductMatrixSettingsDrawer - Settings drawer for product matrix module
 *
 * Contains tabs for:
 * - Vendor configuration
 * - Dimension configuration
 * - Matrix settings (axes, display options)
 */

import { useState, useEffect } from 'react'
import { Drawer, Tabs, Typography, Space } from 'antd'
import { ShopOutlined, AppstoreOutlined, SettingOutlined } from '@ant-design/icons'
import { VendorConfig } from './modules/config/VendorConfig'
import { DimensionConfig } from './modules/config/DimensionConfig'
import { MatrixSettings } from './modules/config/MatrixSettings'
import { useConfigStore } from './stores/configStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import styles from './ProductMatrixSettingsDrawer.module.css'

const { Text } = Typography

const MIN_WIDTH = 480
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 560
const STORAGE_KEY = 'product-matrix-settings-drawer-width'

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

export function ProductMatrixSettingsDrawer() {
  const { t } = useI18n()
  const m = t.productMatrix
  const { vendors, dimensions } = useConfigStore()
  const { settingsDrawerVisible, closeSettingsDrawer, appMode } = useUIStore()
  const [width, setWidth] = useState(getStoredWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('vendor')

  // Only render when in product-matrix mode
  const visible = settingsDrawerVisible && appMode === 'product-matrix'

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
      key: 'vendor',
      label: <span><ShopOutlined /> {m.vendorConfig}</span>,
      children: (
        <div className={styles.tabContent}>
          <VendorConfig />
        </div>
      ),
    },
    {
      key: 'dimension',
      label: <span><AppstoreOutlined /> {m.dimensionConfig}</span>,
      children: (
        <div className={styles.tabContent}>
          <DimensionConfig />
        </div>
      ),
    },
    {
      key: 'settings',
      label: <span><SettingOutlined /> {m.matrixSettings}</span>,
      children: (
        <div className={styles.tabContent}>
          <MatrixSettings />
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
          <Text type="secondary">{m.vendorConfig}: <Text strong>{vendors.length}</Text></Text>
          <Text type="secondary">{m.dimensionConfig}: <Text strong>{dimensions.length}</Text></Text>
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
