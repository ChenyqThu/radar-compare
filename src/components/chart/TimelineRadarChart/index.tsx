import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { Empty, Button, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { isRegularRadar } from '@/types'
import type { RadarChart } from '@/types'
import { formatTimeMarker } from '@/components/settings/TimeMarkerPicker'
import { TimelineSlider } from '@/components/timeline/TimelineSlider'
import { getDimensionScore } from '@/utils/calculation'
import styles from './TimelineRadarChart.module.css'

const { Text } = Typography

// 生成年份渐变颜色
function getYearColor(index: number, total: number, baseColor: string) {
  const hex = baseColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const ratio = total > 1 ? index / (total - 1) : 1
  const opacity = 0.3 + ratio * 0.7
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// 更新动画配置
const updateAnimationConfig = {
  animationDurationUpdate: 600,
  animationEasingUpdate: 'cubicInOut' as const,
}

interface TimelineRadarChartProps {
  timelineId: string
}

export function TimelineRadarChart({ timelineId }: TimelineRadarChartProps) {
  const { getTimelineData, currentProject } = useRadarStore()
  const { theme } = useUIStore()
  const { t, language } = useI18n()

  const mainChartRef = useRef<ReactECharts>(null)
  const subChartRef = useRef<ReactECharts>(null)

  const [currentVendorIndex, setCurrentVendorIndex] = useState(0)
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | 'all'>('all')
  const [selectedDimIndex, setSelectedDimIndex] = useState(0)
  const [vendorDirection, setVendorDirection] = useState<'left' | 'right' | null>(null)
  const [vendorAnimKey, setVendorAnimKey] = useState(0)

  const isDark = theme === 'dark'
  const timelineData = getTimelineData(timelineId)

  // Vendor切换时触发容器动画
  useEffect(() => {
    setVendorAnimKey((k) => k + 1)
  }, [currentVendorIndex])

  // 获取源雷达图数据
  const sourceRadars = useMemo(() => {
    if (!currentProject || !timelineData) return []
    return timelineData.timePoints
      .map((tp) => currentProject.radarCharts.find((r) => r.id === tp.radarId))
      .filter((r): r is RadarChart => r !== undefined && isRegularRadar(r))
  }, [currentProject, timelineData])

  const vendors = timelineData?.vendors ?? []
  const dimensions = timelineData?.dimensions ?? []
  const currentVendor = vendors[currentVendorIndex]

  // 找出所有有 3+ 子维度的维度
  const dimensionsWithSubs = useMemo(() => {
    return dimensions.filter((d) => d.subDimensions.length >= 3)
  }, [dimensions])

  const showDualLayout = dimensionsWithSubs.length > 0

  // 确保索引有效
  useEffect(() => {
    if (dimensionsWithSubs.length === 0) {
      setSelectedDimIndex(0)
    } else if (selectedDimIndex >= dimensionsWithSubs.length) {
      setSelectedDimIndex(dimensionsWithSubs.length - 1)
    }
  }, [dimensionsWithSubs.length, selectedDimIndex])

  const selectedDimension = dimensionsWithSubs[selectedDimIndex] ?? null

  const handlePrevVendor = useCallback(() => {
    setVendorDirection('left')
    setCurrentVendorIndex((i) => (i - 1 + vendors.length) % vendors.length)
  }, [vendors.length])

  const handleNextVendor = useCallback(() => {
    setVendorDirection('right')
    setCurrentVendorIndex((i) => (i + 1) % vendors.length)
  }, [vendors.length])

  const handlePrevDim = useCallback(() => {
    setSelectedDimIndex((i) => (i - 1 + dimensionsWithSubs.length) % dimensionsWithSubs.length)
  }, [dimensionsWithSubs.length])

  const handleNextDim = useCallback(() => {
    setSelectedDimIndex((i) => (i + 1) % dimensionsWithSubs.length)
  }, [dimensionsWithSubs.length])

  // 获取 Vendor 在某个雷达图中的维度分数
  const getVendorDimScores = useCallback(
    (radar: RadarChart, vendorName: string) => {
      const vendor = radar.vendors.find((v) => v.name === vendorName)
      if (!vendor) return dimensions.map(() => 0)
      return dimensions.map((dim) => {
        const targetDim = radar.dimensions.find((d) => d.name === dim.name)
        if (!targetDim) return 0
        return getDimensionScore(targetDim, vendor.id)
      })
    },
    [dimensions]
  )

  // 获取 Vendor 在某个雷达图中某维度的子维度分数
  const getVendorSubScores = useCallback(
    (radar: RadarChart, vendorName: string, dimName: string) => {
      const vendor = radar.vendors.find((v) => v.name === vendorName)
      const targetDim = radar.dimensions.find((d) => d.name === dimName)
      if (!vendor || !targetDim) return []
      return targetDim.subDimensions.map((sub) => sub.scores[vendor.id] ?? 0)
    },
    []
  )

  // 主雷达图配置 - 使用统一的数据结构以支持平滑过渡
  const mainOption = useMemo<EChartsOption>(() => {
    if (!timelineData || !currentVendor || sourceRadars.length === 0) return {}

    const baseConfig = {
      tooltip: {
        trigger: 'item' as const,
        confine: true,
        formatter: (params: any) => {
          if (!params.value || !Array.isArray(params.value)) return params.name
          const values = dimensions.map((dim, i) => `${dim.name}: ${Number(params.value[i]).toFixed(1)}`)
          return `<strong>${params.name}</strong><br/>${values.join('<br/>')}`
        },
      },
      radar: {
        indicator: dimensions.map((d) => ({ name: d.name, max: 10 })),
        shape: 'polygon' as const,
        splitNumber: 5,
        radius: showDualLayout ? '55%' : '60%',
        axisName: { color: isDark ? '#d0d0d0' : '#333', fontSize: 12 },
        splitArea: {
          areaStyle: {
            color: isDark
              ? ['rgba(80, 140, 200, 0.03)', 'rgba(80, 140, 200, 0.06)']
              : ['rgba(24, 144, 255, 0.02)', 'rgba(24, 144, 255, 0.04)'],
          },
        },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)' } },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.15)' } },
      },
      animation: true,
      animationDuration: 400,
      animationEasing: 'cubicOut' as const,
      ...updateAnimationConfig,
    }

    if (selectedTimeIndex === 'all') {
      return {
        ...baseConfig,
        legend: {
          data: sourceRadars.map((r) => (r.timeMarker ? formatTimeMarker(r.timeMarker, language) : r.name)),
          bottom: 10,
          textStyle: { color: isDark ? '#e0e0e0' : '#333' },
        },
        series: [
          {
            type: 'radar',
            data: sourceRadars.map((radar, idx) => {
              const yearColor = getYearColor(idx, sourceRadars.length, currentVendor.color)
              return {
                name: radar.timeMarker ? formatTimeMarker(radar.timeMarker, language) : radar.name,
                value: getVendorDimScores(radar, currentVendor.name),
                lineStyle: { color: yearColor, width: 2 },
                itemStyle: { color: yearColor },
                symbol: currentVendor.markerType,
                symbolSize: 6,
              }
            }),
          },
        ],
      }
    } else {
      const radar = sourceRadars[selectedTimeIndex]
      if (!radar) return {}
      return {
        ...baseConfig,
        legend: { show: false },
        series: [
          {
            type: 'radar',
            data: [
              {
                name: currentVendor.name,
                value: getVendorDimScores(radar, currentVendor.name),
                lineStyle: { color: currentVendor.color, width: 2 },
                itemStyle: { color: currentVendor.color },
                symbol: currentVendor.markerType,
                symbolSize: 8,
              },
            ],
          },
        ],
      }
    }
  }, [timelineData, currentVendor, sourceRadars, selectedTimeIndex, isDark, language, dimensions, showDualLayout, getVendorDimScores])

  // 子维度雷达图配置
  const subOption = useMemo<EChartsOption>(() => {
    if (!selectedDimension || !currentVendor || sourceRadars.length === 0) return {}

    const subDims = selectedDimension.subDimensions

    const baseConfig = {
      tooltip: {
        trigger: 'item' as const,
        confine: true,
        formatter: (params: any) => {
          if (!params.value || !Array.isArray(params.value)) return params.name
          const values = subDims.map((sub, i) => `${sub.name}: ${Number(params.value[i]).toFixed(1)}`)
          return `<strong>${params.name}</strong><br/>${values.join('<br/>')}`
        },
      },
      radar: {
        indicator: subDims.map((s) => ({ name: s.name, max: 10 })),
        shape: 'polygon' as const,
        splitNumber: 5,
        radius: '55%',
        axisName: { color: isDark ? '#b0b0b0' : '#666', fontSize: 11 },
        splitArea: {
          areaStyle: {
            color: isDark
              ? ['rgba(80, 140, 200, 0.03)', 'rgba(80, 140, 200, 0.06)']
              : ['rgba(24, 144, 255, 0.02)', 'rgba(24, 144, 255, 0.04)'],
          },
        },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)' } },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.15)' } },
      },
      animation: true,
      animationDuration: 400,
      animationEasing: 'cubicOut' as const,
      ...updateAnimationConfig,
    }

    if (selectedTimeIndex === 'all') {
      return {
        ...baseConfig,
        legend: {
          data: sourceRadars.map((r) => (r.timeMarker ? formatTimeMarker(r.timeMarker, language) : r.name)),
          bottom: 10,
          textStyle: { color: isDark ? '#e0e0e0' : '#333' },
        },
        series: [
          {
            type: 'radar',
            data: sourceRadars.map((radar, idx) => {
              const yearColor = getYearColor(idx, sourceRadars.length, currentVendor.color)
              return {
                name: radar.timeMarker ? formatTimeMarker(radar.timeMarker, language) : radar.name,
                value: getVendorSubScores(radar, currentVendor.name, selectedDimension.name),
                lineStyle: { color: yearColor, width: 2 },
                itemStyle: { color: yearColor },
                symbol: currentVendor.markerType,
                symbolSize: 5,
              }
            }),
          },
        ],
      }
    } else {
      const radar = sourceRadars[selectedTimeIndex]
      if (!radar) return {}
      return {
        ...baseConfig,
        legend: { show: false },
        series: [
          {
            type: 'radar',
            data: [
              {
                name: currentVendor.name,
                value: getVendorSubScores(radar, currentVendor.name, selectedDimension.name),
                lineStyle: { color: currentVendor.color, width: 2 },
                itemStyle: { color: currentVendor.color },
                symbol: currentVendor.markerType,
                symbolSize: 7,
              },
            ],
          },
        ],
      }
    }
  }, [selectedDimension, currentVendor, sourceRadars, selectedTimeIndex, isDark, language, getVendorSubScores])

  if (!timelineData || vendors.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty description={t.chart.noData} />
      </div>
    )
  }

  const vendorAnimClass = vendorDirection === 'left' ? styles.slideFromLeft : vendorDirection === 'right' ? styles.slideFromRight : ''

  // 时间轴滑块
  const timelineSlider = (
    <div className={styles.timeline}>
      <TimelineSlider
        timePoints={timelineData.timePoints.map((tp, idx) => ({
          label: formatTimeMarker(tp.timeMarker, language),
          value: idx,
        }))}
        value={selectedTimeIndex}
        onChange={setSelectedTimeIndex}
      />
    </div>
  )

  // 双列布局
  if (showDualLayout && selectedDimension) {
    return (
      <div className={styles.container}>
        {/* Vendor 切换区域 */}
        <div className={styles.vendorSwitcher}>
          <Button type="text" icon={<LeftOutlined />} onClick={handlePrevVendor} className={styles.navBtn} disabled={vendors.length <= 1} />
          <div key={vendorAnimKey} className={`${styles.vendorInfo} ${vendorAnimClass}`}>
            <span className={styles.vendorName} style={{ color: currentVendor?.color }}>{currentVendor?.name}</span>
            <span className={styles.vendorIndex}>{currentVendorIndex + 1} / {vendors.length}</span>
          </div>
          <Button type="text" icon={<RightOutlined />} onClick={handleNextVendor} className={styles.navBtn} disabled={vendors.length <= 1} />
        </div>

        {/* 双雷达图区域 */}
        <div className={styles.dualContainer}>
          <div className={styles.mainChart}>
            <div className={styles.chartTitle}>
              <Text strong>{t.app.overview}</Text>
            </div>
            <div className={styles.chartContent}>
              <ReactECharts ref={mainChartRef} option={mainOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className={styles.subChart}>
            <div className={styles.subChartHeader}>
              <Button type="text" icon={<LeftOutlined />} onClick={handlePrevDim} className={styles.navBtn} disabled={dimensionsWithSubs.length <= 1} />
              <div className={styles.subChartTitle}>
                <span className={styles.dimName}>{selectedDimension.name}</span>
                <span className={styles.pageIndicator}>{selectedDimIndex + 1} / {dimensionsWithSubs.length}</span>
              </div>
              <Button type="text" icon={<RightOutlined />} onClick={handleNextDim} className={styles.navBtn} disabled={dimensionsWithSubs.length <= 1} />
            </div>
            <div className={styles.chartContent}>
              <ReactECharts ref={subChartRef} option={subOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        {timelineSlider}
      </div>
    )
  }

  // 单列布局
  return (
    <div className={styles.container}>
      <div className={styles.vendorSwitcher}>
        <Button type="text" icon={<LeftOutlined />} onClick={handlePrevVendor} className={styles.navBtn} disabled={vendors.length <= 1} />
        <div key={vendorAnimKey} className={`${styles.vendorInfo} ${vendorAnimClass}`}>
          <span className={styles.vendorName} style={{ color: currentVendor?.color }}>{currentVendor?.name}</span>
          <span className={styles.vendorIndex}>{currentVendorIndex + 1} / {vendors.length}</span>
        </div>
        <Button type="text" icon={<RightOutlined />} onClick={handleNextVendor} className={styles.navBtn} disabled={vendors.length <= 1} />
      </div>

      <div className={styles.chartContainer}>
        <ReactECharts ref={mainChartRef} option={mainOption} style={{ height: '100%', width: '100%' }} />
      </div>

      {timelineSlider}
    </div>
  )
}
