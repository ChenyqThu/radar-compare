/**
 * Manpower module constants
 * 人力排布模块常量配置
 */

// ============ 利用率阈值 ============
export const UTILIZATION_THRESHOLDS = {
  critical: 110,   // 严重超配
  overload: 100,   // 超配
  warning: 90,     // 预警
  normal: 0,       // 正常
} as const

// ============ 利用率颜色配置 ============
export const UTILIZATION_COLORS = {
  critical: {
    bg: 'rgba(255, 77, 79, 0.1)',
    text: 'var(--color-error)',
  },
  overload: {
    bg: 'rgba(250, 140, 22, 0.1)',
    text: '#fa8c16',
  },
  warning: {
    bg: 'rgba(250, 173, 20, 0.1)',
    text: 'var(--color-warning)',
  },
  normal: {
    bg: 'rgba(82, 196, 26, 0.1)',
    text: 'var(--color-success)',
  },
} as const

// ============ 项目状态颜色 ============
export const PROJECT_STATUS_STYLES = {
  development: {
    bg: 'rgba(24, 144, 255, 0.1)',
    text: '#1890ff',
    border: '1px solid rgba(24, 144, 255, 0.3)',
  },
  planning: {
    bg: 'rgba(250, 173, 20, 0.1)',
    text: '#faad14',
    border: '1px solid rgba(250, 173, 20, 0.3)',
  },
  release: {
    bg: 'rgba(82, 196, 26, 0.1)',
    text: '#52c41a',
    border: '1px solid rgba(82, 196, 26, 0.3)',
  },
  completed: {
    bg: 'rgba(140, 140, 140, 0.1)',
    text: '#8c8c8c',
    border: '1px solid rgba(140, 140, 140, 0.3)',
  },
} as const

// ============ PowerPoint 风格调色板 ============
// Re-export from shared utility for backward compatibility
export { COLOR_PALETTE } from '@/utils/colorPalette'

// ============ 团队标号选项 ============
export const BADGE_OPTIONS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'] as const

// ============ 表格配置 ============
export const TABLE_CONFIG = {
  minColumnWidth: 160,
  timeColumnWidth: 180,
  maxVisibleHeight: 'calc(100vh + 200px)',
  stickyHeaderZIndex: 20,
} as const

// ============ Sankey 图配置 ============
export const SANKEY_CONFIG = {
  maxTimePoints: 3,  // 最多显示 3 个时间点
} as const

// ============ 本地存储键名 ============
export const STORAGE_KEYS = {
  showTeamDetails: 'allocation-show-team-details',
  collapsedProjects: 'allocation-collapsed-projects',
} as const

// ============ 验证配置 ============
export const VALIDATION_CONFIG = {
  lowUtilizationThreshold: 50,   // 低利用率阈值
  highUtilizationThreshold: 90,  // 高利用率阈值
} as const

/**
 * Get utilization color style based on percentage
 */
export function getUtilizationStyle(percentage: number): React.CSSProperties {
  if (percentage > UTILIZATION_THRESHOLDS.critical) {
    return {
      backgroundColor: UTILIZATION_COLORS.critical.bg,
      color: UTILIZATION_COLORS.critical.text,
    }
  }
  if (percentage > UTILIZATION_THRESHOLDS.overload) {
    return {
      backgroundColor: UTILIZATION_COLORS.overload.bg,
      color: UTILIZATION_COLORS.overload.text,
    }
  }
  if (percentage > UTILIZATION_THRESHOLDS.warning) {
    return {
      backgroundColor: UTILIZATION_COLORS.warning.bg,
      color: UTILIZATION_COLORS.warning.text,
    }
  }
  return {
    backgroundColor: UTILIZATION_COLORS.normal.bg,
    color: UTILIZATION_COLORS.normal.text,
  }
}

/**
 * Get utilization text color based on percentage
 */
export function getUtilizationTextColor(percentage: number): string {
  if (percentage > UTILIZATION_THRESHOLDS.critical) {
    return UTILIZATION_COLORS.critical.text
  }
  if (percentage > UTILIZATION_THRESHOLDS.overload) {
    return UTILIZATION_COLORS.overload.text
  }
  if (percentage > UTILIZATION_THRESHOLDS.warning) {
    return UTILIZATION_COLORS.warning.text
  }
  return UTILIZATION_COLORS.normal.text
}

/**
 * Get project status style
 */
export function getProjectStatusStyle(status: keyof typeof PROJECT_STATUS_STYLES): React.CSSProperties {
  const style = PROJECT_STATUS_STYLES[status]
  return {
    backgroundColor: style.bg,
    color: style.text,
    border: style.border,
  }
}
