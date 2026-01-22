/**
 * ProductForm component for Product Matrix module
 *
 * Modal form for adding or editing a product with:
 * - Basic info (name, vendor, model, price, status)
 * - Dynamic dimension value inputs
 * - Validation
 */

import { useEffect, useMemo } from 'react'
import { Modal, Form, Input, Select, InputNumber, DatePicker } from 'antd'
import dayjs from 'dayjs'
import {
  TagOutlined,
  ShopOutlined,
  BarcodeOutlined,
  DollarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  LinkOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useConfigStore } from '../../stores/configStore'
import { useDataStore } from '../../stores/dataStore'
import { useI18n } from '@/locales'
import type { Product, ProductStatus, DimensionValue } from '@/types/productMatrix'
import { PRODUCT_STATUS_CONFIG } from '@/types/productMatrix'
import { NotionIcon } from '../../common/NotionIcon'
import styles from './ProductForm.module.css'

interface ProductFormProps {
  open: boolean
  onClose: () => void
  product?: Product | null  // null = add new, Product = edit
}

interface FormValues {
  name: string
  vendorId: string
  // model removed
  brand?: string
  status: ProductStatus
  price?: number
  priceUnit?: string
  description?: string
  url?: string
  releaseDate?: dayjs.Dayjs
  dimensionValues: Record<string, DimensionValue>
}

export function ProductForm({ open, onClose, product }: ProductFormProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { vendors, dimensions } = useConfigStore()
  const { addProduct, updateProduct } = useDataStore()
  const [form] = Form.useForm<FormValues>()

  const isEditing = !!product

  // Status options
  const statusOptions = useMemo(() => {
    return Object.entries(PRODUCT_STATUS_CONFIG).map(([value, config]) => ({
      value,
      label: m[config.labelKey as keyof typeof m] || config.labelKey,
    }))
  }, [m])

  // Vendor options
  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({
      value: v.id,
      label: v.name,
    }))
  }, [vendors])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (product) {
        // Edit mode: populate form with product data
        form.setFieldsValue({
          name: product.name,
          vendorId: product.vendorId,
          // brand removed
          status: product.status,
          price: product.price,
          priceUnit: product.priceUnit || '¥',
          description: product.description,
          url: product.url,
          releaseDate: product.releaseDate ? dayjs(product.releaseDate) : undefined,
          dimensionValues: product.dimensionValues || {},
        })
      } else {
        // Add mode: reset to defaults
        form.resetFields()
        form.setFieldsValue({
          status: 'active',
          priceUnit: '¥',
          dimensionValues: {},
        })
      }
    }
  }, [open, product, form])

  // Handle form submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const productData: Partial<Product> = {
        name: values.name,
        // brand removed
        status: values.status,
        price: values.price,
        priceUnit: values.priceUnit,
        description: values.description,
        url: values.url,
        releaseDate: values.releaseDate?.format('YYYY-MM-DD'),
        dimensionValues: values.dimensionValues || {},
      }

      if (isEditing && product) {
        updateProduct(product.id, productData)
      } else {
        addProduct(values.vendorId, productData)
      }

      onClose()
    } catch (error) {
      // Form validation failed
      console.error('Form validation failed:', error)
    }
  }

  // Render dimension input based on type
  const renderDimensionInput = (dimension: typeof dimensions[0]) => {
    if (dimension.type === 'discrete' && dimension.options) {
      return (
        <Select
          placeholder={m.selectOption}
          showSearch
          optionFilterProp="label"
          options={dimension.options.map(opt => ({
            value: opt.value,
            label: opt.label,
          }))}
          allowClear
        />
      )
    }

    // Continuous dimension
    return (
      <InputNumber
        placeholder={`${dimension.min ?? ''} - ${dimension.max ?? ''}`}
        min={dimension.min}
        max={dimension.max}
        addonAfter={dimension.unit}
        style={{ width: '100%' }}
      />
    )
  }

  return (
    <Modal
      title={isEditing ? m.editProduct : m.addProduct}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={t.common.confirm}
      cancelText={t.common.cancel}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className={styles.form}
      >
        {/* Basic Info Section */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{m.basicInfo}</div>
          <div className={styles.row}>
            <Form.Item
              name="name"
              label={<span><BarcodeOutlined /> {m.productModel || m.productName}</span>}
              rules={[{ required: true, message: m.productNameRequired }]}
              className={styles.halfItem}
            >
              <Input placeholder={m.productModel || m.productName} />
            </Form.Item>
            <Form.Item
              name="vendorId"
              label={<span><ShopOutlined /> {m.brand || m.vendor}</span>}
              rules={[{ required: true, message: m.vendorRequired }]}
              className={styles.halfItem}
            >
              <Select
                placeholder={m.selectVendor}
                options={vendorOptions}
                disabled={isEditing}
              />
            </Form.Item>
          </div>

          <div className={styles.row}>
            {/* model and brand fields removed */}
            <Form.Item
              name="status"
              label={<span><InfoCircleOutlined /> {m.status}</span>}
              rules={[{ required: true }]}
              className={styles.halfItem}
            >
              <Select options={statusOptions} />
            </Form.Item>
            <Form.Item
              label={<span><DollarOutlined /> {m.price}</span>}
              className={styles.halfItem}
            >
              <Input.Group compact>
                <Form.Item name="priceUnit" noStyle>
                  <Select style={{ width: 60 }}>
                    <Select.Option value="¥">¥</Select.Option>
                    <Select.Option value="$">$</Select.Option>
                    <Select.Option value="€">€</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item name="price" noStyle>
                  <InputNumber
                    placeholder={m.price}
                    min={0}
                    style={{ width: 'calc(100% - 60px)' }}
                  />
                </Form.Item>
              </Input.Group>
            </Form.Item>
          </div>

          <Form.Item
            name="releaseDate"
            label={<span><CalendarOutlined /> {m.releaseDate}</span>}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span><FileTextOutlined /> {m.description}</span>}
          >
            <Input.TextArea rows={2} placeholder={m.description} />
          </Form.Item>

          <Form.Item
            name="url"
            label={<span><LinkOutlined /> {m.productUrl}</span>}
          >
            <Input placeholder="https://..." />
          </Form.Item>
        </div>

        {/* Dimension Values Section */}
        {dimensions.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}><TagOutlined /> {m.dimensionValues}</div>
            <div className={styles.dimensionGrid}>
              {dimensions.map(dim => (
                <Form.Item
                  key={dim.id}
                  name={['dimensionValues', dim.id]}
                  label={<span style={{ display: 'flex', alignItems: 'center' }}><NotionIcon icon={dim.icon} variant="text" size={16} iconSize={14} style={{ marginRight: 4 }} /> {dim.name}</span>}
                  className={styles.dimensionItem}
                >
                  {renderDimensionInput(dim)}
                </Form.Item>
              ))}
            </div>
          </div>
        )}
      </Form>
    </Modal>
  )
}
