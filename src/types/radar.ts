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

export interface RadarChart {
  id: UUID
  name: string
  order: number
  dimensions: Dimension[]
  vendors: Vendor[]
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: UUID
  name: string
  description: string
  radarCharts: RadarChart[]
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
