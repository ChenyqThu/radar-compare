import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { Empty, Button, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { calculateAllDimensionScores } from '@/utils/calculation'
import type { Dimension } from '@/types'
import { isRegularRadar } from '@/types'
import styles from './RadarChart.module.css'

// Helper function to create radial gradient for radar chart area
function createRadialGradient(color: string) {
  // Parse hex color to RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  return new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
    { offset: 0, color: `rgba(${r}, ${g}, ${b}, 0.02)` },
    { offset: 0.5, color: `rgba(${r}, ${g}, ${b}, 0.12)` },
    { offset: 1, color: `rgba(${r}, ${g}, ${b}, 0.35)` },
  ])
}

const { Text } = Typography

// 子维度雷达图组件（带动画）
function SubDimensionRadar({ dimension, direction }: { dimension: Dimension; direction: 'left' | 'right' | null }) {
  const { getActiveRadar } = useRadarStore()
  const { theme } = useUIStore()
  const activeRadar = getActiveRadar()

  const isDark = theme === 'dark'

  // 只有普通雷达图才有 vendors
  const regularRadar = activeRadar && isRegularRadar(activeRadar) ? activeRadar : null

  const option = useMemo<EChartsOption>(() => {
    if (!dimension || !regularRadar || dimension.subDimensions.length === 0) {
      return {}
    }

    const visibleVendors = regularRadar.vendors.filter((v) => v.visible)

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: any) => {
          if (!params.value || !Array.isArray(params.value)) return params.name
          const values = dimension.subDimensions.map((sub, i) =>
            `${sub.name}: ${Number(params.value[i]).toFixed(1)}`
          )
          return `<strong>${params.name}</strong><br/>${values.join('<br/>')}`
        },
      },
      legend: {
        show: true,
        data: visibleVendors.map((v) => v.name),
        bottom: 10,
        selectedMode: 'multiple',
        textStyle: {
          color: isDark ? '#e0e0e0' : '#333',
        },
        itemStyle: {
          borderWidth: 0,
        },
      },
      radar: {
        indicator: dimension.subDimensions.map((sub) => ({
          name: sub.name,
          max: 10,
        })),
        shape: 'polygon',
        splitNumber: 5,
        radius: '65%',
        center: ['50%', '50%'],
        axisName: {
          color: isDark ? '#b0b0b0' : '#666',
          fontSize: 11,
        },
        splitArea: {
          areaStyle: {
            color: isDark
              ? ['rgba(80, 140, 200, 0.03)', 'rgba(80, 140, 200, 0.06)']
              : ['rgba(24, 144, 255, 0.02)', 'rgba(24, 144, 255, 0.04)'],
          },
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.15)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: visibleVendors.map((vendor) => ({
            name: vendor.name,
            value: dimension.subDimensions.map((sub) => sub.scores[vendor.id] ?? 0),
            symbol: vendor.markerType,
            symbolSize: 8,
            lineStyle: { color: vendor.color, width: 2 },
            areaStyle: { color: createRadialGradient(vendor.color) },
            itemStyle: { color: vendor.color },
          })),
        },
      ],
      animation: true,
      animationDuration: 400,
      animationEasing: 'cubicOut',
      animationDurationUpdate: 600,
      animationEasingUpdate: 'cubicInOut',
    }
  }, [dimension, regularRadar, isDark])

  const animClass = direction === 'left' ? styles.slideFromLeft : direction === 'right' ? styles.slideFromRight : ''

  return (
    <div className={`${styles.subRadarContainer} ${animClass}`}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  )
}

