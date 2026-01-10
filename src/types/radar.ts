export type UUID = string

export type MarkerType = 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow'

export interface SubDimension {
  id: UUID
  name: string
  description: string
  weight: number // 0-100
  order: number
  scores: Record<UUID, number> // vendorId -> score (0-10)
}

export interface Dimension {
  id: UUID
  name: string
  description: string
  weight: number // 0-100
  order: number
  scores: Record<UUID, number> // 无子维度时直接打分 (0-10)
  subDimensions: SubDimension[]
}

export interface Vendor {
  id: UUID
  name: string
  color: string // HEX
  markerType: MarkerType
  order: number
  visible: boolean
}

// 时间标记
export interface TimeMarker {
  year: number      // e.g., 2024
  month?: number    // 1-12 (可选)
}

export interface RadarChart {
  id: UUID
  name: string
  order: number
  dimensions: Dimension[]
  vendors: Vendor[]
  createdAt: number
  updatedAt: number
  timeMarker?: TimeMarker  // 可选时间标记
}

// 时间轴雷达图（特殊类型，引用其他 Tab）
export interface TimelineRadarChart {
  id: UUID
  name: string
  order: number
  isTimeline: true         // 类型标识
  sourceRadarIds: UUID[]   // 引用的 Tab ID 列表
  createdAt: number
  updatedAt: number
}

// 联合类型
export type AnyRadarChart = RadarChart | TimelineRadarChart

// 类型守卫
export function isTimelineRadar(chart: AnyRadarChart): chart is TimelineRadarChart {
  return 'isTimeline' in chart && chart.isTimeline === true
}

export function isRegularRadar(chart: AnyRadarChart): chart is RadarChart {
  return !isTimelineRadar(chart)
}

export interface Project {
  id: UUID
  name: string
  description: string
  radarCharts: AnyRadarChart[]  // 支持普通雷达图和时间轴雷达图
  activeRadarId: UUID | null
  createdAt: number
  updatedAt: number
}

// 计算后的分数类型
export interface CalculatedDimensionScore {
  dimensionId: UUID
  dimensionName: string
  vendorScores: {
    vendorId: UUID
    vendorName: string
    rawScore: number
    weightedScore: number
  }[]
}

export interface VendorTotalScore {
  vendorId: UUID
  vendorName: string
  color: string
  totalScore: number
  rank: number
  dimensionBreakdown: {
    dimensionId: UUID
    dimensionName: string
    score: number
    weight: number
    contribution: number
  }[]
}

// 预设颜色
export const PRESET_COLORS = [
  '#5470c6', // 蓝色
  '#91cc75', // 绿色
  '#fac858', // 黄色
  '#ee6666', // 红色
  '#73c0de', // 浅蓝
  '#3ba272', // 深绿
  '#fc8452', // 橙色
  '#9a60b4', // 紫色
  '#ea7ccc', // 粉色
] as const

export const PRESET_MARKERS: MarkerType[] = [
  'circle',
  'diamond',
  'triangle',
  'rect',
  'roundRect',
  'pin',
  'arrow',
]
