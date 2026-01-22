/**
 * ProductMatrixView - Main entry component for product matrix module
 *
 * Provides tab-based layout for matrix visualization, product list, and analysis.
 */

import React, { useCallback, useMemo, useState } from 'react'
import { Tabs, Empty, Button } from 'antd'
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useConfigStore, useDataStore } from './stores'
import { useI18n } from '@/locales'
import { useUIStore } from '@/stores/uiStore'
import { ProductList } from './modules/product/ProductList'
import { ProductForm } from './modules/product/ProductForm'
import { MatrixChart } from './modules/visualization/MatrixChart'
import { CompetitorAnalysis } from './modules/analysis/CompetitorAnalysis'
import { GapAnalysis } from './modules/analysis/GapAnalysis'
import type { Product } from '@/types/productMatrix'
import styles from './styles.module.css'

type TabType = 'matrix' | 'products' | 'analysis'
type AnalysisSubTab = 'competitor' | 'gap'

interface ProductMatrixViewProps {
  readonly?: boolean
}

export const ProductMatrixView: React.FC<ProductMatrixViewProps> = ({ readonly = false }) => {
  const { vendors, dimensions, matrixConfig } = useConfigStore()
  const { products } = useDataStore()
  const { t } = useI18n()
  const m = t.productMatrix
  const { openSettingsDrawer } = useUIStore()

  // Product form state
  const [productFormOpen, setProductFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Check if there's enough data to show visualizations
  const hasVendors = vendors.length > 0
  const hasDimensions = dimensions.length > 0
  const hasProducts = products.length > 0
  const hasAxes = matrixConfig?.xAxisDimensionId && matrixConfig?.yAxisDimensionId

  // Handle add product
  const handleAddProduct = useCallback(() => {
    setEditingProduct(null)
    setProductFormOpen(true)
  }, [])

  // Handle edit product
  const handleEditProduct = useCallback((product: Product) => {
    setEditingProduct(product)
    setProductFormOpen(true)
  }, [])

  // Handle close product form
  const handleCloseProductForm = useCallback(() => {
    setProductFormOpen(false)
    setEditingProduct(null)
  }, [])

  // Analysis sub-tabs
  const analysisItems = useMemo(() => [
    {
      key: 'competitor' as AnalysisSubTab,
      label: m.competitorCompare,
      children: <CompetitorAnalysis readonly={readonly} />,
    },
    {
      key: 'gap' as AnalysisSubTab,
      label: m.gapAnalysis,
      children: <GapAnalysis readonly={readonly} />,
    },
  ], [readonly, m])

  // Tab items with i18n
  const tabItems = useMemo(() => [
    {
      key: 'matrix' as TabType,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreOutlined />
          {m.matrixView}
        </span>
      ),
      children: hasAxes && hasProducts ? (
        <div className={styles.chartContainer}>
          <MatrixChart readonly={readonly} />
        </div>
      ) : (
        <Empty
          description={
            <div>
              <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>
                {!hasVendors ? m.noVendors : !hasDimensions ? m.noDimensions : !hasAxes ? m.noAxes : m.noProducts}
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                {!hasVendors || !hasDimensions ? m.configHint : !hasAxes ? m.selectAxesHint : m.addProductHint}
              </div>
            </div>
          }
        >
          {!readonly && (
            <Button type="primary" onClick={() => openSettingsDrawer()}>
              {m.config}
            </Button>
          )}
        </Empty>
      ),
    },
    {
      key: 'products' as TabType,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UnorderedListOutlined />
          {m.productList} ({products.length})
        </span>
      ),
      children: hasVendors ? (
        <div className={styles.productListContainer}>
          <ProductList
            readonly={readonly}
            onAddProduct={handleAddProduct}
            onEditProduct={handleEditProduct}
          />
        </div>
      ) : (
        <Empty
          description={
            <div>
              <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>{m.noVendors}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{m.configHint}</div>
            </div>
          }
        >
          {!readonly && (
            <Button type="primary" onClick={() => openSettingsDrawer()}>
              {m.config}
            </Button>
          )}
        </Empty>
      ),
    },
    {
      key: 'analysis' as TabType,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChartOutlined />
          {m.analysis}
        </span>
      ),
      children: hasProducts && products.length >= 2 ? (
        <div className={styles.analysisContainer}>
          <Tabs
            defaultActiveKey="competitor"
            items={analysisItems}
            size="small"
            className={styles.analysisTabs}
          />
        </div>
      ) : (
        <Empty
          description={
            <div>
              <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>
                {!hasProducts ? m.noProducts : m.minTwoProducts}
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                {m.addProductHint}
              </div>
            </div>
          }
        >
          {!readonly && (
            <Button type="primary" onClick={() => openSettingsDrawer()}>
              {m.addProduct}
            </Button>
          )}
        </Empty>
      ),
    },
  ], [m, hasVendors, hasDimensions, hasProducts, hasAxes, readonly, openSettingsDrawer, products.length, analysisItems, handleAddProduct, handleEditProduct])

  return (
    <div className={styles.container}>
      {/* Main Tabs */}
      <Tabs
        defaultActiveKey="matrix"
        items={tabItems}
        size="large"
        className={styles.tabs}
      />

      {/* Product Form Modal */}
      {!readonly && (
        <ProductForm
          open={productFormOpen}
          onClose={handleCloseProductForm}
          product={editingProduct}
        />
      )}
    </div>
  )
}

export default ProductMatrixView
