/**
 * PetalConfigPanel - Petal Chart Configuration Panel
 *
 * Configurable options:
 * - Petal shape (diamond/petal/sector/circle)
 * - Size scale mode (linear/sqrt/log)
 * - Size range (min/max)
 * - Animation toggle
 * - Display options (legend/grid/tooltip)
 */

import { Form, Switch, Slider, Radio, Space, Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useI18n } from '@/locales'
import type { PetalConfig, MatrixConfig } from '@/types/productMatrix'
import styles from './PetalConfigPanel.module.css'

// Shape icon components for visual selection
const ShapeIcon = ({ shape }: { shape: string }) => {
  const iconStyle = { width: 20, height: 20 }
  switch (shape) {
    case 'diamond':
      return (
        <svg viewBox="0 0 24 24" style={iconStyle}>
          <path d="M12 2L22 12L12 22L2 12Z" fill="currentColor" />
        </svg>
      )
    case 'petal':
      return (
        <svg viewBox="0 0 24 24" style={iconStyle}>
          <path d="M12 2C12 2 18 8 18 12C18 16 12 22 12 22C12 22 6 16 6 12C6 8 12 2 12 2Z" fill="currentColor" />
        </svg>
      )
    case 'sector':
      return (
        <svg viewBox="0 0 24 24" style={iconStyle}>
          <path d="M12 2L22 12A10 10 0 0 1 12 22V2Z" fill="currentColor" />
        </svg>
      )
    case 'circle':
      return (
        <svg viewBox="0 0 24 24" style={iconStyle}>
          <circle cx="12" cy="12" r="10" fill="currentColor" />
        </svg>
      )
    default:
      return null
  }
}

interface PetalConfigPanelProps {
  petalConfig: PetalConfig
  matrixConfig: MatrixConfig
  onPetalChange: (updates: Partial<PetalConfig>) => void
  onMatrixChange: (updates: Partial<MatrixConfig>) => void
  readonly?: boolean
}

export function PetalConfigPanel({
  petalConfig,
  matrixConfig,
  onPetalChange,
  onMatrixChange,
  readonly = false,
}: PetalConfigPanelProps) {
  const { t } = useI18n()
  const m = t.productMatrix

  const shapeOptions = [
    { value: 'diamond', label: m.shapeDiamond },
    { value: 'petal', label: m.shapePetal },
    { value: 'sector', label: m.shapeSector },
    { value: 'circle', label: m.shapeCircle },
  ]

  return (
    <div className={styles.container}>
      {/* Shape Selection */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{m.petalShape}</div>
        <div className={styles.shapeGrid}>
          {shapeOptions.map((opt) => (
            <Tooltip key={opt.value} title={opt.label}>
              <button
                type="button"
                className={`${styles.shapeButton} ${petalConfig.shape === opt.value ? styles.shapeButtonActive : ''}`}
                onClick={() => !readonly && onPetalChange({ shape: opt.value as PetalConfig['shape'] })}
                disabled={readonly}
              >
                <ShapeIcon shape={opt.value} />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Size Configuration */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          {m.sizeScale}
          <Tooltip title="Controls how product count maps to petal size">
            <InfoCircleOutlined className={styles.infoIcon} />
          </Tooltip>
        </div>

        <Form.Item label={`${m.minPetalSize} / ${m.maxPetalSize}`} style={{ marginBottom: 12 }}>
          <Slider
            range
            min={10}
            max={100}
            value={[petalConfig.minPetalSize, petalConfig.maxPetalSize]}
            onChange={(val) => onPetalChange({ minPetalSize: val[0], maxPetalSize: val[1] })}
            marks={{ 10: 'XS', 50: 'M', 100: 'XL' }}
            disabled={readonly}
          />
        </Form.Item>

        <div className={styles.optionRow}>
          <span>{m.sizeScale}</span>
          <Radio.Group
            size="small"
            value={petalConfig.sizeScale}
            onChange={(e) => onPetalChange({ sizeScale: e.target.value })}
            optionType="button"
            disabled={readonly}
          >
            <Radio value="linear">{m.scaleLinear}</Radio>
            <Radio value="sqrt">{m.scaleSqrt}</Radio>
            <Radio value="log">{m.scaleLog}</Radio>
          </Radio.Group>
        </div>
      </div>

      {/* Animation */}
      <div className={styles.section}>
        <div className={styles.optionRow}>
          <span>{m.enableAnimation}</span>
          <Switch
            checked={petalConfig.animationEnabled}
            onChange={(v) => onPetalChange({ animationEnabled: v })}
            size="small"
            disabled={readonly}
          />
        </div>
      </div>

      {/* Display Options */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{m.displayOptions}</div>
        <Space direction="vertical" className={styles.optionList}>
          <div className={styles.optionRow}>
            <span>{m.showLegend}</span>
            <Switch
              checked={matrixConfig.showLegend}
              onChange={(checked) => onMatrixChange({ showLegend: checked })}
              size="small"
              disabled={readonly}
            />
          </div>
          <div className={styles.optionRow}>
            <span>{m.showGrid}</span>
            <Switch
              checked={matrixConfig.showGrid}
              onChange={(checked) => onMatrixChange({ showGrid: checked })}
              size="small"
              disabled={readonly}
            />
          </div>
          <div className={styles.optionRow}>
            <span>{m.showTooltip}</span>
            <Switch
              checked={matrixConfig.showTooltip}
              onChange={(checked) => onMatrixChange({ showTooltip: checked })}
              size="small"
              disabled={readonly}
            />
          </div>
        </Space>
      </div>
    </div>
  )
}
