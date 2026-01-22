/**
 * Product Matrix data export service
 * Exports to Excel with multiple worksheets:
 * 1. Products - Main product data with dimension values
 * 2. Vendors - Vendor configuration
 * 3. Dimensions - Dimension configuration with options
 * 4. Summary - Statistics overview
 */

import * as XLSX from 'xlsx'
import { message } from 'antd'
import type { ProductMatrixChart, Product, MatrixVendor, MatrixDimension } from '@/types/productMatrix'

interface ExportOptions {
  chart: ProductMatrixChart
  t: Record<string, Record<string, string>>
  fileName?: string
}

// Default sheet names (fallback)
const DEFAULT_SHEET_NAMES = {
  products: '产品列表',
  vendors: '厂商配置',
  dimensions: '维度配置',
  dimensionOptions: '维度选项',
  summary: '统计摘要',
}

/**
 * Get sheet names from translation or use defaults
 */
function getSheetNames(m: Record<string, string>) {
  return {
    products: m.sheetProducts || DEFAULT_SHEET_NAMES.products,
    vendors: m.sheetVendors || DEFAULT_SHEET_NAMES.vendors,
    dimensions: m.sheetDimensions || DEFAULT_SHEET_NAMES.dimensions,
    dimensionOptions: m.sheetDimensionOptions || DEFAULT_SHEET_NAMES.dimensionOptions,
    summary: m.sheetSummary || DEFAULT_SHEET_NAMES.summary,
  }
}

/**
 * Export Product Matrix to Excel
 */
export function exportProductMatrixToExcel(options: ExportOptions) {
  const { chart, t, fileName } = options
  const m = t.productMatrix || {}
  const sheetNames = getSheetNames(m)

  try {
    const workbook = XLSX.utils.book_new()
    const { vendors, dimensions, products } = chart

    // 1. Products Sheet
    createProductsSheet(workbook, products, vendors, dimensions, m, sheetNames)

    // 2. Vendors Sheet
    createVendorsSheet(workbook, vendors, m, sheetNames)

    // 3. Dimensions Sheet
    createDimensionsSheet(workbook, dimensions, m, sheetNames)

    // 4. Dimension Options Sheet (for discrete dimensions)
    createDimensionOptionsSheet(workbook, dimensions, m, sheetNames)

    // 5. Summary Sheet
    createSummarySheet(workbook, chart, m, sheetNames)

    // Generate filename
    const exportFileName = fileName || `${chart.name || 'ProductMatrix'}_${formatDate(new Date())}.xlsx`

    // Write and download
    XLSX.writeFile(workbook, exportFileName)
    message.success(m.exportSuccess || '导出成功')
  } catch (error) {
    console.error('Export failed:', error)
    message.error(m.exportFailed || '导出失败')
  }
}

/**
 * Create Products worksheet
 */
function createProductsSheet(
  workbook: XLSX.WorkBook,
  products: Product[],
  vendors: MatrixVendor[],
  dimensions: MatrixDimension[],
  m: Record<string, string>,
  sheetNames: ReturnType<typeof getSheetNames>
) {
  // Build header row
  const header = [
    m.productId || '产品ID',
    m.productName || '产品名称',
    m.vendorName || '厂商',
    m.brand || '品牌',
    m.model || '型号',
    m.status || '状态',
    m.price || '价格',
    m.priceUnit || '价格单位',
    m.releaseDate || '发布日期',
    m.description || '描述',
    m.url || '链接',
    m.tags || '标签',
    // Add dimension columns
    ...dimensions.map(d => d.name),
  ]

  // Build data rows
  const data: (string | number | null)[][] = [header]

  products.forEach(product => {
    const vendor = vendors.find(v => v.id === product.vendorId)
    const row: (string | number | null)[] = [
      product.id,
      product.name,
      vendor?.name || '',
      product.brand || '',
      product.model || '',
      product.status,
      product.price ?? '',
      product.priceUnit || '',
      product.releaseDate || '',
      product.description || '',
      product.url || '',
      product.tags?.join(', ') || '',
    ]

    // Add dimension values
    dimensions.forEach(dim => {
      const value = product.dimensionValues[dim.id]
      if (value === null || value === undefined) {
        row.push('')
      } else if (dim.type === 'discrete' && dim.options) {
        // For discrete, find option label
        const option = dim.options.find(o => o.value === String(value))
        row.push(option?.label || String(value))
      } else {
        row.push(value as string | number)
      }
    })

    data.push(row)
  })

  const sheet = XLSX.utils.aoa_to_sheet(data)
  setColumnWidths(sheet, [15, 20, 15, 15, 15, 10, 10, 10, 12, 30, 30, 20, ...dimensions.map(() => 15)])
  XLSX.utils.book_append_sheet(workbook, sheet, sheetNames.products)
}

