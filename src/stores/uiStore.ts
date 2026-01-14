import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UUID } from '@/types'

export type ThemeMode = 'light' | 'dark' | 'system'
export type AppMode = 'radar' | 'timeline' | 'manpower'
export type ShareType = 'readonly' | 'editable'

// 分享信息
export interface ShareInfo {
  token: string
  shareType: ShareType
  projectId: string
  projectName: string
  sharedTabIds?: string[]  // 分享的 Tab ID 列表，用于 UI 过滤
}

interface UIState {
  // 分享模式
  shareMode: boolean
  shareInfo: ShareInfo | null
  setShareMode: (active: boolean, info?: ShareInfo) => void
  exitShareMode: () => void

  // 应用模式 (雷达图 vs 时间轴)
  appMode: AppMode
  setAppMode: (mode: AppMode) => void

  // 每个模式下上次选中的 Tab ID
  lastRadarModeTabId: UUID | null
  lastTimelineModeTabId: UUID | null
  lastManpowerModeTabId: UUID | null
  setLastTabForMode: (mode: AppMode, tabId: UUID | null) => void

  // 主题
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void

  // 设置抽屉
  settingsDrawerVisible: boolean
  openSettingsDrawer: () => void
  closeSettingsDrawer: () => void

  // 子维度抽屉
  subRadarDrawer: {
    visible: boolean
    dimensionId: UUID | null
  }
  openSubRadarDrawer: (dimensionId: UUID) => void
  closeSubRadarDrawer: () => void

  // 导出弹窗
  exportModalVisible: boolean
  setExportModalVisible: (visible: boolean) => void

  // 导入弹窗
  importModalVisible: boolean
  setImportModalVisible: (visible: boolean) => void

  // 创建时间轴弹窗
  createTimelineModalVisible: boolean
  setCreateTimelineModalVisible: (visible: boolean) => void

  // 编辑状态
  editingItemId: UUID | null
  setEditingItemId: (id: UUID | null) => void

  // 设置面板 Tab
  activeSettingsTab: 'vendor' | 'dimension'
  setActiveSettingsTab: (tab: 'vendor' | 'dimension') => void

  // 时间轴方案选择 ('custom' | 'react-chrono' | 'enhanced')
  timelineImplementation: 'custom' | 'react-chrono' | 'enhanced'
  setTimelineImplementation: (impl: 'custom' | 'react-chrono' | 'enhanced') => void
}

// 获取系统主题
const getSystemTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// 应用主题
const applyTheme = (theme: ThemeMode) => {
  const actualTheme = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.setAttribute('data-theme', actualTheme)

  if (actualTheme === 'dark') {
    document.body.style.backgroundColor = '#0d0d0d'
    document.body.style.colorScheme = 'dark'
  } else {
    document.body.style.backgroundColor = '#f5f5f5'
    document.body.style.colorScheme = 'light'
  }
}

// 初始化时检测系统主题
const initialTheme = getSystemTheme()

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // 分享模式
      shareMode: false,
      shareInfo: null,
      setShareMode: (active, info) => set({ shareMode: active, shareInfo: info || null }),
      exitShareMode: () => set({ shareMode: false, shareInfo: null }),

      appMode: 'radar',
      setAppMode: (mode) => set({ appMode: mode }),

      lastRadarModeTabId: null,
      lastTimelineModeTabId: null,
      lastManpowerModeTabId: null,
      setLastTabForMode: (mode, tabId) => set(
        mode === 'radar'
          ? { lastRadarModeTabId: tabId }
          : mode === 'timeline'
            ? { lastTimelineModeTabId: tabId }
            : { lastManpowerModeTabId: tabId }
      ),

      theme: initialTheme,
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      settingsDrawerVisible: false,
      openSettingsDrawer: () => set({ settingsDrawerVisible: true }),
      closeSettingsDrawer: () => set({ settingsDrawerVisible: false }),

      subRadarDrawer: { visible: false, dimensionId: null },
      openSubRadarDrawer: (dimensionId) =>
        set({ subRadarDrawer: { visible: true, dimensionId } }),
      closeSubRadarDrawer: () =>
        set({ subRadarDrawer: { visible: false, dimensionId: null } }),

      exportModalVisible: false,
      setExportModalVisible: (visible) => set({ exportModalVisible: visible }),

      importModalVisible: false,
      setImportModalVisible: (visible) => set({ importModalVisible: visible }),

      createTimelineModalVisible: false,
      setCreateTimelineModalVisible: (visible) => set({ createTimelineModalVisible: visible }),

      editingItemId: null,
      setEditingItemId: (id) => set({ editingItemId: id }),

      activeSettingsTab: 'dimension',
      setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),

      timelineImplementation: 'enhanced',
      setTimelineImplementation: (impl) => set({ timelineImplementation: impl }),
    }),
    {
      name: 'radar-ui',
      partialize: (state) => ({
        theme: state.theme,
        appMode: state.appMode,
        lastRadarModeTabId: state.lastRadarModeTabId,
        lastTimelineModeTabId: state.lastTimelineModeTabId,
        lastManpowerModeTabId: state.lastManpowerModeTabId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

// 初始化时应用主题
if (typeof window !== 'undefined') {
  // 首次加载时检查是否有缓存的主题
  const stored = localStorage.getItem('radar-ui')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed.state?.theme) {
        applyTheme(parsed.state.theme)
      }
    } catch {
      applyTheme(initialTheme)
    }
  } else {
    applyTheme(initialTheme)
  }
}
