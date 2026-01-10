import { FloatButton } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import styles from './SettingsButton.module.css'

export function SettingsButton() {
  const { openSettingsDrawer } = useUIStore()
  const { t } = useI18n()

  return (
    <FloatButton
      icon={<SettingOutlined />}
      type="primary"
      onClick={openSettingsDrawer}
      tooltip={t.settings.openSettings}
      className={styles.button}
      style={{ right: 24, bottom: 24 }}
    />
  )
}
