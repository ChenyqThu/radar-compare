import { Input, Popconfirm, Button, Select } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useConfigStore } from '../../stores'
import { useI18n } from '@/locales'
import type { TimePoint } from '../../types/data'
import styles from './ConfigTable.module.css'

interface TimeRowProps {
  timePoint: TimePoint
}

function TimeRow({ timePoint }: TimeRowProps) {
  const { updateTimePoint, removeTimePoint } = useConfigStore()
  const { t } = useI18n()
  const m = t.manpower

  const typeOptions: { value: TimePoint['type']; label: string; color: string }[] = [
    { value: 'current', label: m.typeCurrent, color: 'processing' },
    { value: 'planning', label: m.typePlanning, color: 'default' },
    { value: 'release', label: m.typeRelease, color: 'success' },
  ]

  return (
    <div className={styles.row}>
      <div className={styles.nameCell}>
        <Input
          value={timePoint.name}
          onChange={(e) => updateTimePoint(timePoint.id, { name: e.target.value })}
          placeholder={m.timePointName}
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.dateCell}>
        <Input
          value={timePoint.date}
          onChange={(e) => updateTimePoint(timePoint.id, { date: e.target.value })}
          placeholder="YYYY-MM"
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.typeCell}>
        <Select
          value={timePoint.type}
          onChange={(val) => updateTimePoint(timePoint.id, { type: val })}
          variant="borderless"
          className={styles.select}
          options={typeOptions}
          size="small"
        />
      </div>
      <div className={styles.descCell}>
        <Input
          value={timePoint.description || ''}
          onChange={(e) => updateTimePoint(timePoint.id, { description: e.target.value })}
          placeholder={m.description}
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.actionCell}>
        <Popconfirm
          title={m.confirmDeleteTimePoint}
          onConfirm={() => removeTimePoint(timePoint.id)}
          okText={t.common.confirm}
          cancelText={t.common.cancel}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" className={styles.actionBtn} />
        </Popconfirm>
      </div>
    </div>
  )
}

export function TimeConfig() {
  const { timePoints, addTimePoint } = useConfigStore()
  const { t } = useI18n()
  const m = t.manpower

  // Sort by date
  const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>
        <div className={styles.nameCell}>{m.timePointName}</div>
        <div className={styles.dateCell}>{m.date}</div>
        <div className={styles.typeCell}>{m.type}</div>
        <div className={styles.descCell}>{m.description}</div>
        <div className={styles.actionCell}>{t.common.action}</div>
      </div>

      <div className={styles.tableBody}>
        {sortedTimePoints.map((timePoint) => (
          <TimeRow key={timePoint.id} timePoint={timePoint} />
        ))}
      </div>

      <div className={styles.addRow} onClick={() => addTimePoint({ name: '', date: '', type: 'planning', description: '' })}>
        <PlusOutlined />
        <span>{m.addTimePoint}</span>
      </div>

      {timePoints.length === 0 && (
        <div className={styles.empty}>{m.noData || '暂无数据'}</div>
      )}
    </div>
  )
}
