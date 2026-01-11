import type {
  Project,
  RadarChart,
  Vendor,
  Dimension,
  SubDimension,
  UUID,
  TimeMarker,
  AnyRadarChart,
} from '@/types'
import type { VersionTimeline, VersionEvent, TimelineInfo } from '@/types/versionTimeline'

// 校验结果类型
export interface ValidationResult {
  valid: boolean
  errors: string[]  // i18n keys
}

// 时间轴数据类型
export interface TimelineData {
  timelineId: UUID
  timePoints: Array<{
    radarId: UUID
    timeMarker: TimeMarker
    name: string
  }>
  dimensions: Dimension[]
  vendors: Vendor[]
}

// Store state
export interface RadarState {
  currentProject: Project | null
  projectList: Pick<Project, 'id' | 'name'>[]
  isLoading: boolean
  lastSavedAt: number | null

  getActiveRadar: () => AnyRadarChart | null

  // 项目操作
  loadProject: (projectId: UUID) => Promise<void>
  createProject: (name: string) => Promise<UUID>
  deleteProject: (projectId: UUID) => Promise<void>
  renameProject: (projectId: UUID, name: string) => void
  refreshProjectList: () => Promise<void>

  // 雷达图操作
  setActiveRadar: (radarId: UUID) => void
  addRadarChart: (name?: string) => void
  deleteRadarChart: (radarId: UUID) => void
  duplicateRadarChart: (radarId: UUID) => void
  renameRadarChart: (radarId: UUID, name: string) => void
  reorderRadarCharts: (fromIndex: number, toIndex: number) => void

  // Vendor 操作
  addVendor: (vendor?: Partial<Vendor>) => void
  updateVendor: (vendorId: UUID, updates: Partial<Vendor>) => void
  deleteVendor: (vendorId: UUID) => void
  reorderVendors: (fromIndex: number, toIndex: number) => void
  toggleVendorVisibility: (vendorId: UUID) => void

  // 维度操作
  addDimension: (dimension?: Partial<Dimension>) => void
  updateDimension: (dimensionId: UUID, updates: Partial<Dimension>) => void
  deleteDimension: (dimensionId: UUID) => void
  reorderDimensions: (fromIndex: number, toIndex: number) => void

  // 子维度操作
  addSubDimension: (dimensionId: UUID, subDimension?: Partial<SubDimension>) => void
  updateSubDimension: (dimensionId: UUID, subDimensionId: UUID, updates: Partial<SubDimension>) => void
  deleteSubDimension: (dimensionId: UUID, subDimensionId: UUID) => void
  reorderSubDimensions: (dimensionId: UUID, fromIndex: number, toIndex: number) => void

  // 高级拖拽操作
  moveSubToOtherParent: (fromParentId: UUID, subId: UUID, toParentId: UUID, toIndex: number) => void
  promoteSubToDimension: (parentId: UUID, subId: UUID, toDimensionIndex: number) => void
  demoteDimensionToSub: (dimensionId: UUID, toParentId: UUID, toIndex: number) => void

  // 分数操作
  setDimensionScore: (dimensionId: UUID, vendorId: UUID, score: number) => void
  setSubDimensionScore: (dimensionId: UUID, subDimensionId: UUID, vendorId: UUID, score: number) => void

  // 导入
  importRadarChart: (data: RadarChart) => void
  importMultipleRadarCharts: (data: RadarChart[]) => void

  // 时间标记操作
  setRadarTimeMarker: (radarId: UUID, year: number, month?: number) => void
  clearRadarTimeMarker: (radarId: UUID) => void

  // 时间轴雷达图操作
  createTimelineRadar: (name: string, sourceRadarIds: UUID[]) => ValidationResult
  deleteTimelineRadar: (timelineId: UUID) => void
  updateTimelineSources: (timelineId: UUID, sourceRadarIds: UUID[]) => ValidationResult

  // 校验和查询
  validateTimelineConsistency: (sourceRadarIds: UUID[]) => ValidationResult
  isRadarReferencedByTimeline: (radarId: UUID) => boolean
  getTimelineData: (timelineId: UUID) => TimelineData | null
  getRegularRadars: () => RadarChart[]

  // 版本时间轴操作
  getActiveVersionTimeline: () => VersionTimeline | null
  getVersionTimelineById: (id: UUID) => VersionTimeline | null
  addVersionTimeline: (name?: string) => void
  deleteVersionTimeline: (id: UUID) => void
  renameVersionTimeline: (id: UUID, name: string) => void
  duplicateVersionTimeline: (id: UUID) => void
  updateTimelineInfo: (id: UUID, info: Partial<TimelineInfo>) => void

  // 版本事件操作
  addVersionEvent: (timelineId: UUID, event?: Partial<VersionEvent>) => void
  updateVersionEvent: (timelineId: UUID, eventId: UUID, updates: Partial<VersionEvent>) => void
  deleteVersionEvent: (timelineId: UUID, eventId: UUID) => void

  // 版本时间轴导入
  importVersionTimeline: (data: VersionTimeline) => void
}

// Store setter type for actions
export type StoreGetter = () => RadarState
export type StoreSetter = (partial: Partial<RadarState> | ((state: RadarState) => Partial<RadarState>)) => void
