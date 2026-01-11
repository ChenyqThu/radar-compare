import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.css'

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
