/**
 * CompetitorAnalysis - Compare products across dimensions
 * Shows a detailed comparison table with scores and winner indicators
 */

import { useState, useMemo } from 'react'
import { Select, Table, Empty, Tag } from 'antd'
import { TrophyOutlined } from '@ant-design/icons'
import { useDataStore, useConfigStore } from '../../stores'
import { useI18n } from '@/locales'
import type { ColumnsType } from 'antd/es/table'
import type { Product, MatrixDimension } from '@/types/productMatrix'
import styles from './CompetitorAnalysis.module.css'

interface CompetitorAnalysisProps {
  readonly?: boolean
}

interface DimensionRow {
  key: string
  dimension: MatrixDimension
  [productId: string]: number | string | MatrixDimension | undefined
}

export function CompetitorAnalysis({ readonly: _readonly }: CompetitorAnalysisProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { products } = useDataStore()
  const { vendors, dimensions } = useConfigStore()

  // Selected products for comparison
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  // Auto-select first few products if none selected
  useMemo(() => {
    if (selectedProductIds.length === 0 && products.length >= 2) {
      setSelectedProductIds(products.slice(0, Math.min(4, products.length)).map(p => p.id))
    }
  }, [products, selectedProductIds.length])

  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedProductIds.includes(p.id))
  }, [products, selectedProductIds])

  // Get normalized value for a dimension
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

  // Get display value for a dimension
  const getDisplayValue = (product: Product, dimension: MatrixDimension): string => {
    const dimValue = product.dimensionValues[dimension.id]
    if (dimValue === null || dimValue === undefined) return '-'

    if (dimension.type === 'continuous') {
      const numValue = typeof dimValue === 'number' ? dimValue : parseFloat(String(dimValue)) || 0
      return `${numValue}${dimension.unit ? ` ${dimension.unit}` : ''}`
    } else {
      if (dimension.options) {
        const option = dimension.options.find(o => o.value === String(dimValue))
        return option?.label || String(dimValue)
      }
      return String(dimValue)
    }
  }

  // Find winner for a dimension
  const findWinner = (dimension: MatrixDimension): string | null => {
    if (selectedProducts.length < 2) return null

    let maxScore = -1
    let winnerId: string | null = null

    selectedProducts.forEach(product => {
      const score = getNormalizedValue(product, dimension)
      if (score > maxScore) {
        maxScore = score
        winnerId = product.id
      }
    })

    return winnerId
  }

  // Build table data
  const tableData: DimensionRow[] = useMemo(() => {
    return dimensions.map(dimension => {
      const row: DimensionRow = {
        key: dimension.id,
        dimension,
      }

      selectedProducts.forEach(product => {
        row[product.id] = getNormalizedValue(product, dimension)
        row[`${product.id}_display`] = getDisplayValue(product, dimension)
      })

      row.winner = findWinner(dimension) || undefined

      return row
    })
  }, [dimensions, selectedProducts])

  // Calculate overall scores
  const overallScores = useMemo(() => {
    return selectedProducts.map(product => {
      const scores = dimensions.map(d => getNormalizedValue(product, d))
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
      return {
        product,
        score: Math.round(avg),
      }
    }).sort((a, b) => b.score - a.score)
  }, [selectedProducts, dimensions])

  // Build columns
  const columns: ColumnsType<DimensionRow> = useMemo(() => {
    const cols: ColumnsType<DimensionRow> = [
      {
        title: t.productMatrix?.dimensionName,
        dataIndex: 'dimension',
        key: 'dimension',
        width: 150,
        fixed: 'left',
        render: (dimension: MatrixDimension) => (
          <div className={styles.dimensionHeader}>
            <span className={styles.dimensionName}>{dimension.name}</span>
            <span className={styles.dimensionType}>
              {dimension.type === 'continuous' ? t.productMatrix.continuous : t.productMatrix.discrete}
            </span>
          </div>
        ),
      },
    ]

    selectedProducts.forEach(product => {
      const vendor = vendors.find(v => v.id === product.vendorId)

      cols.push({
        title: (
          <div className={styles.productHeader}>
            <span className={styles.productName}>{product.name}</span>
            {vendor && (
              <Tag
                className={styles.vendorTag}
                color={vendor.color}
                style={{ color: '#fff' }}
              >
                {vendor.name}
              </Tag>
            )}
          </div>
        ),
        dataIndex: product.id,
        key: product.id,
        width: 180,
        render: (score: number, record: DimensionRow) => {
          const displayValue = record[`${product.id}_display`] as string
          const isWinner = record.winner === product.id
          const color = vendor?.color || '#666'

          return (
            <div className={styles.scoreCell}>
              <span className={styles.scoreValue}>{displayValue}</span>
              <div className={styles.scoreBar}>
                <div
                  className={styles.scoreBarFill}
                  style={{
                    width: `${score}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              {isWinner && selectedProducts.length > 1 && (
                <TrophyOutlined style={{ color: '#faad14' }} />
              )}
            </div>
          )
        },
      })
    })

    return cols
  }, [selectedProducts, vendors, t])

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
          description={m.minTwoProducts}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.filters}>
          <span className={styles.filterLabel}>
            {m.selectProduct}:
          </span>
          <Select
            className={styles.filterSelect}
            mode="multiple"
            placeholder={m.selectCompareProducts}
            value={selectedProductIds}
            onChange={setSelectedProductIds}
            options={productOptions}
            maxTagCount={2}
            style={{ minWidth: 300 }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      {overallScores.length > 0 && (
        <div className={styles.summaryCards}>
          {overallScores.map((item, index) => {
            const vendor = vendors.find(v => v.id === item.product.vendorId)
            return (
              <div key={item.product.id} className={styles.summaryCard}>
                <div className={styles.summaryTitle}>
                  {index === 0 && <TrophyOutlined style={{ color: '#faad14', marginRight: 4 }} />}
                  {item.product.name}
                </div>
                <div
                  className={styles.summaryValue}
                  style={{ color: vendor?.color || '#666' }}
                >
                  {item.score}%
                </div>
                <div className={styles.summaryLabel}>
                  {m.overallScore}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Comparison Table */}
      {selectedProducts.length >= 2 ? (
        <div className={styles.comparisonTable}>
          <Table
            dataSource={tableData}
            columns={columns}
            pagination={false}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </div>
      ) : (
        <Empty
          className={styles.empty}
          description={m.minTwoProducts}
        />
      )}
    </div>
  )
}
