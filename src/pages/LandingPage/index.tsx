import { Button, Typography, Space, Card, Row, Col } from 'antd'
import {
  RadarChartOutlined,
  TeamOutlined,
  HistoryOutlined,
  GoogleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { useEffect } from 'react'
import styles from './LandingPage.module.css'

const { Title, Paragraph, Text } = Typography

export function LandingPage() {
  const { t, language, setLanguage } = useI18n()
  const navigate = useNavigate()
  const { user, signInWithGoogle, isLoading } = useAuthStore()
  const { theme, setTheme } = useUIStore()

  // 已登录用户自动跳转到应用
  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true })
    }
  }, [user, navigate])

  const features = [
    {
      icon: <RadarChartOutlined className={styles.featureIcon} />,
      title: t.landing?.feature1Title || '雷达图对比',
      description: t.landing?.feature1Desc || '直观展示多维度数据对比，支持自定义维度和权重',
    },
    {
      icon: <TeamOutlined className={styles.featureIcon} />,
      title: t.landing?.feature2Title || '团队协作',
      description: t.landing?.feature2Desc || '实时云端同步，支持多人协作编辑',
    },
    {
      icon: <HistoryOutlined className={styles.featureIcon} />,
      title: t.landing?.feature3Title || '时间轴追踪',
      description: t.landing?.feature3Desc || '记录产品演进历程，对比不同时间节点的能力变化',
    },
  ]

  return (
    <div className={styles.container}>
      {/* 顶部导航 */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <RadarChartOutlined /> Radar Compare
        </div>
        <Space>
          <Button
            type="text"
            onClick={() => setLanguage(language === 'zh-CN' ? 'en-US' : 'zh-CN')}
          >
            {language === 'zh-CN' ? 'EN' : '中文'}
          </Button>
          <Button type="text" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </Button>
        </Space>
      </header>

      {/* Hero 区域 */}
      <section className={styles.hero}>
        <Title level={1} className={styles.heroTitle}>
          {t.landing?.title || '竞品能力对比可视化工具'}
        </Title>
        <Paragraph className={styles.heroSubtitle}>
          {t.landing?.subtitle || '通过雷达图直观对比产品能力，支持团队协作与时间轴追踪'}
        </Paragraph>
        <Button
          type="primary"
          size="large"
          icon={<GoogleOutlined />}
          onClick={signInWithGoogle}
          loading={isLoading}
          className={styles.ctaButton}
        >
          {t.landing?.signInWithGoogle || '使用 Google 账号登录'}
        </Button>
        <Text type="secondary" className={styles.hint}>
          {t.landing?.cloudHint || '数据安全存储在云端，支持跨设备访问'}
        </Text>
      </section>

      {/* 功能介绍 */}
      <section className={styles.features}>
        <Row gutter={[32, 32]} justify="center">
          {features.map((feature, index) => (
            <Col xs={24} sm={24} md={8} key={index}>
              <Card className={styles.featureCard} bordered={false}>
                {feature.icon}
                <Title level={4}>{feature.title}</Title>
                <Paragraph type="secondary">{feature.description}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* 底部 */}
      <footer className={styles.footer}>
        <Text type="secondary">
          © {new Date().getFullYear()} Radar Compare
        </Text>
      </footer>
    </div>
  )
}
