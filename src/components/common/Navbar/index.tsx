import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Space, Tooltip, Tag, Popconfirm, message, Modal } from 'antd'
import { SunOutlined, MoonOutlined, RadarChartOutlined, HistoryOutlined, ShareAltOutlined, EyeOutlined, EditOutlined, HomeOutlined, LogoutOutlined, CopyOutlined, TeamOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useAuthStore } from '@/stores/authStore'
import { leaveCollaboration } from '@/services/supabase'
import { useI18n } from '@/locales'
import { LoginModal, UserMenu } from '@/components/auth'
import { ShareModal, CollaborationsModal } from '@/components/share'
import omadaLight from '@/assets/omada_light.png'
import omadaDark from '@/assets/Omada_dark.png'
import styles from './Navbar.module.css'
import type { AppMode } from '@/stores/uiStore'

export function Navbar() {
  const navigate = useNavigate()
  const { theme, setTheme, appMode, setAppMode, shareMode, shareInfo } = useUIStore()
  const { currentProject, copySharedTabsToMyProject } = useRadarStore()
  const { user } = useAuthStore()
  const { language, setLanguage, t } = useI18n()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [collaborationsModalOpen, setCollaborationsModalOpen] = useState(false)
  const [copying, setCopying] = useState(false)
  const [returning, setReturning] = useState(false)

  const toggleLanguage = () => {
    setLanguage(language === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const handleBackToHome = async () => {
    setReturning(true)
    try {
      // Set global loading state and clear current project to force MainApp to re-initialize
      useRadarStore.setState({ isLoading: true, currentProject: null })

      // Reset share mode
      useUIStore.getState().setShareMode(false, undefined)

      // Navigate immediately - MainApp will handle the loading
      navigate('/app', { replace: true })
    } catch (error) {
      console.error('Failed to return home:', error)
      message.error('操作失败，请重试')
      setReturning(false)
      useRadarStore.setState({ isLoading: false })
    }
  }

  const handleLeaveCollaboration = async () => {
    if (!shareInfo?.projectId) return

    const success = await leaveCollaboration(shareInfo.projectId)
    if (success) {
      message.success(t.share?.leaveSuccess || '已离开协作')
      // Reset share mode before navigating
      useUIStore.getState().setShareMode(false, undefined)
      navigate('/app', { replace: true })
    } else {
      message.error(t.share?.leaveFailed || '离开协作失败')
    }
  }

  const handleCopyToMyProject = () => {
    Modal.confirm({
      title: t.share?.copyToMyProject || '复制到我的项目',
      content: t.share?.copyToMyProjectHint || '将创建一个包含分享内容副本的新项目，副本与原项目独立。',
      okText: t.common?.confirm || '确定',
      cancelText: t.common?.cancel || '取消',
      onOk: async () => {
        setCopying(true)
        try {
          // Copy the shared tabs (or all tabs if no specific sharedTabIds)
          const tabIds = shareInfo?.sharedTabIds || []
          const result: { projectId: string; copiedTabIds: string[] } | null = await copySharedTabsToMyProject(tabIds)

          if (result) {
            const { projectId, copiedTabIds } = result

            // Load the target project with copied tabs
            const { loadProject, setActiveRadar } = useRadarStore.getState()
            await loadProject(projectId)

            // Set the first copied tab as active and determine correct app mode
            if (copiedTabIds.length > 0) {
              const firstTabId = copiedTabIds[0]
              setActiveRadar(firstTabId)

              // Get the tab to determine app mode
              const project = useRadarStore.getState().currentProject
              if (project) {
                const firstTab = project.radarCharts.find((c) => c.id === firstTabId)
                if (firstTab) {
                  const { isVersionTimeline } = await import('@/types/versionTimeline')
                  const { isManpowerChart } = await import('@/types/manpower')
                  const appMode = isVersionTimeline(firstTab)
                    ? 'timeline'
                    : isManpowerChart(firstTab)
                      ? 'manpower'
                      : 'radar'
                  useUIStore.getState().setAppMode(appMode)
                }
              }
            }

            message.success(t.share?.copySuccess || '已复制到我的项目')

            // Reset share mode before navigation
            useUIStore.getState().setShareMode(false, undefined)

            // Navigate to main app to see the copied tabs
            navigate('/app', { replace: true })
          } else {
            message.error(t.share?.copyFailed || '复制失败')
          }
        } catch (error) {
          console.error('Failed to copy:', error)
          message.error(t.share?.copyFailed || '复制失败')
        } finally {
          setCopying(false)
        }
      },
    })
  }

  const logoSrc = theme === 'light' ? omadaLight : omadaDark

  const navItems: Array<{ key: AppMode; icon: React.ReactNode; label: string }> = [
    { key: 'radar', icon: <RadarChartOutlined />, label: t.app.radarMode || '雷达图' },
    { key: 'timeline', icon: <HistoryOutlined />, label: t.versionTimeline?.title || '大事记' },
    { key: 'manpower', icon: <UsergroupAddOutlined />, label: t.manpower?.title || '人力排布' },
  ]

  return (
    <div className={styles.navbar}>
      <div className={styles.left}>
        <img src={logoSrc} alt="Omada" className={styles.logo} />
        <div className={styles.divider} />

        {/* Share mode indicator */}
        {shareMode && shareInfo && (
          <div className={styles.shareIndicator}>
            <Tag
              color={shareInfo.shareType === 'readonly' ? 'blue' : 'green'}
              icon={shareInfo.shareType === 'readonly' ? <EyeOutlined /> : <EditOutlined />}
            >
              {shareInfo.shareType === 'readonly'
                ? (t.share?.readonly || '只读分享')
                : (t.share?.editable || '可编辑分享')}
            </Tag>
            <span className={styles.shareProjectName}>{shareInfo.projectName}</span>
          </div>
        )}

        {/* Normal nav menu (hidden in share mode) */}
        {!shareMode && (
          <div className={styles.navMenu}>
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`${styles.navItem} ${appMode === item.key ? styles.active : ''}`}
                onClick={() => setAppMode(item.key)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.right}>
        <Space size={4}>
          {/* Back to home button in share mode */}
          {shareMode && (
            <Tooltip title={t.shareView?.backToHome || '返回首页'}>
              <Button
                type="text"
                icon={<HomeOutlined />}
                onClick={handleBackToHome}
                loading={returning}
                disabled={returning}
                className={styles.toggleBtn}
              />
            </Tooltip>
          )}

          {/* Leave collaboration button (only for editable shares) */}
          {shareMode && shareInfo?.shareType === 'editable' && user && (
            <Popconfirm
              title={t.share?.confirmLeave || '确定离开协作？'}
              description={t.share?.leaveHint || '离开后将无法再编辑此项目'}
              onConfirm={handleLeaveCollaboration}
            >
              <Tooltip title={t.share?.leaveCollaboration || '离开协作'}>
                <Button
                  type="text"
                  danger
                  icon={<LogoutOutlined />}
                  className={styles.toggleBtn}
                />
              </Tooltip>
            </Popconfirm>
          )}

          {/* Copy to my project button (only for editable shares with logged in user) */}
          {shareMode && shareInfo?.shareType === 'editable' && user && (
            <Tooltip title={t.share?.copyToMyProject || '复制到我的项目'}>
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={handleCopyToMyProject}
                loading={copying}
                className={styles.toggleBtn}
              />
            </Tooltip>
          )}

          {/* Share button (hidden in share mode) */}
          {!shareMode && (
            <Tooltip title={user ? (t.share?.title || '分享') : (t.share?.loginRequired || '请先登录')}>
              <Button
                type="text"
                icon={<ShareAltOutlined />}
                onClick={() => setShareModalOpen(true)}
                disabled={!currentProject}
                className={styles.toggleBtn}
              />
            </Tooltip>
          )}

          {/* Collaborations button (only for logged in users, hidden in share mode) */}
          {!shareMode && user && (
            <Tooltip title={t.collaborations?.title || '我的协作'}>
              <Button
                type="text"
                icon={<TeamOutlined />}
                onClick={() => setCollaborationsModalOpen(true)}
                className={styles.toggleBtn}
              />
            </Tooltip>
          )}

          <Button
            type="text"
            onClick={toggleLanguage}
            className={styles.toggleBtn}
          >
            {language === 'zh-CN' ? '中' : 'EN'}
          </Button>
          <Button
            type="text"
            icon={theme === 'light' ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggleTheme}
            className={styles.toggleBtn}
          />

          {/* User menu (show in share mode for potential login) */}
          <UserMenu onLoginClick={() => setLoginModalOpen(true)} />
        </Space>
      </div>

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {currentProject && !shareMode && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          projectId={currentProject.id}
        />
      )}

      {user && !shareMode && (
        <CollaborationsModal
          open={collaborationsModalOpen}
          onClose={() => setCollaborationsModalOpen(false)}
        />
      )}
    </div>
  )
}
