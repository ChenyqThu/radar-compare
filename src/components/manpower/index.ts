/**
 * Manpower module - Research and Development Manpower Allocation Tool
 *
 * This module provides a complete solution for managing and visualizing
 * R&D team resource allocation across projects and time points.
 *
 * Migrated from rd-manpower-tool project, now using Ant Design v5.
 */

// Main view component
export { ManpowerView } from './ManpowerView'
export { default as ManpowerViewDefault } from './ManpowerView'

// Core modules
export { AllocationGrid } from './modules/allocation/AllocationGrid'
export { SankeyChart } from './modules/visualization/SankeyChart'
export { DistributionChart } from './modules/visualization/DistributionChart'
export { ProjectBarChart } from './modules/visualization/ProjectBarChart'

// Config components
export { TeamConfig } from './modules/config/TeamConfig'
export { ProjectConfig } from './modules/config/ProjectConfig'
export { TimeConfig } from './modules/config/TimeConfig'
export { ConfigImportExport } from './modules/config/ConfigImportExport'

// Excel integration
export { ExcelIntegration } from './modules/excel/ExcelIntegration'

// Store adapters
export { useConfigStore, useDataStore } from './stores'
export type { Team, Project, TimePoint, AllocationMatrix } from './stores'

// Badge components
export { TeamBadge } from './TeamBadge'
export { ProjectBadge } from './ProjectBadge'

// Utilities
export { exportDashboardToHTML } from './utils/exportDashboard'

// Types
export type { ProjectStatus, TimePointType } from './types/data'
