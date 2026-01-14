import React, { useMemo, useState, useEffect } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Card, Typography, Space, Tag, DatePicker, Button, Tooltip, Empty } from 'antd'
import { InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useConfigStore, useDataStore } from '../../stores'
import { useI18n } from '@/locales'
import { getCSSVariable } from '../../utils'
import styles from '../../styles.module.css'

const { Title, Text } = Typography
const { CheckableTag } = Tag

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  BarChart,
  CanvasRenderer,
])

// 生成颜色渐变的工具函数（用于项目柱状图，从深到浅）
const generateColorGradient = (baseColor: string, steps: number): string[] => {
  const colors: string[] = []

  // 将hex颜色转换为RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  const rgb = hexToRgb(baseColor)

  for (let i = 0; i < steps; i++) {
    // 从深到浅的渐变，第一个最深，最后一个最浅
    const ratio = 1 - (i * 0.5) / Math.max(1, steps - 1) // 最浅50%
    const newR = Math.round(rgb.r + (255 - rgb.r) * (1 - ratio))
    const newG = Math.round(rgb.g + (255 - rgb.g) * (1 - ratio))
    const newB = Math.round(rgb.b + (255 - rgb.b) * (1 - ratio))

    colors.push(`rgb(${newR}, ${newG}, ${newB})`)
  }

  return colors
}

// 生成灰色系渐变的工具函数（用于图例）
const generateGrayGradient = (steps: number): string[] => {
  const colors: string[] = []

  // 从深灰到浅灰的渐变
  for (let i = 0; i < steps; i++) {
    // 灰度值从 60 到 180 (越小越深)
    const grayValue = Math.round(60 + (120 / Math.max(1, steps - 1)) * i)
    colors.push(`rgb(${grayValue}, ${grayValue}, ${grayValue})`)
  }

  return colors
}

interface ProjectStatistics {
  id: string
  name: string
  status: string
  color: string
  totalManpower: number
  releaseDate?: string
  pattern?: string
  timePeriods: TimePeriodData[]
}

interface TimePeriodData {
  name: string
  fromTimePoint: string
  toTimePoint: string
  manpower: number
  days: number
  totalManDays: number
  color: string
}

