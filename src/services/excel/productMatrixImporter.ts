/**
 * Product Matrix data import service
 * Imports from Excel with multiple worksheets:
 * 1. Products - Main product data with dimension values
 * 2. Vendors - Vendor configuration
 * 3. Dimensions - Dimension configuration with options
 * 4. Dimension Options - Options for discrete dimensions
 */

import * as XLSX from 'xlsx'
import { message } from 'antd'
import { idGenerators } from '@/utils/idGenerator'
import type {
  ProductMatrixChart,
  Product,
  MatrixVendor,
  MatrixDimension,
  DimensionOption,
  ProductStatus
} from '@/types/productMatrix'

interface ImportResult {
  success: boolean
  chart?: Partial<ProductMatrixChart>
  errors: string[]
  warnings: string[]
}

// Sheet names (matching exporter)
const SHEET_NAMES = {
  products: '产品列表',
  vendors: '厂商配置',
  dimensions: '维度配置',
  dimensionOptions: '维度选项',
}

// Valid product statuses
const VALID_STATUSES: ProductStatus[] = ['active', 'discontinued', 'planned', 'presale', 'eol']

/**
 * Import Product Matrix from Excel file
 */
export async function importProductMatrixFromExcel(
  file: File,
  t: Record<string, Record<string, string>>
): Promise<ImportResult> {
  const m = t.productMatrix || {}
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Parse each sheet
    const vendorsResult = parseVendorsSheet(workbook, errors, warnings)
    const dimensionsResult = parseDimensionsSheet(workbook, errors, warnings)
    const optionsResult = parseDimensionOptionsSheet(workbook, dimensionsResult.dimensions, errors, warnings)

    // Merge options into dimensions
    const dimensionsWithOptions = mergeDimensionOptions(dimensionsResult.dimensions, optionsResult.options)

    const productsResult = parseProductsSheet(
      workbook,
      vendorsResult.vendors,
      dimensionsWithOptions,
      errors,
      warnings
    )

    if (errors.length > 0) {
      return { success: false, errors, warnings }
    }

    const chart: Partial<ProductMatrixChart> = {
      vendors: vendorsResult.vendors,
      dimensions: dimensionsWithOptions,
      products: productsResult.products,
    }

    message.success(m.importSuccess || '导入成功')
    return { success: true, chart, errors, warnings }
  } catch (error) {
    console.error('Import failed:', error)
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    errors.push(`${m.importFailed || '导入失败'}: ${errorMsg}`)
    return { success: false, errors, warnings }
  }
}

/**
 * Parse Vendors sheet
 */
function parseVendorsSheet(
  workbook: XLSX.WorkBook,
  _errors: string[],
  warnings: string[]
): { vendors: MatrixVendor[] } {
  const vendors: MatrixVendor[] = []
  const sheet = workbook.Sheets[SHEET_NAMES.vendors]

  if (!sheet) {
    warnings.push(`未找到"${SHEET_NAMES.vendors}"工作表，将使用空厂商列表`)
    return { vendors }
  }

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  data.forEach((row, index) => {
    const name = getString(row, ['厂商名称', 'vendorName', 'name'])
    if (!name) {
      warnings.push(`厂商表第${index + 2}行：缺少厂商名称，已跳过`)
      return
    }

    vendors.push({
      id: getString(row, ['厂商ID', 'vendorId', 'id']) || idGenerators.vendor(),
      name,
      brand: getString(row, ['品牌', 'brand']) || '',
      color: getString(row, ['颜色', 'color']) || generateColor(index),
      description: getString(row, ['描述', 'description']) || '',
      order: index,
      visible: true,
    })
  })

  return { vendors }
}

/**
 * Parse Dimensions sheet
 */
function parseDimensionsSheet(
  workbook: XLSX.WorkBook,
  _errors: string[],
  warnings: string[]
): { dimensions: MatrixDimension[] } {
  const dimensions: MatrixDimension[] = []
  const sheet = workbook.Sheets[SHEET_NAMES.dimensions]

  if (!sheet) {
    warnings.push(`未找到"${SHEET_NAMES.dimensions}"工作表，将使用空维度列表`)
    return { dimensions }
  }

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  data.forEach((row, index) => {
    const name = getString(row, ['维度名称', 'dimensionName', 'name'])
    if (!name) {
      warnings.push(`维度表第${index + 2}行：缺少维度名称，已跳过`)
      return
    }

    const typeStr = getString(row, ['类型', 'type', 'dimensionType'])
    const type = typeStr === '连续' || typeStr === 'continuous' ? 'continuous' : 'discrete'

    dimensions.push({
      id: getString(row, ['维度ID', 'dimensionId', 'id']) || idGenerators.dimension(),
      name,
      type,
      unit: getString(row, ['单位', 'unit']) || undefined,
      min: getNumber(row, ['最小值', 'min']),
      max: getNumber(row, ['最大值', 'max']),
      description: getString(row, ['描述', 'description']) || undefined,
      order: index,
      options: [], // Will be filled from options sheet
    })
  })

  return { dimensions }
}

/**
 * Parse Dimension Options sheet
 */
