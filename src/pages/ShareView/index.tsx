import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Spin, Empty, Typography, Input, Button, message } from 'antd'
import { LockOutlined, LoginOutlined } from '@ant-design/icons'
import { Navbar } from '@/components/common/Navbar'
import { RadarTabs } from '@/components/tabs/RadarTabs'
import { RadarChart } from '@/components/chart/RadarChart'
import { TimelineRadarChart } from '@/components/chart/TimelineRadarChart'
import { SubRadarDrawer } from '@/components/chart/SubRadarDrawer'
import { SettingsDrawer } from '@/components/settings/SettingsDrawer'
import { SettingsButton } from '@/components/settings/SettingsButton'
import { Toolbar } from '@/components/toolbar/Toolbar'
import { ImportModal } from '@/components/io/ImportModal'
import {
  VersionTimelineView,
  VersionEventEditor,
  TimelineInfoEditor,
  TimelineToolbar,
  TimelineImportModal,
} from '@/components/versionTimeline'
import { LoginModal } from '@/components/auth'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import {
  getShareByToken,
  getProjectByShareToken,
  incrementShareViewCount,
  isShareLinkValid,
  joinCollaboration,
} from '@/services/supabase'
import { isTimelineRadar, isManpowerChart } from '@/types'
import { isVersionTimeline } from '@/types/versionTimeline'
import { ManpowerView } from '@/components/manpower/ManpowerView'
import { useI18n } from '@/locales'
import type { VersionEvent } from '@/types/versionTimeline'
import styles from './ShareView.module.css'

const { Content } = Layout

interface PendingShareData {
  id: string
  projectId: string
  shareType: 'readonly' | 'editable'
  ownerId: string
  password?: string
  sharedTabIds?: string[]
}