/**
 * Create Vendors worksheet
 */
function createVendorsSheet(
  workbook: XLSX.WorkBook,
  vendors: MatrixVendor[],
  m: Record<string, string>,
  sheetNames: ReturnType<typeof getSheetNames>
) {
  const header = [
    m.vendorId || '厂商ID',
    m.vendorName || '厂商名称',
    m.brand || '品牌',
    m.color || '颜色',
    m.description || '描述',
    m.order || '排序',
  ]

  const data: (string | number)[][] = [header]

  vendors.forEach(vendor => {
    data.push([
      vendor.id,
      vendor.name,
      vendor.brand || '',
      vendor.color,
      vendor.description || '',
      vendor.order,
    ])
  })

  const sheet = XLSX.utils.aoa_to_sheet(data)
  setColumnWidths(sheet, [15, 20, 15, 10, 30, 8])
  XLSX.utils.book_append_sheet(workbook, sheet, sheetNames.vendors)
}

/**
 * Create Dimensions worksheet
 */
function createDimensionsSheet(
  workbook: XLSX.WorkBook,
  dimensions: MatrixDimension[],
  m: Record<string, string>,
  sheetNames: ReturnType<typeof getSheetNames>
) {
  const header = [
    m.dimensionId || '维度ID',
    m.dimensionName || '维度名称',
    m.dimensionType || '类型',
    m.unit || '单位',
    m.min || '最小值',
    m.max || '最大值',
    m.description || '描述',
    m.order || '排序',
  ]

  const data: (string | number)[][] = [header]

  dimensions.forEach(dim => {
    data.push([
      dim.id,
      dim.name,
      dim.type === 'continuous' ? (m.continuous || '连续') : (m.discrete || '离散'),
      dim.unit || '',
      dim.min ?? '',
      dim.max ?? '',
      dim.description || '',
      dim.order,
    ])
  })

  const sheet = XLSX.utils.aoa_to_sheet(data)
  setColumnWidths(sheet, [15, 20, 10, 10, 10, 10, 30, 8])
  XLSX.utils.book_append_sheet(workbook, sheet, sheetNames.dimensions)
}

/**
 * Create Dimension Options worksheet (for discrete dimensions)
 */
function createDimensionOptionsSheet(
  workbook: XLSX.WorkBook,
  dimensions: MatrixDimension[],
  m: Record<string, string>,
  sheetNames: ReturnType<typeof getSheetNames>
) {
  const header = [
    m.dimensionName || '维度名称',
    m.optionId || '选项ID',
    m.optionLabel || '选项标签',
    m.optionValue || '选项值',
    m.color || '颜色',
    m.order || '排序',
  ]

  const data: (string | number)[][] = [header]

  dimensions.forEach(dim => {
    if (dim.type === 'discrete' && dim.options) {
      dim.options.forEach(option => {
        data.push([
          dim.name,
          option.id,
          option.label,
          option.value,
          option.color || '',
          option.order,
        ])
      })
    }
  })

  const sheet = XLSX.utils.aoa_to_sheet(data)
  setColumnWidths(sheet, [20, 15, 20, 15, 10, 8])
  XLSX.utils.book_append_sheet(workbook, sheet, sheetNames.dimensionOptions)
}

/**
 * Create Summary worksheet
 */
