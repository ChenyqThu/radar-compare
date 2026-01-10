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
    expand: '放大',
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
    exportExcel: '导出当前 Tab',
    exportAllTabs: '导出所有 Tab',
    exportJSON: '导出 JSON',
    downloadTemplate: '下载模板',
    exportSuccess: '导出成功',
    templateDownloadSuccess: '模板下载成功',
    pleaseSelectRadar: '请先选择一个雷达图',
    importFailed: '导入失败',
    importSuccess: '导入成功',
    dataPreview: '数据预览',
    sheetsFound: '找到',
    sheets: '个工作表',
    subDimensionCount: '子维度数',
    importAllSheets: '导入所有工作表',
    dragExcel: '点击或拖拽 Excel 文件到此处',
    excelHint: '支持 .xlsx, .xls 格式',
    dragJson: '点击或拖拽 JSON 文件到此处',
    jsonHint: '支持导出的 JSON 格式',
    confirmImport: '确认导入',
    parseSuccess: '解析成功',
    confirmToImport: '数据格式正确，请确认后导入',
    reselect: '重新选择文件',
    row: '第',
    rowSuffix: '行',
    warning: '警告',
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
    weightDistribution: '权重分布',
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

  // Timeline
  timeline: {
    createTimeline: '创建时间轴',
    timeCompare: '时间对比',
    selectSources: '选择数据源',
    selectYear: '年',
    selectMonth: '月',
    timeMarker: '时间标记',
    setTimeMarker: '设置时间点',
    clearTimeMarker: '清除时间点',
    minSourcesRequired: '至少需要选择 2 个数据源',
    missingTimeMarker: '所选雷达图缺少时间标记',
    dimensionMismatch: '维度结构不一致',
    vendorMismatch: '对比对象不一致',
    cannotDeleteReferenced: '该雷达图被时间轴引用，无法删除',
    allYears: '全部',
    noTimeMarker: '未设置',
    editSources: '编辑数据源',
    name: '名称',
    sourcesPreview: '数据源预览',
    noEligibleSources: '没有可用的数据源（需先为 Tab 设置时间点）',
    selectAtLeast2: '请至少选择 2 个数据源',
  },
}

export type Locale = typeof zhCN
