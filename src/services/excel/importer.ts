import * as XLSX from 'xlsx'
import { nanoid } from 'nanoid'
import type { RadarChart, Dimension, SubDimension, Vendor, ValidationResult, ValidationError, ValidationWarning } from '@/types'
import { PRESET_COLORS, PRESET_MARKERS } from '@/types'

// 多sheet导入结果
export interface MultiSheetImportResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  radars: RadarChart[]
}

export async function importFromExcel(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        const result = parseExcelData(jsonData)
        resolve(result)
      } catch (error) {
        resolve({
          isValid: false,
          errors: [{ field: 'file', message: '文件解析失败: ' + (error as Error).message }],
          warnings: [],
          preview: null,
        })
      }
    }

    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: [{ field: 'file', message: '文件读取失败' }],
        warnings: [],
        preview: null,
      })
    }

    reader.readAsArrayBuffer(file)
  })
}

// 导入多sheet Excel文件
export async function importMultipleFromExcel(file: File): Promise<MultiSheetImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const allErrors: ValidationError[] = []
        const allWarnings: ValidationWarning[] = []
        const radars: RadarChart[] = []

        workbook.SheetNames.forEach((sheetName, sheetIndex) => {
          const sheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

          const result = parseExcelData(jsonData, sheetName)

          if (result.errors.length > 0) {
            // 为错误添加sheet名称前缀
            result.errors.forEach((err) => {
              allErrors.push({
                ...err,
                field: `[${sheetName}] ${err.field}`,
              })
            })
          }

          if (result.warnings.length > 0) {
            result.warnings.forEach((warn) => {
              allWarnings.push({
                ...warn,
                field: `[${sheetName}] ${warn.field}`,
              })
            })
          }

          if (result.preview) {
            // 使用sheet名称作为雷达图名称
            result.preview.name = sheetName
            result.preview.order = sheetIndex
            radars.push(result.preview)
          }
        })

        resolve({
          isValid: radars.length > 0,
          errors: allErrors,
          warnings: allWarnings,
          radars,
        })
      } catch (error) {
        resolve({
          isValid: false,
          errors: [{ field: 'file', message: '文件解析失败: ' + (error as Error).message }],
          warnings: [],
          radars: [],
        })
      }
    }

    reader.onerror = () => {
      resolve({
        isValid: false,
        errors: [{ field: 'file', message: '文件读取失败' }],
        warnings: [],
        radars: [],
      })
    }

    reader.readAsArrayBuffer(file)
  })
}

export async function importFromJson(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)

        // 验证 JSON 结构
        if (!json.radarCharts || !Array.isArray(json.radarCharts)) {
          resolve({
            isValid: false,
            errors: [{ field: 'structure', message: 'JSON 格式不正确，缺少 radarCharts 字段' }],
            warnings: [],
            preview: null,
          })
          return
        }

        const firstRadar = json.radarCharts[0] as RadarChart
        if (firstRadar) {
          resolve({
            isValid: true,
            errors: [],
            warnings: [],
            preview: firstRadar,
          })
        } else {
          resolve({
            isValid: false,
            errors: [{ field: 'data', message: '没有找到雷达图数据' }],
            warnings: [],
            preview: null,
          })
        }
      } catch (error) {
        resolve({
          isValid: false,
          errors: [{ field: 'file', message: 'JSON 解析失败' }],
          warnings: [],
          preview: null,
        })
      }
    }

    reader.readAsText(file)
  })
}

function parseExcelData(rows: any[][], sheetName?: string): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (rows.length < 2) {
    return {
      isValid: false,
      errors: [{ field: 'data', message: '数据为空或只有表头' }],
      warnings: [],
      preview: null,
    }
  }

  const header = rows[0]
  const vendorStartIndex = 6 // 从第7列开始是 Vendor 名称
  const vendorNames = header.slice(vendorStartIndex).filter(Boolean) as string[]

  if (vendorNames.length === 0) {
    return {
      isValid: false,
      errors: [{ field: 'vendors', message: '未找到对比对象（Vendor）' }],
      warnings: [],
      preview: null,
    }
  }

  // 创建 Vendors
  const vendors: Vendor[] = vendorNames.map((name, index) => ({
    id: nanoid(),
    name: String(name),
    color: PRESET_COLORS[index % PRESET_COLORS.length],
    markerType: PRESET_MARKERS[index % PRESET_MARKERS.length],
    order: index,
    visible: true,
  }))

  // 解析维度和子维度
  const dimensions: Dimension[] = []
  let currentDimension: Dimension | null = null

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((cell) => cell === '' || cell === undefined || cell === null)) continue

    const dimName = row[0]
    const dimWeight = row[1]
    const dimDesc = row[2] || ''
    const subName = row[3]
    const subWeight = row[4]
    const subDesc = row[5] || ''
    const scores = row.slice(vendorStartIndex)

    // 如果有维度名称，创建新维度
    if (dimName) {
      if (currentDimension) {
        dimensions.push(currentDimension)
      }
      currentDimension = {
        id: nanoid(),
        name: String(dimName),
        description: String(dimDesc),
        weight: Number(dimWeight) || 0,
        order: dimensions.length,
        scores: {},
        subDimensions: [],
      }
    }

    if (!currentDimension) {
      warnings.push({ row: i + 1, field: 'dimension', message: '找不到对应的维度' })
      continue
    }

    // 如果有子维度名称
    if (subName) {
      const subDimension: SubDimension = {
        id: nanoid(),
        name: String(subName),
        description: String(subDesc),
        weight: Number(subWeight) || 0,
        order: currentDimension.subDimensions.length,
        scores: {},
      }
      // 解析分数
      vendors.forEach((vendor, idx) => {
        const score = Number(scores[idx])
        if (!isNaN(score) && score >= 0 && score <= 10) {
          subDimension.scores[vendor.id] = score
        }
      })
      currentDimension.subDimensions.push(subDimension)
    } else {
      // 无子维度，分数直接存在维度上
      vendors.forEach((vendor, idx) => {
        const score = Number(scores[idx])
        if (!isNaN(score) && score >= 0 && score <= 10) {
          currentDimension!.scores[vendor.id] = score
        }
      })
    }
  }

  // 添加最后一个维度
  if (currentDimension) {
    dimensions.push(currentDimension)
  }

  if (dimensions.length === 0) {
    return {
      isValid: false,
      errors: [{ field: 'dimensions', message: '未找到维度数据' }],
      warnings,
      preview: null,
    }
  }

  const now = Date.now()
  const radarChart: RadarChart = {
    id: nanoid(),
    name: sheetName || '导入的对比图',
    order: 0,
    dimensions,
    vendors,
    createdAt: now,
    updatedAt: now,
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    preview: radarChart,
  }
}
