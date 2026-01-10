/**
 * 版本时间轴类型定义
 */

// 版本事件类型
export type VersionEventType =
  | 'major'        // 重大版本
  | 'minor'        // 次要版本
  | 'patch'        // 补丁版本
  | 'milestone'    // 里程碑

// 版本事件
export interface VersionEvent {
  id: string
  year: number                     // 发布年份
  title: string                    // 事件标题
  description?: string             // 详细描述
  type: VersionEventType           // 事件类型
  position: 'top' | 'bottom'       // 显示位置（上层或下层）
  highlight?: string[]             // 需要高亮的关键词
  icon?: string                    // 图标（可选）
}

// 产品线/公司信息
export interface TimelineInfo {
  logo?: string                    // Logo URL
  title: string                    // 标题（如"大事记"）
  company?: string                 // 公司名称
}

// 时间轴数据
export interface TimelineData {
  info: TimelineInfo
  events: VersionEvent[]
  startYear?: number               // 起始年份（可选，自动计算）
  endYear?: number                 // 结束年份（可选，自动计算）
}
