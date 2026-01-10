import { useState, useMemo } from 'react'
import { Modal, Input, Transfer, Alert, Form, Tag } from 'antd'
import type { TransferProps } from 'antd'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import { isRegularRadar } from '@/types'
import { formatTimeMarker } from '@/components/settings/TimeMarkerPicker'
import styles from './CreateTimelineModal.module.css'

interface CreateTimelineModalProps {
  open: boolean
  onClose: () => void
}

interface TransferItem {
  key: string
  title: string
  timeLabel: string
}

export function CreateTimelineModal({ open, onClose }: CreateTimelineModalProps) {
  const { currentProject, createTimelineRadar, validateTimelineConsistency } = useRadarStore()
  const { t, language } = useI18n()
  const [name, setName] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])

  // 获取所有有时间标记的普通雷达图
  const eligibleRadars = useMemo(() => {
    if (!currentProject) return []
    return currentProject.radarCharts
      .filter((r) => isRegularRadar(r) && r.timeMarker)
      .sort((a, b) => {
        if (!isRegularRadar(a) || !isRegularRadar(b)) return 0
        const aTime = (a.timeMarker?.year ?? 0) * 100 + (a.timeMarker?.month ?? 0)
        const bTime = (b.timeMarker?.year ?? 0) * 100 + (b.timeMarker?.month ?? 0)
        return aTime - bTime
      })
  }, [currentProject])

  // Transfer 数据源
  const dataSource: TransferItem[] = eligibleRadars.map((r) => {
    const radar = isRegularRadar(r) ? r : null
    return {
      key: r.id,
      title: r.name,
      timeLabel: radar?.timeMarker ? formatTimeMarker(radar.timeMarker, language) : '',
    }
  })

  // 校验结果
  const validation = useMemo(() => {
    if (selectedKeys.length < 2) {
      return { valid: false, errors: ['timeline.selectAtLeast2'] }
    }
    return validateTimelineConsistency(selectedKeys)
  }, [selectedKeys, validateTimelineConsistency])

  const handleCreate = () => {
    if (!validation.valid || !name.trim()) return
    const result = createTimelineRadar(name.trim(), selectedKeys)
    if (result.valid) {
      handleClose()
    }
  }

  const handleClose = () => {
    setName('')
    setSelectedKeys([])
    onClose()
  }

  const handleTransferChange: TransferProps['onChange'] = (nextTargetKeys) => {
    setSelectedKeys(nextTargetKeys as string[])
  }

  const filterOption = (inputValue: string, option: TransferItem) => {
    return option.title.toLowerCase().includes(inputValue.toLowerCase())
  }

  const renderItem = (item: TransferItem) => (
    <span className={styles.transferItem}>
      <span className={styles.itemTitle}>{item.title}</span>
      {item.timeLabel && <Tag color="blue" className={styles.itemTag}>{item.timeLabel}</Tag>}
    </span>
  )

  const canCreate = validation.valid && name.trim().length > 0

  return (
    <Modal
      title={t.timeline.createTimeline}
      open={open}
      onCancel={handleClose}
      onOk={handleCreate}
      okButtonProps={{ disabled: !canCreate }}
      okText={t.common.confirm}
      cancelText={t.common.cancel}
      width={600}
      destroyOnClose
    >
      <Form layout="vertical" className={styles.form}>
        <Form.Item label={t.timeline.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.timeline.createTimeline}
          />
        </Form.Item>

        <Form.Item label={t.timeline.selectSources}>
          {eligibleRadars.length === 0 ? (
            <Alert
              type="warning"
              message={t.timeline.noEligibleSources}
              showIcon
            />
          ) : (
            <Transfer
              dataSource={dataSource}
              targetKeys={selectedKeys}
              onChange={handleTransferChange}
              render={renderItem}
              filterOption={filterOption}
              showSearch
              listStyle={{ width: 230, height: 280 }}
              titles={['', t.timeline.sourcesPreview]}
            />
          )}
        </Form.Item>

        {selectedKeys.length > 0 && !validation.valid && (
          <Alert
            type="warning"
            message={validation.errors.map((e) => (t.timeline as any)[e.split('.')[1]] || e).join(', ')}
            showIcon
          />
        )}
      </Form>
    </Modal>
  )
}
