/**
 * 产品矩阵图类型定义
 * Product Matrix Chart Type Definitions
 */

import { idGenerators } from '@/utils/idGenerator'

// ============ 产品状态 ============

export type ProductStatus = 'active' | 'discontinued' | 'planned' | 'presale' | 'eol'

export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, {
  label: string
  labelEn: string
  labelKey: string
  color: string
  icon: string
}> = {
  active: { label: '在售', labelEn: 'Active', labelKey: 'status_active', color: '#52c41a', icon: 'check-circle' },
  discontinued: { label: '停产', labelEn: 'Discontinued', labelKey: 'status_discontinued', color: '#8c8c8c', icon: 'stop' },
  planned: { label: '规划中', labelEn: 'Planned', labelKey: 'status_planned', color: '#1890ff', icon: 'clock-circle' },
  presale: { label: '预售', labelEn: 'Pre-sale', labelKey: 'status_presale', color: '#faad14', icon: 'star' },
  eol: { label: 'EOL', labelEn: 'End of Life', labelKey: 'status_eol', color: '#ff4d4f', icon: 'close-circle' },
}

// ============ 厂商 ============

export interface MatrixVendor {
  id: string
  name: string
  color: string           // HEX color
  brand?: string          // 品牌名（可选，与厂商不同时使用）
  logoUrl?: string        // 厂商 Logo 图片链接
  description?: string
  order: number
  visible: boolean
}

// ============ 维度 ============

export type DimensionType = 'discrete' | 'continuous'

// 离散维度选项
export interface DimensionOption {
  id: string
  label: string
  value: string           // 用于数据存储的值
  order: number
  color?: string          // 可选颜色标识
}

// 连续维度分段（用于可视化分组）
export interface ContinuousSegment {
  id: string
  label: string
  min: number
  max: number
  color?: string
}

// 维度定义
export interface MatrixDimension {
  id: string
  name: string
  type: DimensionType
  description?: string
  color?: string                     // 维度主题色
  icon?: string                      // 维度图标 (Antd Icon Name)
  order: number
  // 离散维度专用
  options?: DimensionOption[]
  // 连续维度专用
  unit?: string                      // 单位，如 "MHz", "GB", "$"
  min?: number                       // 最小值
  max?: number                       // 最大值
  segments?: ContinuousSegment[]     // 分段配置
}

// ============ 产品 ============

// 维度值（根据维度类型不同）
export type DimensionValue = string | number | null

// 产品
export interface Product {
  id: string
  name: string
  vendorId: string
  brand?: string           // 品牌（可覆盖厂商默认品牌）
  model?: string           // 型号
  status: ProductStatus
  price?: number           // 价格
  priceUnit?: string       // 价格单位
  description?: string
  url?: string             // 产品链接
  imageUrl?: string        // 产品图片
  releaseDate?: string     // 发布日期 YYYY-MM-DD
  dimensionValues: Record<string, DimensionValue>  // dimensionId -> value
  tags?: string[]          // 标签
  createdAt: number
  updatedAt: number
}

// ============ 矩阵配置 ============

export type CellLayout = 'overlap' | 'stack' | 'grid' | 'petal'

export interface MatrixConfig {
  xAxisDimensionId: string | null    // X 轴维度 ID
  yAxisDimensionId: string | null    // Y 轴维度 ID
  cellLayout: CellLayout             // 单元格内布局模式
  showLabels: boolean                // 显示产品标签
  showTooltip: boolean               // 显示提示框
  showLegend: boolean                // 显示图例
  showGrid: boolean                  // 显示网格线
  enableZoom: boolean                // 启用缩放
  enablePan: boolean                 // 启用平移
}

// ============ 花瓣图配置 ============

export type PetalShape = 'diamond' | 'sector' | 'petal' | 'circle'
export type SizeScaleMode = 'linear' | 'sqrt' | 'log'
export type ColorEncoding = 'vendor' | 'price' | 'status'
export type OpacityEncoding = 'none' | 'price' | 'count'

export interface PetalConfig {
  shape: PetalShape                  // 花瓣形状
  sizeScale: SizeScaleMode           // 大小缩放模式
  colorEncoding: ColorEncoding       // 颜色编码
  opacityEncoding: OpacityEncoding   // 透明度编码
  minPetalSize: number               // 最小花瓣尺寸 (px)
  maxPetalSize: number               // 最大花瓣尺寸 (px)
  showVendorLabels: boolean          // 显示厂商标签
  animationEnabled: boolean          // 启用动画
}

// ============ 产品矩阵图 (Tab 类型) ============

export interface ProductMatrixChart {
  id: string
  name: string
  order: number
  isProductMatrixChart: true         // 类型标识符
  vendors: MatrixVendor[]
  dimensions: MatrixDimension[]
  products: Product[]
  matrixConfig: MatrixConfig
  petalConfig: PetalConfig
  createdAt: number
  updatedAt: number
}

