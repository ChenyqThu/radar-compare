import { useState, useEffect, useCallback } from 'react'
import { Layout, Spin, Empty } from 'antd'
import { Navbar } from '@/components/common/Navbar'
import { RadarTabs } from '@/components/tabs/RadarTabs'
import { RadarChart } from '@/components/chart/RadarChart'
import { TimelineRadarChart } from '@/components/chart/TimelineRadarChart'
import { SubRadarDrawer } from '@/components/chart/SubRadarDrawer'
import { SettingsDrawer } from '@/components/settings/SettingsDrawer'
import { SettingsButton } from '@/components/settings/SettingsButton'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { ImportModal } from '@/components/io/ImportModal'
import { CreateTimelineModal } from '@/components/timeline/CreateTimelineModal'
import {
  VersionTimelineView,
  VersionEventEditor,
  TimelineInfoEditor,
  TimelineToolbar,
  TimelineImportModal,
} from '@/components/versionTimeline'
import { ManpowerView } from '@/components/manpower'
import { ManpowerSettingsDrawer } from '@/components/manpower/ManpowerSettingsDrawer'
import { ProductMatrixView, ProductMatrixSettingsDrawer } from '@/components/productMatrix'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { getCloudProjects } from '@/services/supabase'
import { isTimelineRadar } from '@/types'
import { isVersionTimeline } from '@/types/versionTimeline'
import { useI18n } from '@/locales'
import type { VersionEvent } from '@/types/versionTimeline'
import styles from './MainApp.module.css'

const { Content } = Layout

