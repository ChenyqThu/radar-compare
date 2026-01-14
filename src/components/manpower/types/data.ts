/**
 * Type definitions for manpower module
 *
 * Re-exports types from the stores to maintain compatibility with original project imports
 */

export type { Team, Project, TimePoint } from '../stores/configStore'
export type { AllocationMatrix, ValidationResult, SankeyData, SankeyNode, SankeyLink } from '../stores/dataStore'

// Re-export ProjectStatus type
export type ProjectStatus = 'development' | 'planning' | 'release' | 'completed'
export type TimePointType = 'current' | 'planning' | 'release'
