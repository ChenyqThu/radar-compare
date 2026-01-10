import { Select, Space, Button } from 'antd'
import { useState, useEffect } from 'react'
import { useI18n } from '@/locales'
import type { TimeMarker } from '@/types'

interface TimeMarkerPickerProps {
  value?: TimeMarker | null
  onChange: (value: TimeMarker | null) => void
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
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
}: TimeMarkerPickerProps) {
  const { t } = useI18n()

  // 内部状态暂存选择
  const [tempYear, setTempYear] = useState<number | undefined>(value?.year)
  const [tempMonth, setTempMonth] = useState<number | undefined>(value?.month)

  // 当外部 value 变化时，同步到内部状态
  useEffect(() => {
    setTempYear(value?.year)
    setTempMonth(value?.month)
  }, [value])

  const handleConfirm = () => {
    if (tempYear) {
      onChange({ year: tempYear, month: tempMonth })
    } else {
      onChange(null)
    }
  }

  const handleCancel = () => {
    // 恢复到初始值
    setTempYear(value?.year)
    setTempMonth(value?.month)
    onChange(null) // 通知外部关闭 Popover
  }

  const handleClear = () => {
    setTempYear(undefined)
    setTempMonth(undefined)
  }

  return (
    <Space direction="vertical" size={8} style={{ width: 180 }}>
      <Space size={4}>
        <Select
          placeholder={t.timeline.selectYear}
          value={tempYear}
          onChange={setTempYear}
          options={yearOptions}
          disabled={disabled}
          size={size}
          style={{ width: 80 }}
          allowClear
          onClear={handleClear}
        />
        <Select
          placeholder={t.timeline.selectMonth}
          value={tempMonth}
          onChange={setTempMonth}
          options={monthOptions}
          disabled={disabled || !tempYear}
          size={size}
          style={{ width: 80 }}
          allowClear
        />
      </Space>
      <Space size={4} style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button size="small" onClick={handleCancel}>
          {t.common.cancel}
        </Button>
        <Button size="small" type="primary" onClick={handleConfirm} disabled={!tempYear}>
          {t.common.confirm}
        </Button>
      </Space>
    </Space>
  )
}

// 格式化时间标记为显示文本
export function formatTimeMarker(marker: TimeMarker | undefined, lang: 'zh-CN' | 'en-US'): string {
  if (!marker) return ''
  if (marker.month) {
    if (lang === 'zh-CN') {
      return `${marker.year}年${marker.month}月`
    }
    return `${marker.year}/${String(marker.month).padStart(2, '0')}`
  }
  // 只有年份
  if (lang === 'zh-CN') {
    return `${marker.year}年`
  }
  return `${marker.year}`
}