// ============ 类型守卫 ============

export function isProductMatrixChart(chart: unknown): chart is ProductMatrixChart {
  return (
    typeof chart === 'object' &&
    chart !== null &&
    'isProductMatrixChart' in chart &&
    (chart as ProductMatrixChart).isProductMatrixChart === true
  )
}

// ============ 默认值工厂函数 ============

export function createDefaultMatrixVendor(partial?: Partial<MatrixVendor>): MatrixVendor {
  return {
    id: partial?.id ?? idGenerators.vendor(),
    name: partial?.name ?? '新厂商',
    color: partial?.color ?? '#5470c6',
    brand: partial?.brand,
    description: partial?.description,
    order: partial?.order ?? 0,
    visible: partial?.visible ?? true,
  }
}

export function createDefaultDimensionOption(partial?: Partial<DimensionOption>): DimensionOption {
  const label = partial?.label ?? '选项'
  return {
    id: partial?.id ?? idGenerators.option(),
    label: label,
    value: partial?.value ?? label,  // 默认 value 与 label 相同
    order: partial?.order ?? 0,
    color: partial?.color,
  }
}

export function createDefaultMatrixDimension(partial?: Partial<MatrixDimension>): MatrixDimension {
  return {
    id: partial?.id ?? idGenerators.dimension(),
    name: partial?.name ?? '新维度',
    type: partial?.type ?? 'discrete',
    description: partial?.description,
    order: partial?.order ?? 0,
    options: partial?.options ?? [],
    unit: partial?.unit,
    min: partial?.min,
    max: partial?.max,
    segments: partial?.segments,
  }
}

export function createDefaultProduct(
  vendorId: string,
  partial?: Partial<Product>
): Product {
  const now = Date.now()
  return {
    id: partial?.id ?? idGenerators.product(),
    name: partial?.name ?? '新产品',
    vendorId,
    brand: partial?.brand,
    model: partial?.model,
    status: partial?.status ?? 'active',
    price: partial?.price,
    priceUnit: partial?.priceUnit,
    description: partial?.description,
    url: partial?.url,
    imageUrl: partial?.imageUrl,
    releaseDate: partial?.releaseDate,
    dimensionValues: partial?.dimensionValues ?? {},
    tags: partial?.tags ?? [],
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  }
}

export function createDefaultMatrixConfig(partial?: Partial<MatrixConfig>): MatrixConfig {
  return {
    xAxisDimensionId: partial?.xAxisDimensionId ?? null,
    yAxisDimensionId: partial?.yAxisDimensionId ?? null,
    cellLayout: partial?.cellLayout ?? 'overlap',
    showLabels: partial?.showLabels ?? true,
    showTooltip: partial?.showTooltip ?? true,
    showLegend: partial?.showLegend ?? true,
    showGrid: partial?.showGrid ?? true,
    enableZoom: partial?.enableZoom ?? true,
    enablePan: partial?.enablePan ?? true,
  }
}

export function createDefaultPetalConfig(partial?: Partial<PetalConfig>): PetalConfig {
  return {
    shape: partial?.shape ?? 'diamond',
    sizeScale: partial?.sizeScale ?? 'sqrt',
    colorEncoding: partial?.colorEncoding ?? 'vendor',
    opacityEncoding: partial?.opacityEncoding ?? 'none',
    minPetalSize: partial?.minPetalSize ?? 20,
    maxPetalSize: partial?.maxPetalSize ?? 60,
    showVendorLabels: partial?.showVendorLabels ?? true,
    animationEnabled: partial?.animationEnabled ?? true,
  }
}

export function createDefaultProductMatrixChart(
  partial?: Partial<ProductMatrixChart>
): ProductMatrixChart {
  const now = Date.now()
  return {
    id: partial?.id ?? idGenerators.productMatrixChart(),
    name: partial?.name ?? '产品矩阵',
    order: partial?.order ?? 0,
    isProductMatrixChart: true,
    vendors: partial?.vendors ?? [],
    dimensions: partial?.dimensions ?? [],
    products: partial?.products ?? [],
    matrixConfig: partial?.matrixConfig ?? createDefaultMatrixConfig(),
    petalConfig: partial?.petalConfig ?? createDefaultPetalConfig(),
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  }
}

// ============ 预设颜色 ============

export const MATRIX_VENDOR_COLORS = [
  '#5470c6', // 蓝色
  '#91cc75', // 绿色
  '#fac858', // 黄色
  '#ee6666', // 红色
  '#73c0de', // 浅蓝
  '#3ba272', // 深绿
  '#fc8452', // 橙色
  '#9a60b4', // 紫色
  '#ea7ccc', // 粉色
  '#48b8e6', // 青色
] as const

// 价格颜色映射（用于热力图）
export const PRICE_HEATMAP_COLORS = [
  '#52c41a', // 低价 - 绿色
  '#faad14', // 中价 - 黄色
  '#ff4d4f', // 高价 - 红色
] as const