export function ShareView() {
  const { token: shareToken } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { user } = useAuthStore()
  const { getActiveRadar, getActiveVersionTimeline, isLoading: globalLoading } = useRadarStore()
  const {
    settingsDrawerVisible,
    openSettingsDrawer,
    closeSettingsDrawer,
    appMode,
    shareMode,
    shareInfo,
    setShareMode,
  } = useUIStore()

  // Share page states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [loginRequired, setLoginRequired] = useState(false)
  const [pendingShareData, setPendingShareData] = useState<PendingShareData | null>(null)

  // Track previous shareMode to detect "leaving" scenario
  const prevShareModeRef = useRef(shareMode)

  // Version Timeline event editor state
  const [eventEditorOpen, setEventEditorOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<VersionEvent | null>(null)
  const [timelineImportOpen, setTimelineImportOpen] = useState(false)
  const [infoEditorOpen, setInfoEditorOpen] = useState(false)

  const activeRadar = getActiveRadar()
  const activeVersionTimeline = getActiveVersionTimeline()
  const isTimeline = activeRadar && isTimelineRadar(activeRadar)
  const isVersionTimelineMode = activeRadar && isVersionTimeline(activeRadar)

  // Compute readonly status
  const isReadonly = shareMode && shareInfo?.shareType === 'readonly'

  // In share mode, always hide "create new" actions (new tab, timeline compare)
  // but allow editing existing content for editable shares
  const hideCreateActions = shareMode

  // Load shared project
  const loadSharedProject = useCallback(
    async (shareData: PendingShareData) => {
      if (!shareToken) return

      const result = await getProjectByShareToken(shareToken)
      if (!result || !result.project) {
        setError(t.shareView?.projectNotFound || '项目不存在')
        setLoading(false)
        return
      }

      const { project, charts, share } = result
      const sharedTabIds = share.sharedTabIds || shareData.sharedTabIds || []
      const activeTabId = sharedTabIds.length > 0 ? sharedTabIds[0] : project.activeChartId

      // Determine appMode based on the shared tab type
      const sharedTab = charts.find((c) => c.id === activeTabId)
      const isVersionTimelineTab = sharedTab && isVersionTimeline(sharedTab)

      // Increment view count
      await incrementShareViewCount(shareData.id)

      // For editable shares, join as collaborator
      if (shareData.shareType === 'editable' && user) {
        const joinResult = await joinCollaboration(
          shareData.id,
          shareData.projectId,
          shareData.ownerId
        )
        if (!joinResult.success) {
          console.warn('Failed to join collaboration:', joinResult.error)
        }
      }

      // Load FULL project into store
      useRadarStore.setState({
        currentProject: {
          id: project.id,
          name: project.name,
          description: project.description || '',
          radarCharts: charts,
          activeRadarId: activeTabId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        currentProjectId: project.id,
        currentProjectName: project.name,
        isLoading: false,
      })

      // Set correct app mode based on shared tab type
      if (isVersionTimelineTab) {
        useUIStore.getState().setAppMode('timeline')
      } else if (sharedTab && isManpowerChart(sharedTab)) {
        useUIStore.getState().setAppMode('manpower')
      } else {
        useUIStore.getState().setAppMode('radar')
      }

      // Set share mode with sharedTabIds for UI filtering
      setShareMode(true, {
        token: shareToken,
        shareType: shareData.shareType,
        projectId: shareData.projectId,
        projectName: project.name,
        sharedTabIds: sharedTabIds.length > 0 ? sharedTabIds : undefined,
      })

      setLoading(false)
    },
    [shareToken, setShareMode, t, user]
  )

  // Handle password submit
  const handlePasswordSubmit = useCallback(async () => {
    if (!pendingShareData) return

    if (password === pendingShareData.password) {
      setPasswordRequired(false)
      setLoading(true)
      await loadSharedProject(pendingShareData)
    } else {
      message.error(t.shareView?.wrongPassword || '密码错误')
    }
  }, [pendingShareData, password, loadSharedProject, t])

  // Load share data on mount
  useEffect(() => {
    // Capture previous shareMode before updating ref
    const wasInShareMode = prevShareModeRef.current
    prevShareModeRef.current = shareMode

    if (!shareToken) {
      navigate('/', { replace: true })
      return
    }

    const loadShare = async () => {
      // Already in share mode with this token - skip reload
      if (shareMode && shareInfo?.token === shareToken) return

      // User just left share mode (was true, now false) - don't reload
      // This happens when handleBackToHome calls setShareMode(false)
      if (wasInShareMode && !shareMode) return

      setLoading(true)
      setError(null)

      const shareData = await getShareByToken(shareToken)

      if (!shareData) {
        setError(t.shareView?.linkNotFound || '分享链接不存在或已失效')
        setLoading(false)
        return
      }

      const { valid, reason } = isShareLinkValid(shareData)
      if (!valid) {
        setError(reason || t.shareView?.linkExpired || '链接已失效')
        setLoading(false)
        return
      }

      const pendingData: PendingShareData = {
        id: shareData.id,
        projectId: shareData.projectId,
        shareType: shareData.shareType,
        ownerId: shareData.createdBy || '',
        password: shareData.password,
        sharedTabIds: shareData.sharedTabIds,
      }

      // Check if password is required
      if (shareData.password) {
        setPendingShareData(pendingData)
        setPasswordRequired(true)
        setLoading(false)
        return
      }

      // Check if login is required for editable shares
      const currentUser = useAuthStore.getState().user
      if (shareData.shareType === 'editable' && !currentUser) {
        setPendingShareData(pendingData)
        setLoginRequired(true)
        setLoading(false)
        return
      }

      // Load project directly
      await loadSharedProject(pendingData)
    }

    loadShare()
  }, [shareToken, loadSharedProject, t, shareMode, shareInfo, navigate])

  // Auto-load project after login for editable shares
  useEffect(() => {
    if (loginRequired && user && pendingShareData) {
      setLoginRequired(false)
      setLoading(true)
      loadSharedProject(pendingShareData)
    }
  }, [loginRequired, user, pendingShareData, loadSharedProject])

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

  // Password prompt
  if (passwordRequired) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.promptCard}>
          <LockOutlined className={styles.promptIcon} />
          <Typography.Title level={4}>
            {t.shareView?.passwordRequired || '此链接需要密码'}
          </Typography.Title>
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.shareView?.enterPassword || '请输入密码'}
            onPressEnter={handlePasswordSubmit}
            size="large"
            style={{ marginBottom: 16, maxWidth: 300 }}
          />
          <Button type="primary" onClick={handlePasswordSubmit} size="large">
            {t.shareView?.access || '访问'}
          </Button>
        </div>
      </div>
    )
  }

  // Login prompt for editable shares
  if (loginRequired) {
    // Save current path for redirect after login
    const currentPath = window.location.pathname
    sessionStorage.setItem('auth_redirect_path', currentPath)

    return (
      <div className={styles.loadingContainer}>
        <div className={styles.promptCard}>
          <LoginOutlined className={styles.promptIcon} />
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
            {t.share?.loginToCollaborate || '请登录以加入协作'}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 20, fontSize: '13px' }}>
            {t.share?.editableHint ||
              '可编辑分享需要协作者登录后才能访问，修改会同步到原项目'}
          </Typography.Paragraph>
          <LoginModal open={true} onClose={() => { }} embedded={true} />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <Empty description={error} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  // Loading state
  // Check both local loading and global loading (triggered by Navbar when returning home)
  // Put this LAST so it doesn't block Password/Login prompts if globalLoading is true
  if (loading || globalLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    )
  }

  // Main share view
  return (
    <Layout className={styles.layout}>
      <Navbar />
      <Content className={styles.content}>
        {appMode === 'manpower' ? (
          // Manpower mode
          <div className={styles.manpowerMode}>
            <div className={styles.header}>
              <RadarTabs readonly={hideCreateActions} />
              <Toolbar hideTimeCompare hideImport={isReadonly} hideExport={isReadonly} />
            </div>
            <div className={styles.chartArea}>
              <ManpowerView />
            </div>
            {!isReadonly && <SettingsDrawer />}
          </div>
        ) : appMode === 'timeline' ? (
          // Version Timeline mode
          <div className={styles.timelineMode}>
            <div className={styles.header}>
              {/* Always hide new tab button in share mode */}
              <RadarTabs readonly={hideCreateActions} />
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
              {/* Always hide new tab button in share mode */}
              <RadarTabs readonly={hideCreateActions} />
              {/* Show toolbar: hide time compare, hide import for readonly */}
              <Toolbar hideTimeCompare hideImport={isReadonly} hideExport={isReadonly} />
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
            {!isTimeline && !isVersionTimelineMode && !isReadonly && <SettingsButton />}
            {!isReadonly && (
              <>
                <SettingsDrawer />
                <SubRadarDrawer />
                <ImportModal />
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
