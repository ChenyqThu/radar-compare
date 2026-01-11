import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/stores/authStore'
import styles from './AuthCallback.module.css'

export function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isInitialized, user } = useAuthStore()

  useEffect(() => {
    if (isInitialized) {
      if (user) {
        // 检查是否有重定向目标
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app'
        navigate(from, { replace: true })
      } else {
        // 登录失败，返回首页
        navigate('/', { replace: true })
      }
    }
  }, [isInitialized, user, navigate, location])

  return (
    <div className={styles.container}>
      <Spin size="large" tip="登录中..." />
    </div>
  )
}
