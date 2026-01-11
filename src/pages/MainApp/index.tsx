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
  const isTimeline = activeRadar && isTimelineRadar(activeRadar)
  const isVersionTimelineMode = activeRadar && isVersionTimeline(activeRadar)

  // Compute readonly status (in share mode with readonly type)
  const isReadonly = shareMode && shareInfo?.shareType === 'readonly'

  // Initialize: load projects from cloud
  useEffect(() => {
    // Skip initialization if in share mode (ShareView handles its own loading)
    if (shareMode) {
      setInitializing(false)
      return
    }

    const init = async () => {
      try {
        setInitializing(true)

        // 从云端获取项目列表
        console.log('[MainApp] Fetching cloud projects...')
        const cloudProjects = await getCloudProjects()
        console.log('[MainApp] Cloud projects:', cloudProjects)

        if (cloudProjects.length > 0) {
          // 加载第一个项目
          console.log('[MainApp] Loading first project:', cloudProjects[0].id)
          await refreshProjectList()
          await loadProject(cloudProjects[0].id)
          console.log('[MainApp] Project loaded successfully')
        } else {
          // 新用户：创建默认项目
          console.log('[MainApp] No projects found, creating default project')
          const newProjectId = await createProject(t.project?.defaultName || '我的项目')
          if (newProjectId) {
            await loadProject(newProjectId)
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
  }, [shareMode]) // Re-run when exiting share mode

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
    <Layout className={styles.layout}>
      <Navbar />
      <Content className={styles.content}>
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
                <ImportModal />
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
    </Layout>
  )
}