export const ProjectBarChart: React.FC = () => {
  const { t } = useI18n()
  const m = t.manpower
  const { teams, projects, timePoints } = useConfigStore()
  const { allocations } = useDataStore()

  // 按日期排序时间点
  const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date))

  // 选中的时间点，默认选择所有时间点
  const [selectedTimePoints, setSelectedTimePoints] = useState<Set<string>>(
    new Set(timePoints.map((tp) => tp.id))
  )

  // 当 timePoints 变化时（切换 tab），重置选中状态
  useEffect(() => {
    setSelectedTimePoints(new Set(timePoints.map((tp) => tp.id)))
  }, [timePoints])

  // 计算默认截止时间（当前日期）
  const getDefaultEndDate = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  // 用户设置的截止时间
  const [endDate, setEndDate] = useState<string>(() => getDefaultEndDate())

  // 当时间点变化时，更新默认截止时间
  useEffect(() => {
    if (!endDate || endDate === getDefaultEndDate()) {
      setEndDate(getDefaultEndDate())
    }
  }, [timePoints])

  // 计算两个时间点之间的天数差
  const calculateDaysBetween = (startDate: string, endDateStr: string): number => {
    const start = new Date(startDate)
    const end = new Date(endDateStr)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 计算项目统计数据
  const projectStatistics = useMemo((): ProjectStatistics[] => {
    return projects
      .map((project) => {
        let totalManpower = 0
        const timePeriods: TimePeriodData[] = []

        // 获取选中的时间点并按日期排序
        const selectedTimePointsData = sortedTimePoints.filter((tp) => selectedTimePoints.has(tp.id))

        // 生成该项目的颜色渐变（从深到浅）
        const colors = generateColorGradient(project.color, selectedTimePointsData.length)

        // 如果只选择了一个时间点，按30天计算
        if (selectedTimePointsData.length === 1) {
          const timePoint = selectedTimePointsData[0]
          let singlePeriodManpower = 0
          for (const team of teams) {
            const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
            if (allocation) {
              singlePeriodManpower += allocation.occupied
            }
          }
          const days = 30
          const manDays = singlePeriodManpower * days
          totalManpower = manDays

          timePeriods.push({
            name: `${timePoint.name} ${m.periodDays.replace('{days}', String(days))}`,
            fromTimePoint: timePoint.name,
            toTimePoint: m.periodDays.replace('{days}', String(days)),
            manpower: singlePeriodManpower,
            days,
            totalManDays: manDays,
            color: colors[0] || project.color,
          })
        } else if (selectedTimePointsData.length > 1) {
          // 遍历选中的时间点（除了最后一个）
          for (let i = 0; i < selectedTimePointsData.length - 1; i++) {
            const currentTimePoint = selectedTimePointsData[i]
            const nextTimePoint = selectedTimePointsData[i + 1]

            // 计算该时间段的天数
            const daysBetween = calculateDaysBetween(currentTimePoint.date, nextTimePoint.date)

            // 遍历所有团队，获取当前时间点的人力投入
            let currentPeriodManpower = 0
            for (const team of teams) {
              const allocation = allocations[currentTimePoint.id]?.[project.id]?.[team.id]
              if (allocation) {
                currentPeriodManpower += allocation.occupied
              }
            }

            // 计算人·天：人力投入 * 天数
            const manDays = currentPeriodManpower * daysBetween
            totalManpower += manDays

            timePeriods.push({
              name: `${currentTimePoint.name} → ${nextTimePoint.name}`,
              fromTimePoint: currentTimePoint.name,
              toTimePoint: nextTimePoint.name,
              manpower: currentPeriodManpower,
              days: daysBetween,
              totalManDays: manDays,
              color: colors[i] || project.color,
            })
          }

          // 处理最后一个时间点：使用用户设置的截止时间
          const lastTimePoint = selectedTimePointsData[selectedTimePointsData.length - 1]

          // 计算最后一个时间点到截止时间的天数
          const daysToEnd = endDate ? calculateDaysBetween(lastTimePoint.date, endDate) : 30

          // 计算最后一个时间点的人力投入
          let lastPeriodManpower = 0
          for (const team of teams) {
            const allocation = allocations[lastTimePoint.id]?.[project.id]?.[team.id]
            if (allocation) {
              lastPeriodManpower += allocation.occupied
            }
          }

          const lastManDays = lastPeriodManpower * daysToEnd
          totalManpower += lastManDays

          const endDateStr = endDate
            ? new Date(endDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
            : m.endDate
          timePeriods.push({
            name: `${lastTimePoint.name} → ${endDateStr}`,
            fromTimePoint: lastTimePoint.name,
            toTimePoint: endDateStr,
            manpower: lastPeriodManpower,
            days: daysToEnd,
            totalManDays: lastManDays,
            color: colors[selectedTimePointsData.length - 1] || project.color,
          })
        }

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          color: project.color,
          totalManpower,
          releaseDate: project.releaseDate,
          pattern: project.pattern,
          timePeriods,
        }
      })
      .sort((a, b) => b.totalManpower - a.totalManpower) // 按人力投入降序排序
  }, [projects, teams, allocations, selectedTimePoints, sortedTimePoints, endDate, m])

  // 准备图表配置
  const chartOptions = useMemo(() => {
    // 获取 CSS 变量颜色
    const textColor = getCSSVariable('--chart-text-color')
    const axisColor = getCSSVariable('--chart-axis-color')
    const splitlineColor = getCSSVariable('--chart-splitline-color')

    // 获取所有时间段的名称用于图例
    const allTimePeriods = new Set<string>()
    projectStatistics.forEach((project) => {
      project.timePeriods.forEach((period) => {
        allTimePeriods.add(period.name)
      })
    })
    const timePeriodNames = Array.from(allTimePeriods)

    // 生成灰色图例颜色
    const legendColors = generateGrayGradient(timePeriodNames.length)

    // 准备Y轴数据（项目名称）
    const projectNames = projectStatistics.map((p) => p.name)

    // 为每个时间段创建一个series
    const series = timePeriodNames.map((periodName, periodIndex) => {
      const data = projectStatistics.map((project) => {
        const period = project.timePeriods.find((p) => p.name === periodName)
        return period
          ? {
              value: period.totalManDays,
              itemStyle: { color: period.color }, // 使用项目的色深变化颜色
              // 存储额外信息供tooltip使用
              periodData: period,
              projectData: {
                id: project.id,
                name: project.name,
                status: project.status,
                releaseDate: project.releaseDate,
              },
            }
          : {
              value: 0,
              itemStyle: { color: 'transparent' },
              periodData: null,
              projectData: {
                id: project.id,
                name: project.name,
                status: project.status,
                releaseDate: project.releaseDate,
              },
            }
      })

      return {
        name: periodName,
        type: 'bar',
        stack: '总量',
        data: data.reverse(), // 反转数据顺序，让投入多的在上面
        barWidth: 20,
        // 图例使用灰色
        itemStyle: {
          color: legendColors[periodIndex],
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
          },
        },
      }
    })

    // Status map for i18n
    const statusMap: { [key: string]: string } = {
      development: m.statusDevelopment,
      planning: m.statusPlanning,
      release: m.statusRelease,
      completed: m.statusCompleted,
    }

    return {
      title: {
        text: m.projectBarChartTitle,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: textColor,
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: function (params: any) {
          const { data } = params
          if (!data.periodData || data.value === 0) return ''

          return `
            <div style="margin: 0; padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${data.projectData.name}</div>
              <div style="color: var(--color-text-secondary); margin-bottom: 4px;">${m.status}: ${statusMap[data.projectData.status] || data.projectData.status}</div>
              ${data.projectData.releaseDate ? `<div style="color: var(--color-text-secondary); margin-bottom: 4px;">${m.releaseDate}: ${data.projectData.releaseDate}</div>` : ''}
              <div style="border-top: 1px solid var(--color-border); margin: 8px 0; padding-top: 8px;">
                <div style="font-weight: bold; color: ${params.color}; margin-bottom: 4px;">${data.periodData.name}</div>
                <div style="color: var(--color-text-secondary);">${m.manpowerInput}: ${m.manpowerPerson.replace('{count}', data.periodData.manpower)}</div>
                <div style="color: var(--color-text-secondary);">${m.timeSpan}: ${data.periodData.days}${m.days}</div>
                <div style="font-weight: bold; color: ${params.color};">${m.totalManDays}: ${data.periodData.totalManDays}</div>
              </div>
            </div>
          `
        },
      },
      legend: {
        type: 'scroll',
        orient: 'horizontal',
        top: 'bottom',
        data: timePeriodNames,
        selector: false,
        textStyle: {
          color: textColor,
        },
      },
      grid: {
        left: '15%',
        right: '10%',
        top: '15%',
        bottom: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: `${m.manpowerInput} (${m.manDays})`,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: 12,
          color: textColor,
        },
        axisLine: {
          lineStyle: {
            color: axisColor,
          },
        },
        axisTick: {
          lineStyle: {
            color: axisColor,
          },
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: splitlineColor,
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'category',
        data: projectNames.reverse(),
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          width: 120,
          overflow: 'truncate',
        },
      },
      series: series,
    }
  }, [projectStatistics])

  // 处理时间点选择
  const handleTimePointToggle = (timePointId: string) => {
    const newSelection = new Set(selectedTimePoints)
    if (newSelection.has(timePointId)) {
      newSelection.delete(timePointId)
    } else {
      newSelection.add(timePointId)
    }
    setSelectedTimePoints(newSelection)
  }

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedTimePoints.size === timePoints.length) {
      setSelectedTimePoints(new Set())
    } else {
      setSelectedTimePoints(new Set(timePoints.map((tp) => tp.id)))
    }
  }

  // 计算最后时间点到截止时间的天数（用于显示）
  const daysToEndDisplay = useMemo(() => {
    if (sortedTimePoints.length === 0 || !endDate) return 0
    const lastDate = sortedTimePoints[sortedTimePoints.length - 1]?.date
    if (!lastDate) return 0
    return calculateDaysBetween(lastDate, endDate)
  }, [sortedTimePoints, endDate])

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>{m.projectBarTitle}</Title>
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>{m.instructions}</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>{m.projectBarDesc}</li>
                  <li>{m.projectBarTimeRangeDesc}</li>
                </ul>
              </div>
            }
            overlayStyle={{ maxWidth: 400 }}
          >
            <InfoCircleOutlined style={{ color: 'var(--color-text-tertiary)', cursor: 'help' }} />
          </Tooltip>
        </Space>
        <Space style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          <span>{m.selectedTimePoints}: {selectedTimePoints.size}/{timePoints.length}</span>
          <span>•</span>
          <span>{m.total}: {projectStatistics.reduce((sum, p) => sum + p.totalManpower, 0)}{m.manDays}</span>
        </Space>
      </div>

      {/* 时间点筛选 */}
      <Card size="small" style={{ marginBottom: 24 }} className={styles.timePointFilterContainer}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text strong style={{ fontSize: 14 }}>{m.timePointFilter}</Text>
          <Button type="link" size="small" onClick={handleSelectAll} style={{ padding: 0 }}>
            {selectedTimePoints.size === timePoints.length ? m.deselectAll : m.selectAll}
          </Button>
        </div>
        <div className={styles.filterTags} style={{ alignItems: 'center' }}>
          {sortedTimePoints.map((timePoint) => (
            <CheckableTag
              key={timePoint.id}
              checked={selectedTimePoints.has(timePoint.id)}
              onChange={() => handleTimePointToggle(timePoint.id)}
              style={{
                borderRadius: 16,
                padding: '2px 12px',
                border: selectedTimePoints.has(timePoint.id) ? '1px solid var(--ant-color-primary)' : '1px solid var(--color-border)',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {timePoint.name}
            </CheckableTag>
          ))}

          {/* 截止时间设置 */}
          {sortedTimePoints.length > 0 && (
            <>
              <span style={{ margin: '0 8px', color: 'var(--color-text-tertiary)' }}>→</span>
              <Space size="small" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{m.endDate}</Text>
                <DatePicker
                  value={endDate ? dayjs(endDate) : null}
                  onChange={(date) => setEndDate(date ? date.format('YYYY-MM-DD') : '')}
                  size="small"
                  style={{ width: 130 }}
                  allowClear={false}
                />
                <Tooltip
                  title={
                    <div style={{ textAlign: 'center' }}>
                      <div>{m.lastTimePointTo.replace('{name}', sortedTimePoints[sortedTimePoints.length - 1]?.name || '')}</div>
                      <div style={{ fontWeight: 500, color: 'var(--ant-color-primary)' }}>{daysToEndDisplay}{m.days}</div>
                    </div>
                  }
                >
                  <InfoCircleOutlined style={{ color: 'var(--color-text-tertiary)', cursor: 'help' }} />
                </Tooltip>
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => setEndDate(getDefaultEndDate())}
                  title={m.resetToDefault}
                >
                  {m.reset}
                </Button>
              </Space>
            </>
          )}
        </div>
      </Card>

      {/* 图表 */}
      <div className={styles.chartContainer}>
        {projectStatistics.length > 0 ? (
          <ReactEChartsCore
            echarts={echarts}
            option={chartOptions}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        ) : (
          <Empty
            description={
              <span>
                <Text type="secondary">{t.common.noData}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{m.noDataHint}</Text>
              </span>
            }
            style={{ paddingTop: 100 }}
          />
        )}
      </div>
    </Card>
  )
}
