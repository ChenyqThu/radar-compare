/**
 * Product Matrix module constants
 */

// Vendor colors palette
export const VENDOR_COLORS = [
  '#5470c6', // Blue
  '#91cc75', // Green
  '#fac858', // Yellow
  '#ee6666', // Red
  '#73c0de', // Light Blue
  '#3ba272', // Dark Green
  '#fc8452', // Orange
  '#9a60b4', // Purple
  '#ea7ccc', // Pink
  '#48b8e6', // Cyan
] as const

// Price heatmap colors
export const PRICE_HEATMAP_COLORS = {
  low: '#52c41a',     // Green
  medium: '#faad14',  // Yellow
  high: '#ff4d4f',    // Red
} as const

// Petal shape options
export const PETAL_SHAPES = ['diamond', 'sector', 'petal', 'circle'] as const

// Size scale modes
export const SIZE_SCALE_MODES = ['linear', 'sqrt', 'log'] as const

// Color encoding options
export const COLOR_ENCODINGS = ['vendor', 'price', 'status'] as const

// Opacity encoding options
export const OPACITY_ENCODINGS = ['none', 'price', 'count'] as const

// Cell layout options
export const CELL_LAYOUTS = ['overlap', 'stack', 'grid', 'petal'] as const

// Petal config defaults
export const DEFAULT_PETAL_CONFIG = {
  minPetalSize: 20,
  maxPetalSize: 60,
} as const

// Chart dimensions
export const CHART_CONFIG = {
  padding: 40,
  labelOffset: 20,
  gridLineWidth: 1,
  pointRadius: 8,
  tooltipOffset: 10,
} as const

// Animation durations (ms)
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
} as const

// Z-index layers
export const Z_INDEX = {
  grid: 1,
  dataPoint: 2,
  label: 3,
  tooltip: 100,
} as const
