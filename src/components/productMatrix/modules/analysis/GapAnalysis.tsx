/**
 * GapAnalysis - Identify gaps between a target product and competitors
 * Shows dimension-by-dimension comparison with gap indicators
 */

import { useState, useMemo } from 'react'
import { Select, Empty } from 'antd'
import { ArrowRightOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons'
import { useDataStore, useConfigStore } from '../../stores'
import { useI18n } from '@/locales'
import type { Product, MatrixDimension } from '@/types/productMatrix'
import styles from './GapAnalysis.module.css'

interface GapAnalysisProps {
  readonly?: boolean
}

interface GapData {
  dimension: MatrixDimension
  targetScore: number
  competitorScore: number
  gap: number
  gapPercent: number
}

export function GapAnalysis({ readonly: _readonly }: GapAnalysisProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { products } = useDataStore()
  const { vendors, dimensions } = useConfigStore()

  // Selected target and competitor
  const [targetProductId, setTargetProductId] = useState<string>('')
  const [competitorProductId, setCompetitorProductId] = useState<string>('')

  // Auto-select first two products
  useMemo(() => {
    if (!targetProductId && products.length >= 1) {
      setTargetProductId(products[0].id)
    }
    if (!competitorProductId && products.length >= 2) {
      setCompetitorProductId(products[1].id)
    }
  }, [products, targetProductId, competitorProductId])

  const targetProduct = products.find(p => p.id === targetProductId)
  const competitorProduct = products.find(p => p.id === competitorProductId)

  // Get normalized value (0-100) for a dimension
  const getNormalizedValue = (product: Product, dimension: MatrixDimension): number => {
    const dimValue = product.dimensionValues[dimension.id]
    if (dimValue === null || dimValue === undefined) return 0

    if (dimension.type === 'continuous') {
      const numValue = typeof dimValue === 'number' ? dimValue : parseFloat(String(dimValue)) || 0
      const min = dimension.min ?? 0
      const max = dimension.max ?? 100
      if (max === min) return 50
      return Math.max(0, Math.min(100, ((numValue - min) / (max - min)) * 100))
    } else {
      if (dimension.options && dimension.options.length > 0) {
        const optionIndex = dimension.options.findIndex(o => o.value === String(dimValue))
        return optionIndex >= 0 ? ((optionIndex + 1) / dimension.options.length) * 100 : 0
      }
      return 0
    }
  }

  // Calculate gap data for all dimensions
  const gapData: GapData[] = useMemo(() => {
    if (!targetProduct || !competitorProduct) return []

    return dimensions.map(dimension => {
      const targetScore = getNormalizedValue(targetProduct, dimension)
      const competitorScore = getNormalizedValue(competitorProduct, dimension)
      const gap = targetScore - competitorScore
      const gapPercent = competitorScore !== 0 ? (gap / competitorScore) * 100 : (gap > 0 ? 100 : 0)

      return {
        dimension,
        targetScore: Math.round(targetScore),
        competitorScore: Math.round(competitorScore),
        gap: Math.round(gap),
        gapPercent: Math.round(gapPercent),
      }
    })
  }, [targetProduct, competitorProduct, dimensions])

  // Summary statistics
  const summary = useMemo(() => {
    if (gapData.length === 0) return null

    const advantages = gapData.filter(g => g.gap > 5).length
    const disadvantages = gapData.filter(g => g.gap < -5).length
    const ties = gapData.length - advantages - disadvantages
    const avgGap = gapData.reduce((sum, g) => sum + g.gap, 0) / gapData.length

    return {
      advantages,
      disadvantages,
      ties,
      avgGap: Math.round(avgGap),
    }
  }, [gapData])

  // Product selector options
  const productOptions = useMemo(() => {
    return products.map(p => {
      const vendor = vendors.find(v => v.id === p.vendorId)
      return {
        value: p.id,
        label: `${p.name}${vendor ? ` (${vendor.name})` : ''}`,
      }
    })
  }, [products, vendors])

  // No products
  if (products.length < 2) {
    return (
      <div className={styles.container}>
        <Empty
          className={styles.empty}
          description={m.minTwoProductsGap}
        />
      </div>
    )
  }

  const targetVendor = targetProduct ? vendors.find(v => v.id === targetProduct.vendorId) : null
  const competitorVendor = competitorProduct ? vendors.find(v => v.id === competitorProduct.vendorId) : null

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>
              {m.targetProduct}:
            </span>
            <Select
              className={styles.filterSelect}
              value={targetProductId}
              onChange={setTargetProductId}
              options={productOptions.filter(o => o.value !== competitorProductId)}
              placeholder={m.selectProduct}
            />
          </div>
          <ArrowRightOutlined style={{ color: 'var(--color-text-tertiary)' }} />
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>
              {m.competitor}:
            </span>
            <Select
              className={styles.filterSelect}
              value={competitorProductId}
              onChange={setCompetitorProductId}
              options={productOptions.filter(o => o.value !== targetProductId)}
              placeholder={m.selectProduct}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className={styles.summary}>
          <div className={styles.summaryTitle}>
            {m.analysisSummary}
          </div>
          <div className={styles.summaryContent}>
            <div className={styles.summaryItem}>
              <div className={`${styles.summaryItemValue} ${styles.gapPositive}`}>
                {summary.advantages}
              </div>
              <div className={styles.summaryItemLabel}>
                {m.advantageDimensions}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={`${styles.summaryItemValue} ${styles.gapNegative}`}>
                {summary.disadvantages}
              </div>
              <div className={styles.summaryItemLabel}>
                {m.disadvantageDimensions}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={`${styles.summaryItemValue} ${styles.gapNeutral}`}>
                {summary.avgGap > 0 ? '+' : ''}{summary.avgGap}%
              </div>
              <div className={styles.summaryItemLabel}>
                {m.averageGap}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gap Cards */}
      {gapData.length > 0 ? (
        <div className={styles.gapCards}>
          {gapData.map(item => (
            <div key={item.dimension.id} className={styles.gapCard}>
              <div className={styles.gapCardHeader}>
                <span className={styles.gapCardTitle}>{item.dimension.name}</span>
                <span className={styles.gapCardType}>
                  {item.dimension.type === 'continuous' ? m.continuous : m.discrete}
                </span>
              </div>
              <div className={styles.gapCardContent}>
                {/* Score Comparison */}
                <div className={styles.scoreComparison}>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>
                      {targetProduct?.name || '-'}
                    </span>
                    <span
                      className={styles.scoreValue}
                      style={{ color: targetVendor?.color || '#666' }}
                    >
                      {item.targetScore}%
                    </span>
                  </div>
                  <span className={styles.scoreArrow}>vs</span>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>
                      {competitorProduct?.name || '-'}
                    </span>
                    <span
                      className={styles.scoreValue}
                      style={{ color: competitorVendor?.color || '#666' }}
                    >
                      {item.competitorScore}%
                    </span>
                  </div>
                </div>

                {/* Gap Indicator */}
                <div className={styles.gapIndicator}>
                  <div className={styles.gapBar}>
                    <div
                      className={styles.gapBarFill}
                      style={{
                        width: `${Math.abs(item.gap)}%`,
                        backgroundColor: item.gap > 0 ? 'var(--color-success)' : item.gap < 0 ? 'var(--color-error)' : 'var(--color-text-quaternary)',
                        marginLeft: item.gap < 0 ? 0 : undefined,
                      }}
                    />
                  </div>
                  <span className={`${styles.gapValue} ${item.gap > 0 ? styles.gapPositive : item.gap < 0 ? styles.gapNegative : styles.gapNeutral
                    }`}>
                    {item.gap > 0 ? <RiseOutlined /> : item.gap < 0 ? <FallOutlined /> : null}
                    {' '}{item.gap > 0 ? '+' : ''}{item.gap}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          className={styles.empty}
          description={m.selectCompareProducts}
        />
      )}
    </div>
  )
}
