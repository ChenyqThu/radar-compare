/**
 * AxisToolbar Component
 * Axis selectors and vendor legend for MatrixChart
 */

import { Select, Button, Divider } from 'antd'
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  SwapOutlined
} from '@ant-design/icons'
import { useConfigStore } from '../../../stores'
import type { MatrixDimension } from '@/types/productMatrix'
import styles from '../MatrixChart.module.css'

interface AxisToolbarProps {
  selectableDimensions: MatrixDimension[]
  xAxisDimId: string
  yAxisDimId: string
  hiddenVendors: Set<string>
  toggleVendor: (vendorId: string) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

/**
 * Toolbar component for axis selection and vendor legend
 */
export function AxisToolbar({
  selectableDimensions,
  xAxisDimId,
  yAxisDimId,
  hiddenVendors,
  toggleVendor,
  isFullscreen,
  onToggleFullscreen
}: AxisToolbarProps) {
  const { vendors, updateMatrixConfig } = useConfigStore()

  const dimensionOptions = selectableDimensions.map(d => ({
    label: d.name,
    value: d.id
  }))

  const handleSwapAxes = () => {
    updateMatrixConfig({
      xAxisDimensionId: yAxisDimId,
      yAxisDimensionId: xAxisDimId
    })
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.axisSelectors}>
        <Select
          value={xAxisDimId}
          onChange={v => updateMatrixConfig({ xAxisDimensionId: v })}
          options={dimensionOptions}
          size="small"
          className={styles.axisSelect}
        />
        <SwapOutlined onClick={handleSwapAxes} style={{ cursor: 'pointer' }} />
        <Select
          value={yAxisDimId}
          onChange={v => updateMatrixConfig({ yAxisDimensionId: v })}
          options={dimensionOptions}
          size="small"
          className={styles.axisSelect}
        />
        <Divider type="vertical" />
        {/* Vendor Legend Toggles */}
        {vendors.map(v => (
          <div
            key={v.id}
            onClick={() => toggleVendor(v.id)}
            style={{
              opacity: hiddenVendors.has(v.id) ? 0.3 : 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              marginRight: 8
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                background: v.color,
                borderRadius: '50%',
                marginRight: 4
              }}
            />
            <span style={{ fontSize: 12 }}>{v.name}</span>
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <Button
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          type="text"
          onClick={onToggleFullscreen}
        />
      </div>
    </div>
  )
}
