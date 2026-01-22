import { useState } from 'react'
import { Button, Space, Dropdown, message, Upload } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  HistoryOutlined,
  FolderOutlined,
} from '@ant-design/icons'
import type { MenuProps, UploadFile } from 'antd'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useConfigStore as useManpowerConfigStore, useDataStore as useManpowerDataStore } from '@/components/manpower/stores'
import { useConfigStore as useProductMatrixConfigStore, useDataStore as useProductMatrixDataStore } from '@/components/productMatrix/stores'
import { useI18n } from '@/locales'
import { exportToExcel, exportMultipleToExcel, exportCurrentTabToJson, downloadTemplate } from '@/services/excel/exporter'
import {
  exportManpowerToExcel,
  exportManpowerToJson,
  downloadManpowerTemplateExcel,
  downloadManpowerTemplateJson,
} from '@/services/excel/manpowerExporter'
import {
  exportProductMatrixToExcel,
  downloadProductMatrixTemplate,
} from '@/services/excel/productMatrixExporter'
import { importProductMatrixFromExcel } from '@/services/excel/productMatrixImporter'
import { isRegularRadar } from '@/types'
import type { ProductMatrixChart } from '@/types/productMatrix'
import { createDefaultMatrixConfig, createDefaultPetalConfig } from '@/types/productMatrix'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  hideTimeCompare?: boolean
  hideImport?: boolean
  hideExport?: boolean
}

