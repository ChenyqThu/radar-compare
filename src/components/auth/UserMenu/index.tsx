import { Dropdown, Avatar, Button, Typography, message } from 'antd'
import {
  UserOutlined,
  LogoutOutlined,
  CloudOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useI18n } from '@/locales'
import styles from './UserMenu.module.css'

interface UserMenuProps {
  onLoginClick: () => void
}

export function UserMenu({ onLoginClick }: UserMenuProps) {
  const { user, isLoading, signOut } = useAuthStore()
  const { t } = useI18n()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    message.success(t.auth?.logoutSuccess || '已退出登录')
    navigate('/', { replace: true })
  }

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
      key: 'cloud-status',
      icon: <CloudOutlined />,
      label: t.auth?.cloudConnected || '已连接云端',
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
        <div className={styles.avatarWrapper}>
          <Avatar
            size={32}
            src={user.avatarUrl}
            icon={!user.avatarUrl && <UserOutlined />}
            className={styles.avatar}
          />
        </div>
      </button>
    </Dropdown>
  )
}
