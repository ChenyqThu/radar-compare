# Manpower 模块前端重构工作量评估

## 1. 评估背景
本评估基于将 `src/components/manpower` 模块从 **Tailwind CSS + 自定义 UI** 完全重构为 **Ant Design v5 + 现有项目规范** 的假设。
目标是实现代码层面的统一，移除 Tailwind 依赖，复用 Ant Design 组件库。

## 2. 模块复杂度分析

经过代码走查，Manpower 模块主要由以下部分组成：

### 2.1 核心页面 (Tabs)

| 页面/模块 | 复杂度 | 关键组件/逻辑 | 重构难点 |
| :--- | :--- | :--- | :--- |
| **Allocation (人力分配表)** | **高 (High)** | `AllocationGrid.tsx` (800+行) | • **复杂表格**: 目前使用原生 `<table>` + Tailwind 实现多层表头、冻结列、折叠行。<br>• **性能敏感**: 包含大量输入框 (Input)，AntD Table 在大量 Form Item 下可能存在性能瓶颈。<br>• **交互逻辑**: 需重写单元格编辑、键盘导航、自动计算逻辑。 |
| **Visualization (可视化)** | 中 (Medium) | `SankeyChart`, `DistributionChart`, `ProjectBarChart` | • **图表容器**: 需移除 Tailwind 布局，改用 AntD `Card` + Flex/Grid。<br>• **Echarts**: 核心图表逻辑可复用，但需调整容器响应式逻辑。 |
| **Config (配置管理)** | 中 (Medium) | `TeamConfig`, `ProjectConfig`, `TimeConfig`, `ImportExport` | • **表单交互**: 需将自定义 `Modal`/`Form` 替换为 AntD `Form` + `Modal`。<br>• **列表渲染**: 需将 Tailwind Grid 替换为 AntD `List` 或 `Card` Grid。<br>• **颜色选择**: 需替换为 AntD `ColorPicker`。 |

### 2.2 公共组件 (UI Kit)
目前 Manpower 模块维护了一套独立的 UI 组件库 (`src/components/manpower/ui`)，包含 `Button`, `Input`, `Modal`, `Switch` 等。
**重构动作**: 彻底废弃该目录，全局替换为 AntD 对应组件。

---

## 3. 重构功能检查清单 (Checklist)

为确保重构后的功能与现有版本完全一致，请在开发和测试阶段严格对照以下清单。

### 3.1 核心分配表 (AllocationGrid) - **最复杂**
此页面是重构的核心难点，需确保所有交互细节还原。

#### 视图展示 (View)
- [ ] **多级表头**: 表头需按时间点分组，下设 "投入 (Occupied)" 和 "预释 (Prerelease)" 两列。
- [ ] **冻结列 (Sticky Columns)**: 左侧 "项目 (Project)" 和 "团队 (Team)" 列需在横向滚动时固定。
- [ ] **冻结表头 (Sticky Header)**: 顶部时间轴表头需在纵向滚动时固定。
- [ ] **项目折叠**: 点击项目行可折叠/展开其下的团队行，且状态需持久化 (LocalStorage)。
- [ ] **视觉标识**:
    - [ ] 团队利用率颜色标记 (绿 <90%, 黄 90-100%, 橙 100-110%, 红 >110%)。
    - [ ] 项目/团队 Badge 样式需与 Config 页面一致。

#### 交互逻辑 (Interaction)
- [ ] **行内编辑 (Inline Editing)**:
    - [ ] 点击单元格进入编辑模式。
    - [ ] 失去焦点 (Blur) 或回车自动保存。
    - [ ] 输入验证: 仅允许数字，非负数。
- [ ] **自动计算 (Auto-Calculation)**:
    - [ ] **输入预释值 (Prerelease)**: 自动扣减**下一个时间点**的投入值 (Occupied)。
    - [ ] **输入投入值 (Occupied)**:
        - [ ] 若小于上个时间点投入，自动增加上个时间点的预释值。
        - [ ] 若等于上个时间点投入，自动清零上个时间点的预释值。
        - [ ] 确保当前时间点的预释值不超过新的投入值。
- [ ] **显示控制**:
    - [ ] 切换 "显示团队详情" (Show Team Details) 开关。

#### 数据管理 (Data)
- [ ] **导入**: 支持导入 JSON 格式的分配数据，需包含格式校验。
- [ ] **导出**:
    - [ ] 导出为 JSON (备份)。
    - [ ] 导出为 Excel (`.xlsx`)，需保留表格结构。