export function Toolbar({ hideTimeCompare = false, hideImport = false, hideExport = false }: ToolbarProps) {
  const { setImportModalVisible, setCreateTimelineModalVisible, appMode } = useUIStore()
  const { getActiveRadar, currentProject, getRegularRadars } = useRadarStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()

  // Manpower stores
  const manpowerConfig = useManpowerConfigStore()
  const manpowerData = useManpowerDataStore()

  // Product Matrix stores
  const productMatrixConfig = useProductMatrixConfigStore()
  const productMatrixData = useProductMatrixDataStore()
  const { getActiveProductMatrixChart, importProductsFromData } = useRadarStore()

  const [importing, setImporting] = useState(false)

  const isManpowerMode = appMode === 'manpower'
  const isProductMatrixMode = appMode === 'product-matrix'

  // Radar mode export handlers
  const handleExportExcel = () => {
    if (!activeRadar || !isRegularRadar(activeRadar)) {
      message.warning(t.toolbar.pleaseSelectRadar)
      return
    }
    exportToExcel(activeRadar)
    message.success(t.toolbar.exportSuccess)
  }

  const handleExportAllExcel = () => {
    const radars = getRegularRadars()
    if (radars.length === 0) {
      message.warning(t.common.noData)
      return
    }
    exportMultipleToExcel(radars, `${currentProject?.name || '竞品对比'}.xlsx`)
    message.success(t.toolbar.exportSuccess)
  }

  const handleExportJson = () => {
    if (!activeRadar || !isRegularRadar(activeRadar)) {
      message.warning(t.toolbar.pleaseSelectRadar)
      return
    }
    exportCurrentTabToJson(activeRadar)
    message.success(t.toolbar.exportSuccess)
  }

  const handleDownloadTemplate = () => {
    downloadTemplate()
    message.success(t.toolbar.templateDownloadSuccess)
  }

  // Manpower mode export handlers
  const handleManpowerExportExcel = () => {
    const activeManpowerChart = getActiveRadar()
    const fileName = activeManpowerChart?.name || t.manpower.excelFileName

    exportManpowerToExcel({
      teams: manpowerConfig.teams,
      projects: manpowerConfig.projects,
      timePoints: manpowerConfig.timePoints,
      allocations: manpowerData.allocations,
      t,
      fileName,
      getStatistics: manpowerData.getStatistics,
    })
  }

  const handleManpowerExportJson = () => {
    const activeManpowerChart = getActiveRadar()
    const fileName = activeManpowerChart?.name || t.manpower.config

    exportManpowerToJson({
      teams: manpowerConfig.teams,
      projects: manpowerConfig.projects,
      timePoints: manpowerConfig.timePoints,
      allocations: manpowerData.allocations,
      t,
      fileName,
    })
  }

  const handleManpowerDownloadExcelTemplate = () => {
    downloadManpowerTemplateExcel({
      teams: manpowerConfig.teams,
      projects: manpowerConfig.projects,
      timePoints: manpowerConfig.timePoints,
      t,
    })
  }

  const handleManpowerDownloadJsonTemplate = () => {
    downloadManpowerTemplateJson({ t })
  }

  // Product Matrix mode export handlers
  const handleProductMatrixExportExcel = () => {
    const chart = getActiveProductMatrixChart()
    if (!chart) {
      message.warning(t.toolbar.pleaseSelectRadar)
      return
    }

    const fullChart: ProductMatrixChart = {
      ...chart,
      vendors: productMatrixConfig.vendors,
      dimensions: productMatrixConfig.dimensions,
      products: productMatrixData.products,
      matrixConfig: productMatrixConfig.matrixConfig || createDefaultMatrixConfig(),
      petalConfig: productMatrixConfig.petalConfig || createDefaultPetalConfig(),
    }

    exportProductMatrixToExcel({
      chart: fullChart,
      t,
      fileName: `${chart.name || t.productMatrix?.excelFileName || '产品矩阵'}.xlsx`,
    })
    message.success(t.toolbar.exportSuccess)
  }

  const handleProductMatrixDownloadTemplate = () => {
    downloadProductMatrixTemplate(t)
    message.success(t.toolbar.templateDownloadSuccess)
  }

  const handleProductMatrixImport = async (file: UploadFile) => {
    if (!file.originFileObj) return false

    const chart = getActiveProductMatrixChart()
    if (!chart) {
      message.warning(t.toolbar.pleaseSelectRadar)
      return false
    }

    setImporting(true)
    try {
      const result = await importProductMatrixFromExcel(file.originFileObj, t)

      if (result.success && result.chart) {
        if (importProductsFromData && result.chart.products) {
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
          message.success(t.toolbar.importSuccess)

          if (result.warnings.length > 0) {
            result.warnings.forEach(w => message.warning(w))
          }
        }
      } else {
        result.errors.forEach(e => message.error(e))
      }
    } catch (error) {
      console.error('Import error:', error)
      message.error(t.toolbar.importFailed)
    } finally {
      setImporting(false)
    }

    return false
  }

  // Export menu items based on mode
  const getExportMenuItems = (): MenuProps['items'] => {
    if (isProductMatrixMode) {
      return [
        {
          key: 'excel',
          icon: <FileExcelOutlined />,
          label: t.toolbar.exportExcel,
          onClick: handleProductMatrixExportExcel,
        },
        {
          type: 'divider',
        },
        {
          key: 'template',
          icon: <DownloadOutlined />,
          label: t.toolbar.downloadTemplate,
          onClick: handleProductMatrixDownloadTemplate,
        },
      ]
    }

    if (isManpowerMode) {
      return [
        {
          key: 'excel',
          icon: <FileExcelOutlined />,
          label: t.toolbar.exportExcel,
          onClick: handleManpowerExportExcel,
        },
        {
          key: 'json',
          icon: <FileTextOutlined />,
          label: t.toolbar.exportJSON,
          onClick: handleManpowerExportJson,
        },
        {
          type: 'divider',
        },
        {
          key: 'excelTemplate',
          icon: <FileExcelOutlined />,
          label: `${t.toolbar.downloadTemplate} (Excel)`,
          onClick: handleManpowerDownloadExcelTemplate,
        },
        {
          key: 'jsonTemplate',
          icon: <FileTextOutlined />,
          label: `${t.toolbar.downloadTemplate} (JSON)`,
          onClick: handleManpowerDownloadJsonTemplate,
        },
      ]
    }

    // Radar mode
    return [
      {
        key: 'excel',
        icon: <FileExcelOutlined />,
        label: t.toolbar.exportExcel,
        onClick: handleExportExcel,
      },
      {
        key: 'excelAll',
        icon: <FolderOutlined />,
        label: t.toolbar.exportAllTabs,
        onClick: handleExportAllExcel,
      },
      {
        key: 'json',
        icon: <FileTextOutlined />,
        label: t.toolbar.exportJSON,
        onClick: handleExportJson,
      },
      {
        type: 'divider',
      },
      {
        key: 'template',
        icon: <FileExcelOutlined />,
        label: t.toolbar.downloadTemplate,
        onClick: handleDownloadTemplate,
      },
    ]
  }

  const exportMenuItems = getExportMenuItems()

  const handleImport = () => {
    setImportModalVisible(true)
  }

  const handleCreateTimeline = () => {
    setCreateTimelineModalVisible(true)
  }

  return (
    <div className={styles.container}>
      <Space>
        {!hideTimeCompare && !isManpowerMode && !isProductMatrixMode && (
          <Button icon={<HistoryOutlined />} onClick={handleCreateTimeline}>
            {t.timeline.timeCompare}
          </Button>
        )}
        {!hideExport && (
          <Dropdown menu={{ items: exportMenuItems }}>
            <Button icon={<DownloadOutlined />}>{t.toolbar.export}</Button>
          </Dropdown>
        )}
        {!hideImport && !isProductMatrixMode && (
          <Button icon={<UploadOutlined />} onClick={handleImport}>
            {t.toolbar.import}
          </Button>
        )}
        {!hideImport && isProductMatrixMode && (
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={handleProductMatrixImport}
            disabled={importing}
          >
            <Button icon={<UploadOutlined />} loading={importing}>
              {t.toolbar.import}
            </Button>
          </Upload>
        )}
      </Space>
    </div>
  )
}
