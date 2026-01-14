import { useState } from 'react'
import { Modal, Upload, Button, Alert, Typography, Table, Tabs, message, Space, Switch } from 'antd'
import { InboxOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import { importFromExcel, importMultipleFromExcel, importFromJson } from '@/services/excel/importer'
import { importManpowerFromExcel, importManpowerFromJson } from '@/services/excel/manpowerImporter'
import { createDefaultManpowerChart } from '@/types/manpower'
import type { MultiSheetImportResult } from '@/services/excel/importer'
import type { ValidationResult } from '@/types'
import styles from './ImportModal.module.css'

const { Dragger } = Upload
const { Text, Title } = Typography

type ImportResult = ValidationResult | MultiSheetImportResult | ManpowerImportResult

interface ManpowerImportResult extends ValidationResult {
  data?: {
    teams: any[]
    projects: any[]
    timePoints: any[]
    allocations: any
  }
  configOnly?: boolean
}

function isMultiSheetResult(result: ImportResult): result is MultiSheetImportResult {
  return 'radars' in result
}

function isManpowerResult(result: ImportResult): result is ManpowerImportResult {
  return 'data' in result && result.data !== undefined && 'teams' in result.data
}

export function ImportModal() {
  const { importModalVisible, setImportModalVisible, appMode } = useUIStore()
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

      // In manpower mode, always use manpower importers
      if (appMode === 'manpower') {
        if (type === 'excel') {
          res = await importManpowerFromExcel(file, t)
        } else {
          res = await importManpowerFromJson(file, t)
        }
      } else {
        // In radar mode, try radar import first
        if (type === 'excel') {
          res = importAllSheets ? await importMultipleFromExcel(file) : await importFromExcel(file)
        } else {
          res = await importFromJson(file)
        }
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

    if (isManpowerResult(result)) {
      // Handle manpower data import
      if (result.data) {
        const { teams, projects, timePoints, allocations } = result.data

        // Create a new Manpower chart
        const newChart = createDefaultManpowerChart({
          name: `人力排布 (导入)`,
          teams,
          projects,
          timePoints,
          allocations,
        })

        // Import as a new chart
        importRadarChart(newChart)

        const messages = []
        if (teams.length > 0) messages.push(`${teams.length} ${t.manpower?.teamConfig || '团队'}`)
        if (projects.length > 0) messages.push(`${projects.length} ${t.manpower?.projectConfig || '项目'}`)
        if (timePoints.length > 0) messages.push(`${timePoints.length} ${t.manpower?.timePointConfig || '时间点'}`)

        message.success(`${t.toolbar.importSuccess || '导入成功'}: ${messages.join(', ')}`)
        handleClose()
      }
    } else if (isMultiSheetResult(result)) {
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

    if (isManpowerResult(result)) {
      // Manpower data preview
      if (!result.data) return null

      const { teams, projects, timePoints, allocations } = result.data
      const allocationCount = Object.keys(allocations).reduce((sum, timeId) => {
        return (
          sum +
          Object.keys(allocations[timeId]).reduce((projectSum, projectId) => {
            return projectSum + Object.keys(allocations[timeId][projectId]).length
          }, 0)
        )
      }, 0)

      return (
        <div className={styles.preview}>
          <Title level={5}>{t.toolbar.dataPreview || '数据预览'}</Title>
          <Space direction="vertical" style={{ width: '100%', gap: 16 }}>
            {teams.length > 0 && (
              <div>
                <Text strong>{t.manpower?.teamConfig || '团队配置'}: </Text>
                <Text type="secondary">{teams.length} {t.manpower?.teamConfig || '个团队'}</Text>
                <div style={{ marginTop: 8 }}>
                  {teams.slice(0, 3).map((team) => (
                    <div key={team.id} style={{ marginLeft: 16 }}>
                      <Text>• {team.name} ({team.capacity} {t.manpower?.columnCapacity || '人'})</Text>
                    </div>
                  ))}
                  {teams.length > 3 && <Text type="secondary" style={{ marginLeft: 16 }}>...</Text>}
                </div>
              </div>
            )}
            {projects.length > 0 && (
              <div>
                <Text strong>{t.manpower?.projectConfig || '项目配置'}: </Text>
                <Text type="secondary">{projects.length} {t.manpower?.projectConfig || '个项目'}</Text>
                <div style={{ marginTop: 8 }}>
                  {projects.slice(0, 3).map((project) => (
                    <div key={project.id} style={{ marginLeft: 16 }}>
                      <Text>• {project.name} ({project.status})</Text>
                    </div>
                  ))}
                  {projects.length > 3 && <Text type="secondary" style={{ marginLeft: 16 }}>...</Text>}
                </div>
              </div>
            )}
            {timePoints.length > 0 && (
              <div>
                <Text strong>{t.manpower?.timePointConfig || '时间点配置'}: </Text>
                <Text type="secondary">{timePoints.length} {t.manpower?.timePointConfig || '个时间点'}</Text>
                <div style={{ marginTop: 8 }}>
                  {timePoints.slice(0, 3).map((tp) => (
                    <div key={tp.id} style={{ marginLeft: 16 }}>
                      <Text>• {tp.name} ({tp.date})</Text>
                    </div>
                  ))}
                  {timePoints.length > 3 && <Text type="secondary" style={{ marginLeft: 16 }}>...</Text>}
                </div>
              </div>
            )}
            {allocationCount > 0 && (
              <div>
                <Text strong>{t.manpower?.allocationGrid || '人力分配'}: </Text>
                <Text type="secondary">{allocationCount} {t.manpower?.records || '条记录'}</Text>
              </div>
            )}
          </Space>
        </div>
      )
    }

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
          {appMode !== 'manpower' && (
            <div className={styles.importOption}>
              <Text>{t.toolbar.importAllSheets || '导入所有工作表'}</Text>
              <Switch checked={importAllSheets} onChange={setImportAllSheets} />
            </div>
          )}
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
