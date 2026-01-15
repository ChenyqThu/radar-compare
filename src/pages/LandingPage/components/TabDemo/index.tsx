import { useState } from 'react'
import { Tabs } from 'antd'
import { RadarChartOutlined, ApartmentOutlined, HistoryOutlined } from '@ant-design/icons'
import { useI18n } from '@/locales'
import { motion, AnimatePresence } from 'framer-motion'
import { DemoRadar } from './DemoRadar'
import { DemoSankey } from './DemoSankey'
import { DemoTimeline } from './DemoTimeline'
import styles from './TabDemo.module.css'

export function TabDemo() {
  const { language } = useI18n()
  const isZh = language === 'zh-CN'
  const [activeKey, setActiveKey] = useState('radar')

  const items = [
    {
      key: 'radar',
      label: (
        <span className={styles.tabLabel}>
          <RadarChartOutlined />
          {isZh ? '雷达图' : 'Radar'}
        </span>
      ),
    },
    {
      key: 'timeline',
      label: (
        <span className={styles.tabLabel}>
          <HistoryOutlined />
          {isZh ? '时间轴' : 'Timeline'}
        </span>
      ),
    },
    {
      key: 'sankey',
      label: (
        <span className={styles.tabLabel}>
          <ApartmentOutlined />
          {isZh ? '桑基图' : 'Sankey'}
        </span>
      ),
    },
  ]

  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items}
        centered
        className={styles.tabs}
      />

      <div className={styles.chartContainer}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%', height: '100%' }}
          >
            {activeKey === 'radar' && <DemoRadar />}
            {activeKey === 'timeline' && <DemoTimeline />}
            {activeKey === 'sankey' && <DemoSankey />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
