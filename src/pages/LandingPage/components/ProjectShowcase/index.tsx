import { motion } from 'framer-motion'
import { LinkOutlined, CameraOutlined, LineChartOutlined, ShopOutlined } from '@ant-design/icons'
import { useI18n } from '@/locales'
import styles from './ProjectShowcase.module.css'

interface Project {
  id: string
  name: string
  url: string
  descEn: string
  descZh: string
  icon: React.ReactNode
  gradient: string
}

const PROJECTS: Project[] = [
  {
    id: 'instagen',
    name: 'InstaGen',
    url: 'https://instagen.chenge.ink',
    descEn: 'Polaroid-style selfie app with album management',
    descZh: '拍立得风格自拍应用，支持相册管理',
    icon: <CameraOutlined />,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'console-omada',
    name: 'Console Omada',
    url: 'https://console.omada.ink',
    descEn: 'Competitor financial & channel data tracking',
    descZh: '竞品财务与渠道数据追踪平台',
    icon: <LineChartOutlined />,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'uistore-monitor',
    name: 'UIStore Monitor',
    url: 'https://uistore.omada.ink',
    descEn: 'Competitor online store monitoring',
    descZh: '竞品在线商店状态监控',
    icon: <ShopOutlined />,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
]

export function ProjectShowcase() {
  const { language } = useI18n()
  const isZh = language === 'zh-CN'

  return (
    <div className={styles.grid}>
      {PROJECTS.map((project, index) => (
        <motion.a
          key={project.id}
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.card}
          style={{ '--card-gradient': project.gradient } as React.CSSProperties}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.15, duration: 0.5 }}
        >
          <div className={styles.iconWrapper} style={{ background: project.gradient }}>
            {project.icon}
          </div>
          <div className={styles.content}>
            <h3 className={styles.name}>
              {project.name}
              <LinkOutlined className={styles.linkIcon} />
            </h3>
            <p className={styles.desc}>
              {isZh ? project.descZh : project.descEn}
            </p>
          </div>
        </motion.a>
      ))}
    </div>
  )
}
