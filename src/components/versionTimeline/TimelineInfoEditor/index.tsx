import React, { useEffect } from 'react'
import { Modal, Form, Input, Button, Upload, message, ColorPicker, Select, Divider } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd'
import type { Color } from 'antd/es/color-picker'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import type { TimelineInfo, TimelineTheme } from '@/types/versionTimeline'
import styles from './TimelineInfoEditor.module.css'

// Theme presets with their primary colors
const THEME_PRESETS: { value: TimelineTheme; color: string }[] = [
  { value: 'teal', color: '#0A7171' },
  { value: 'blue', color: '#1677FF' },
  { value: 'purple', color: '#722ED1' },
  { value: 'orange', color: '#FA541C' },
  { value: 'green', color: '#52C41A' },
  { value: 'rainbow', color: 'linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4, #FFEAA7)' },
  { value: 'monochrome', color: '#666666' },
]

interface TimelineInfoEditorProps {
  open: boolean
  onClose: () => void
  timelineId: string
}

export const TimelineInfoEditor: React.FC<TimelineInfoEditorProps> = ({
  open,
  onClose,
  timelineId,
}) => {
  const { t } = useI18n()
  const { getVersionTimelineById, updateTimelineInfo } = useRadarStore()
  const [form] = Form.useForm()

  const timeline = getVersionTimelineById(timelineId)

  useEffect(() => {
    if (open && timeline) {
      form.setFieldsValue({
        title: timeline.info.title,
        company: timeline.info.company || '',
        logo: timeline.info.logo || '',
        themeColor: timeline.info.themeColor || '#0A7171',
        theme: timeline.info.theme || 'teal',
      })
    }
  }, [open, timeline, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const themeColorValue = typeof values.themeColor === 'object'
        ? (values.themeColor as Color).toHexString()
        : values.themeColor

      const info: TimelineInfo = {
        title: values.title,
        company: values.company || undefined,
        logo: values.logo || undefined,
        themeColor: themeColorValue || undefined,
        theme: values.theme || undefined,
      }

      updateTimelineInfo(timelineId, info)
      message.success(t.common.saveSuccess || 'Saved successfully')
      onClose()
    } catch {
      // Validation failed
    }
  }

  const handleUploadChange = (info: { file: UploadFile }) => {
    if (info.file.status === 'done') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        form.setFieldValue('logo', dataUrl)
      }
      reader.readAsDataURL(info.file.originFileObj as Blob)
    }
  }

  const handleThemeChange = (theme: TimelineTheme) => {
    const preset = THEME_PRESETS.find(p => p.value === theme)
    if (preset && !preset.color.startsWith('linear')) {
      form.setFieldValue('themeColor', preset.color)
    }
  }

  const getThemeLabel = (theme: TimelineTheme) => {
    const key = `theme_${theme}` as keyof typeof t.versionTimeline
    return t.versionTimeline[key] || theme
  }

  return (
    <Modal
      title={t.versionTimeline.editInfo}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {t.common.cancel}
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {t.common.save}
        </Button>,
      ]}
      width={520}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className={styles.form}
      >
        <Form.Item
          name="title"
          label={t.versionTimeline.title}
          rules={[{ required: true, message: t.versionTimeline.titleRequired || 'Please enter title' }]}
        >
          <Input placeholder={t.versionTimeline.titlePlaceholder} />
        </Form.Item>

        <Form.Item
          name="company"
          label={t.versionTimeline.company}
        >
          <Input placeholder="Enter company name (optional)" />
        </Form.Item>

        <Form.Item
          name="logo"
          label="Logo URL"
        >
          <Input placeholder="Enter logo URL or upload image" />
        </Form.Item>

        <Form.Item label="Upload Logo">
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={({ onSuccess }) => {
              setTimeout(() => {
                onSuccess?.('ok')
              }, 0)
            }}
            onChange={handleUploadChange}
          >
            <Button icon={<UploadOutlined />}>
              {t.common.upload || 'Upload Image'}
            </Button>
          </Upload>
          <div className={styles.hint}>
            Supports JPG, PNG. Recommended size: 200x50px
          </div>
        </Form.Item>

        {form.getFieldValue('logo') && (
          <div className={styles.logoPreview}>
            <div className={styles.previewLabel}>Logo Preview:</div>
            <img src={form.getFieldValue('logo')} alt="Logo" className={styles.previewImage} />
          </div>
        )}

        <Divider />

        <Form.Item
          name="theme"
          label={t.versionTimeline.timelineTheme}
        >
          <Select
            onChange={handleThemeChange}
            options={THEME_PRESETS.map(preset => ({
              value: preset.value,
              label: (
                <div className={styles.themeOption}>
                  <span
                    className={styles.themeColorDot}
                    style={{
                      background: preset.color,
                    }}
                  />
                  <span>{getThemeLabel(preset.value)}</span>
                </div>
              ),
            }))}
          />
        </Form.Item>

        <Form.Item
          name="themeColor"
          label={t.versionTimeline.themeColor}
          tooltip={t.versionTimeline.themeColorHint}
        >
          <ColorPicker
            showText
            format="hex"
            presets={[
              {
                label: 'Presets',
                colors: THEME_PRESETS.filter(p => !p.color.startsWith('linear')).map(p => p.color),
              },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default TimelineInfoEditor
