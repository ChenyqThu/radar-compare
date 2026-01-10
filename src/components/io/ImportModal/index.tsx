import { useState } from 'react'
import { Modal, Upload, Button, Alert, Typography, Table, Tabs, message, Space } from 'antd'
import { InboxOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useUIStore } from '@/stores/uiStore'
import { useRadarStore } from '@/stores/radarStore'
import { importFromExcel, importFromJson } from '@/services/excel/importer'
import type { ValidationResult, RadarChart } from '@/types'
import styles from './ImportModal.module.css'

const { Dragger } = Upload
const { Text, Title } = Typography

export function ImportModal() {
  const { importModalVisible, setImportModalVisible } = useUIStore()
  const { importRadarChart } = useRadarStore()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [activeTab, setActiveTab] = useState<'excel' | 'json'>('excel')

  const handleClose = () => {
    setImportModalVisible(false)
    setResult(null)
  }

  const handleImport = async (file: File, type: 'excel' | 'json') => {
    setLoading(true)
    try {
      const res = type === 'excel' ? await importFromExcel(file) : await importFromJson(file)
      setResult(res)
    } catch (error) {
      message.error('导入失败')
    } finally {
      setLoading(false)
    }
    return false
  }

  const handleConfirm = () => {
    if (result?.preview) {
      importRadarChart(result.preview)
      message.success('导入成功')
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
    if (!result?.preview) return null

    const { preview } = result
    const columns = [
      { title: '维度', dataIndex: 'name', key: 'name' },
      { title: '权重', dataIndex: 'weight', key: 'weight', render: (v: number) => `${v}%` },
      { title: '子维度数', dataIndex: 'subCount', key: 'subCount' },
    ]

    const dataSource = preview.dimensions.map((d) => ({
      key: d.id,
      name: d.name,
      weight: d.weight,
      subCount: d.subDimensions.length,
    }))

    return (
      <div className={styles.preview}>
        <Title level={5}>数据预览</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            对比对象: {preview.vendors.map((v) => v.name).join(', ')}
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
        <Dragger {...excelUploadProps} className={styles.dragger}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽 Excel 文件到此处</p>
          <p className="ant-upload-hint">支持 .xlsx, .xls 格式</p>
        </Dragger>
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
          <p className="ant-upload-text">点击或拖拽 JSON 文件到此处</p>
          <p className="ant-upload-hint">支持导出的 JSON 格式</p>
        </Dragger>
      ),
    },
  ]

  return (
    <Modal
      title="导入数据"
      open={importModalVisible}
      onCancel={handleClose}
      footer={
        result?.isValid
          ? [
              <Button key="cancel" onClick={handleClose}>
                取消
              </Button>,
              <Button key="confirm" type="primary" onClick={handleConfirm}>
                确认导入
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                关闭
              </Button>,
            ]
      }
      width={600}
    >
      {!result ? (
        <Tabs activeKey={activeTab} onChange={(k) => setActiveTab(k as 'excel' | 'json')} items={tabItems} />
      ) : (
        <div className={styles.result}>
          {result.errors.length > 0 && (
            <Alert
              type="error"
              message="导入失败"
              description={
                <ul>
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      {e.row ? `第 ${e.row} 行: ` : ''}
                      {e.message}
                    </li>
                  ))}
                </ul>
              }
              showIcon
            />
          )}
          {result.warnings.length > 0 && (
            <Alert
              type="warning"
              message="警告"
              description={
                <ul>
                  {result.warnings.map((w, i) => (
                    <li key={i}>
                      {w.row ? `第 ${w.row} 行: ` : ''}
                      {w.message}
                    </li>
                  ))}
                </ul>
              }
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
          {result.isValid && (
            <Alert
              type="success"
              message="解析成功"
              description="数据格式正确，请确认后导入"
              showIcon
            />
          )}
          {renderPreview()}
          <Button
            type="link"
            onClick={() => setResult(null)}
            style={{ marginTop: 16 }}
          >
            重新选择文件
          </Button>
        </div>
      )}
    </Modal>
  )
}
