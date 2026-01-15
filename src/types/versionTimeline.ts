/**
 * 版本时间轴类型定义
 */

// 事件类型配置接口
export interface EventTypeConfig {
  label: string       // 显示名称（如 "关键节点"）
  color: string       // 颜色（HEX 格式，如 #ff4d4f）
  order?: number      // 排序权重（用于图例排序，可选）
}

// 版本事件类型（保留用于向后兼容）
export type VersionEventType =
  | 'major'        // 重大版本
  | 'minor'        // 次要版本
  | 'patch'        // 补丁版本
  | 'milestone'    // 里程碑

// 版本事件
export interface VersionEvent {
  id: string
  year: number                     // 发布年份
  month?: number                   // 发布月份（1-12，可选）
  title: string                    // 事件标题
  description?: string             // 详细描述
  type: string                     // 事件类型（支持自定义类型）
  position?: 'top' | 'bottom'      // 显示位置（上层或下层，由算法自动分配，可选）
  highlight?: string[]             // 需要高亮的关键词
  icon?: string                    // 图标（可选）
  order?: number                   // 同年内排序（可选，由布局算法自动计算）
}

// 时间轴主题类型
export type TimelineTheme =
  | 'teal'          // 青色系（默认）
  | 'blue'          // 蓝色系
  | 'purple'        // 紫色系
  | 'orange'        // 橙色系
  | 'green'         // 绿色系
  | 'rainbow'       // 彩虹渐变
  | 'monochrome'    // 单色渐变

// 卡片样式类型
export type CardStyle = 'classic' | 'glass'

// 产品线/公司信息
export interface TimelineInfo {
  logo?: string                    // Logo URL
  title: string                    // 标题（如"大事记"）
  company?: string                 // 公司名称
  themeColor?: string              // 主题色（HEX格式，如 #0A7171，作为未定义类型的回退颜色）
  theme?: TimelineTheme            // 时间轴主题样式
  cardStyle?: CardStyle            // 卡片样式（可选，默认 'classic'）
  eventTypes?: Record<string, EventTypeConfig>  // 事件类型注册表（Key: 类型ID, Value: 配置）
}

// 时间轴数据 (用于组件 props)
export interface TimelineData {
  info: TimelineInfo
  events: VersionEvent[]
  startYear?: number               // 起始年份（可选，自动计算）
  endYear?: number                 // 结束年份（可选，自动计算）
}

// 版本时间轴 Tab（存储在项目中）
export interface VersionTimeline {
  id: string
  name: string
  order: number
  isVersionTimeline: true          // 类型标识符
  info: TimelineInfo
  events: VersionEvent[]
  createdAt: number
  updatedAt: number
}


// 时间轴分段类型
export interface TimeSegment {
  startYear: number
  endYear: number
  pixelStart: number
  pixelWidth: number // 宽度
  scale: number // pixels per year (density)
  type: 'continuous' | 'compressed' | 'break'
}

// 时间轴分段配置
export interface TimeScaleConfig {
  segments: TimeSegment[]
  totalWidth: number
}

// 类型守卫
export function isVersionTimeline(chart: unknown): chart is VersionTimeline {
  return (
    typeof chart === 'object' &&
    chart !== null &&
    'isVersionTimeline' in chart &&
    (chart as VersionTimeline).isVersionTimeline === true
  )
}

// 默认事件类型配置
export const DEFAULT_EVENT_TYPES: Record<string, EventTypeConfig> = {
  major: { label: '重大版本', color: '#ff4d4f', order: 0 },
  minor: { label: '次要版本', color: '#1890ff', order: 1 },
  patch: { label: '补丁版本', color: '#52c41a', order: 2 },
  milestone: { label: '里程碑', color: '#faad14', order: 3 },
}
