import { useMemo } from 'react'
import { Space, Typography, Tag, Tooltip } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { useRadarStore } from '@/stores/radarStore'
import { calculateVendorTotalScores } from '@/utils/calculation'
import styles from './ScoreSummary.module.css'

const { Text } = Typography

export function ScoreSummary() {
  const { getActiveRadar } = useRadarStore()
  const activeRadar = getActiveRadar()

  const scores = useMemo(() => {
    if (!activeRadar) return []
    return calculateVendorTotalScores(activeRadar.dimensions, activeRadar.vendors)
      .filter((s) => {
        const vendor = activeRadar.vendors.find((v) => v.id === s.vendorId)
        return vendor?.visible
      })
      .sort((a, b) => b.totalScore - a.totalScore)
  }, [activeRadar])

  if (!activeRadar || scores.length === 0) return null

  return (
    <Space size={8}>
      {scores.map((score, index) => (
        <Tooltip
          key={score.vendorId}
          title={
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {score.vendorName} 总分明细
              </div>
              {score.dimensionBreakdown.map((b) => (
                <div key={b.dimensionId} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span>{b.dimensionName}</span>
                  <span>{b.score.toFixed(1)} × {b.weight}%</span>
                </div>
              ))}
            </div>
          }
        >
          <Tag
            color={score.color}
            className={styles.tag}
            icon={index === 0 ? <TrophyOutlined /> : undefined}
          >
            {score.vendorName}: {score.totalScore.toFixed(1)}
          </Tag>
        </Tooltip>
      ))}
    </Space>
  )
}
