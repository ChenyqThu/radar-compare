import { useMemo, useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import styles from './TabDemo.module.css'

const DIMENSIONS = [
  { id: 'd1', name: 'Performance', nameZh: '性能' },
  { id: 'd2', name: 'Security', nameZh: '安全性' },
  { id: 'd3', name: 'Scalability', nameZh: '可扩展性' },
  { id: 'd4', name: 'User Experience', nameZh: '用户体验' },
  { id: 'd5', name: 'Integration', nameZh: '集成能力' },
  { id: 'd6', name: 'Cost', nameZh: '成本效益' },
]

const VENDORS = [
  { id: 'v1', name: 'Product A', nameZh: '产品 A', color: '#5470c6', scores: [8.5, 7.2, 9.0, 6.8, 7.5, 8.0] },
  { id: 'v2', name: 'Product B', nameZh: '产品 B', color: '#91cc75', scores: [7.0, 8.8, 6.5, 8.2, 9.0, 6.5] },
  { id: 'v3', name: 'Product C', nameZh: '产品 C', color: '#fac858', scores: [9.2, 6.5, 7.8, 7.5, 6.0, 9.0] },
]

export function DemoRadar() {
  const { theme } = useUIStore()
  const { language } = useI18n()
  const [mounted, setMounted] = useState(false)
  const isZh = language === 'zh-CN'
  const isDark = theme === 'dark'

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const option = useMemo<EChartsOption>(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'
    const axisColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'

    return {
      tooltip: { trigger: 'item' },
      legend: {
        data: VENDORS.map((v) => (isZh ? v.nameZh : v.name)),
        bottom: 0,
        textStyle: { color: textColor, fontSize: 11 },
        itemWidth: 14,
        itemHeight: 10,
        itemGap: 8,
      },
      radar: {
        indicator: DIMENSIONS.map((d) => ({ name: isZh ? d.nameZh : d.name, max: 10 })),
        shape: 'polygon',
        splitNumber: 5,
        radius: '58%',
        center: ['50%', '45%'],
        axisName: { color: textColor, fontSize: 10 },
        splitLine: { lineStyle: { color: axisColor } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: axisColor } },
      },
      series: [{
        type: 'radar',
        data: VENDORS.map((v) => ({
          name: isZh ? v.nameZh : v.name,
          value: v.scores,
          itemStyle: { color: v.color },
          lineStyle: { color: v.color, width: 2 },
          areaStyle: {
            color: {
              type: 'radial' as const,
              x: 0.5, y: 0.5, r: 0.5,
              colorStops: [
                { offset: 0, color: 'transparent' },
                { offset: 1, color: v.color + '40' },
              ],
            },
          },
        })),
        symbol: 'circle',
        symbolSize: 5,
      }],
    }
  }, [isDark, isZh])

  if (!mounted) return <div className={styles.chartContainer} />

  return (
    <div className={styles.chartContainer}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
