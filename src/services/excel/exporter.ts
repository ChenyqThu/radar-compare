import * as XLSX from 'xlsx'
import type { RadarChart, Project } from '@/types'
import { isRegularRadar } from '@/types'

// 将单个雷达图转换为sheet数据
function radarToSheetData(radar: RadarChart): any[][] {
  const rows: any[][] = []

  // 表头
  const headers = [
    '维度',
    '维度权重',
    '维度说明',
    '子维度',
    '子维度权重',
    '子维度说明',
    ...radar.vendors.map((v) => v.name),
  ]
  rows.push(headers)

  // 数据行
  radar.dimensions.forEach((dim) => {
    if (dim.subDimensions.length > 0) {
      dim.subDimensions.forEach((sub, subIdx) => {
        rows.push([
          subIdx === 0 ? dim.name : '',
          subIdx === 0 ? dim.weight : '',
          subIdx === 0 ? dim.description : '',
          sub.name,
          sub.weight,
          sub.description,
          ...radar.vendors.map((v) => sub.scores[v.id] ?? ''),
        ])
      })
    } else {
      rows.push([
        dim.name,
        dim.weight,
        dim.description,
        '',
        '',
        '',
        ...radar.vendors.map((v) => dim.scores[v.id] ?? ''),
      ])
    }
  })

  return rows
}

// 设置sheet列宽
function setColumnWidths(ws: XLSX.WorkSheet, vendorCount: number) {
  ws['!cols'] = [
    { wch: 15 }, // 维度
    { wch: 10 }, // 维度权重
    { wch: 20 }, // 维度说明
    { wch: 15 }, // 子维度
    { wch: 12 }, // 子维度权重
    { wch: 20 }, // 子维度说明
    ...Array(vendorCount).fill({ wch: 10 }),
  ]
}

// 导出单个雷达图
export function exportToExcel(radar: RadarChart, filename?: string) {
  const wb = XLSX.utils.book_new()
  const rows = radarToSheetData(radar)
  const ws = XLSX.utils.aoa_to_sheet(rows)
  setColumnWidths(ws, radar.vendors.length)

  // Sheet名称最长31字符
  const sheetName = radar.name.substring(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename || `${radar.name}.xlsx`)
}

// 导出多个雷达图（每个tab一个sheet）
export function exportMultipleToExcel(radars: RadarChart[], filename?: string) {
  const wb = XLSX.utils.book_new()

  // 过滤出普通雷达图（非时间轴）
  const regularRadars = radars.filter(isRegularRadar)

  regularRadars.forEach((radar) => {
    const rows = radarToSheetData(radar)
    const ws = XLSX.utils.aoa_to_sheet(rows)
    setColumnWidths(ws, radar.vendors.length)

    // Sheet名称最长31字符，且不能重复
    let sheetName = radar.name.substring(0, 31)
    let counter = 1
    while (wb.SheetNames.includes(sheetName)) {
      const suffix = ` (${counter})`
      sheetName = radar.name.substring(0, 31 - suffix.length) + suffix
      counter++
    }

    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  XLSX.writeFile(wb, filename || '竞品对比.xlsx')
}

export function exportToJson(project: Project, filename?: string) {
  const json = JSON.stringify(project, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `${project.name}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const rows = [
    ['维度', '维度权重', '维度说明', '子维度', '子维度权重', '子维度说明', 'Vendor A', 'Vendor B', 'Vendor C'],
    ['功能完整性', 25, '产品功能覆盖范围', '', '', '', 8, 7, 6],
    ['性能表现', 20, '系统性能指标', '吞吐量', 50, '数据处理能力', 9, 8, 7],
    ['', '', '', '延迟', 50, '响应时间', 8, 8, 8],
    ['易用性', 20, '用户界面友好程度', '', '', '', 9, 6, 7],
    ['可扩展性', 15, '系统扩展能力', '', '', '', 7, 8, 6],
    ['性价比', 20, '价格与功能比较', '', '', '', 8, 6, 9],
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, '模板')
  XLSX.writeFile(wb, '竞品对比模板.xlsx')
}
