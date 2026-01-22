/**
 * ProductList component for Product Matrix module
 *
 * Displays and manages products with:
 * - Search and filter
 * - Vendor and status filtering
 * - Add/Edit/Delete operations
 * - Dynamic columns based on dimensions
 */

import { useState, useMemo } from 'react'
import { Table, Input, Button, Space, Tag, Popconfirm, Empty, Select } from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  BarcodeOutlined,
  ShopOutlined,
  InfoCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useConfigStore } from '../../stores/configStore'
import { useDataStore } from '../../stores/dataStore'
import { useI18n } from '@/locales'
import type { Product, ProductStatus } from '@/types/productMatrix'
import { PRODUCT_STATUS_CONFIG } from '@/types/productMatrix'
import { NotionIcon } from '../../common/NotionIcon'
import styles from './ProductList.module.css'

interface ProductListProps {
  readonly?: boolean
  onAddProduct?: () => void
  onEditProduct?: (product: Product) => void
}

export function ProductList({ readonly = false, onAddProduct, onEditProduct }: ProductListProps) {
  const { t } = useI18n()
  const m = t.productMatrix
  const { vendors, dimensions } = useConfigStore()
  const {
    filteredProducts,
    filters,
    setFilters,
    removeProduct,
    removeProducts,
  } = useDataStore()

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Get vendor name by ID
  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId)
    return vendor?.name || vendorId
  }

  // Get vendor color by ID
  const getVendorColor = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId)
    return vendor?.color || '#999'
  }

  // Status options for filter
  const statusOptions = useMemo(() => {
    return Object.entries(PRODUCT_STATUS_CONFIG).map(([value, config]) => ({
      value,
      label: m[config.labelKey as keyof typeof m],
      color: config.color,
    }))
  }, [m])

  // Vendor options for filter
  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({
      value: v.id,
      label: v.name,
      color: v.color,
    }))
  }, [vendors])

  // Build dynamic columns
  const columns: ColumnsType<Product> = useMemo(() => {
    const baseColumns: ColumnsType<Product> = [
      {
        title: <span><BarcodeOutlined /> {m.productModel || m.productName}</span>,
        dataIndex: 'name',
        key: 'name',
        width: 180,
        fixed: 'left',
        ellipsis: true,
        render: (name: string) => (
          <div className={styles.productName}>
            <span>{name}</span>
          </div>
        ),
      },
      {
        title: <span><ShopOutlined /> {m.brand || m.vendor}</span>,
        dataIndex: 'vendorId',
        key: 'vendorId',
        width: 120,
        render: (vendorId: string) => (
          <Tag color={getVendorColor(vendorId)} className={styles.vendorTag}>
            {getVendorName(vendorId)}
          </Tag>
        ),
      },
      {
        title: <span><InfoCircleOutlined /> {m.status}</span>,
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: (status: ProductStatus) => {
          const config = PRODUCT_STATUS_CONFIG[status]
          return (
            <Tag color={config?.color || 'default'}>
              {m[config?.labelKey as keyof typeof m]}
            </Tag>
          )
        },
      },
      {
        title: <span><DollarOutlined /> {m.price}</span>,
        dataIndex: 'price',
        key: 'price',
        width: 120,
        render: (price: number | undefined, record: Product) => {
          if (price === undefined || price === null) return '-'
          return `${record.priceUnit || '¥'}${price.toLocaleString()}`
        },
      },
    ]

    // Add dimension columns (first 3 dimensions only to avoid too wide table)
    const dimensionColumns: ColumnsType<Product> = dimensions.slice(0, 3).map(dim => ({
      title: <span style={{ display: 'flex', alignItems: 'center' }}><NotionIcon icon={dim.icon} variant="text" size={16} iconSize={14} style={{ marginRight: 4 }} /> {dim.name}</span>,
      key: `dim_${dim.id}`,
      width: 120,
      ellipsis: true,
      render: (_: unknown, record: Product) => {
        const value = record.dimensionValues?.[dim.id]
        if (value === undefined || value === null) return '-'

        if (dim.type === 'discrete' && dim.options) {
          const option = dim.options.find(o => o.value === value)
          return option?.label || String(value)
        }

        return `${value}${dim.unit || ''}`
      },
    }))

    // Action column (only show if not readonly)
    const actionColumn: ColumnsType<Product> = readonly ? [] : [
      {
        title: t.common.action,
        key: 'action',
        width: 100,
        fixed: 'right',
        render: (_: unknown, record: Product) => (
          <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEditProduct?.(record)}
            />
            <Popconfirm
              title={m.confirmDeleteProduct}
              onConfirm={() => removeProduct(record.id)}
              okText={t.common.confirm}
              cancelText={t.common.cancel}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        ),
      },
    ]

    return [...baseColumns, ...dimensionColumns, ...actionColumn]
  }, [m, t.common, dimensions, vendors, onEditProduct, removeProduct, readonly])

  // Handle batch delete
  const handleBatchDelete = () => {
    removeProducts(selectedRowKeys as string[])
    setSelectedRowKeys([])
  }

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Input
            placeholder={m.searchProduct}
            prefix={<SearchOutlined />}
            value={filters.searchText}
            onChange={e => setFilters({ searchText: e.target.value })}
            className={styles.searchInput}
            allowClear
          />
          <Select
            mode="multiple"
            placeholder={m.filterByVendor}
            value={filters.vendorIds}
            onChange={vendorIds => setFilters({ vendorIds })}
            options={vendorOptions}
            className={styles.filterSelect}
            allowClear
            maxTagCount={2}
          />
          <Select
            mode="multiple"
            placeholder={m.filterByStatus}
            value={filters.statuses}
            onChange={statuses => setFilters({ statuses })}
            options={statusOptions}
            className={styles.filterSelect}
            allowClear
            maxTagCount={2}
          />
        </div>
        {!readonly && (
          <div className={styles.actions}>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={m.confirmDeleteProducts?.replace('{count}', String(selectedRowKeys.length))}
                onConfirm={handleBatchDelete}
                okText={t.common.confirm}
                cancelText={t.common.cancel}
              >
                <Button danger icon={<DeleteOutlined />}>
                  {m.batchDelete} ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAddProduct}
            >
              {m.addProduct}
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {vendors.length === 0 ? (
        <Empty
          description={m.noVendors}
          className={styles.empty}
        />
      ) : filteredProducts.length === 0 ? (
        <Empty
          description={filters.searchText || filters.vendorIds.length > 0 || filters.statuses.length > 0
            ? m.noMatchingProducts
            : m.noProducts
          }
          className={styles.empty}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddProduct}>
            {m.addProduct}
          </Button>
        </Empty>
      ) : (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredProducts}
          rowSelection={rowSelection}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${m.total} ${total} ${m.items}`,
          }}
          scroll={{ x: 'max-content' }}
          className={styles.table}
          size="middle"
        />
      )}
    </div>
  )
}
