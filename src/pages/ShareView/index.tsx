import { useState, useEffect } from 'react'
import { Layout, Spin, Empty, Typography, Input, Button, message, Space, Tag } from 'antd'
import { LockOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import { RadarChart } from '@/components/chart/RadarChart'
import { useRadarStore } from '@/stores/radarStore'
import {
  getShareByToken,
  getCloudProject,
  incrementShareViewCount,
  isShareLinkValid,
  type ShareLink,
} from '@/services/supabase'
import { useI18n } from '@/locales'
import styles from './ShareView.module.css'

const { Content } = Layout

interface ShareViewProps {
  shareToken: string
}

export function ShareView({ shareToken }: ShareViewProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [share, setShare] = useState<ShareLink | null>(null)
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [projectLoaded, setProjectLoaded] = useState(false)

  useEffect(() => {
    loadShare()
  }, [shareToken])

  const loadShare = async () => {
    setLoading(true)
    setError(null)

    const shareData = await getShareByToken(shareToken)

    if (!shareData) {
      setError(t.shareView?.linkNotFound || '分享链接不存在或已失效')
      setLoading(false)
      return
    }

    // Check if link is valid
    const { valid, reason } = isShareLinkValid(shareData)
    if (!valid) {
      setError(reason || t.shareView?.linkExpired || '链接已失效')
      setLoading(false)
      return
    }

    setShare(shareData)

    // Check if password is required
    if (shareData.password) {
      setPasswordRequired(true)
      setLoading(false)
      return
    }

    // Load project
    await loadProject(shareData)
  }

  const loadProject = async (shareData: ShareLink) => {
    setLoading(true)

    const project = await getCloudProject(shareData.projectId)

    if (!project) {
      setError(t.shareView?.projectNotFound || '项目不存在')
      setLoading(false)
      return
    }

    // Increment view count
    await incrementShareViewCount(shareData.id)

    // Load project into store (read-only mode)
    useRadarStore.setState({
      currentProject: project,
      isLoading: false,
    })

    setProjectLoaded(true)
    setLoading(false)
  }

  const handlePasswordSubmit = async () => {
    if (!share) return

    // Simple password check (in production, this should be done server-side)
    if (password === share.password) {
      await loadProject(share)
      setPasswordRequired(false)
    } else {
      message.error(t.shareView?.wrongPassword || '密码错误')
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Empty
          description={error}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  if (passwordRequired) {
    return (
      <div className={styles.passwordContainer}>
        <div className={styles.passwordCard}>
          <LockOutlined className={styles.lockIcon} />
          <Typography.Title level={4}>
            {t.shareView?.passwordRequired || '此链接需要密码'}
          </Typography.Title>
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.shareView?.enterPassword || '请输入密码'}
            onPressEnter={handlePasswordSubmit}
            size="large"
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={handlePasswordSubmit} block size="large">
            {t.shareView?.access || '访问'}
          </Button>
        </div>
      </div>
    )
  }

  if (!projectLoaded) {
    return null
  }

  return (
    <Layout className={styles.layout}>
      <div className={styles.shareHeader}>
        <Typography.Title level={4} className={styles.projectName}>
          {useRadarStore.getState().currentProject?.name}
        </Typography.Title>
        <Space>
          <Tag color={share?.shareType === 'readonly' ? 'blue' : 'green'}>
            {share?.shareType === 'readonly' ? (
              <><EyeOutlined /> {t.share?.readonly || '只读'}</>
            ) : (
              <><EditOutlined /> {t.share?.editable || '可编辑'}</>
            )}
          </Tag>
          <Typography.Text type="secondary">
            {t.shareView?.sharedView || '分享视图'}
          </Typography.Text>
        </Space>
      </div>
      <Content className={styles.content}>
        <div className={styles.chartArea}>
          <RadarChart />
        </div>
      </Content>
    </Layout>
  )
}
