import { FloatButton } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import styles from './SettingsButton.module.css'

interface SettingsButtonProps {
  keyShortcut?: string
}

export function SettingsButton({ keyShortcut = 's' }: SettingsButtonProps) {
  const { openSettingsDrawer, appMode } = useUIStore()
  const { t } = useI18n()

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if it's the designated shortcut key (case insensitive)
      // and no modifier keys except shift
      if (
        e.key.toLowerCase() === keyShortcut.toLowerCase() &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        // Ignore if user is typing in an input/textarea
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return
        }

        e.preventDefault()
        openSettingsDrawer()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [keyShortcut, openSettingsDrawer])

  const tooltipText = appMode === 'manpower'
    ? `${t.manpower?.config || '配置'} (${keyShortcut.toUpperCase()})`
    : `${t.settings.openSettings} (${keyShortcut.toUpperCase()})`

  return (
    <FloatButton
      icon={<SettingOutlined />}
      type="primary"
      onClick={openSettingsDrawer}
      tooltip={tooltipText}
      className={styles.button}
      style={{ right: 24, bottom: 24 }}
    />
  )
}
