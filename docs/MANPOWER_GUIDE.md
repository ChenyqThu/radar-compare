# Manpower 模块开发指南

> 更新于 2026-01-13

## 概述

Manpower（人力排布）模块是 Prism 项目的独立功能模块，用于团队人力资源的规划、分配和可视化分析。本模块基于 Ant Design v5 构建，完全遵循项目的设计规范和技术栈。

## 架构设计

### 1. 模块结构

```
src/components/manpower/
├── ManpowerView.tsx              # 主视图容器
├── TeamBadge.tsx                 # 团队徽章组件
├── ProjectBadge.tsx              # 项目徽章组件
├── styles.module.css             # CSS Modules 样式
├── stores/                       # Zustand Store 适配器
│   ├── configStore.ts           # 配置数据 (团队/项目/时间点)
│   └── dataStore.ts             # 分配数据
├── hooks/                        # 自定义 Hooks
│   └── useI18n.ts               # 国际化 Hook
├── modules/
│   ├── allocation/              # 分配表格模块
│   │   └── AllocationGrid.tsx
│   ├── config/                  # 配置管理模块
│   │   ├── TeamConfig.tsx
│   │   ├── ProjectConfig.tsx
│   │   └── TimeConfig.tsx
│   ├── excel/                   # Excel 集成模块
│   │   └── ExcelIntegration.tsx
│   └── visualization/           # 可视化模块
│       ├── SankeyChart.tsx
│       ├── DistributionChart.tsx
│       └── ProjectBarChart.tsx
└── types/                       # 类型兼容层
    └── index.ts
```

### 2. 数据流

```
Supabase (radar_charts 表)
    ↕
radarStore (Zustand)
    ↕
manpowerActions.ts (CRUD + 统计)
    ↕
Store Adapters (configStore, dataStore)
    ↕
React Components (UI)
```

## 核心概念

### 1. 数据模型

**ManpowerChart** - 顶层数据结构：
```typescript
interface ManpowerChart extends BaseRadarChart {
  chart_type: 'manpower'
  teams: ManpowerTeam[]
  projects: ManpowerProject[]
  timePoints: ManpowerTimePoint[]
  allocations: AllocationMatrix
}
```

**三维配置系统**：
- **Teams** (团队): 人力资源提供方
- **Projects** (项目): 人力资源消耗方
- **TimePoints** (时间点): 时间维度

**AllocationMatrix** - 分配矩阵：
```typescript
AllocationMatrix = {
  [timePointId]: {
    [projectId]: {
      [teamId]: {
        occupied: number      // 投入人力
        prerelease: number    // 预释人力
      }
    }
  }
}
```

### 2. Store 系统

**configStore** (配置管理):
- `teams`, `projects`, `timePoints`
- `addTeam`, `updateTeam`, `deleteTeam`
- `addProject`, `updateProject`, `deleteProject`
- `addTimePoint`, `updateTimePoint`, `deleteTimePoint`

**dataStore** (数据管理):
- `allocations`
- `updateAllocation` - 更新单个分配
- `importAllocations` - 批量导入
- `getStatistics` - 获取统计数据

**持久化**:
- 所有操作通过 `radarStore.manpowerActions` 持久化到 Supabase
- 自动防抖 500ms 保存

## 开发规范

### 1. CSS 变量系统

**必须使用项目 CSS 变量**，不能使用硬编码颜色：

```css
/* ✅ 正确 */
.container {
  background: var(--color-bg-container);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
}

/* ❌ 错误 */
.container {
  background: #ffffff;
  color: #333333;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
}
```

**常用 CSS 变量**:
- 颜色: `--color-primary`, `--color-text`, `--color-text-secondary`, `--color-border`
- 背景: `--color-bg-layout`, `--color-bg-container`, `--color-bg-container-secondary`
- 状态: `--color-success`, `--color-warning`, `--color-error`
- Ant Design: `--ant-color-primary`, `--ant-color-success`
- 其他: `--border-radius`, `--shadow`

### 2. 动画规范

统一使用 Spring 动画曲线：

```typescript
transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
```

时长建议：
- 小动画: 120ms - 200ms
- 中动画: 200ms - 300ms
- 大动画: 300ms - 600ms

### 3. 国际化 (i18n)

**使用 useI18n Hook**:
```typescript
import { useI18n } from '@/locales'

const MyComponent = () => {
  const { t } = useI18n()
  const m = t.manpower  // 快捷访问 manpower 命名空间

  return <div>{m.teamName}</div>
}
```

**添加新的翻译 Key**:
1. 在 `src/locales/zh-CN.ts` 的 `manpower` 对象中添加中文
2. 在 `src/locales/en-US.ts` 的 `manpower` 对象中添加英文
3. 使用时通过 `t.manpower.xxx` 访问

**动态文本替换**:
```typescript
// 使用 {placeholder} 占位符
const text = m.teamsCount.replace('{count}', String(teams.length))
// "共 5 个团队" 或 "5 teams"
```

### 4. Ant Design 组件使用

**Table 组件**:
```typescript
<Table
  size="small"
  columns={columns}
  dataSource={dataSource}
  pagination={false}
  scroll={{ x: 'max-content', y: 600 }}
  sticky={{ offsetHeader: 0 }}
/>
```

**Form 组件**:
```typescript
const [form] = Form.useForm()

<Form
  form={form}
  layout="vertical"
  onFinish={handleFinish}
>
  <Form.Item name="name" label={m.teamName} rules={[{ required: true }]}>
    <Input />
  </Form.Item>
</Form>
```

**Modal 组件**:
```typescript
<Modal
  title={m.addTeam}
  open={visible}
  onOk={handleOk}
  onCancel={handleCancel}
  okText={t.common.confirm}
  cancelText={t.common.cancel}
>
  {/* 内容 */}
</Modal>
```

