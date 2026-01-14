import React, { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import { Card, Typography, Space, Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { useConfigStore, useDataStore } from '../../stores'
import { useI18n } from '@/locales'
import { getCSSVariable } from '../../utils'
import styles from '../../styles.module.css'

const { Title } = Typography

export const DistributionChart: React.FC = () => {
  const { t } = useI18n()
  const m = t.manpower
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const { teams, projects, timePoints } = useConfigStore()
  const { allocations } = useDataStore()

  // 按日期排序时间点
  const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date))

  // 准备图表数据
  const prepareChartData = () => {
    // 构建数据源格式 - 按项目（版本）统计
    const source: (string | number)[][] = [['project', ...sortedTimePoints.map((tp) => tp.name)]]

    projects.forEach((project) => {
      const row: (string | number)[] = [project.name]
      sortedTimePoints.forEach((timePoint) => {
        let totalOccupied = 0
        teams.forEach((team) => {
          const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
          if (allocation) {
            totalOccupied += allocation.occupied
          }
        })
        row.push(totalOccupied)
      })
      source.push(row)
    })

    return source
  }

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current)
    }

    const source = prepareChartData()
    if (source.length <= 1) return // 没有数据时不渲染

    // 为饼图准备初始数据（第一个时间点）
    const initialPieData = projects.map((project, index) => ({
      name: project.name,
      value: source[index + 1] ? source[index + 1][1] : 0,
      itemStyle: {
        color: project.color,
      },
    }))

    // 获取 CSS 变量颜色
    const textColor = getCSSVariable('--chart-text-color')
    const axisColor = getCSSVariable('--chart-axis-color')
    const splitlineColor = getCSSVariable('--chart-splitline-color')

    const option = {
      color: projects.map((project) => project.color),
      legend: {
        top: 10,
        textStyle: {
          color: textColor,
        },
      },
      tooltip: {
        trigger: 'axis',
        showContent: false,
      },
      dataset: {
        source: source,
      },
      xAxis: {
        type: 'category',
        axisLabel: {
          rotate: 45,
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
      },
      yAxis: {
        gridIndex: 0,
        name: '人力投入',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          color: textColor,
        },
        axisLabel: {
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
        splitLine: {
          lineStyle: {
            color: splitlineColor,
            type: 'dashed',
          },
        },
      },
      grid: {
        top: '20%',
        left: '52%',
        right: '5%',
        bottom: '20%',
      },
      series: [
        // 折线图系列 - 按项目（版本）
        ...projects.map(() => ({
          type: 'line',
          smooth: false,
          seriesLayoutBy: 'row',
          emphasis: { focus: 'series' },
          lineStyle: {
            width: 2,
          },
          symbol: 'circle',
          symbolSize: 6,
        })),
        // 饼图系列
        {
          type: 'pie',
          id: 'pie',
          radius: '50%',
          center: ['20%', '50%'],
          data: initialPieData,
          emphasis: {
            focus: 'self',
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            formatter: '{b}: {c} ({d}%)',
            fontSize: 12,
            color: textColor,
          },
          labelLine: {
            show: true,
            lineStyle: {
              color: textColor,
            },
          },
        },
      ],
    }

    // 设置图表联动
    chartInstance.current.off('updateAxisPointer')
    chartInstance.current.on('updateAxisPointer', function (event: any) {
      const xAxisInfo = event.axesInfo[0]
      if (xAxisInfo) {
        const dimension = xAxisInfo.value + 1

        // 更新饼图数据
        const updatedPieData = projects.map((project, index) => ({
          name: project.name,
          value: source[index + 1] ? source[index + 1][dimension] : 0,
          itemStyle: {
            color: project.color,
          },
        }))

        chartInstance.current?.setOption({
          series: {
            id: 'pie',
            data: updatedPieData,
            label: {
              formatter: '{b}: {c} ({d}%)',
            },
          },
        })
      }
    })

    chartInstance.current.setOption(option)

    // 响应式处理
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [teams, projects, timePoints, allocations, sortedTimePoints])

  // 清理
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
        chartInstance.current = null
      }
    }
  }, [])

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>{m.distribution}</Title>
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>{m.instructions}</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>{m.distributionDesc1}</li>
                  <li>{m.distributionDesc2}</li>
                  <li>{m.distributionDesc3}</li>
                  <li>{m.distributionDesc4}</li>
                </ul>
              </div>
            }
            overlayStyle={{ maxWidth: 400 }}
          >
            <InfoCircleOutlined style={{ color: 'var(--color-text-tertiary)', cursor: 'help' }} />
          </Tooltip>
        </Space>
        <Space size="large" style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          <span>{m.project}: {projects.length}</span>
          <span>{m.timePointCount}: {timePoints.length}</span>
          <span>{m.totalCapacity}: {teams.reduce((sum, team) => sum + team.capacity, 0)}</span>
        </Space>
      </div>

      {/* 图表容器 */}
      <div ref={chartRef} className={styles.chartContainer} />
    </Card>
  )
}
