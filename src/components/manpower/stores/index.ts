/**
 * Store adapters for manpower module
 *
 * These adapters provide compatibility with the original rd-manpower-tool's store API
 * while reading/writing data through the integrated radarStore.
 */

export { useConfigStore } from './configStore'
export type { Team, Project, TimePoint } from './configStore'

export { useDataStore } from './dataStore'
export type { AllocationMatrix, ValidationResult, SankeyData, SankeyNode, SankeyLink } from './dataStore'
