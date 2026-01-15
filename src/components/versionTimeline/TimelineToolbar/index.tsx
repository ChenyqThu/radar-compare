import { Button, Space, Dropdown, message } from 'antd'
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  EditOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import styles from './TimelineToolbar.module.css'

interface TimelineToolbarProps {
  onAddEvent: () => void
  onEditInfo: () => void
  onImport: () => void
}

export function TimelineToolbar({ onAddEvent, onEditInfo, onImport }: TimelineToolbarProps) {
  const { t } = useI18n()
  const timeline = useRadarStore(state => state.getActiveVersionTimeline())

  const handleExportJson = () => {
    if (!timeline) {
      message.warning(t.versionTimeline.noTimeline)
      return
    }

    const jsonData = JSON.stringify(timeline, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${timeline.name}.json`
    link.click()
    URL.revokeObjectURL(url)
    message.success(t.toolbar.exportSuccess)
  }

  const handleDownloadTemplate = () => {
    // Create a comprehensive template with documentation
    const template = {
      _comment: '时间轴数据模板 - Timeline Data Template',
      _instructions: {
        description: '本模板展示了时间轴数据的完整结构和字段说明',
        usage: '请根据示例修改数据，然后通过导入功能上传此 JSON 文件',
        fields: {
          name: '时间轴名称',
          chartType: '图表类型，固定为 "versionTimeline"',
          info: {
            title: '时间轴标题（显示在视图顶部）',
            company: '公司/组织名称（可选）',
            logo: 'Logo 图片 URL（可选）',
            theme: '主题颜色：teal(青色)/blue(蓝色)/purple(紫色)/orange(橙色)/green(绿色)/rainbow(彩虹)/monochrome(单色)',
            themeColor: '自定义主题色（HEX 格式，可选）',
            cardStyle: '卡片样式（可选，classic 或 glass，默认 classic）',
            eventTypes: '事件类型定义（可选）'
          },
          events: {
            year: '年份（必填，整数）',
            month: '月份（可选，1-12）',
            title: '事件标题（必填）',
            description: '事件描述（可选）',
            type: '事件类型（必填，如 milestone/major/minor）',
            highlight: '高亮关键词数组（可选）'
          }
        }
      },
      name: '产品发展历程',
      chartType: 'versionTimeline',
      info: {
        title: '产品大事记',
        company: 'Your Company',
        theme: 'teal',
        themeColor: '#0A7171',
        cardStyle: 'classic',
        eventTypes: {
          milestone: {
            label: '里程碑',
            color: '#1890ff'
          },
          major: {
            label: '主要版本',
            color: '#52c41a'
          },
          funding: {
            label: '融资',
            color: '#fa8c16'
          },
          achievement: {
            label: '成就',
            color: '#13c2c2'
          }
        }
      },
      events: [
        {
          year: 2020,
          month: 1,
          title: '公司成立',
          description: '在深圳成立，开始产品研发',
          type: 'milestone'
        },
        {
          year: 2020,
          month: 6,
          title: '推出 v1.0',
          description: '首个正式版本发布',
          type: 'major'
        },
        {
          year: 2021,
          month: 3,
          title: '获得 A 轮融资',
          description: '完成 A 轮融资，金额 $5000万',
          type: 'funding',
          highlight: ['$5000万']
        },
        {
          year: 2021,
          month: 9,
          title: '推出 v2.0',
          description: '全新架构，性能提升 300%',
          type: 'major',
          highlight: ['300%']
        },
        {
          year: 2022,
          month: 5,
          title: '用户突破 100 万',
          description: '全球活跃用户达到 100 万',
          type: 'achievement',
          highlight: ['100 万']
        }
      ]
    }

    const jsonData = JSON.stringify(template, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'timeline-template.json'
    link.click()
    URL.revokeObjectURL(url)
    message.success(t.toolbar.exportSuccess)
  }

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'json',
      icon: <FileTextOutlined />,
      label: t.toolbar.exportJSON,
      onClick: handleExportJson,
    },
    {
      type: 'divider',
    },
    {
      key: 'template',
      icon: <FileExcelOutlined />,
      label: t.toolbar.downloadTemplate,
      onClick: handleDownloadTemplate,
    },
  ]

  return (
    <div className={styles.container}>
      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAddEvent}>
          {t.versionTimeline.addEvent}
        </Button>
        <Button icon={<EditOutlined />} onClick={onEditInfo}>
          {t.versionTimeline.editInfo}
        </Button>
        <Dropdown menu={{ items: exportMenuItems }}>
          <Button icon={<DownloadOutlined />}>{t.toolbar.export}</Button>
        </Dropdown>
        <Button icon={<UploadOutlined />} onClick={onImport}>
          {t.toolbar.import}
        </Button>
      </Space>
    </div>
  )
}

export default TimelineToolbar
