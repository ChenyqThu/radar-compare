import { useState } from 'react'
import { Modal, Upload, Button, Alert, Typography, Table, Tabs, message, Space, Switch } from 'antd'
import { InboxOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import { importFromExcel, importMultipleFromExcel, importFromJson } from '@/services/excel/importer'
import type { MultiSheetImportResult } from '@/services/excel/importer'
import type { ValidationResult } from '@/types'
import styles from './ImportModal.module.css'

const { Dragger } = Upload
const { Text, Title } = Typography

type ImportResult = ValidationResult | MultiSheetImportResult

function isMultiSheetResult(result: ImportResult): result is MultiSheetImportResult {
  return 'radars' in result
}

export function ImportModal() {
  const { importModalVisible, setImportModalVisible } = useUIStore()
  const { importRadarChart, importMultipleRadarCharts } = useRadarStore()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [activeTab, setActiveTab] = useState<'excel' | 'json'>('excel')
  const [importAllSheets, setImportAllSheets] = useState(true)

  const handleClose = () => {
    setImportModalVisible(false)
    setResult(null)
  }

  const handleImport = async (file: File, type: 'excel' | 'json') => {
    setLoading(true)
    try {
      let res: ImportResult
      if (type === 'excel') {
        res = importAllSheets ? await importMultipleFromExcel(file) : await importFromExcel(file)
      } else {
        res = await importFromJson(file)
      }
      setResult(res)
    } catch (error) {
      message.error(t.toolbar.importFailed || '导入失败')
    } finally {
      setLoading(false)
    }
    return false
  }

  const handleConfirm = () => {
    if (!result) return

    if (isMultiSheetResult(result)) {
      if (result.radars.length > 0) {
        importMultipleRadarCharts(result.radars)
        message.success(`${t.toolbar.importSuccess || '导入成功'} (${result.radars.length} ${t.tabs.newTab || 'Tab'})`)
        handleClose()
      }
    } else if (result.preview) {
      importRadarChart(result.preview)
      message.success(t.toolbar.importSuccess || '导入成功')
      handleClose()
    }
  }

  const excelUploadProps: UploadProps = {
    accept: '.xlsx,.xls',
    beforeUpload: (file) => handleImport(file, 'excel'),
    showUploadList: false,
    maxCount: 1,
  }

  const jsonUploadProps: UploadProps = {
    accept: '.json',
    beforeUpload: (file) => handleImport(file, 'json'),
    showUploadList: false,
    maxCount: 1,
  }

  const renderPreview = () => {
    if (!result) return null

    if (isMultiSheetResult(result)) {
      // 多sheet预览
      return (
        <div className={styles.preview}>
          <Title level={5}>{t.toolbar.dataPreview || '数据预览'}</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>{t.toolbar.sheetsFound || '找到'} {result.radars.length} {t.toolbar.sheets || '个工作表'}:</Text>
            {result.radars.map((radar, index) => (
              <div key={radar.id} className={styles.sheetPreview}>
                <Text strong>{index + 1}. {radar.name}</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({radar.dimensions.length} {t.dimension.title || '维度'}, {radar.vendors.length} {t.vendor.title || '对比对象'})
                </Text>
              </div>
            ))}
          </Space>
        </div>
      )
    }

    // 单sheet预览
    if (!result.preview) return null

    const { preview } = result
    const columns = [
      { title: t.dimension.title || '维度', dataIndex: 'name', key: 'name' },
      { title: t.dimension.weight || '权重', dataIndex: 'weight', key: 'weight', render: (v: number) => `${v}%` },
      { title: t.toolbar.subDimensionCount || '子维度数', dataIndex: 'subCount', key: 'subCount' },
    ]

    const dataSource = preview.dimensions.map((d) => ({
      key: d.id,
      name: d.name,
      weight: d.weight,
      subCount: d.subDimensions.length,
    }))

    return (
      <div className={styles.preview}>
        <Title level={5}>{t.toolbar.dataPreview || '数据预览'}</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            {t.vendor.title || '对比对象'}: {preview.vendors.map((v) => v.name).join(', ')}
          </Text>
          <Table
            dataSource={dataSource}
            columns={columns}
            pagination={false}
            size="small"
          />
        </Space>
      </div>
    )
  }

  const isValid = result ? (isMultiSheetResult(result) ? result.isValid : result.isValid) : false
  const errors = result ? (isMultiSheetResult(result) ? result.errors : result.errors) : []
  const warnings = result ? (isMultiSheetResult(result) ? result.warnings : result.warnings) : []

  const tabItems = [
    {
      key: 'excel',
      label: (
        <span>
          <FileExcelOutlined />
          Excel
        </span>
      ),
      children: (
        <>
          <div className={styles.importOption}>
            <Text>{t.toolbar.importAllSheets || '导入所有工作表'}</Text>
            <Switch checked={importAllSheets} onChange={setImportAllSheets} />
          </div>
          <Dragger {...excelUploadProps} className={styles.dragger}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t.toolbar.dragExcel || '点击或拖拽 Excel 文件到此处'}</p>
            <p className="ant-upload-hint">{t.toolbar.excelHint || '支持 .xlsx, .xls 格式'}</p>
          </Dragger>
        </>
      ),
    },
    {
      key: 'json',
      label: (
        <span>
          <FileTextOutlined />
          JSON
        </span>
      ),
      children: (
        <Dragger {...jsonUploadProps} className={styles.dragger}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">{t.toolbar.dragJson || '点击或拖拽 JSON 文件到此处'}</p>
          <p className="ant-upload-hint">{t.toolbar.jsonHint || '支持导出的 JSON 格式'}</p>
        </Dragger>
      ),
    },
  ]

  return (
    <Modal
      title={t.toolbar.import || '导入数据'}
      open={importModalVisible}
      onCancel={handleClose}
      confirmLoading={loading}
      footer={
        isValid
          ? [
              <Button key="cancel" onClick={handleClose}>
                {t.common.cancel || '取消'}
              </Button>,
              <Button key="confirm" type="primary" onClick={handleConfirm}>
                {t.toolbar.confirmImport || '确认导入'}
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                {t.common.cancel || '关闭'}
              </Button>,
            ]
      }
      width={600}
    >
      {!result ? (
        <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as 'excel' | 'json')} items={tabItems} />
      ) : (
        <div className={styles.result}>
          {errors.length > 0 && (
            <Alert
              type="error"
              message={t.toolbar.importFailed || '导入失败'}
              description={
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>
                      {e.row ? `${t.toolbar.row || '第'} ${e.row} ${t.toolbar.rowSuffix || '行'}: ` : ''}
                      {e.message}
                    </li>
                  ))}
                </ul>
              }
              showIcon
            />
          )}
          {warnings.length > 0 && (
            <Alert
              type="warning"
              message={t.toolbar.warning || '警告'}
              description={
                <ul>
                  {warnings.map((w, i) => (
                    <li key={i}>
                      {w.row ? `${t.toolbar.row || '第'} ${w.row} ${t.toolbar.rowSuffix || '行'}: ` : ''}
                      {w.message}
                    </li>
                  ))}
                </ul>
              }
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
          {isValid && (
            <Alert
              type="success"
              message={t.toolbar.parseSuccess || '解析成功'}
              description={t.toolbar.confirmToImport || '数据格式正确，请确认后导入'}
              showIcon
            />
          )}
          {renderPreview()}
          <Button
            type="link"
            onClick={() => setResult(null)}
            style={{ marginTop: 16 }}
          >
            {t.toolbar.reselect || '重新选择文件'}
          </Button>
        </div>
      )}
    </Modal>
  )
}