// 文字滚动动画组件
function AnimatedText({ text, direction }: { text: string; direction: 'left' | 'right' | null }) {
  const [displayText, setDisplayText] = useState(text)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (text !== displayText) {
      setAnimating(true)
      const timer = setTimeout(() => {
        setDisplayText(text)
        setAnimating(false)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [text, displayText])

  const animClass = animating
    ? direction === 'left'
      ? styles.textExitRight
      : styles.textExitLeft
    : direction
    ? direction === 'left'
      ? styles.textEnterLeft
      : styles.textEnterRight
    : ''

  return (
    <span className={`${styles.animatedText} ${animClass}`}>
      {displayText}
    </span>
  )
}

export function RadarChart() {
  const chartRef = useRef<ReactECharts>(null)
  const { getActiveRadar } = useRadarStore()
  const { theme } = useUIStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)

  const isDark = theme === 'dark'

  // 只有普通雷达图才有维度数据
  const regularRadar = activeRadar && isRegularRadar(activeRadar) ? activeRadar : null
  const dimensions = regularRadar?.dimensions ?? []
  const vendors = regularRadar?.vendors ?? []

  // 找出所有有 3+ 子维度的维度
  const dimensionsWithSubRadar = useMemo(() => {
    return dimensions.filter((d) => d.subDimensions.length >= 3)
  }, [dimensions])

  // 是否显示双雷达图布局
  const showDualLayout = dimensionsWithSubRadar.length > 0

  // 确保索引有效
  useEffect(() => {
    if (dimensionsWithSubRadar.length === 0) {
      setSelectedIndex(0)
    } else if (selectedIndex >= dimensionsWithSubRadar.length) {
      setSelectedIndex(dimensionsWithSubRadar.length - 1)
    }
  }, [dimensionsWithSubRadar.length, selectedIndex])

  const selectedDimension = dimensionsWithSubRadar[selectedIndex] ?? null

  const handlePrev = useCallback(() => {
    setDirection('left')
    setSelectedIndex((i) => (i - 1 + dimensionsWithSubRadar.length) % dimensionsWithSubRadar.length)
  }, [dimensionsWithSubRadar.length])

  const handleNext = useCallback(() => {
    setDirection('right')
    setSelectedIndex((i) => (i + 1) % dimensionsWithSubRadar.length)
  }, [dimensionsWithSubRadar.length])

  const mainOption = useMemo<EChartsOption>(() => {
    if (dimensions.length === 0) {
      return {}
    }

    const visibleVendors = vendors.filter((v) => v.visible)
    const scores = calculateAllDimensionScores(dimensions, vendors)

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: any) => {
          if (!params.value || !Array.isArray(params.value)) return params.name
          const values = dimensions.map((dim, i) =>
            `${dim.name}: ${Number(params.value[i]).toFixed(1)}`
          )
          return `<strong>${params.name}</strong><br/>${values.join('<br/>')}`
        },
      },
      legend: {
        data: visibleVendors.map((v) => v.name),
        bottom: 20,
        selectedMode: 'multiple',
        textStyle: {
          color: isDark ? '#e0e0e0' : '#333',
        },
        itemStyle: {
          borderWidth: 0,
        },
      },
      radar: {
        indicator: dimensions.map((d) => ({
          name: d.name,
          max: 10,
        })),
        shape: 'polygon',
        splitNumber: 5,
        radius: showDualLayout ? '55%' : undefined,
        axisName: {
          color: isDark ? '#d0d0d0' : '#333',
          fontSize: 13,
          fontWeight: 500,
        },
        splitArea: {
          areaStyle: {
            color: isDark
              ? ['rgba(80, 140, 200, 0.03)', 'rgba(80, 140, 200, 0.06)']
              : ['rgba(24, 144, 255, 0.02)', 'rgba(24, 144, 255, 0.04)'],
          },
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.15)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: visibleVendors.map((vendor) => ({
            name: vendor.name,
            value: scores.map((s) => {
              const vendorScore = s.vendorScores.find((vs) => vs.vendorId === vendor.id)
              return vendorScore?.rawScore ?? 0
            }),
            symbol: vendor.markerType,
            symbolSize: 8,
            lineStyle: {
              color: vendor.color,
              width: 2,
            },
            areaStyle: {
              color: createRadialGradient(vendor.color),
            },
            itemStyle: {
              color: vendor.color,
            },
          })),
          emphasis: {
            lineStyle: {
              width: 3,
            },
            areaStyle: {
              opacity: 0.5,
            },
          },
        },
      ],
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut',
    }
  }, [dimensions, vendors, showDualLayout, isDark])

  if (!regularRadar) {
    return (
      <div className={styles.empty}>
        <Empty description={t.chart.noData} />
      </div>
    )
  }

  if (dimensions.length === 0 || vendors.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty
          description={
            dimensions.length === 0
              ? t.chart.pleaseAddDimension
              : t.chart.pleaseAddVendor
          }
        />
      </div>
    )
  }

  // 双雷达图布局
  if (showDualLayout && selectedDimension) {
    return (
      <div className={styles.dualContainer}>
        <div className={styles.mainChart}>
          <div className={styles.chartTitle}>
            <Text strong>{t.app.overview}</Text>
          </div>
          <div className={styles.chartContent}>
            <ReactECharts
              ref={chartRef}
              option={mainOption}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
        </div>
        <div className={styles.subChart}>
          <div className={styles.subChartHeader}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={handlePrev}
              className={styles.navBtn}
              disabled={dimensionsWithSubRadar.length <= 1}
            />
            <div className={styles.subChartTitle}>
              <AnimatedText text={selectedDimension.name} direction={direction} />
              <span className={styles.pageIndicator}>
                {selectedIndex + 1} / {dimensionsWithSubRadar.length}
              </span>
            </div>
            <Button
              type="text"
              icon={<RightOutlined />}
              onClick={handleNext}
              className={styles.navBtn}
              disabled={dimensionsWithSubRadar.length <= 1}
            />
          </div>
          <div className={styles.chartContent}>
            <SubDimensionRadar dimension={selectedDimension} direction={direction} />
          </div>
        </div>
      </div>
    )
  }

  // 单雷达图布局
  return (
    <div className={styles.container}>
      <ReactECharts
        ref={chartRef}
        option={mainOption}
        style={{ height: '100%', width: '100%' }}
        notMerge={true}
      />
    </div>
  )
}
