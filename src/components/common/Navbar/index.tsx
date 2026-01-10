import { Button, Space } from 'antd'
import { SunOutlined, MoonOutlined, RadarChartOutlined, HistoryOutlined } from '@ant-design/icons'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import omadaLight from '@/assets/omada_light.png'
import omadaDark from '@/assets/Omada_dark.png'
import styles from './Navbar.module.css'
import type { AppMode } from '@/stores/uiStore'

export function Navbar() {
  const { theme, setTheme, appMode, setAppMode } = useUIStore()
  const { language, setLanguage, t } = useI18n()

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
        </Space>
      </div>
    </div>
  )
}
