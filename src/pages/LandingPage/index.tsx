import { Button, Typography, Row, Col } from 'antd'
import {
  RadarChartOutlined,
  TeamOutlined,
  HistoryOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { LoginModal } from '@/components/auth/LoginModal'
import styles from './LandingPage.module.css'
import logoNew from '@/assets/logo_new.png'

const { Title, Paragraph } = Typography

export function LandingPage() {
  const { t, language, setLanguage } = useI18n()
  const navigate = useNavigate()
  const { user, isLoading } = useAuthStore()
  const { theme, setTheme } = useUIStore()
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const [loginVisible, setLoginVisible] = useState(false)

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // 已登录用户自动跳转到应用
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
      delay: 0.2
    },
    {
      icon: <HistoryOutlined className={styles.featureIcon} />,
      title: t.landing?.feature3Title || 'Version Timeline',
      description: t.landing?.feature3Desc || 'Track product evolution with our smart layout engine and perfect zoom.',
      delay: 0.4
    },
    {
      icon: <TeamOutlined className={styles.featureIcon} />,
      title: t.landing?.feature2Title || 'Real-time Collaboration',
      description: t.landing?.feature2Desc || 'Work together with your team, sync data instantly to the cloud.',
      delay: 0.6
    },
  ]

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <motion.header
        className={styles.navbar}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.logo}>
          <img src={logoNew} alt="Logo" className={styles.logoIcon} style={{ height: 32, width: 'auto' }} />
          <span className={styles.logoText}>{t.app?.productName || 'Product Evolution Platform'}</span>
        </div>
        <div className={styles.navActions}>
          <Button
            type="text"
            className={styles.navBtn}
            onClick={() => setLanguage(language === 'zh-CN' ? 'en-US' : 'zh-CN')}
          >
            {language === 'zh-CN' ? '中' : 'EN'}
          </Button>
          <Button
            type="text"
            className={styles.navBtn}
            icon={theme === 'light' ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          />
          <Button
            type="primary"
            className={styles.loginBtn}
            onClick={() => setLoginVisible(true)}
            loading={isLoading}
          >
            {t.landing?.signIn || 'Sign In'}
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroContent}>
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className={styles.heroTextContent}>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className={styles.accentBadge}>
                <RocketOutlined /> v2.0 Now Available
              </div>
            </motion.div>

            <motion.h1
              className={styles.gradTitle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {t.landing?.title || 'The Ultimate Competitive Intelligence Platform'}
            </motion.h1>

            <motion.p
              className={styles.heroSubtitle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              {t.app?.subtitle || 'Multi-Dimensional Insights for Product Evolution'}
            </motion.p>

            <motion.div
              className={styles.heroButtons}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <Button
                type="primary"
                size="large"
                className={styles.ctaButton}
                onClick={() => setLoginVisible(true)}
                loading={isLoading}
              >
                {t.landing?.getStarted || 'Get Started Now'}
              </Button>
              <Button
                ghost
                size="large"
                className={styles.secondaryButton}
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Abstract Background Elements */}
        <div className={styles.bgGlow}></div>
        <div className={styles.gridOverlay}></div>
      </section>

      {/* Feature Showcase 1: Radar */}
      <section className={styles.showcaseSection}>
        <div className={styles.maxWidthWrapper}>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} md={12}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={styles.showcaseText}
              >
                <Title level={2} className={styles.sectionTitle}>
                  Unrivaled Radar Analysis
                </Title>
                <Paragraph className={styles.sectionDesc}>
                  Don't settle for simple charts. Create deep, multi-level evaluation models. Drag, drop, and score with precision. Visualize weights with our Sunburst view.
                </Paragraph>
                <ul className={styles.featureList}>
                  <li><SafetyCertificateOutlined /> Hierarchical Dimensions</li>
                  <li><SafetyCertificateOutlined /> Smart Dual-Layout</li>
                  <li><SafetyCertificateOutlined /> Excel/JSON Import</li>
                </ul>
              </motion.div>
            </Col>
            <Col xs={24} md={12}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={styles.mockupWrapper}
              >
                {/* Placeholder for Radar Image */}
                <div className={styles.glassMockup}>
                  <img src="/radar_mockup_placeholder.png" alt="Radar Comparison Interface" className={styles.mockupImage} />
                  <div className={styles.glowEffect}></div>
                </div>
              </motion.div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Feature Showcase 2: Timeline */}
      <section className={`${styles.showcaseSection} ${styles.altSection}`}>
        <div className={styles.maxWidthWrapper}>
          <Row gutter={[48, 48]} align="middle" style={{ flexDirection: 'row-reverse' }}>
            <Col xs={24} md={12}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={styles.showcaseText}
              >
                <Title level={2} className={styles.sectionTitle}>
                  Time-Travel Through History
                </Title>
                <Paragraph className={styles.sectionDesc}>
                  Understand how products evolve effectively. Our new "Best-Fit" Version Timeline algorithm packs dense history into a beautiful, readable stream.
                </Paragraph>
                <ul className={styles.featureList}>
                  <li><HistoryOutlined /> Smart Non-Overlap Layout</li>
                  <li><HistoryOutlined /> Perfect Zoom Technology</li>
                  <li><HistoryOutlined /> Critical Path Highlighting</li>
                </ul>
              </motion.div>
            </Col>
            <Col xs={24} md={12}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className={styles.mockupWrapper}
              >
                {/* Placeholder for Timeline Image */}
                <div className={styles.glassMockup}>
                  <img src="/timeline_mockup_placeholder.png" alt="Timeline Interface" className={styles.mockupImage} />
                  <div className={styles.glowEffect}></div>
                </div>
              </motion.div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Cards Grid */}
      <section className={styles.gridSection}>
        <div className={styles.maxWidthWrapper}>
          <Title level={2} className={`${styles.sectionTitle} ${styles.centerText}`}>Why Choose Product Evolution Platform?</Title>
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
                    <div className={styles.glassCardIcon}>{f.icon}</div>
                    <h3 className={styles.glassCardTitle}>{f.title}</h3>
                    <p className={styles.glassCardDesc}>{f.description}</p>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.maxWidthWrapper}>
          <div className={styles.footerContent}>
            <div className={styles.footerLogo}>
              <img src={logoNew} alt="Logo" className={styles.logoIcon} style={{ height: 24, width: 'auto', marginRight: 8 }} />
              {t.app?.productName || 'Prism'}
            </div>
            <div className={styles.footerLinks}>
              <a href="#">Documentation</a>
              <a href="#">GitHub</a>
              <a href="#">Privacy</a>
            </div>
          </div>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} {t.app?.productName || 'Prism'}. All rights reserved.
          </div>
        </div>
      </footer>

      <LoginModal
        open={loginVisible}
        onClose={() => setLoginVisible(false)}
      />
    </div>
  )
}
