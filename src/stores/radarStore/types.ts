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
import type { VersionTimeline, VersionEvent, TimelineInfo, EventTypeConfig } from '@/types/versionTimeline'
import type {
  ManpowerChart,
  ManpowerTeam,
  ManpowerProject,
  ManpowerTimePoint,
  AllocationEntry,
  ManpowerValidationResult,
  TeamUtilization,
  ManpowerStatistics,
} from '@/types/manpower'

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

// Project list item with collaboration info
export interface ProjectListItem {
  id: string
  name: string
  isCollaborated?: boolean  // true if user is a collaborator, not owner
  role?: 'owner' | 'editor' | 'viewer'
}

// Store state
// Note: We keep currentProject for backwards compatibility, but data comes from radar_charts table
export interface RadarState {
  // Project state - assembled from projects + radar_charts tables
  currentProject: Project | null

  // Convenience getters for project metadata
  currentProjectId: string | null
  currentProjectName: string

  projectList: ProjectListItem[]
  isLoading: boolean
  lastSavedAt: number | null

  getActiveRadar: () => AnyRadarChart | null

  // 项目操作
  initialize: () => Promise<void>
  loadProject: (projectId: UUID) => Promise<void>
  createProject: (name: string) => Promise<string | null>
  deleteProject: (projectId: UUID) => Promise<void>
  renameProject: (projectId: UUID, name: string) => void
  refreshProjectList: () => Promise<void>
  copySharedTabsToMyProject: (tabIds: string[], targetProjectId?: string) => Promise<{ projectId: string; copiedTabIds: string[] } | null>
  clearCurrentProject: () => void  // 清空当前项目状态

  // 雷达图操作
  setActiveRadar: (radarId: UUID) => void
  addRadarChart: (name?: string) => Promise<void>
  deleteRadarChart: (radarId: UUID) => Promise<void>
  duplicateRadarChart: (radarId: UUID) => Promise<void>
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
  importRadarChart: (data: AnyRadarChart) => void
  importMultipleRadarCharts: (data: AnyRadarChart[]) => void

  // 时间标记操作
  setRadarTimeMarker: (radarId: UUID, year: number, month?: number) => void
  clearRadarTimeMarker: (radarId: UUID) => void

  // 时间轴雷达图操作
  createTimelineRadar: (name: string, sourceRadarIds: UUID[]) => Promise<ValidationResult>
  deleteTimelineRadar: (timelineId: UUID) => Promise<void>
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

  // 事件类型管理
  addEventType: (timelineId: UUID, typeId: string, config: EventTypeConfig) => void
  updateEventType: (timelineId: UUID, typeId: string, updates: Partial<EventTypeConfig>) => void
  deleteEventType: (timelineId: UUID, typeId: string) => void
  getEventTypeUsageCount: (timelineId: UUID, typeId: string) => number

  // 版本时间轴导入
  importVersionTimeline: (data: VersionTimeline) => void

  // ==================== 人力排布操作 ====================

  // 人力排布图 CRUD
  getActiveManpowerChart: () => ManpowerChart | null
  getManpowerChartById: (id: UUID) => ManpowerChart | null
  addManpowerChart: (name?: string) => Promise<boolean>
  deleteManpowerChart: (id: UUID) => Promise<boolean>
  renameManpowerChart: (id: UUID, name: string) => void
  duplicateManpowerChart: (id: UUID) => Promise<boolean>

  // 团队操作
  addManpowerTeam: (chartId: UUID, team?: Partial<ManpowerTeam>) => void
  updateManpowerTeam: (chartId: UUID, teamId: UUID, updates: Partial<ManpowerTeam>) => void
  deleteManpowerTeam: (chartId: UUID, teamId: UUID) => void
  reorderManpowerTeams: (chartId: UUID, fromIndex: number, toIndex: number) => void

  // 项目操作
  addManpowerProject: (chartId: UUID, project?: Partial<ManpowerProject>) => void
  updateManpowerProject: (chartId: UUID, projectId: UUID, updates: Partial<ManpowerProject>) => void
  deleteManpowerProject: (chartId: UUID, projectId: UUID) => void
  reorderManpowerProjects: (chartId: UUID, fromIndex: number, toIndex: number) => void

  // 时间点操作
  addManpowerTimePoint: (chartId: UUID, timePoint?: Partial<ManpowerTimePoint>) => void
  updateManpowerTimePoint: (chartId: UUID, timePointId: UUID, updates: Partial<ManpowerTimePoint>) => void
  deleteManpowerTimePoint: (chartId: UUID, timePointId: UUID) => void
  reorderManpowerTimePoints: (chartId: UUID, fromIndex: number, toIndex: number) => void

  // 分配操作
  updateAllocation: (chartId: UUID, timePointId: UUID, projectId: UUID, teamId: UUID, data: Partial<AllocationEntry>) => void
  updateMultipleAllocations: (chartId: UUID, updates: Array<{ timePointId: UUID; projectId: UUID; teamId: UUID; data: Partial<AllocationEntry> }>) => void
  resetAllocations: (chartId: UUID) => void
  autoCalculatePrerelease: (chartId: UUID) => void

  // 验证和统计
  validateManpowerChart: (chartId: UUID) => ManpowerValidationResult
  getTeamUtilization: (chartId: UUID, teamId: UUID, timePointId: UUID) => TeamUtilization | null
  getManpowerStatistics: (chartId: UUID) => ManpowerStatistics | null

  // 人力排布导入
  importManpowerChart: (data: ManpowerChart) => Promise<boolean>

  // 元数据更新
  updateManpowerMetadata: (chartId: UUID, updates: Partial<ManpowerChart['metadata']>) => void
}

// Store setter type for actions
export type StoreGetter = () => RadarState
export type StoreSetter = (partial: Partial<RadarState> | ((state: RadarState) => Partial<RadarState>)) => void
