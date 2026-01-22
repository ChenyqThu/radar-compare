/**
 * Unified ID generation utility
 * 统一的 ID 生成工具
 */

import { nanoid } from 'nanoid'

/**
 * Generate a unique ID with optional prefix
 * @param prefix - Optional prefix for the ID
 * @returns A unique ID string
 */
export function generateId(prefix?: string): string {
  const id = nanoid()
  return prefix ? `${prefix}_${id}` : id
}

/**
 * Generate IDs for different entity types
 */
export const idGenerators = {
  team: () => generateId('team'),
  project: () => generateId('project'),
  timePoint: () => generateId('time'),
  chart: () => generateId('chart'),
  radarChart: () => generateId('radar'),
  manpowerChart: () => generateId('manpower'),
  // Product Matrix
  productMatrixChart: () => generateId('matrix'),
  vendor: () => generateId('vendor'),
  dimension: () => generateId('dim'),
  option: () => generateId('opt'),
  product: () => generateId('prod'),
  segment: () => generateId('seg'),
} as const

/**
 * Validate if a string is a valid ID format
 * @param id - The ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0
}
