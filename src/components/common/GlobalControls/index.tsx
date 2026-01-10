import { Dropdown, Button, Space, Tooltip } from 'antd'
import { SunOutlined, MoonOutlined, GlobalOutlined, DesktopOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useUIStore, type ThemeMode } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import styles from './GlobalControls.module.css'

const themeIcons: Record<ThemeMode, React.ReactNode> = {
  light: <SunOutlined />,
  dark: <MoonOutlined />,
  system: <DesktopOutlined />,
}

export function GlobalControls() {
  const { theme, setTheme } = useUIStore()
  const { language, setLanguage, t } = useI18n()

  const themeItems: MenuProps['items'] = [
    {
      key: 'light',
      label: t.theme.light,
      icon: <SunOutlined />,
      onClick: () => setTheme('light'),
    },
    {
      key: 'dark',
      label: t.theme.dark,
      icon: <MoonOutlined />,
      onClick: () => setTheme('dark'),
    },
    {
      key: 'system',
      label: t.theme.system,
      icon: <DesktopOutlined />,
      onClick: () => setTheme('system'),
    },
  ]

  const languageItems: MenuProps['items'] = [
    {
      key: 'zh-CN',
      label: '中文',
      onClick: () => setLanguage('zh-CN'),
    },
    {
      key: 'en-US',
      label: 'English',
      onClick: () => setLanguage('en-US'),
    },
  ]

  return (
    <div className={styles.container}>
      <Space size={4}>
        <Dropdown menu={{ items: languageItems, selectedKeys: [language] }} trigger={['click']}>
          <Tooltip title={language === 'zh-CN' ? '切换语言' : 'Switch Language'}>
            <Button type="text" icon={<GlobalOutlined />} className={styles.controlBtn}>
              {language === 'zh-CN' ? '中' : 'EN'}
            </Button>
          </Tooltip>
        </Dropdown>
        <Dropdown menu={{ items: themeItems, selectedKeys: [theme] }} trigger={['click']}>
          <Tooltip title={t.theme[theme]}>
            <Button type="text" icon={themeIcons[theme]} className={styles.controlBtn} />
          </Tooltip>
        </Dropdown>
      </Space>
    </div>
  )
}
