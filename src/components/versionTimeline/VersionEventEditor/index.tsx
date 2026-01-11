import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, Select, Button, Space, Tag, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import type { VersionEvent, VersionEventType } from '@/types/versionTimeline'
import styles from './VersionEventEditor.module.css'

interface VersionEventEditorProps {
  open: boolean
  onClose: () => void
  timelineId: string
  event?: VersionEvent | null  // null for new event
}

interface EventTypeConfig {
  value: VersionEventType
  labelKey: 'eventType_major' | 'eventType_minor' | 'eventType_patch' | 'eventType_milestone'
  color: string
}

const EVENT_TYPES: EventTypeConfig[] = [
  { value: 'major', labelKey: 'eventType_major', color: 'red' },
  { value: 'minor', labelKey: 'eventType_minor', color: 'blue' },
  { value: 'patch', labelKey: 'eventType_patch', color: 'green' },
  { value: 'milestone', labelKey: 'eventType_milestone', color: 'purple' },
]

// 生成年份选项 (1900-2100)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 201 }, (_, i) => ({
    value: 1900 + i,
    label: `${1900 + i}`,
  }))
}

// 月份选项
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}`.padStart(2, '0'),
}))

export const VersionEventEditor: React.FC<VersionEventEditorProps> = ({
  open,
  onClose,
  timelineId,
  event,
}) => {
  const { t } = useI18n()
  const { addVersionEvent, updateVersionEvent, deleteVersionEvent } = useRadarStore()
  const [form] = Form.useForm()
  const [highlights, setHighlights] = useState<string[]>([])
  const [highlightInput, setHighlightInput] = useState('')

  const isEditing = !!event

  useEffect(() => {
    if (open) {
      if (event) {
        form.setFieldsValue({
          year: event.year,
          month: event.month,
          title: event.title,
          description: event.description || '',
          type: event.type,
        })
        setHighlights(event.highlight || [])
      } else {
        form.resetFields()
        form.setFieldsValue({
          year: new Date().getFullYear(),
          type: 'minor',
        })
        setHighlights([])
      }
      setHighlightInput('')
    }
  }, [open, event, form])

  const handleAddHighlight = () => {
    const trimmed = highlightInput.trim()
    if (trimmed && !highlights.includes(trimmed)) {
      setHighlights([...highlights, trimmed])
      setHighlightInput('')
    }
  }

  const handleRemoveHighlight = (keyword: string) => {
    setHighlights(highlights.filter(h => h !== keyword))
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const eventData: Partial<VersionEvent> = {
        year: values.year,
        month: values.month,
        title: values.title,
        description: values.description || undefined,
        type: values.type,
        highlight: highlights.length > 0 ? highlights : undefined,
        position: 'top',
      }

      if (isEditing && event) {
        updateVersionEvent(timelineId, event.id, eventData)
      } else {
        addVersionEvent(timelineId, eventData)
      }

      onClose()
    } catch {
      // Validation failed
    }
  }

  const handleDelete = () => {
    if (event) {
      Modal.confirm({
        title: t.versionTimeline.deleteEventConfirm,
        okText: t.common.delete,
        okType: 'danger',
        cancelText: t.common.cancel,
        onOk: () => {
          deleteVersionEvent(timelineId, event.id)
          onClose()
        },
      })
    }
  }

  return (
    <Modal
      title={isEditing ? t.versionTimeline.editEvent : t.versionTimeline.addEvent}
      open={open}
      onCancel={onClose}
      footer={
        <div className={styles.footer}>
          {isEditing && (
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              {t.common.delete}
            </Button>
          )}
          <Space style={{ marginLeft: 'auto' }}>
            <Button onClick={onClose}>{t.common.cancel}</Button>
            <Button type="primary" onClick={handleSubmit}>
              {isEditing ? t.common.save : t.common.add}
            </Button>
          </Space>
        </div>
      }
      width={520}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        className={styles.form}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="year"
              label={t.versionTimeline.year}
              rules={[{ required: true, message: t.versionTimeline.yearRequired }]}
            >
              <Select
                showSearch
                placeholder={t.versionTimeline.yearPlaceholder}
                options={generateYearOptions()}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="month"
              label={t.versionTimeline.month || 'Month (Optional)'}
            >
              <Select
                placeholder={t.versionTimeline.monthPlaceholder || 'Select month'}
                options={MONTH_OPTIONS}
                allowClear
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="title"
          label={t.versionTimeline.eventTitle}
          rules={[{ required: true, message: t.versionTimeline.titleRequired }]}
        >
          <Input placeholder={t.versionTimeline.titlePlaceholder} />
        </Form.Item>

        <Form.Item
          name="description"
          label={t.versionTimeline.description}
        >
          <Input.TextArea
            rows={3}
            placeholder={t.versionTimeline.descriptionPlaceholder}
          />
        </Form.Item>

        <Form.Item
          name="type"
          label={t.versionTimeline.eventType}
          rules={[{ required: true }]}
        >
          <Select>
            {EVENT_TYPES.map(type => (
              <Select.Option key={type.value} value={type.value}>
                <Tag color={type.color} style={{ marginRight: 8 }}>
                  {t.versionTimeline[type.labelKey]}
                </Tag>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={t.versionTimeline.highlights}>
          <div className={styles.highlightsContainer}>
            <div className={styles.highlightTags}>
              {highlights.map(keyword => (
                <Tag
                  key={keyword}
                  closable
                  onClose={() => handleRemoveHighlight(keyword)}
                  color="orange"
                >
                  {keyword}
                </Tag>
              ))}
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={highlightInput}
                onChange={e => setHighlightInput(e.target.value)}
                onPressEnter={handleAddHighlight}
                placeholder={t.versionTimeline.highlightPlaceholder}
              />
              <Button icon={<PlusOutlined />} onClick={handleAddHighlight}>
                {t.common.add}
              </Button>
            </Space.Compact>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default VersionEventEditor
