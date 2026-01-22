/**
 * MatrixSettings component for Product Matrix module
 *
 * Allows configuration of:
 * - X/Y axis dimension selection
 * - Cell layout mode (scatter, petal)
 * - Display options (labels, legend, grid)
 */


import { useMemo } from 'react'
import { Form, Select, Switch, Button, Divider, Space, Typography, Slider, Radio } from 'antd'
import { SwapOutlined } from '@ant-design/icons'
import { useConfigStore } from '../../stores/configStore'
import { useI18n } from '@/locales'
import styles from './MatrixSettings.module.css'
import { NotionIcon } from '../../common/NotionIcon'

const { Text } = Typography

export function MatrixSettings() {
  const { t } = useI18n()
  const m = t.productMatrix
  const { dimensions, matrixConfig, petalConfig, updateMatrixConfig, updatePetalConfig } = useConfigStore()

  // Dimension options for axis selection
  const dimensionOptions = useMemo(() => {
    return dimensions.map(dim => ({
      value: dim.id,
      label: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <NotionIcon icon={dim.icon} variant="text" size={16} iconSize={14} style={{ marginRight: 4 }} />
          {dim.name}
        </div>
      ),
    }))
  }, [dimensions])

  // Handle X axis change
  const handleXAxisChange = (dimensionId: string) => {
    if (dimensionId === matrixConfig?.yAxisDimensionId) {
      updateMatrixConfig({
        xAxisDimensionId: dimensionId,
        yAxisDimensionId: matrixConfig?.xAxisDimensionId || null,
      })
    } else {
      updateMatrixConfig({ xAxisDimensionId: dimensionId })
    }
  }

  // Handle Y axis change
  const handleYAxisChange = (dimensionId: string) => {
    if (dimensionId === matrixConfig?.xAxisDimensionId) {
      updateMatrixConfig({
        yAxisDimensionId: dimensionId,
        xAxisDimensionId: matrixConfig?.yAxisDimensionId || null,
      })
    } else {
      updateMatrixConfig({ yAxisDimensionId: dimensionId })
    }
  }

  // Swap X and Y axes
  const handleSwapAxes = () => {
    updateMatrixConfig({
      xAxisDimensionId: matrixConfig?.yAxisDimensionId || null,
      yAxisDimensionId: matrixConfig?.xAxisDimensionId || null,
    })
  }

  if (dimensions.length < 2) {
    return (
      <div className={styles.emptyState}>
        <Text type="secondary">{m.minTwoDimensions}</Text>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Axis Configuration */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{m.axisConfig}</div>
        <div className={styles.axisRow}>
          <Form.Item label={m.xAxis} className={styles.axisItem}>
            <Select
              value={matrixConfig?.xAxisDimensionId}
              onChange={handleXAxisChange}
              options={dimensionOptions}
              placeholder={m.selectDimension}
              allowClear
            />
          </Form.Item>
          <Button
            icon={<SwapOutlined />}
            onClick={handleSwapAxes}
            className={styles.swapButton}
            title={m.swapAxes}
          />
          <Form.Item label={m.yAxis} className={styles.axisItem}>
            <Select
              value={matrixConfig?.yAxisDimensionId}
              onChange={handleYAxisChange}
              options={dimensionOptions}
              placeholder={m.selectDimension}
              allowClear
            />
          </Form.Item>
        </div>
      </div>

      <Divider />

      {/* Petal Configuration */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{m.petalSettings}</div>

        <Form.Item label={m.petalShape} style={{ marginBottom: 12 }}>
          <Select
            value={petalConfig?.shape || 'diamond'}
            onChange={(v) => updatePetalConfig({ shape: v })}
            options={[
              { value: 'diamond', label: m.shapeDiamond },
              { value: 'petal', label: m.shapePetal },
              { value: 'sector', label: m.shapeSector },
              { value: 'circle', label: m.shapeCircle },
            ]}
          />
        </Form.Item>

        <Form.Item label={m.sizeScale + ' (Min/Max)'} style={{ marginBottom: 12 }}>
          <Slider
            range
            min={10}
            max={100}
            value={[petalConfig?.minPetalSize || 20, petalConfig?.maxPetalSize || 60]}
            onChange={(val) => updatePetalConfig({ minPetalSize: val[0], maxPetalSize: val[1] })}
            marks={{ 10: 'XS', 50: 'M', 100: 'XL' }}
          />
        </Form.Item>

        <div className={styles.optionRow}>
          <span>{m.sizeScale}</span>
          <Radio.Group
            size="small"
            value={petalConfig?.sizeScale || 'sqrt'}
            onChange={e => updatePetalConfig({ sizeScale: e.target.value })}
            optionType="button"
          >
            <Radio value="linear">{m.scaleLinear}</Radio>
            <Radio value="sqrt">{m.scaleSqrt}</Radio>
            <Radio value="log">{m.scaleLog}</Radio>
          </Radio.Group>
        </div>

        <div className={styles.optionRow}>
          <span>{m.enableAnimation}</span>
          <Switch
            checked={petalConfig?.animationEnabled}
            onChange={v => updatePetalConfig({ animationEnabled: v })}
            size="small"
          />
        </div>
      </div>

      <Divider />

      {/* Display Options */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{m.displayOptions}</div>
        <Space direction="vertical" className={styles.optionList}>
          <div className={styles.optionRow}>
            <span>{m.showLegend}</span>
            <Switch
              checked={matrixConfig?.showLegend ?? true}
              onChange={(checked) => updateMatrixConfig({ showLegend: checked })}
              size="small"
            />
          </div>
          <div className={styles.optionRow}>
            <span>{m.showGrid}</span>
            <Switch
              checked={matrixConfig?.showGrid ?? true}
              onChange={(checked) => updateMatrixConfig({ showGrid: checked })}
              size="small"
            />
          </div>
          <div className={styles.optionRow}>
            <span>{m.showTooltip}</span>
            <Switch
              checked={matrixConfig?.showTooltip ?? true}
              onChange={(checked) => updateMatrixConfig({ showTooltip: checked })}
              size="small"
            />
          </div>
        </Space>
      </div>
    </div>
  )
}

