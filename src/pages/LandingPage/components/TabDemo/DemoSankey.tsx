import { useMemo, useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useUIStore } from '@/stores/uiStore'
import styles from './TabDemo.module.css'

const SANKEY_DATA = {
  nodes: [
    { name: 'Team A' }, { name: 'Team B' }, { name: 'Team C' },
    { name: 'Project X' }, { name: 'Project Y' }, { name: 'Project Z' },
  ],
  links: [
    { source: 'Team A', target: 'Project X', value: 5 },
    { source: 'Team A', target: 'Project Y', value: 3 },
    { source: 'Team B', target: 'Project Y', value: 4 },
    { source: 'Team B', target: 'Project Z', value: 6 },
    { source: 'Team C', target: 'Project X', value: 2 },
    { source: 'Team C', target: 'Project Z', value: 4 },
  ],
}

export function DemoSankey() {
  const { theme } = useUIStore()
  const [mounted, setMounted] = useState(false)
  const isDark = theme === 'dark'

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const option = useMemo<EChartsOption>(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'

    return {
      tooltip: { trigger: 'item', triggerOn: 'mousemove' },
      series: [{
        type: 'sankey',
        data: SANKEY_DATA.nodes,
        links: SANKEY_DATA.links,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { color: textColor },
      }],
    }
  }, [isDark])

  if (!mounted) return <div className={styles.chartContainer} />

  return (
    <div className={styles.chartContainer}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
