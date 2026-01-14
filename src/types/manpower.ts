/**
 * 人力排布图类型定义
 * Manpower Allocation Chart Type Definitions
 */

import { idGenerators } from '@/utils/idGenerator'

// 项目状态
export type ProjectStatus = 'development' | 'planning' | 'release' | 'completed'

// 时间点类型
export type TimePointType = 'current' | 'planning' | 'release'

// 团队
export interface ManpowerTeam {
  id: string
  name: string
  capacity: number        // 团队人力容量
  color: string          // HEX 颜色
  badge?: string         // 团队标号，如 "1", "2", "A"
  description?: string
}

// 项目
export interface ManpowerProject {
  id: string
  name: string
  status: ProjectStatus
  color: string
  description?: string
  teams?: string[]       // 关联的团队 ID 列表
  releaseDate?: string   // YYYY-MM 格式
  pattern?: 'solid' | 'stripes' | 'dots'
}

// 时间点
export interface ManpowerTimePoint {
  id: string
  name: string
  date: string           // YYYY-MM 格式
  type: TimePointType
  description?: string
}

// 分配数据条目
export interface AllocationEntry {
  occupied: number       // 当前投入人力
  prerelease: number     // 预释放人力
}

// 分配矩阵: [timePointId][projectId][teamId] -> AllocationEntry
export type AllocationMatrix = Record<string, Record<string, Record<string, AllocationEntry>>>

// 人力排布元数据
export interface ManpowerMetadata {
  title: string
  version: string
  totalPersons: number
}

// 人力排布图 (Tab 类型)
export interface ManpowerChart {
  id: string
  name: string
  order: number
  isManpowerChart: true  // 类型标识符
  metadata: ManpowerMetadata
  teams: ManpowerTeam[]
  projects: ManpowerProject[]
  timePoints: ManpowerTimePoint[]
  allocations: AllocationMatrix
  createdAt: number
  updatedAt: number
}

// 类型守卫函数
export function isManpowerChart(chart: unknown): chart is ManpowerChart {
  return (
    typeof chart === 'object' &&
    chart !== null &&
    'isManpowerChart' in chart &&
    (chart as ManpowerChart).isManpowerChart === true
  )
}

// ============ 验证相关类型 ============

export type ManpowerValidationErrorType =
  | 'team_overallocation'    // 团队超配
  | 'data_inconsistency'     // 数据不一致
  | 'missing_data'           // 数据缺失
  | 'negative_value'         // 负值

export type ManpowerValidationWarningType =
  | 'capacity_warning'       // 容量预警
  | 'resource_inefficiency'  // 资源闲置
  | 'prerelease_exceeds'     // 预释放超过投入

export interface ManpowerValidationError {
  id: string
  type: ManpowerValidationErrorType
  message: string
  details: {
    teamId?: string
    timePointId?: string
    projectId?: string
    expected?: number
    actual?: number
  }
}

export interface ManpowerValidationWarning {
  id: string
  type: ManpowerValidationWarningType
  message: string
  severity: 'low' | 'medium' | 'high'
  details: {
    teamId?: string
    timePointId?: string
    projectId?: string
    value?: number
    threshold?: number
  }
}

export interface ManpowerValidationResult {
  isValid: boolean
  errors: ManpowerValidationError[]
  warnings: ManpowerValidationWarning[]
}

// ============ 桑基图数据类型 ============

export interface ManpowerSankeyNode {
  name: string
  value?: number
  itemStyle?: { color: string }
  category?: number
}

export interface ManpowerSankeyLink {
  source: string
  target: string
  value: number
  teamDetails?: Record<string, {
    name: string
    value: number
    color: string
  }>
}

export interface ManpowerSankeyData {
  nodes: ManpowerSankeyNode[]
  links: ManpowerSankeyLink[]
}

// ============ 统计数据类型 ============

export interface TeamUtilization {
  teamId: string
  teamName: string
  capacity: number
  allocated: number
  utilizationRate: number  // 0-100%
  isOverallocated: boolean
}

export interface TimePointStatistics {
  timePointId: string
  timePointName: string
  totalAllocated: number
  totalCapacity: number
  overallUtilization: number
  teamUtilizations: TeamUtilization[]
}

export interface ManpowerStatistics {
  totalPersons: number
  totalTeams: number
  totalProjects: number
  totalTimePoints: number
  timePointStats: TimePointStatistics[]
  averageUtilization: number
}

// ============ 默认值工厂函数 ============

export function createDefaultTeam(partial?: Partial<ManpowerTeam>): ManpowerTeam {
  return {
    id: partial?.id ?? idGenerators.team(),
    name: partial?.name ?? '新团队',
    capacity: partial?.capacity ?? 10,
    color: partial?.color ?? '#5470c6',
    badge: partial?.badge,
    description: partial?.description,
  }
}

export function createDefaultProject(partial?: Partial<ManpowerProject>): ManpowerProject {
  return {
    id: partial?.id ?? idGenerators.project(),
    name: partial?.name ?? '新项目',
    status: partial?.status ?? 'planning',
    color: partial?.color ?? '#91cc75',
    description: partial?.description,
    teams: partial?.teams ?? [],
    releaseDate: partial?.releaseDate,
    pattern: partial?.pattern ?? 'solid',
  }
}

export function createDefaultTimePoint(partial?: Partial<ManpowerTimePoint>): ManpowerTimePoint {
  const now = new Date()
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return {
    id: partial?.id ?? idGenerators.timePoint(),
    name: partial?.name ?? '新时间点',
    date: partial?.date ?? defaultDate,
    type: partial?.type ?? 'planning',
    description: partial?.description,
  }
}

export function createDefaultAllocationEntry(): AllocationEntry {
  return {
    occupied: 0,
    prerelease: 0,
  }
}

export function createDefaultManpowerChart(partial?: Partial<ManpowerChart>): ManpowerChart {
  const now = Date.now()

  return {
    id: partial?.id ?? idGenerators.manpowerChart(),
    name: partial?.name ?? '人力排布',
    order: partial?.order ?? 0,
    isManpowerChart: true,
    metadata: partial?.metadata ?? {
      title: '研发人力排布',
      version: '1.0.0',
      totalPersons: 0,
    },
    teams: partial?.teams ?? [],
    projects: partial?.projects ?? [],
    timePoints: partial?.timePoints ?? [],
    allocations: partial?.allocations ?? {},
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  }
}

// ============ 预设颜色 ============

export const MANPOWER_TEAM_COLORS = [
  '#5470c6', // 蓝色
  '#91cc75', // 绿色
  '#fac858', // 黄色
  '#ee6666', // 红色
  '#73c0de', // 浅蓝
  '#3ba272', // 深绿
  '#fc8452', // 橙色
  '#9a60b4', // 紫色
] as const

export const MANPOWER_PROJECT_COLORS = [
  '#5470c6', // 蓝色
  '#91cc75', // 绿色
  '#fac858', // 黄色
  '#ee6666', // 红色
  '#73c0de', // 浅蓝
  '#3ba272', // 深绿
  '#fc8452', // 橙色
  '#9a60b4', // 紫色
  '#ea7ccc', // 粉色
  '#48b8e6', // 青色
] as const

// 项目状态对应的颜色
export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: '#faad14',    // 金色 - 规划中
  development: '#1890ff', // 蓝色 - 开发中
  release: '#52c41a',     // 绿色 - 即将发布
  completed: '#8c8c8c',   // 灰色 - 已完成
}
