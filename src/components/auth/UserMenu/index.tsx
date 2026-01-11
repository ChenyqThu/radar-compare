import { Dropdown, Avatar, Button, Space, Typography, message, Tooltip } from 'antd'
import {
  UserOutlined,
  LogoutOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import { useI18n } from '@/locales'
import styles from './UserMenu.module.css'

interface UserMenuProps {
  onLoginClick: () => void
}

export function UserMenu({ onLoginClick }: UserMenuProps) {
  const { user, isLoading, signOut } = useAuthStore()
  const { status, lastSyncAt } = useSyncStore()
  const { t } = useI18n()

  const handleSignOut = async () => {
    await signOut()
    message.success(t.auth?.logoutSuccess || '已退出登录')
  }

  // Get sync status display
  const getSyncDisplay = () => {
    switch (status) {
      case 'syncing':
        return {
          icon: <SyncOutlined spin className={styles.syncingIcon} />,
          text: t.auth?.syncing || '同步中...',
          tooltip: t.auth?.syncing || '正在同步数据',
        }
      case 'success':
        return {
          icon: <CheckCircleOutlined className={styles.successIcon} />,
          text: lastSyncAt
            ? `${t.auth?.lastSync || '上次同步'}: ${new Date(lastSyncAt).toLocaleTimeString()}`
            : t.auth?.synced || '已同步',
          tooltip: t.auth?.synced || '数据已同步',
        }
      case 'error':
        return {
          icon: <ExclamationCircleOutlined className={styles.errorIcon} />,
          text: t.auth?.syncError || '同步失败',
          tooltip: t.auth?.syncError || '同步失败，稍后重试',
        }
      default:
        return {
          icon: <CloudOutlined />,
          text: t.auth?.cloudReady || '云端就绪',
          tooltip: t.auth?.cloudReady || '已连接云端',
        }
    }
  }

  const syncDisplay = getSyncDisplay()

  // Not logged in - show login button
  if (!user) {
    return (
      <Button
        type="text"
        icon={<UserOutlined />}
        onClick={onLoginClick}
        loading={isLoading}
        className={styles.loginBtn}
      >
        {t.auth?.login || '登录'}
      </Button>
    )
  }

  // Logged in - show user menu
  const menuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div className={styles.userInfo}>
          <Typography.Text strong>{user.name}</Typography.Text>
          <Typography.Text type="secondary" className={styles.email}>
            {user.email}
          </Typography.Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'sync-status',
      icon: syncDisplay.icon,
      label: syncDisplay.text,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t.auth?.logout || '退出登录',
      danger: true,
      onClick: handleSignOut,
    },
  ]

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
      <button className={styles.avatarBtn}>
        <Space size={8}>
          <Tooltip title={syncDisplay.tooltip}>
            {syncDisplay.icon}
          </Tooltip>
          <Avatar
            size={28}
            src={user.avatarUrl}
            icon={!user.avatarUrl && <UserOutlined />}
            className={styles.avatar}
          />
        </Space>
      </button>
    </Dropdown>
  )
}
