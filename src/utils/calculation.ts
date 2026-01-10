import type { Dimension, Vendor, CalculatedDimensionScore, VendorTotalScore } from '@/types'

/**
 * 获取单个维度的分数
 * 如果有子维度，计算子维度加权平均；否则直接返回维度分数
 */
export function getDimensionScore(dimension: Dimension, vendorId: string): number {
  if (dimension.subDimensions.length === 0) {
    return dimension.scores[vendorId] ?? 0
  }

  const totalWeight = dimension.subDimensions.reduce((sum, sub) => sum + sub.weight, 0)
  if (totalWeight === 0) return 0

  return dimension.subDimensions.reduce((sum, sub) => {
    const score = sub.scores[vendorId] ?? 0
    return sum + score * (sub.weight / totalWeight)
  }, 0)
}

/**
 * 计算所有维度的分数
 */
export function calculateAllDimensionScores(
  dimensions: Dimension[],
  vendors: Vendor[]
): CalculatedDimensionScore[] {
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0)

  return dimensions.map((dim) => ({
    dimensionId: dim.id,
    dimensionName: dim.name,
    vendorScores: vendors.map((vendor) => {
      const rawScore = getDimensionScore(dim, vendor.id)
      const weightedScore = totalWeight > 0 ? rawScore * (dim.weight / totalWeight) : 0
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        rawScore,
        weightedScore,
      }
    }),
  }))
}

/**
 * 计算各 Vendor 的总分和排名
 */
export function calculateVendorTotalScores(
  dimensions: Dimension[],
  vendors: Vendor[]
): VendorTotalScore[] {
  const dimensionScores = calculateAllDimensionScores(dimensions, vendors)
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0)

  const scores: VendorTotalScore[] = vendors.map((vendor) => {
    const breakdown = dimensions.map((dim) => {
      const dimScore = dimensionScores.find((ds) => ds.dimensionId === dim.id)
      const vendorScore = dimScore?.vendorScores.find((vs) => vs.vendorId === vendor.id)
      const score = vendorScore?.rawScore ?? 0
      const contribution = totalWeight > 0 ? score * (dim.weight / totalWeight) : 0

      return {
        dimensionId: dim.id,
        dimensionName: dim.name,
        score,
        weight: dim.weight,
        contribution,
      }
    })

    const totalScore = breakdown.reduce((sum, b) => sum + b.contribution, 0)

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      color: vendor.color,
      totalScore,
      rank: 0,
      dimensionBreakdown: breakdown,
    }
  })

  // 计算排名
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore)
  sorted.forEach((score, index) => {
    const original = scores.find((s) => s.vendorId === score.vendorId)
    if (original) {
      original.rank = index + 1
    }
  })

  return scores
}

/**
 * 验证权重是否合法
 */
export function validateWeights(weights: number[]): { valid: boolean; sum: number } {
  const sum = weights.reduce((s, w) => s + w, 0)
  return {
    valid: Math.abs(sum - 100) < 0.01 || sum === 0,
    sum,
  }
}

/**
 * 自动规范化权重，使其总和为 100
 */
export function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0)
  if (sum === 0) return weights.map(() => 100 / weights.length)
  return weights.map((w) => Math.round((w / sum) * 100 * 100) / 100)
}