export function MainApp() {
  const { t } = useI18n()
  const {
    isLoading,
    loadProject,
    refreshProjectList,
    createProject,
    getActiveRadar,
    getActiveVersionTimeline,
    getActiveManpowerChart,
    getActiveProductMatrixChart,
  } = useRadarStore()
  const {
    settingsDrawerVisible,
    openSettingsDrawer,
    closeSettingsDrawer,
    createTimelineModalVisible,
    setCreateTimelineModalVisible,
    appMode,
    shareMode,
    shareInfo,
  } = useUIStore()

  // Version Timeline event editor state
  const [eventEditorOpen, setEventEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<VersionEvent | null>(null)
  const [timelineImportOpen, setTimelineImportOpen] = useState(false)
  const [infoEditorOpen, setInfoEditorOpen] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  const activeRadar = getActiveRadar()
  const activeVersionTimeline = getActiveVersionTimeline()
  const activeManpowerChart = getActiveManpowerChart()
  const activeProductMatrixChart = getActiveProductMatrixChart()
  const isTimeline = activeRadar && isTimelineRadar(activeRadar)
  const isVersionTimelineMode = activeRadar && isVersionTimeline(activeRadar)

  // Compute readonly status (in share mode with readonly type)
  const isReadonly = shareMode && shareInfo?.shareType === 'readonly'

  // Initialize: load projects from cloud
  useEffect(() => {
    const init = async () => {
      // Skip initialization if in share mode (ShareView handles its own loading)
      if (shareMode) {
        setInitializing(false)
        return
      }

      // Skip initialization if we already have a valid project loaded
      const { currentProject, currentProjectId } = useRadarStore.getState()

      if (currentProject && currentProjectId && currentProject.radarCharts.length > 0) {
        setInitializing(false)
        return
      }

      try {
        setInitializing(true)

        // 从云端获取项目列表
        const cloudProjects = await getCloudProjects()

        if (cloudProjects.length > 0) {
          // 加载第一个项目
          await refreshProjectList()
          await loadProject(cloudProjects[0].id)
        } else {
          // 新用户：创建默认项目
          const newProjectId = await createProject(t.project?.defaultName || '我的项目')
          if (newProjectId) {
            await loadProject(newProjectId)
          }
        }

        // App Mode Correction: Ensure we are in a valid mode for the loaded project
        const project = useRadarStore.getState().currentProject
        if (project) {
          const { isVersionTimeline } = await import('@/types/versionTimeline')
          const { isManpowerChart } = await import('@/types/manpower')
          const { isProductMatrixChart } = await import('@/types/productMatrix')
          const { isRegularRadar, isTimelineRadar } = await import('@/types')
          const currentAppMode = useUIStore.getState().appMode

          if (currentAppMode === 'timeline') {
            // Check if project has VersionTimeline
            const hasVersionTimeline = project.radarCharts.some(chart => isVersionTimeline(chart))
            if (!hasVersionTimeline) {
              // No VersionTimeline, switch back to radar mode
              useUIStore.getState().setAppMode('radar')
            }
          } else if (currentAppMode === 'manpower') {
            // Check if project has ManpowerChart
            const hasManpowerChart = project.radarCharts.some(chart => isManpowerChart(chart))
            if (!hasManpowerChart) {
              // No ManpowerChart, switch back to radar mode
              useUIStore.getState().setAppMode('radar')
            }
          } else if (currentAppMode === 'product-matrix') {
            // Check if project has ProductMatrixChart
            const hasProductMatrixChart = project.radarCharts.some(chart => isProductMatrixChart(chart))
            if (!hasProductMatrixChart) {
              // No ProductMatrixChart, switch back to radar mode
              useUIStore.getState().setAppMode('radar')
            }
          } else {
            // If in radar mode, check if we have regular radar charts
            const hasRadarChart = project.radarCharts.some(chart => isRegularRadar(chart) || isTimelineRadar(chart))
            if (!hasRadarChart) {
              // No regular radar charts, try switching to timeline mode if available
              const hasVersionTimeline = project.radarCharts.some(chart => isVersionTimeline(chart))
              if (hasVersionTimeline) {
                useUIStore.getState().setAppMode('timeline')
              } else {
                // Try manpower mode
                const hasManpowerChart = project.radarCharts.some(chart => isManpowerChart(chart))
                if (hasManpowerChart) {
                  useUIStore.getState().setAppMode('manpower')
                } else {
                  // Try product-matrix mode
                  const hasProductMatrixChart = project.radarCharts.some(chart => isProductMatrixChart(chart))
                  if (hasProductMatrixChart) {
                    useUIStore.getState().setAppMode('product-matrix')
                  }
                }
              }
            }
          }
        }

        setInitializing(false)
      } catch (error) {
        console.error('Failed to initialize:', error)
        setInitError(error instanceof Error ? error.message : 'Unknown error')
        setInitializing(false)
      }
    }

    init()
  }, []) // Empty deps - only run once on mount

  // Keyboard shortcuts (disabled in readonly mode)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isReadonly) return

      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        if (settingsDrawerVisible) {
          closeSettingsDrawer()
        } else {
          openSettingsDrawer()
        }
      }
    },
    [isReadonly, settingsDrawerVisible, openSettingsDrawer, closeSettingsDrawer]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Version Timeline handlers
  const handleEventClick = useCallback(
    (event: VersionEvent) => {
      if (isReadonly) return
      setEditingEvent(event)
      setEventEditorOpen(true)
    },
    [isReadonly]
  )

  const handleAddEvent = useCallback(() => {
    if (isReadonly) return
    setEditingEvent(null)
    setEventEditorOpen(true)
  }, [isReadonly])

  const handleEditInfo = useCallback(() => {
    if (isReadonly) return
    setInfoEditorOpen(true)
  }, [isReadonly])

  const handleImportTimeline = useCallback(() => {
    if (isReadonly) return
    setTimelineImportOpen(true)
  }, [isReadonly])

  // Loading state
  if (initializing || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    )
  }

  // Error state
  if (initError) {
    return (
      <div className={styles.loadingContainer}>
        <Empty
          description={`${t.common?.initFailed || '初始化失败'}: ${initError}`}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  return (
    <Layout className={`${styles.layout} ${appMode === 'manpower' || appMode === 'product-matrix' ? styles.layoutManpower : ''}`}>
      <Navbar />
      <Content className={`${styles.content} ${appMode === 'manpower' || appMode === 'product-matrix' ? styles.contentManpower : ''}`}>
        {appMode === 'timeline' ? (
          // Version Timeline mode
          <div className={styles.timelineMode}>
            <div className={styles.header}>
              <RadarTabs readonly={isReadonly} />
              {!isReadonly && (
                <TimelineToolbar
                  onAddEvent={handleAddEvent}
                  onEditInfo={handleEditInfo}
                  onImport={handleImportTimeline}
                />
              )}
            </div>
            <div className={styles.chartArea}>
              <VersionTimelineView
                key="timeline-mode"
                onEventClick={isReadonly ? undefined : handleEventClick}
                onAddEvent={isReadonly ? undefined : handleAddEvent}
              />
            </div>
            {!isReadonly && activeVersionTimeline && (
              <>
                <VersionEventEditor
                  open={eventEditorOpen}
                  onClose={() => setEventEditorOpen(false)}
                  timelineId={activeVersionTimeline.id}
                  event={editingEvent}
                />
                <TimelineInfoEditor
                  open={infoEditorOpen}
                  onClose={() => setInfoEditorOpen(false)}
                  timelineId={activeVersionTimeline.id}
                />
              </>
            )}
            {!isReadonly && (
              <TimelineImportModal
                open={timelineImportOpen}
                onClose={() => setTimelineImportOpen(false)}
              />
            )}
          </div>
        ) : appMode === 'manpower' ? (
          // Manpower mode
          <div className={styles.manpowerMode}>
            <div className={styles.header}>
              <RadarTabs readonly={isReadonly} />
              {!isReadonly && <Toolbar hideTimeCompare />}
            </div>
            <div className={styles.chartArea}>
              {activeManpowerChart ? (
                <ManpowerView />
              ) : (
                <Empty description={t.manpower?.noData || '暂无数据'} />
              )}
            </div>
            {!isReadonly && <SettingsButton keyShortcut="s" />}
            {!isReadonly && <ManpowerSettingsDrawer />}
          </div>
        ) : appMode === 'product-matrix' ? (
          // Product Matrix mode
          <div className={styles.manpowerMode}>
            <div className={styles.header}>
              <RadarTabs readonly={isReadonly} />
              {!isReadonly && <Toolbar hideTimeCompare />}
            </div>
            <div className={styles.chartArea}>
              {activeProductMatrixChart ? (
                <ProductMatrixView readonly={isReadonly} />
              ) : (
                <Empty description={t.productMatrix?.noProducts || '暂无数据'} />
              )}
            </div>
            {!isReadonly && <SettingsButton keyShortcut="s" />}
            {!isReadonly && <ProductMatrixSettingsDrawer />}
          </div>
        ) : (
          // Radar chart mode
          <>
            <div className={styles.header}>
              <RadarTabs readonly={isReadonly} />
              {!isReadonly && <Toolbar />}
            </div>
            <div className={styles.chartArea}>
              {isTimeline ? (
                <TimelineRadarChart timelineId={activeRadar.id} />
              ) : isVersionTimelineMode ? (
                <VersionTimelineView
                  key="radar-mode"
                  onEventClick={isReadonly ? undefined : handleEventClick}
                  onAddEvent={isReadonly ? undefined : handleAddEvent}
                />
              ) : (
                <RadarChart />
              )}
            </div>
            {/* Hide settings button for timeline modes and readonly */}
            {!isTimeline && !isVersionTimelineMode && !isReadonly && (
              <SettingsButton />
            )}
            {!isReadonly && (
              <>
                <SettingsDrawer />
                <SubRadarDrawer />
                <CreateTimelineModal
                  open={createTimelineModalVisible}
                  onClose={() => setCreateTimelineModalVisible(false)}
                />
              </>
            )}
            {!isReadonly && activeVersionTimeline && (
              <>
                <VersionEventEditor
                  open={eventEditorOpen}
                  onClose={() => setEventEditorOpen(false)}
                  timelineId={activeVersionTimeline.id}
                  event={editingEvent}
                />
                <TimelineInfoEditor
                  open={infoEditorOpen}
                  onClose={() => setInfoEditorOpen(false)}
                  timelineId={activeVersionTimeline.id}
                />
              </>
            )}
          </>
        )}
      </Content>
      {/* Global modals - render outside mode-specific sections */}
      {!isReadonly && <ImportModal />}
    </Layout>
  )
}
