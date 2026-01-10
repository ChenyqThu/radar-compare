import type { Locale } from './zh-CN'

export const enUS: Locale = {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    add: 'Add',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    loading: 'Loading...',
    noData: 'No data',
    action: 'Action',
  },

  // App
  app: {
    title: 'Compare',
    overview: 'Overview',
  },

  // Tabs
  tabs: {
    newTab: 'New',
    rename: 'Rename',
    duplicate: 'Duplicate',
    delete: 'Delete',
    confirmDelete: 'Are you sure to delete this chart?',
  },

  // Toolbar
  toolbar: {
    import: 'Import',
    export: 'Export',
    exportImage: 'Export Image',
    exportExcel: 'Export Excel',
    exportJSON: 'Export JSON',
    downloadTemplate: 'Download Template',
    exportSuccess: 'Export success',
    templateDownloadSuccess: 'Template downloaded',
    pleaseSelectRadar: 'Please select a radar chart first',
  },

  // Settings
  settings: {
    title: 'Settings',
    openSettings: 'Open Settings',
    dimensionTab: 'Dimensions',
    vendorTab: 'Series',
    shortcutHint: 'Shortcut: S',
  },

  // Dimension
  dimension: {
    title: 'Dimension',
    addDimension: 'Add Dimension',
    addSubDimension: 'Add Sub-dimension',
    weight: 'Weight',
    score: 'Score',
    name: 'Name',
    unnamed: 'Unnamed',
    confirmDelete: 'Delete this dimension?',
    confirmDeleteSub: 'Delete this sub-dimension?',
    viewSubRadar: 'View sub-dimension radar',
    editName: 'Edit name',
    dragHint: 'Drag hint: Drag to main dimension to promote/reorder, drag to sub-dimension to move/demote',
    pleaseAddVendor: 'Please add comparison objects in "Series" first',
    pleaseAddDimension: 'Please add dimensions first',
  },

  // Vendor
  vendor: {
    title: 'Series',
    addVendor: 'Add Series',
    name: 'Name',
    color: 'Color',
    marker: 'Marker',
    visible: 'Visible',
    confirmDelete: 'Delete this series?',
    noVendor: 'No series yet. Click button above to add.',
    pleaseAddVendor: 'Please add comparison objects first',
  },

  // Chart
  chart: {
    noData: 'No data',
    pleaseAddDimension: 'Please add dimensions first',
    pleaseAddVendor: 'Please add comparison objects first',
  },

  // Theme
  theme: {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },

  // Language
  language: {
    zh: '中文',
    en: 'English',
  },
}
