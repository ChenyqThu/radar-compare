import { useState, useEffect, useCallback } from 'react'
import { Layout, Spin, message, Empty } from 'antd'
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
import { VersionTimelineView, VersionEventEditor, TimelineInfoEditor, TimelineToolbar, TimelineImportModal } from '@/components/versionTimeline'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { initializeDatabase } from '@/services/db'
import { isTimelineRadar } from '@/types'
import { isVersionTimeline } from '@/types/versionTimeline'
import type { VersionEvent } from '@/types/versionTimeline'
import styles from './App.module.css'

const { Content } = Layout

function App() {
  const { isLoading, loadProject, refreshProjectList, getActiveRadar, getActiveVersionTimeline } = useRadarStore()
  const {
    settingsDrawerVisible,
    openSettingsDrawer,
    closeSettingsDrawer,
    createTimelineModalVisible,
    setCreateTimelineModalVisible,
    appMode,
  } = useUIStore()

  // Version Timeline event editor state
  const [eventEditorOpen, setEventEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<VersionEvent | null>(null)
  const [timelineImportOpen, setTimelineImportOpen] = useState(false)
  const [infoEditorOpen, setInfoEditorOpen] = useState(false)

  const activeRadar = getActiveRadar()
  const activeVersionTimeline = getActiveVersionTimeline()
  const isTimeline = activeRadar && isTimelineRadar(activeRadar)
  const isVersionTimelineMode = activeRadar && isVersionTimeline(activeRadar)

  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase()
        await refreshProjectList()
        const projects = useRadarStore.getState().projectList
        if (projects.length > 0) {
          await loadProject(projects[0].id)
        }
      } catch (error) {
        console.error('Failed to initialize database:', error)
        setInitError(error instanceof Error ? error.message : 'Unknown error')
        // 即使初始化失败，也要停止 loading 状态
        useRadarStore.setState({ isLoading: false })
      }
    }
    init()
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
  }, [settingsDrawerVisible, openSettingsDrawer, closeSettingsDrawer])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Version Timeline handlers
  const handleEventClick = useCallback((event: VersionEvent) => {
    setEditingEvent(event)
    setEventEditorOpen(true)
  }, [])

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null)
    setEventEditorOpen(true)
  }, [])

  const handleEditInfo = useCallback(() => {
    setInfoEditorOpen(true)
  }, [])

  const handleImportTimeline = useCallback(() => {
    setTimelineImportOpen(true)
  }, [])

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    )
  }

  if (initError) {
    return (
      <div className={styles.loadingContainer}>
        <Empty
          description={`初始化失败: ${initError}`}
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
              <RadarTabs />
              <TimelineToolbar
                onAddEvent={handleAddEvent}
                onEditInfo={handleEditInfo}
                onImport={handleImportTimeline}
              />
            </div>
            <div className={styles.chartArea}>
              <VersionTimelineView
                onEventClick={handleEventClick}
                onAddEvent={handleAddEvent}
              />
            </div>
            {activeVersionTimeline && (
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
            <TimelineImportModal
              open={timelineImportOpen}
              onClose={() => setTimelineImportOpen(false)}
            />
          </div>
        ) : (
          // Radar chart mode
          <>
            <div className={styles.header}>
              <RadarTabs />
              <Toolbar />
            </div>
            <div className={styles.chartArea}>
              {isTimeline ? (
                <TimelineRadarChart timelineId={activeRadar.id} />
              ) : isVersionTimelineMode ? (
                <VersionTimelineView
                  onEventClick={handleEventClick}
                  onAddEvent={handleAddEvent}
                />
              ) : (
                <RadarChart />
              )}
            </div>
            {/* Hide settings button for timeline modes */}
            {!isTimeline && !isVersionTimelineMode && <SettingsButton />}
            <SettingsDrawer />
            <SubRadarDrawer />
            <ImportModal />
            <CreateTimelineModal
              open={createTimelineModalVisible}
              onClose={() => setCreateTimelineModalVisible(false)}
            />
            {activeVersionTimeline && (
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

export default App
