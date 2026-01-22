/**
 * ProductMatrixToolbar - Toolbar for product matrix operations
 * Includes import/export buttons and filter controls
 */

import React, { useRef, useState } from 'react'
import { Button, Dropdown, message, Upload } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import type { MenuProps, UploadFile } from 'antd'
import { useI18n } from '@/locales'
import { useRadarStore } from '@/stores/radarStore'
import { useConfigStore, useDataStore } from './stores'
import { exportProductMatrixToExcel, downloadProductMatrixTemplate } from '@/services/excel/productMatrixExporter'
import { importProductMatrixFromExcel } from '@/services/excel/productMatrixImporter'
import type { ProductMatrixChart } from '@/types/productMatrix'
import { createDefaultMatrixConfig, createDefaultPetalConfig } from '@/types/productMatrix'
import styles from './styles.module.css'

interface ProductMatrixToolbarProps {
  readonly?: boolean
}

export const ProductMatrixToolbar: React.FC<ProductMatrixToolbarProps> = ({ readonly = false }) => {
  const { t } = useI18n()
  const m = t.productMatrix
  const tm = t.toolbar

  const { vendors, dimensions, matrixConfig, petalConfig } = useConfigStore()
  const { products } = useDataStore()
  const { getActiveProductMatrixChart, importProductsFromData } = useRadarStore()

  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get current chart
  const currentChart = getActiveProductMatrixChart()

  // Export menu items
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'excel',
      icon: <FileExcelOutlined />,
      label: tm.exportExcel,
      onClick: handleExportExcel,
    },
    {
      type: 'divider',
    },
    {
      key: 'template',
      icon: <DownloadOutlined />,
      label: m.downloadTemplate,
      onClick: handleDownloadTemplate,
    },
  ]

  // Export to Excel
  function handleExportExcel() {
    if (!currentChart) {
      message.warning(tm.pleaseSelectRadar)
      return
    }

    const chart: ProductMatrixChart = {
      ...currentChart,
      vendors,
      dimensions,
      products,
      matrixConfig: matrixConfig || createDefaultMatrixConfig(),
      petalConfig: petalConfig || createDefaultPetalConfig(),
    }

    exportProductMatrixToExcel({
      chart,
      t,
      fileName: `${currentChart.name || m.excelFileName}.xlsx`,
    })
  }

  // Download template
  function handleDownloadTemplate() {
    downloadProductMatrixTemplate(t)
  }

  // Handle file upload
  async function handleFileUpload(file: UploadFile) {
    if (!file.originFileObj) return false

    const chart = getActiveProductMatrixChart()
    if (!chart) {
      message.warning(tm.pleaseSelectRadar)
      return false
    }

    setImporting(true)
    try {
      const result = await importProductMatrixFromExcel(file.originFileObj, t)

      if (result.success && result.chart) {
        // Import data to store - need to import products with the chart ID
        if (importProductsFromData && result.chart.products) {
          // Convert products to the format expected by importProductsFromData
          const productsToImport = result.chart.products.map(p => ({
            name: p.name,
            vendorId: p.vendorId,
            brand: p.brand,
            model: p.model,
            status: p.status,
            price: p.price,
            priceUnit: p.priceUnit,
            releaseDate: p.releaseDate,
            description: p.description,
            url: p.url,
            tags: p.tags,
            dimensionValues: p.dimensionValues,
          }))
          importProductsFromData(chart.id, productsToImport)
          message.success(tm.importSuccess)

          // Show warnings if any
          if (result.warnings.length > 0) {
            result.warnings.forEach(w => message.warning(w))
          }
        }
      } else {
        // Show errors
        result.errors.forEach(e => message.error(e))
      }
    } catch (error) {
      console.error('Import error:', error)
      message.error(tm.importFailed)
    } finally {
      setImporting(false)
    }

    return false // Prevent default upload behavior
  }

  if (readonly) {
    return null
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        {/* Import */}
        <Upload
          accept=".xlsx,.xls"
          showUploadList={false}
          beforeUpload={handleFileUpload}
          disabled={importing}
        >
          <Button
            icon={<UploadOutlined />}
            loading={importing}
          >
            {tm.import}
          </Button>
        </Upload>

        {/* Export */}
        <Dropdown menu={{ items: exportMenuItems }} placement="bottomLeft">
          <Button icon={<DownloadOutlined />}>
            {tm.export}
          </Button>
        </Dropdown>
      </div>

      <div className={styles.toolbarRight}>
        {/* Additional controls can be added here */}
      </div>

      {/* Hidden file input for programmatic upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleFileUpload({ originFileObj: file } as UploadFile)
          }
        }}
      />
    </div>
  )
}

export default ProductMatrixToolbar
