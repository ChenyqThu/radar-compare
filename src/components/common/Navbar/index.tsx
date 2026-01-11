import { useState } from 'react'
import { Button, Space, Tooltip } from 'antd'
import { SunOutlined, MoonOutlined, RadarChartOutlined, HistoryOutlined, ShareAltOutlined } from '@ant-design/icons'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/locales'
import { LoginModal, UserMenu } from '@/components/auth'
import { ShareModal } from '@/components/share'
import omadaLight from '@/assets/omada_light.png'
import omadaDark from '@/assets/Omada_dark.png'
import styles from './Navbar.module.css'
import type { AppMode } from '@/stores/uiStore'

export function Navbar() {
  const { theme, setTheme, appMode, setAppMode } = useUIStore()
  const { currentProject } = useRadarStore()
  const { user } = useAuthStore()
  const { language, setLanguage, t } = useI18n()
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const toggleLanguage = () => {
    setLanguage(language === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const logoSrc = theme === 'light' ? omadaLight : omadaDark

  const navItems: Array<{ key: AppMode; icon: React.ReactNode; label: string }> = [
    { key: 'radar', icon: <RadarChartOutlined />, label: t.app.radarMode || '雷达图' },
    { key: 'timeline', icon: <HistoryOutlined />, label: t.app.timelineMode || '时间轴' },
  ]

  return (
    <div className={styles.navbar}>
      <div className={styles.left}>
        <img src={logoSrc} alt="Omada" className={styles.logo} />
        <div className={styles.divider} />
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
      </div>
      <div className={styles.right}>
        <Space size={4}>
          <Tooltip title={user ? (t.share?.title || '分享') : (t.share?.loginRequired || '请先登录')}>
            <Button
              type="text"
              icon={<ShareAltOutlined />}
              onClick={() => setShareModalOpen(true)}
              disabled={!currentProject}
              className={styles.toggleBtn}
            />
          </Tooltip>
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
          <UserMenu onLoginClick={() => setLoginModalOpen(true)} />
        </Space>
      </div>

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {currentProject && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          projectId={currentProject.id}
          projectName={currentProject.name}
        />
      )}
    </div>
  )
}
