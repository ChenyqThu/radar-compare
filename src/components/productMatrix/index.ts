/**
 * Product Matrix module exports
 */

export { ProductMatrixView } from './ProductMatrixView'
export { ProductMatrixSettingsDrawer } from './ProductMatrixSettingsDrawer'
export { ProductMatrixToolbar } from './ProductMatrixToolbar'
export { useConfigStore, useDataStore } from './stores'

// Visualization components
export { MatrixChart } from './modules/visualization/MatrixChart'
export { PetalChart } from './modules/visualization/PetalChart'

// Product components
export { ProductList } from './modules/product/ProductList'
export { ProductForm } from './modules/product/ProductForm'

// Analysis components
export { CompetitorAnalysis } from './modules/analysis/CompetitorAnalysis'
export { GapAnalysis } from './modules/analysis/GapAnalysis'

// Config components
export { VendorConfig } from './modules/config/VendorConfig'
export { DimensionConfig } from './modules/config/DimensionConfig'