function createSummarySheet(
  workbook: XLSX.WorkBook,
  chart: ProductMatrixChart,
  m: Record<string, string>,
  sheetNames: ReturnType<typeof getSheetNames>
) {
  const { vendors, dimensions, products } = chart

  // Calculate statistics
  const productsByVendor = vendors.map(v => ({
    vendor: v.name,
    count: products.filter(p => p.vendorId === v.id).length,
  }))

  const productsByStatus = {
    active: products.filter(p => p.status === 'active').length,
    discontinued: products.filter(p => p.status === 'discontinued').length,
    planned: products.filter(p => p.status === 'planned').length,
    presale: products.filter(p => p.status === 'presale').length,
    eol: products.filter(p => p.status === 'eol').length,
  }

  const data: (string | number)[][] = [
    [m.summaryTitle || '统计摘要', ''],
    ['', ''],
    [m.chartName || '图表名称', chart.name],
    [m.totalProducts || '产品总数', products.length],
    [m.totalVendors || '厂商总数', vendors.length],
    [m.totalDimensions || '维度总数', dimensions.length],
    ['', ''],
    [m.productsByVendor || '按厂商统计', ''],
    ...productsByVendor.map(item => [`  ${item.vendor}`, item.count]),
    ['', ''],
    [m.productsByStatus || '按状态统计', ''],
    [`  ${m.statusActive || '在售'}`, productsByStatus.active],
    [`  ${m.statusDiscontinued || '停产'}`, productsByStatus.discontinued],
    [`  ${m.statusPlanned || '规划中'}`, productsByStatus.planned],
    [`  ${m.statusPresale || '预售'}`, productsByStatus.presale],
    [`  ${m.statusEol || 'EOL'}`, productsByStatus.eol],
    ['', ''],
    [m.exportTime || '导出时间', formatDateTime(new Date())],
  ]

  const sheet = XLSX.utils.aoa_to_sheet(data)
  setColumnWidths(sheet, [25, 20])
  XLSX.utils.book_append_sheet(workbook, sheet, sheetNames.summary)
}

/**
 * Set column widths for a worksheet
 */
function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet['!cols'] = widths.map(w => ({ wch: w }))
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format date and time
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Generate Excel template for importing
 */
export function downloadProductMatrixTemplate(t: Record<string, Record<string, string>>) {
  const m = t.productMatrix || {}
  const sheetNames = getSheetNames(m)

  try {
    const workbook = XLSX.utils.book_new()

    // Products template
    const productsData = [
      [
        m.productName || '产品名称',
        m.vendorName || '厂商',
        m.brand || '品牌',
        m.model || '型号',
        m.status || '状态',
        m.price || '价格',
        m.releaseDate || '发布日期',
        m.dimension1 || '维度1',
        m.dimension2 || '维度2',
        m.dimension3 || '维度3',
      ],
      [m.sampleProduct || '示例产品', m.sampleVendor || '示例厂商', m.sampleBrandA || '品牌A', 'Model-001', 'active', 999, '2024-01-01', m.sampleHigh || '高', m.sampleMedium || '中', 85],
    ]
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData)
    setColumnWidths(productsSheet, [20, 15, 15, 15, 10, 10, 12, 10, 10, 10])
    XLSX.utils.book_append_sheet(workbook, productsSheet, sheetNames.products)

    // Vendors template
    const vendorsData = [
      [m.vendorName || '厂商名称', m.brand || '品牌', m.color || '颜色', m.description || '描述'],
      [m.sampleVendor || '示例厂商', m.sampleBrandA || '品牌A', '#1890ff', m.sampleVendorDesc || '厂商描述'],
    ]
    const vendorsSheet = XLSX.utils.aoa_to_sheet(vendorsData)
    XLSX.utils.book_append_sheet(workbook, vendorsSheet, sheetNames.vendors)

    // Dimensions template
    const dimensionsData = [
      [m.dimensionName || '维度名称', m.dimensionType || '类型', m.unit || '单位', m.minValue || '最小值', m.maxValue || '最大值'],
      [m.samplePerformance || '性能', m.continuous || '连续', m.sampleScore || '分', 0, 100],
      [m.sampleGrade || '等级', m.discrete || '离散', '', '', ''],
    ]
    const dimensionsSheet = XLSX.utils.aoa_to_sheet(dimensionsData)
    XLSX.utils.book_append_sheet(workbook, dimensionsSheet, sheetNames.dimensions)

    // Dimension options template
    const optionsData = [
      [m.dimensionName || '维度名称', m.optionLabel || '选项标签', m.optionValue || '选项值'],
      [m.sampleGrade || '等级', m.sampleHigh || '高', 'high'],
      [m.sampleGrade || '等级', m.sampleMedium || '中', 'medium'],
      [m.sampleGrade || '等级', m.sampleLow || '低', 'low'],
    ]
    const optionsSheet = XLSX.utils.aoa_to_sheet(optionsData)
    XLSX.utils.book_append_sheet(workbook, optionsSheet, sheetNames.dimensionOptions)

    XLSX.writeFile(workbook, `${m.templateFileName || 'ProductMatrix_Template'}.xlsx`)
    message.success(m.templateDownloaded || '模板下载成功')
  } catch (error) {
    console.error('Template download failed:', error)
    message.error(m.templateFailed || '模板下载失败')
  }
}
