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
        // 优先级: sessionStorage > location.state > /app
        const savedRedirect = sessionStorage.getItem('auth_redirect_path')
        let targetPath = '/app'

        if (savedRedirect) {
          targetPath = savedRedirect
          sessionStorage.removeItem('auth_redirect_path')
        } else if (location.state) {
          const from = (location.state as { from?: { pathname: string } })?.from?.pathname
          if (from) {
            targetPath = from
          }
        }

        navigate(targetPath, { replace: true })
      } else {
        // 登录失败，返回首页
        sessionStorage.removeItem('auth_redirect_path')
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