### 3.2 配置管理 (Config Modules)

#### 团队配置 (TeamConfig)
- [ ] **列表展示**: 卡片式展示团队信息 (名称, 人力容量, 颜色, Badge)。
- [ ] **新增/编辑**:
    - [ ] 弹窗表单 (Modal Form)。
    - [ ] 校验: 名称唯一性，容量必须大于 0。
    - [ ] 颜色选择器 (预设色盘)。
    - [ ] Badge 选择器 (数字/无)。
- [ ] **删除**: 二次确认弹窗。

#### 项目配置 (ProjectConfig)
- [ ] **列表展示**: 卡片式展示，包含状态标签 (Planning/Dev/Release/Done)。
- [ ] **新增/编辑**:
    - [ ] 状态选择 (下拉 + 颜色映射)。
    - [ ] 样式选择 (实心/条纹/圆点)。
    - [ ] **关联团队**: 多选框 (Checkbox Group) 选择参与该项目的团队。
    - [ ] 发布时间: 月份选择器 (Month Picker)。
- [ ] **删除**: 二次确认弹窗。

#### 时间点配置 (TimeConfig)
- [ ] **列表展示**: 按日期排序展示。
- [ ] **新增/编辑**:
    - [ ] 类型选择 (Current/Planning/Release)。
    - [ ] 日期选择 (Month Picker)。
    - [ ] 校验: 名称唯一，日期必填。
- [ ] **删除**: 二次确认弹窗。

### 3.3 可视化图表 (Visualization)

#### 桑基图 (SankeyChart)
- [ ] **筛选器**:
    - [ ] 团队筛选 (多选 Tag)。
    - [ ] 项目筛选 (多选 Tag)。
    - [ ] 筛选状态需实时更新图表。
- [ ] **图表交互**:
    - [ ] 节点/连线 Tooltip 显示详细人力数值。
    - [ ] 节点点击/高亮逻辑 (如有)。

#### 分布图 (DistributionChart)
- [ ] **联动交互**: 鼠标悬停在右侧折线图 (Line) 时，左侧饼图 (Pie) 需动态更新为对应时间点的数据。
- [ ] **图例**: 点击图例可隐藏/显示特定项目。

#### 柱状图 (ProjectBarChart)
- [ ] **时间范围筛选**:
    - [ ] 多选时间点 (Tags/Checkboxes)。
    - [ ] 全选/取消全选功能。
- [ ] **截止时间设置**:
    - [ ] 自定义截止日期输入框 (用于计算最后一个时间点之后的预估人力)。
    - [ ] 重置为默认 (年底) 功能。

---

## 4. 详细工时汇总表

| 模块 | 文件 | 预估工时 (人天) | 备注 |
| :--- | :--- | :--- | :--- |
| **Setup** | 环境配置 | 0.5 | 移除 Tailwind，配置 AntD Theme |
| **Config** | Team/Project/Time/IO | 2.0 | 表单逻辑迁移 |
| **Viz** | Sankey/Dist/Bar | 1.0 | 筛选器 UI 重写 |
| **Allocation** | AllocationGrid | 4.0 | **核心难点** |
| **Main** | ManpowerView | 0.2 | Tabs 替换 |
| **QA** | 整体测试与修复 | 2.3 | 样式微调，Bug 修复 |
| **Total** | | **10.0** | |

## 5. 执行路线图 (Roadmap)

1.  **Phase 1: 基础设施 (Day 1)**
    *   创建新的 `src/components/manpower_v2` 目录（避免破坏现有功能）。
    *   配置 Ant Design 全局样式。
    *   迁移 `ManpowerView` 框架。

2.  **Phase 2: 配置模块 (Day 2-3)**
    *   优先完成 `TeamConfig`, `ProjectConfig`, `TimeConfig`。
    *   这部分逻辑独立，容易产出成果，建立信心。

3.  **Phase 3: 可视化模块 (Day 4)**
    *   迁移图表组件。
    *   重点调整 AntD 容器下的 Echarts 响应式表现。

4.  **Phase 4: 核心分配表 (Day 5-8)**
    *   Day 5: 设计 Table Columns 结构，实现数据转换。
    *   Day 6: 实现基础渲染和冻结列。
    *   Day 7: 实现可编辑单元格和自动计算逻辑。
    *   Day 8: 性能优化和样式细节打磨。

5.  **Phase 5: 收尾 (Day 9-10)**
    *   全局样式统一。
    *   移除旧代码 (`src/components/manpower`)。
    *   回归测试。