import { useMemo, useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { DEMO_DIMENSIONS, DEMO_VENDORS } from './sampleData'
import styles from './DemoRadarChart.module.css'

export function DemoRadarChart() {
  const { theme } = useUIStore()
  const { language } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [visibleVendors, setVisibleVendors] = useState<Set<string>>(
    new Set(DEMO_VENDORS.map((v) => v.id))
  )

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const isZh = language === 'zh-CN'
  const isDark = theme === 'dark'

  const option = useMemo<EChartsOption>(() => {
    const textColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)'
    const axisLineColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'

    const indicator = DEMO_DIMENSIONS.map((d) => ({
      name: isZh ? d.nameZh : d.name,
      max: 10,
    }))

    const seriesData = DEMO_VENDORS.filter((v) => visibleVendors.has(v.id)).map((vendor) => ({
      name: isZh ? vendor.nameZh : vendor.name,
      value: DEMO_DIMENSIONS.map((d) => vendor.scores[d.id]),
      itemStyle: { color: vendor.color },
      lineStyle: { color: vendor.color, width: 2 },
      areaStyle: {
        color: {
          type: 'radial' as const,
          x: 0.5,
          y: 0.5,
          r: 0.5,
          colorStops: [
            { offset: 0, color: 'transparent' },
            { offset: 1, color: vendor.color + '40' },
          ],
        },
      },
    }))

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: isDark ? '#1f1f1f' : '#fff',
        borderColor: isDark ? '#333' : '#e8e8e8',
        textStyle: { color: textColor },
      },
      legend: {
        data: DEMO_VENDORS.map((v) => (isZh ? v.nameZh : v.name)),
        bottom: 0,
        textStyle: { color: textColor },
        selectedMode: 'multiple',
        selected: Object.fromEntries(
          DEMO_VENDORS.map((v) => [isZh ? v.nameZh : v.name, visibleVendors.has(v.id)])
        ),
      },
      radar: {
        indicator,
        shape: 'polygon',
        splitNumber: 5,
        axisName: {
          color: textColor,
          fontSize: 12,
        },
        splitLine: { lineStyle: { color: axisLineColor } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: axisLineColor } },
      },
      series: [
        {
          type: 'radar',
          data: seriesData,
          symbol: 'circle',
          symbolSize: 6,
          animation: true,
          animationDuration: 500,
        },
      ],
    }
  }, [isDark, isZh, visibleVendors])

  const handleLegendClick = (params: { name: string }) => {
    const vendor = DEMO_VENDORS.find(
      (v) => (isZh ? v.nameZh : v.name) === params.name
    )
    if (vendor) {
      setVisibleVendors((prev) => {
        const next = new Set(prev)
        if (next.has(vendor.id)) {
          if (next.size > 1) next.delete(vendor.id)
        } else {
          next.add(vendor.id)
        }
        return next
      })
    }
  }

  if (!mounted) {
    return <div className={styles.container} />
  }

  return (
    <div className={styles.container}>
      <ReactECharts
        option={option}
        style={{ width: '100%', height: '100%' }}
        onEvents={{ legendselectchanged: handleLegendClick }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}
