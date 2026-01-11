import { Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/stores/authStore'
import styles from './AuthGuard.module.css'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  // 等待认证初始化
  if (!isInitialized || isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    )
  }

  // 未登录，重定向到首页
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}
