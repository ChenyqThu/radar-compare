# Radar Compare

**竞品能力对比可视化工具** - A visual comparison tool for competitive capability analysis

[English](#english) | [中文](#中文)

---

## English

### Overview

Radar Compare is a pure frontend visualization tool that helps you compare multiple products/vendors across different capability dimensions using radar charts. It's designed for product managers, market analysts, and technical reviewers who need to create clear, intuitive competitive analysis reports.

### Features

- **Multi-dimensional Comparison**: Compare multiple vendors across customizable dimensions
- **Hierarchical Dimensions**: Support for sub-dimensions with weighted scoring
- **Multiple Radar Charts**: Create and manage multiple comparison scenarios via tabs
- **Drag & Drop**: Reorder dimensions, sub-dimensions, and vendors with intuitive drag-and-drop
- **Data Import/Export**: Import from Excel/JSON, export to Excel/JSON
- **Dual Radar Layout**: Automatic dual-chart layout when dimensions have sub-dimensions
- **Sunburst Visualization**: View dimension weight distribution as a sunburst chart
- **Dark Mode**: Full support for light and dark themes
- **Internationalization**: Available in English and Chinese
- **Local Storage**: All data stored locally in IndexedDB - no server required

### Screenshots

*Coming soon*

### Getting Started

#### Prerequisites

- Node.js 18+
- npm or yarn

#### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/radar-compare.git
cd radar-compare

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

#### Build for Production

```bash
npm run build
npm run preview  # Preview the build
```

### Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Ant Design 5 | UI Components |
| ECharts 5 | Chart Rendering |
| Zustand | State Management |
| @dnd-kit | Drag and Drop |
| Dexie.js | IndexedDB Wrapper |
| SheetJS | Excel Import/Export |

### Usage

1. **Create a Radar Chart**: Click the "+" button to create a new comparison tab
2. **Add Vendors**: Open settings (click the gear icon or press `S`) and add comparison targets
3. **Define Dimensions**: Add dimensions and optional sub-dimensions with weights
4. **Score Each Vendor**: Enter scores (0-10) for each dimension/vendor combination
5. **Analyze Results**: View the radar chart to compare vendor capabilities
6. **Export Data**: Export your analysis to Excel or JSON for sharing

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `S` | Toggle settings drawer |

### License

MIT License

---

## 中文

### 概述

Radar Compare 是一款纯前端的竞品能力对比可视化工具，通过雷达图直观展示多个对比对象在各个维度上的评分对比。适用于产品经理、市场分析师和技术评审人员进行竞争力分析。

### 功能特性

- **多维度对比**: 支持自定义多个对比维度
- **层级维度**: 支持子维度，带权重计算
- **多雷达图**: 通过 Tab 管理多个对比场景
- **拖拽排序**: 维度、子维度、系列均支持拖拽排序
- **数据导入导出**: 支持 Excel/JSON 格式导入导出
- **双雷达图布局**: 有子维度时自动启用左右双图布局
- **旭日图可视化**: 直观展示维度权重分布
- **深色模式**: 支持明暗主题切换
- **国际化**: 支持中英文切换
- **本地存储**: 数据存储在浏览器 IndexedDB，无需服务器

### 快速开始

#### 环境要求

- Node.js 18+
- npm 或 yarn

#### 安装运行

```bash
# 克隆仓库
git clone https://github.com/your-username/radar-compare.git
cd radar-compare

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 `http://localhost:3000` 即可使用

#### 生产构建

```bash
npm run build
npm run preview  # 预览构建结果
```

### 技术栈

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Ant Design 5 | UI 组件库 |
| ECharts 5 | 图表渲染 |
| Zustand | 状态管理 |
| @dnd-kit | 拖拽功能 |
| Dexie.js | IndexedDB 封装 |
| SheetJS | Excel 读写 |

### 使用说明

1. **创建雷达图**: 点击 "+" 按钮创建新的对比 Tab
2. **添加系列**: 打开设置（点击齿轮图标或按 `S`），添加对比对象
3. **定义维度**: 添加维度，可选添加子维度并设置权重
4. **评分**: 为每个维度/系列组合输入评分（0-10）
5. **分析结果**: 通过雷达图直观对比各系列能力
6. **导出数据**: 导出为 Excel 或 JSON 便于分享

### 快捷键

| 按键 | 功能 |
|------|------|
| `S` | 打开/关闭设置抽屉 |

### 开源协议

MIT License

---

## Documentation

- [产品需求文档 (PRD)](./docs/PRD.md)
- [技术设计文档](./docs/DESIGN.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Built with Claude Code
