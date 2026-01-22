import { useCallback, useMemo } from 'react'
import { Select, Space } from 'antd'
import { useI18n } from '@/locales'
import { PRODUCT_STATUS_CONFIG, ProductStatus } from '@/types/productMatrix'

interface StatusFilterProps {
  value: ProductStatus[]
  onChange: (statuses: ProductStatus[]) => void
  disabled?: boolean
}

/** Status color dot indicator */
function StatusDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  )
}

/**
 * Product status multi-select filter component.
 * Displays status options with color indicators.
 */
export function StatusFilter({ value, onChange, disabled = false }: StatusFilterProps) {
  const { t } = useI18n()

  // Build options from PRODUCT_STATUS_CONFIG
  const options = useMemo(() => {
    return Object.entries(PRODUCT_STATUS_CONFIG).map(([key, config]) => {
      // Use i18n label key, fallback to Chinese label
      const label = t.productMatrix?.[config.labelKey as keyof typeof t.productMatrix] || config.label
      return {
        label: (
          <Space size={6}>
            <StatusDot color={config.color} />
            <span>{label}</span>
          </Space>
        ),
        value: key as ProductStatus,
      }
    })
  }, [t])

  const handleChange = useCallback(
    (selected: ProductStatus[]) => {
      onChange(selected)
    },
    [onChange]
  )

  // "All" placeholder when nothing selected
  const placeholder = t.productMatrix?.allStatuses || 'All Statuses'

  return (
    <Select
      mode="multiple"
      allowClear
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      options={options}
      maxTagCount="responsive"
      style={{ minWidth: 140 }}
      popupMatchSelectWidth={false}
      optionFilterProp="label"
      filterOption={(input, option) => {
        // Search by status label text
        const key = option?.value as ProductStatus
        const config = PRODUCT_STATUS_CONFIG[key]
        if (!config) return false
        const label = t.productMatrix?.[config.labelKey as keyof typeof t.productMatrix] || config.label
        return String(label).toLowerCase().includes(input.toLowerCase())
      }}
    />
  )
}
