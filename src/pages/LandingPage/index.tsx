import { Button, Typography, Row, Col } from 'antd'
import {
  RadarChartOutlined,
  TeamOutlined,
  HistoryOutlined,
  RocketOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LoginModal } from '@/components/auth/LoginModal'
import { ParticleBackground } from './components/ParticleBackground'
import { ShinyButton } from './components/ShinyButton'
import { TabDemo } from './components/TabDemo'
import { ProjectShowcase } from './components/ProjectShowcase'
import { InvertedCursor } from './components/InvertedCursor'
import { NoiseOverlay } from './components/NoiseOverlay'
import { BorderBeam } from './components/BorderBeam'
import styles from './LandingPage.module.css'
import logoNew from '@/assets/logo_new.png'

const { Title, Paragraph } = Typography

export function LandingPage() {
  const { t, language, setLanguage } = useI18n()
  const navigate = useNavigate()
  const { user, isLoading } = useAuthStore()
  const { setTheme } = useUIStore()
  const heroRef = useRef(null)

  const [loginVisible, setLoginVisible] = useState(false)

  // Force dark theme on landing page
  useEffect(() => {
    setTheme('dark')
  }, [setTheme])

  // Auto-redirect logged-in users
  useEffect(() => {
    if (user) {
      navigate('/app', { replace: true })
    }
  }, [user, navigate])

  const features = [
    {
      icon: <RadarChartOutlined className={styles.featureIcon} />,
      title: t.landing?.feature1Title || 'Multi-Dimension Radar',
      description: t.landing?.feature1Desc || 'Visualize complex data with customizable dimensions and weights.',
      delay: 0.2,
    },
    {
      icon: <HistoryOutlined className={styles.featureIcon} />,
      title: t.landing?.feature3Title || 'Version Timeline',
      description: t.landing?.feature3Desc || 'Track product evolution with our smart layout engine and perfect zoom.',
      delay: 0.4,
    },
    {
      icon: <TeamOutlined className={styles.featureIcon} />,
      title: t.landing?.feature2Title || 'Real-time Collaboration',
      description: t.landing?.feature2Desc || 'Work together with your team, sync data instantly to the cloud.',
      delay: 0.6,
    },
  ]

  return (
    <div className={styles.container}>
      <InvertedCursor />
      <NoiseOverlay />
      {/* Navbar */}
      <motion.header
        className={styles.navbar}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.logo}>
          <img src={logoNew} alt="Logo" className={styles.logoIcon} style={{ height: 32, width: 'auto' }} />
          <span className={styles.logoText}>{t.app?.productName || 'Prism'}</span>
        </div>
        <div className={styles.navActions}>
          <Button
            type="text"
            className={styles.navBtn}
            onClick={() => setLanguage(language === 'zh-CN' ? 'en-US' : 'zh-CN')}
            data-magnetic
          >
            {language === 'zh-CN' ? '中' : 'EN'}
          </Button>
          <Button
            type="primary"
            className={styles.loginBtn}
            onClick={() => setLoginVisible(true)}
            loading={isLoading}
            data-magnetic
          >
            {t.landing?.signIn || 'Sign In'}
          </Button>
        </div>
      </motion.header>

      {/* Hero Section with Particles */}
      <section className={styles.hero} ref={heroRef}>
        <ParticleBackground />
        <div className={styles.heroContent}>
          {/* Left: Text Content */}
          <motion.div
            className={styles.heroLeft}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className={styles.heroTextContent}>
              <div className={styles.accentBadge}>
                <RocketOutlined /> {t.landing?.heroTagline || 'v2.0 Now Available'}
              </div>

              <h1 className={styles.gradTitle}>
                {t.landing?.title || 'Visualization Tool'}
              </h1>

              <p className={styles.heroSubtitle}>
                {t.landing?.subtitle || 'Multi-Dimensional Insights for Product Evolution'}
              </p>

              <div className={styles.heroButtons}>
                <ShinyButton onClick={() => setLoginVisible(true)} loading={isLoading}>
                  {t.landing?.getStarted || 'Get Started Now'}
                </ShinyButton>
              </div>
            </div>
          </motion.div>

          {/* Right: Demo */}
          <motion.div
            className={styles.heroRight}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <TabDemo />
          </motion.div>
        </div>
      </section>

      {/* Cards Grid */}
      <section className={styles.gridSection}>
        <div className={styles.maxWidthWrapper}>
          <Title level={2} className={`${styles.sectionTitle} ${styles.centerText}`}>
            {t.landing?.whyChooseTitle || 'Why Choose Prism?'}
          </Title>
          <Row gutter={[24, 24]} className={styles.cardGrid}>
            {features.map((f, i) => (
              <Col xs={24} sm={8} key={i}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: f.delay, duration: 0.5 }}
                >
                  <div className={styles.glassCard}>
                    <BorderBeam duration={8} borderWidth={1.5} colorFrom="#ffffff" colorTo="transparent">
                      <div style={{ height: '100%', padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div className={styles.glassCardIcon}>{f.icon}</div>
                        <h3 className={styles.glassCardTitle}>{f.title}</h3>
                        <p className={styles.glassCardDesc}>{f.description}</p>
                      </div>
                    </BorderBeam>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Other Projects Section */}
      <section className={styles.projectsSection}>
        <div className={styles.maxWidthWrapper}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={styles.projectsHeader}
          >
            <Title level={2} className={styles.sectionTitle}>
              {t.landing?.otherProjectsTitle || 'Explore More Tools'}
            </Title>
            <Paragraph className={styles.sectionDesc}>
              {t.landing?.otherProjectsDesc || 'Check out our other productivity tools'}
            </Paragraph>
          </motion.div>
          <ProjectShowcase />
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.maxWidthWrapper}>
          <div className={styles.footerContent}>
            <div className={styles.footerLogo}>
              <img src={logoNew} alt="Logo" style={{ height: 24, width: 'auto', marginRight: 8 }} />
              {t.app?.productName || 'Prism'}
            </div>
            <div className={styles.footerLinks}>
              <a href="#">Documentation</a>
              <a href="https://github.com/ChenyqThu/radar-compare" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="/privacy">Privacy</a>
            </div>
          </div>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} {t.app?.productName || 'Prism'}. All rights reserved.
          </div>
        </div>
      </footer>

      <LoginModal open={loginVisible} onClose={() => setLoginVisible(false)} />
    </div>
  )
}
