import { Select, Space } from 'antd'
import { useI18n } from '@/locales'
import type { TimeMarker } from '@/types'

interface TimeMarkerPickerProps {
  value?: TimeMarker | null
  onChange: (value: TimeMarker | null) => void
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
  allowClear?: boolean
}

// 生成年份选项 (2020-2030)
const yearOptions = Array.from({ length: 11 }, (_, i) => ({
  value: 2020 + i,
  label: `${2020 + i}`,
}))

// 月份选项
const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`.padStart(2, '0'),
}))

export function TimeMarkerPicker({
  value,
  onChange,
  disabled = false,
  size = 'small',
  allowClear = true,
}: TimeMarkerPickerProps) {
  const { t } = useI18n()

  const handleYearChange = (year: number | null) => {
    if (year === null) {
      onChange(null)
    } else {
      onChange({ year, month: value?.month ?? 1 })
    }
  }

  const handleMonthChange = (month: number) => {
    if (value?.year) {
      onChange({ year: value.year, month })
    }
  }

  return (
    <Space size={4}>
      <Select
        placeholder={t.timeline.selectYear}
        value={value?.year ?? null}
        onChange={handleYearChange}
        options={yearOptions}
        disabled={disabled}
        size={size}
        style={{ width: 80 }}
        allowClear={allowClear}
      />
      <Select
        placeholder={t.timeline.selectMonth}
        value={value?.month ?? null}
        onChange={handleMonthChange}
        options={monthOptions}
        disabled={disabled || !value?.year}
        size={size}
        style={{ width: 65 }}
      />
    </Space>
  )
}

// 格式化时间标记为显示文本
export function formatTimeMarker(marker: TimeMarker | undefined, lang: 'zh-CN' | 'en-US'): string {
  if (!marker) return ''
  if (lang === 'zh-CN') {
    return `${marker.year}年${marker.month}月`
  }
  return `${marker.year}/${String(marker.month).padStart(2, '0')}`
}
