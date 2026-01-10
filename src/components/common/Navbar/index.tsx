import { Button, Space } from 'antd'
import { SunOutlined, MoonOutlined } from '@ant-design/icons'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import omadaLight from '@/assets/omada_light.png'
import omadaDark from '@/assets/Omada_dark.png'
import styles from './Navbar.module.css'

export function Navbar() {
  const { theme, setTheme } = useUIStore()
  const { language, setLanguage, t } = useI18n()

  const toggleLanguage = () => {
    setLanguage(language === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const logoSrc = theme === 'light' ? omadaLight : omadaDark

  return (
    <div className={styles.navbar}>
      <div className={styles.left}>
        <img src={logoSrc} alt="Omada" className={styles.logo} />
        <div className={styles.divider} />
        <span className={styles.title}>{t.app.title}</span>
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
