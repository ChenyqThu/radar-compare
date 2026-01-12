import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LandingPage } from '@/pages/LandingPage'
import { MainApp } from '@/pages/MainApp'
import { ShareView } from '@/pages/ShareView'
import { AuthCallback } from '@/pages/AuthCallback'
import { PrivacyPolicy } from '@/pages/PrivacyPolicy'
import { AuthGuard } from '@/components/auth/AuthGuard'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <MainApp />
      </AuthGuard>
    ),
  },
  {
    path: '/share/:token',
    element: <ShareView />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />,
  },
  {
    path: '/privacy',
    element: <PrivacyPolicy />,
  },
  {
    // 兼容旧链接和 404
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