function parseDimensionOptionsSheet(
  workbook: XLSX.WorkBook,
  dimensions: MatrixDimension[],
  _errors: string[],
  warnings: string[]
): { options: Map<string, DimensionOption[]> } {
  const options = new Map<string, DimensionOption[]>()
  const sheet = workbook.Sheets[SHEET_NAMES.dimensionOptions]

  if (!sheet) {
    // Options sheet is optional
    return { options }
  }

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  data.forEach((row, index) => {
    const dimensionName = getString(row, ['维度名称', 'dimensionName'])
    const label = getString(row, ['选项标签', 'optionLabel', 'label'])
    const value = getString(row, ['选项值', 'optionValue', 'value'])

    if (!dimensionName || !label) {
      warnings.push(`维度选项表第${index + 2}行：缺少维度名称或选项标签，已跳过`)
      return
    }

    const dimension = dimensions.find(d => d.name === dimensionName)
    if (!dimension) {
      warnings.push(`维度选项表第${index + 2}行：未找到维度"${dimensionName}"，已跳过`)
      return
    }

    const existingOptions = options.get(dimension.id) || []
    existingOptions.push({
      id: getString(row, ['选项ID', 'optionId', 'id']) || idGenerators.option(),
      label,
      value: value || label,
      color: getString(row, ['颜色', 'color']) || undefined,
      order: existingOptions.length,
    })
    options.set(dimension.id, existingOptions)
  })

  return { options }
}

/**
 * Merge dimension options into dimensions
 */
function mergeDimensionOptions(
  dimensions: MatrixDimension[],
  optionsMap: Map<string, DimensionOption[]>
): MatrixDimension[] {
  return dimensions.map(dim => ({
    ...dim,
    options: optionsMap.get(dim.id) || dim.options || [],
  }))
}

/**
 * Parse Products sheet
 */
function parseProductsSheet(
  workbook: XLSX.WorkBook,
  vendors: MatrixVendor[],
  dimensions: MatrixDimension[],
  _errors: string[],
  warnings: string[]
): { products: Product[] } {
  const products: Product[] = []
  const sheet = workbook.Sheets[SHEET_NAMES.products]

  if (!sheet) {
    warnings.push(`未找到"${SHEET_NAMES.products}"工作表，将使用空产品列表`)
    return { products }
  }

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  data.forEach((row, index) => {
    const name = getString(row, ['产品名称', 'productName', 'name'])
    if (!name) {
      warnings.push(`产品表第${index + 2}行：缺少产品名称，已跳过`)
      return
    }

    // Find vendor
    const vendorName = getString(row, ['厂商', 'vendorName', 'vendor'])
    let vendor = vendors.find(v => v.name === vendorName)

    // Auto-create vendor if not found
    if (!vendor && vendorName) {
      vendor = {
        id: idGenerators.vendor(),
        name: vendorName,
        brand: '',
        color: generateColor(vendors.length),
        description: '',
        order: vendors.length,
        visible: true,
      }
      vendors.push(vendor)
      warnings.push(`产品表第${index + 2}行：自动创建厂商"${vendorName}"`)
    }

    // Parse status
    const statusStr = getString(row, ['状态', 'status'])
    const status: ProductStatus = VALID_STATUSES.includes(statusStr as ProductStatus)
      ? (statusStr as ProductStatus)
      : 'active'

    // Parse dimension values
    const dimensionValues: Record<string, string | number | null> = {}
    dimensions.forEach(dim => {
      const value = row[dim.name]
      if (value !== undefined && value !== null && value !== '') {
        if (dim.type === 'continuous') {
          const numValue = typeof value === 'number' ? value : parseFloat(String(value))
          dimensionValues[dim.id] = isNaN(numValue) ? null : numValue
        } else {
          // For discrete, find matching option value
          const option = dim.options?.find(o =>
            o.label === String(value) || o.value === String(value)
          )
          dimensionValues[dim.id] = option?.value || String(value)
        }
      }
    })

    const now = Date.now()
    products.push({
      id: getString(row, ['产品ID', 'productId', 'id']) || idGenerators.product(),
      name,
      vendorId: vendor?.id || '',
      brand: getString(row, ['品牌', 'brand']) || undefined,
      model: getString(row, ['型号', 'model']) || undefined,
      status,
      price: getNumber(row, ['价格', 'price']),
      priceUnit: getString(row, ['价格单位', 'priceUnit']) || undefined,
      releaseDate: getString(row, ['发布日期', 'releaseDate']) || undefined,
      description: getString(row, ['描述', 'description']) || undefined,
      url: getString(row, ['链接', 'url']) || undefined,
      tags: parseTagsString(getString(row, ['标签', 'tags'])),
      dimensionValues,
      createdAt: now,
      updatedAt: now,
    })
  })

  return { products }
}

// ============ Helper Functions ============

/**
 * Get string value from row with multiple possible keys
 */
function getString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim()
    }
  }
  return ''
}

/**
 * Get number value from row with multiple possible keys
 */
function getNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') {
      const num = typeof value === 'number' ? value : parseFloat(String(value))
      if (!isNaN(num)) return num
    }
  }
  return undefined
}

/**
 * Parse comma-separated tags string
 */
function parseTagsString(tagsStr: string): string[] | undefined {
  if (!tagsStr) return undefined
  const tags = tagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean)
  return tags.length > 0 ? tags : undefined
}

/**
 * Generate a color based on index
 */
function generateColor(index: number): string {
  const colors = [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911',
  ]
  return colors[index % colors.length]
}

/**
 * Validate imported data
 */
export function validateImportedData(
  chart: Partial<ProductMatrixChart>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!chart.products || chart.products.length === 0) {
    errors.push('导入的产品列表为空')
  }

  if (!chart.vendors || chart.vendors.length === 0) {
    errors.push('导入的厂商列表为空')
  }

  // Check for products without valid vendor
  chart.products?.forEach((product) => {
    if (!product.vendorId) {
      errors.push(`产品"${product.name}"缺少厂商`)
    }
    const vendor = chart.vendors?.find(v => v.id === product.vendorId)
    if (!vendor) {
      errors.push(`产品"${product.name}"的厂商不存在`)
    }
  })

  return { valid: errors.length === 0, errors }
}
