export const zhCN = {
  // Common
  common: {
    confirm: '确定',
    cancel: '取消',
    add: '添加',
    delete: '删除',
    edit: '编辑',
    save: '保存',
    loading: '加载中...',
    noData: '暂无数据',
    action: '操作',
  },

  // App
  app: {
    title: '竞品对比',
    overview: '总览',
  },

  // Tabs
  tabs: {
    newTab: '新建',
    rename: '重命名',
    duplicate: '复制',
    delete: '删除',
    confirmDelete: '确定删除该对比图吗？',
  },

  // Toolbar
  toolbar: {
    import: '导入',
    export: '导出',
    exportImage: '导出图片',
    exportExcel: '导出 Excel',
    exportJSON: '导出 JSON',
    downloadTemplate: '下载模板',
    exportSuccess: '导出成功',
    templateDownloadSuccess: '模板下载成功',
    pleaseSelectRadar: '请先选择一个雷达图',
  },

  // Settings
  settings: {
    title: '设置',
    openSettings: '打开设置',
    dimensionTab: '维度管理',
    vendorTab: '系列管理',
    shortcutHint: '快捷键 S 打开/关闭',
  },

  // Dimension
  dimension: {
    title: '维度',
    addDimension: '添加维度',
    addSubDimension: '添加子维度',
    weight: '权重',
    score: '分数',
    name: '名称',
    unnamed: '未命名',
    confirmDelete: '确定删除维度吗？',
    confirmDeleteSub: '确定删除子维度吗？',
    viewSubRadar: '查看子维度雷达图',
    editName: '编辑名称',
    dragHint: '拖拽提示：拖到主维度可提升/重排序，拖到子维度可移动/降级',
    pleaseAddVendor: '请先在"系列管理"中添加对比对象',
    pleaseAddDimension: '请先添加评估维度',
  },

  // Vendor
  vendor: {
    title: '对比对象',
    addVendor: '添加系列',
    name: '名称',
    color: '颜色',
    marker: '标记',
    visible: '显示',
    confirmDelete: '确定删除该对比对象吗？',
    noVendor: '暂无对比对象，请点击上方按钮添加',
    pleaseAddVendor: '请先添加对比对象',
  },

  // Chart
  chart: {
    noData: '暂无数据',
    pleaseAddDimension: '请先添加评估维度',
    pleaseAddVendor: '请先添加对比对象',
  },

  // Theme
  theme: {
    light: '浅色',
    dark: '深色',
    system: '跟随系统',
  },

  // Language
  language: {
    zh: '中文',
    en: 'English',
  },
}

export type Locale = typeof zhCN