### 5. ECharts 规范

**初始化**:
```typescript
const chartRef = useRef<HTMLDivElement>(null)
const chartInstance = useRef<echarts.ECharts | null>(null)

useEffect(() => {
  if (!chartRef.current) return

  if (!chartInstance.current) {
    chartInstance.current = echarts.init(chartRef.current)
  }

  chartInstance.current.setOption(option)

  return () => {
    chartInstance.current?.dispose()
    chartInstance.current = null
  }
}, [option])
```

**颜色使用 CSS 变量**:
```typescript
const option = {
  color: projects.map(p => p.color),  // 使用项目配置的颜色
  axisLine: {
    lineStyle: {
      color: 'var(--color-border)',  // CSS 变量
    },
  },
}
```

## 常见问题

### 1. AllocationGrid 性能优化

**问题**: 大量单元格导致渲染慢。

**解决方案**:
- 使用 `React.memo` 包装 EditableCell
- 使用 `onBlur` 而非 `onChange` 触发保存
- 避免在 render 中创建新对象/函数

```typescript
const EditableCell = React.memo(({ value, onChange }) => {
  return (
    <InputNumber
      value={value}
      onBlur={(e) => onChange(parseFloat(e.target.value))}
    />
  )
})
```

### 2. 深色模式颜色不正确

**问题**: 某些颜色在深色模式下显示不佳。

**解决方案**:
- 检查是否使用了硬编码颜色
- 确保所有颜色使用 CSS 变量
- 使用 `[data-theme='dark']` 选择器覆盖特殊情况

```css
/* styles.module.css */
.myElement {
  background: var(--color-bg-container);
}

[data-theme='dark'] .myElement {
  /* 深色模式特殊处理（如果需要） */
}
```

### 3. Excel 导入导出错误

**问题**: 中英文列名不匹配。

**解决方案**:
- 导出时使用 i18n 生成列名
- 导入时使用当前语言的 i18n key 匹配

```typescript
// 导出
const header = [m.columnProject, m.columnTeam, ...]

// 导入
const projectIndex = headerRow.indexOf(m.columnProject)
```

## 扩展指南

### 1. 添加新的配置项

以添加"团队类型"字段为例：

1. **更新类型定义** (`src/types/manpower.ts`):
```typescript
export interface ManpowerTeam {
  id: string
  name: string
  capacity: number
  type: 'frontend' | 'backend' | 'fullstack'  // 新增
  // ...
}
```

2. **更新 Store Actions** (`src/stores/radarStore/manpowerActions.ts`):
```typescript
// addTeam, updateTeam 方法中添加 type 字段的处理
```

3. **更新 UI** (`src/components/manpower/modules/config/TeamConfig.tsx`):
```tsx
<Form.Item name="type" label={m.teamType}>
  <Select>
    <Option value="frontend">{m.typeFrontend}</Option>
    <Option value="backend">{m.typeBackend}</Option>
    <Option value="fullstack">{m.typeFullstack}</Option>
  </Select>
</Form.Item>
```

4. **添加 i18n**:
```typescript
// zh-CN.ts
manpower: {
  teamType: '团队类型',
  typeFrontend: '前端',
  typeBackend: '后端',
  typeFullstack: '全栈',
}

// en-US.ts
manpower: {
  teamType: 'Team Type',
  typeFrontend: 'Frontend',
  typeBackend: 'Backend',
  typeFullstack: 'Fullstack',
}
```

### 2. 添加新的可视化图表

1. 创建新组件 `src/components/manpower/modules/visualization/NewChart.tsx`
2. 使用 ECharts 或 Canvas/SVG 实现
3. 从 `configStore` 和 `dataStore` 获取数据
4. 遵循 CSS 变量和 i18n 规范
5. 在 `ManpowerView.tsx` 中添加新 Tab

## 测试指南

### 1. 功能测试清单

- [ ] 团队 CRUD 操作正常
- [ ] 项目 CRUD 操作正常
- [ ] 时间点 CRUD 操作正常
- [ ] 分配矩阵编辑正常
- [ ] 利用率计算正确
- [ ] 自动预释计算正确
- [ ] Excel 导出包含所有数据
- [ ] Excel 导入数据正确
- [ ] Sankey 图渲染正常
- [ ] 分布图渲染正常
- [ ] 柱状图渲染正常

### 2. UI 测试清单

- [ ] 深色模式所有颜色正常
- [ ] 浅色模式所有颜色正常
- [ ] 中文界面完整
- [ ] 英文界面完整
- [ ] 动画流畅自然
- [ ] 响应式布局正常

### 3. 性能测试

- [ ] AllocationGrid 100+ 单元格无卡顿
- [ ] 大量数据时图表渲染流畅
- [ ] 页面切换无明显延迟

## 维护建议

1. **定期同步主项目规范**: 如果主项目的 CSS 变量或设计规范有更新，及时同步到 Manpower 模块。

2. **i18n 完整性**: 新增任何文本时，同时添加中英文翻译。

3. **类型安全**: 确保所有新增功能都有完整的 TypeScript 类型定义。

4. **代码审查**: 每次更改后运行 `npx tsc --noEmit` 确保无类型错误。

5. **文档更新**: 重大功能更新时，同步更新本文档和 CLAUDE.md。

## 参考资源

- [Ant Design v5 文档](https://ant.design/components/overview/)
- [ECharts 文档](https://echarts.apache.org/zh/index.html)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [SheetJS 文档](https://docs.sheetjs.com/)
- 主项目 `CLAUDE.md` - 整体架构说明
- 主项目 `src/styles/global.css` - CSS 变量定义

---

**最后更新**: 2026-01-13
**维护者**: Claude Code
