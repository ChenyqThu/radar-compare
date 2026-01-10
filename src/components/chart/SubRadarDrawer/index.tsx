import { useMemo } from 'react'
import { Drawer, Empty, Table, Typography } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { isRegularRadar } from '@/types'
import styles from './SubRadarDrawer.module.css'

const { Title } = Typography

export function SubRadarDrawer() {
  const { subRadarDrawer, closeSubRadarDrawer } = useUIStore()
  const { getActiveRadar } = useRadarStore()
  const activeRadar = getActiveRadar()

  // 只有普通雷达图才有维度数据
  const regularRadar = activeRadar && isRegularRadar(activeRadar) ? activeRadar : null

  const dimension = useMemo(() => {
    if (!regularRadar || !subRadarDrawer.dimensionId) return null
    return regularRadar.dimensions.find((d) => d.id === subRadarDrawer.dimensionId)
  }, [regularRadar, subRadarDrawer.dimensionId])

  const option = useMemo<EChartsOption>(() => {
    if (!dimension || !regularRadar || dimension.subDimensions.length === 0) {
      return {}
    }

    const visibleVendors = regularRadar.vendors.filter((v) => v.visible)

    return {
      tooltip: { trigger: 'item' },
      legend: {
        data: visibleVendors.map((v) => v.name),
        bottom: 10,
      },
      radar: {
        indicator: dimension.subDimensions.map((sub) => ({
          name: sub.name,
          max: 10,
        })),
        shape: 'polygon',
        splitNumber: 5,
      },
      series: [
        {
          type: 'radar',
          data: visibleVendors.map((vendor) => ({
            name: vendor.name,
            value: dimension.subDimensions.map((sub) => sub.scores[vendor.id] ?? 0),
            symbol: vendor.markerType,
            symbolSize: 5,
            lineStyle: { color: vendor.color, width: 2 },
            areaStyle: { color: vendor.color, opacity: 0.15 },
            itemStyle: { color: vendor.color },
          })),
        },
      ],
    }
  }, [dimension, regularRadar])

  const tableColumns = [
    { title: '子维度', dataIndex: 'name', key: 'name', width: 120 },
    { title: '权重', dataIndex: 'weight', key: 'weight', width: 70, render: (v: number) => `${v}%` },
    ...(regularRadar
      ? regularRadar.vendors.filter((v) => v.visible).map((vendor) => ({
          title: <span style={{ color: vendor.color }}>{vendor.name}</span>,
          dataIndex: vendor.id,
          key: vendor.id,
          width: 70,
          render: (v: number) => v?.toFixed(1) ?? '-',
        }))
      : []),
  ]

  const tableData = dimension?.subDimensions.map((sub) => ({
    key: sub.id,
    name: sub.name,
    weight: sub.weight,
    ...Object.fromEntries(
      regularRadar ? regularRadar.vendors.map((v) => [v.id, sub.scores[v.id]]) : []
    ),
  }))

  return (
    <Drawer
      title={dimension?.name ? `${dimension.name} - 子维度详情` : '子维度详情'}
      placement="right"
      width={480}
      open={subRadarDrawer.visible}
      onClose={closeSubRadarDrawer}
    >
      {!dimension || dimension.subDimensions.length === 0 ? (
        <Empty description="该维度暂无子维度" />
      ) : (
        <div className={styles.content}>
          <div className={styles.chart}>
            <ReactECharts option={option} style={{ height: 300 }} />
          </div>
          <div className={styles.table}>
            <Title level={5}>分数明细</Title>
            <Table
              dataSource={tableData}
              columns={tableColumns}
              pagination={false}
              size="small"
            />
          </div>
        </div>
      )}
    </Drawer>
  )
}
