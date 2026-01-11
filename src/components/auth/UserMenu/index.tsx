import { Dropdown, Avatar, Button, Space, Typography, message, Tooltip } from 'antd'
import {
  UserOutlined,
  LogoutOutlined,
  CloudOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  DisconnectOutlined,
  ReloadOutlined,
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
  const { status, lastSyncAt, isOnline, pendingChanges, retrySync } = useSyncStore()
  const { t } = useI18n()

  const handleSignOut = async () => {
    await signOut()
    message.success(t.auth?.logoutSuccess || '已退出登录')
  }

  const handleRetrySync = async () => {
    await retrySync()
    message.info(t.auth?.retryingSync || '正在重试同步...')
  }

  // Get sync status display
  const getSyncDisplay = () => {
    if (!isOnline) {
      return {
        icon: <DisconnectOutlined className={styles.offlineIcon} />,
        text: t.auth?.offline || '离线模式',
        tooltip: pendingChanges > 0
          ? `${t.auth?.offlineWithPending || '离线 - 有'} ${pendingChanges} ${t.auth?.pendingChanges || '个待同步更改'}`
          : t.auth?.offlineHintShort || '网络已断开，数据仅保存在本地',
        showRetry: false,
      }
    }

    switch (status) {
      case 'syncing':
        return {
          icon: <SyncOutlined spin className={styles.syncingIcon} />,
          text: t.auth?.syncing || '同步中...',
          tooltip: t.auth?.syncing || '正在同步数据',
          showRetry: false,
        }
      case 'success':
        return {
          icon: <CheckCircleOutlined className={styles.successIcon} />,
          text: lastSyncAt
            ? `${t.auth?.lastSync || '上次同步'}: ${new Date(lastSyncAt).toLocaleTimeString()}`
            : t.auth?.synced || '已同步',
          tooltip: t.auth?.synced || '数据已同步',
          showRetry: false,
        }
      case 'error':
        return {
          icon: <ExclamationCircleOutlined className={styles.errorIcon} />,
          text: t.auth?.syncError || '同步失败',
          tooltip: t.auth?.syncErrorRetry || '同步失败，点击重试',
          showRetry: true,
        }
      case 'offline':
        return {
          icon: <DisconnectOutlined className={styles.offlineIcon} />,
          text: t.auth?.offline || '离线模式',
          tooltip: t.auth?.offlineHintShort || '网络已断开',
          showRetry: false,
        }
      default:
        return {
          icon: <CloudOutlined />,
          text: t.auth?.cloudReady || '云端就绪',
          tooltip: t.auth?.cloudReady || '已连接云端',
          showRetry: false,
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
      label: (
        <Space>
          <span>{syncDisplay.text}</span>
          {syncDisplay.showRetry && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRetrySync}
              className={styles.retryBtn}
            >
              {t.auth?.retry || '重试'}
            </Button>
          )}
        </Space>
      ),
      disabled: !syncDisplay.showRetry,
      onClick: syncDisplay.showRetry ? handleRetrySync : undefined,
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
