import { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { router } from './router'
import { initializeAuth, useAuthStore } from './stores/authStore'
import './styles/global.css'

// App wrapper that initializes auth on startup
function App() {
  const [isReady, setIsReady] = useState(false)
  const { isInitialized } = useAuthStore()

  useEffect(() => {
    // Initialize auth listener
    const unsubscribe = initializeAuth()

    // Mark as ready after a short delay to ensure auth state is checked
    const timer = setTimeout(() => setIsReady(true), 100)

    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  // Show loading until auth is initialized
  if (!isReady && !isInitialized) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-layout)'
      }}>
        <Spin size="large" />
      </div>
    )
  }

  return <RouterProvider router={router} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  // 临时移除 StrictMode 以验证 echarts-for-react 兼容性问题
  // TODO: 添加 Error Boundary 后恢复 StrictMode
  // <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0A7171',
          borderRadius: 6,
        },
      }}
    >
      <App />
    </ConfigProvider>
  // </React.StrictMode>
)
