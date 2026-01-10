import { useEffect, useCallback } from 'react'
import { Layout, Spin } from 'antd'
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
import { VersionTimeline, ReactChronoTimeline, VersionTimelineEnhanced, ubiquitiTimelineData, simpleTimelineData } from '@/components/versionTimeline'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { initializeDatabase } from '@/services/db'
import { isTimelineRadar } from '@/types'
import styles from './App.module.css'

const { Content } = Layout

function App() {
  const { isLoading, loadProject, refreshProjectList, getActiveRadar } = useRadarStore()
  const {
    settingsDrawerVisible,
    openSettingsDrawer,
    closeSettingsDrawer,
    createTimelineModalVisible,
    setCreateTimelineModalVisible,
    appMode,
    timelineImplementation,
  } = useUIStore()

  const activeRadar = getActiveRadar()
  const isTimeline = activeRadar && isTimelineRadar(activeRadar)

  useEffect(() => {
    const init = async () => {
      await initializeDatabase()
      await refreshProjectList()
      const projects = useRadarStore.getState().projectList
      if (projects.length > 0) {
        await loadProject(projects[0].id)
      }
    }
    init()
  }, [])

  // 快捷键监听
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // 如果正在输入框中，不响应快捷键
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return
    }

    // S 键打开/关闭设置
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

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <Layout className={styles.layout}>
      <Navbar />
      <Content className={styles.content}>
        {appMode === 'timeline' ? (
          // 版本时间轴工具模式
          <div className={styles.timelineMode}>
            <div className={styles.chartArea}>
              {timelineImplementation === 'custom' ? (
                <VersionTimeline data={ubiquitiTimelineData} />
              ) : timelineImplementation === 'react-chrono' ? (
                <ReactChronoTimeline data={ubiquitiTimelineData} />
              ) : (
                <VersionTimelineEnhanced data={ubiquitiTimelineData} />
              )}
            </div>
          </div>
        ) : (
          // 雷达图工具模式
          <>
            <div className={styles.header}>
              <RadarTabs />
              <Toolbar />
            </div>
            <div className={styles.chartArea}>
              {isTimeline ? (
                <TimelineRadarChart timelineId={activeRadar.id} />
              ) : (
                <RadarChart />
              )}
            </div>
            {/* 时间轴雷达图模式下不显示设置按钮 */}
            {!isTimeline && <SettingsButton />}
            <SettingsDrawer />
            <SubRadarDrawer />
            <ImportModal />
            <CreateTimelineModal
              open={createTimelineModalVisible}
              onClose={() => setCreateTimelineModalVisible(false)}
            />
          </>
        )}
      </Content>
    </Layout>
  )
}

export default App
