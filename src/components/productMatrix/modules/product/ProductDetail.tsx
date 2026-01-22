/**
 * ProductDetail component for Product Matrix module
 *
 * Drawer component for viewing product details with:
 * - Basic info display (name, vendor, status, price)
 * - Dimension values table
 * - Edit action (when not readonly)
 */

import { useMemo } from 'react'
import { Drawer, Descriptions, Tag, Button, Space, Table, Empty } from 'antd'
import {
  EditOutlined,
  LinkOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { useConfigStore } from '../../stores/configStore'
import { useI18n } from '@/locales'
import type { Product } from '@/types/productMatrix'
import { PRODUCT_STATUS_CONFIG } from '@/types/productMatrix'
import { VendorLogo } from '../../common/VendorLogo'
import { NotionIcon } from '../../common/NotionIcon'
import styles from './ProductDetail.module.css'

interface ProductDetailProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onEdit?: (product: Product) => void
  readonly?: boolean
}

export function ProductDetail({
  product,
  open,
  onClose,
  onEdit,
  readonly = false,
}: ProductDetailProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { vendors, dimensions } = useConfigStore()

  // Get vendor info
  const vendor = useMemo(() => {
    if (!product) return null
    return vendors.find(v => v.id === product.vendorId)
  }, [product, vendors])

  // Get status config
  const statusConfig = useMemo(() => {
    if (!product) return null
    return PRODUCT_STATUS_CONFIG[product.status]
  }, [product])

  // Build dimension values data for table
  const dimensionData = useMemo(() => {
    if (!product) return []
    return dimensions.map(dim => {
      const value = product.dimensionValues?.[dim.id]
      let displayValue: string = '-'

      if (value !== undefined && value !== null) {
        if (dim.type === 'discrete' && dim.options) {
          const option = dim.options.find(o => o.value === value)
          displayValue = option?.label || String(value)
        } else {
          displayValue = `${value}${dim.unit || ''}`
        }
      }

      return {
        key: dim.id,
        name: dim.name,
        icon: dim.icon,
        value: displayValue,
      }
    })
  }, [product, dimensions])

  // Format price display
  const priceDisplay = useMemo(() => {
    if (!product?.price) return '-'
    return `${product.priceUnit || '¥'}${product.price.toLocaleString()}`
  }, [product])

  // Handle edit click
  const handleEdit = () => {
    if (product && onEdit) {
      onEdit(product)
      onClose()
    }
  }

  if (!product) return null

  return (
    <Drawer
      title={product.name}
      open={open}
      onClose={onClose}
      width={480}
      extra={
        !readonly && onEdit && (
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            {t.common.edit}
          </Button>
        )
      }
    >
      <div className={styles.content}>
        {/* Basic Info */}
        <Descriptions
          column={2}
          size="small"
          className={styles.descriptions}
          labelStyle={{ color: 'var(--color-text-secondary)' }}
        >
          <Descriptions.Item label={m.brand || m.vendor} span={2}>
            {vendor ? (
              <VendorLogo vendor={vendor} size={20} showName />
            ) : (
              <span>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label={m.status}>
            {statusConfig ? (
              <Tag color={statusConfig.color}>
                {m[statusConfig.labelKey as keyof typeof m] || statusConfig.label}
              </Tag>
            ) : (
              '-'
            )}
          </Descriptions.Item>

          <Descriptions.Item label={m.price}>
            <span className={styles.price}>{priceDisplay}</span>
          </Descriptions.Item>

          {product.releaseDate && (
            <Descriptions.Item label={m.releaseDate} span={2}>
              <Space size={4}>
                <CalendarOutlined />
                {product.releaseDate}
              </Space>
            </Descriptions.Item>
          )}

          {product.description && (
            <Descriptions.Item label={m.description} span={2}>
              {product.description}
            </Descriptions.Item>
          )}

          {product.url && (
            <Descriptions.Item label={m.url} span={2}>
              <a href={product.url} target="_blank" rel="noopener noreferrer">
                <Space size={4}>
                  <LinkOutlined />
                  {m.url}
                </Space>
              </a>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Dimension Values */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{m.dimensionValues}</div>
          {dimensionData.length > 0 ? (
            <Table
              dataSource={dimensionData}
              pagination={false}
              size="small"
              className={styles.table}
              columns={[
                {
                  title: m.dimension,
                  dataIndex: 'name',
                  key: 'name',
                  render: (name: string, record) => (
                    <Space size={4}>
                      <NotionIcon icon={record.icon} variant="text" size={16} iconSize={14} />
                      {name}
                    </Space>
                  ),
                },
                {
                  title: t.dimension?.score || 'Value',
                  dataIndex: 'value',
                  key: 'value',
                  align: 'right',
                },
              ]}
            />
          ) : (
            <Empty description={m.noDimensions} image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      </div>
    </Drawer>
  )
}
