# Prism (formerly Radar Compare)

**The Ultimate Competitive Analysis & Product Evolution Visualization Tool**

[English](#english) | [中文](#中文)

---

## English

### Overview

Prism is a powerful visualization platform designed for product managers, market analysts, and strategic planners. It goes beyond simple comparison by combining **multi-dimensional capability analysis (Radar)** with **chronological evolution tracking (Timeline)**.

With cloud synchronization and team collaboration features, it serves as a central hub for your competitive intelligence.

### Key Features

#### 🕸️ Radar Capability Analysis
-   **Deep Customization**: Define arbitrary comparison dimensions and sub-dimensions with adjustable weights.
-   **Smart Layout**: Automatic dual-chart layouts for complex hierarchical data.
-   **Visual Scoring**: Intuitive drag-and-drop interactions for ranking and scoring.
-   **Sunburst View**: visualize the weight distribution of your evaluation model.

#### ⏳ Version Timeline (New!)
-   **Product Evolution**: Track how products or vendors change over time.
-   **Perfect Zoom**: Infinitely zoomable timeline with "Perfect Zoom" technology that preserves readability at any scale.
-   **Axis Breaks**: Intelligent handling of long gaps in history to keep the view focused on relevant data.
-   **Custom Event Types**: Dynamic coloring based on event types with interactive legend filtering.

#### ☁️ Cloud & Collaboration
-   **Cloud Sync**: Sign in with Google or GitHub to save your data to the cloud automatically.
-   **Multi-Device Access**: Access your analysis from anywhere.
-   **Secure Sharing**: Share analysis reports via unique links (Active Development).

### Tech Stack

-   **Frontend**: React 18, Vite, TypeScript
-   **UI/UX**: Ant Design 5, CSS Modules
-   **Visualization**: ECharts 5 (Radar), Custom SVG/Canvas (Timeline)
-   **State Management**: Zustand
-   **Interactions**: @dnd-kit (Sortable/Draggable)
-   **Backend/Auth**: Supabase (PostgreSQL, Auth)
-   **Routing**: React Router 6

### Getting Started

#### Prerequisites
-   Node.js 18+
-   npm or yarn

#### Installation

```bash
git clone https://github.com/your-username/radar-compare.git
cd radar-compare
npm install
```

#### Running Locally
```bash
npm run dev
```
Visit `http://localhost:3000`. You will need to configure Supabase credentials in `.env.local` for full functionality.

### License
MIT License

---

## 中文

### 概述

Prism 是一个专业的竞品分析与产品演进可视化平台。它不仅提供强大的**雷达图可视化**来分析当前能力差异，还引入了**时间轴（Timeline）**功能来追踪产品的历史演进路线。

支持云端同步与团队协作，是产品经理和行业分析师的得力助手。

### 核心功能

#### 🕸️ 雷达能力对比
-   **深度定制**: 支持自定义多级维度、子维度及权重体系。
-   **智能布局**: 针对复杂层级数据，自动适配双雷达图布局。
-   **直观交互**: 支持拖拽排序、权重调整和实时评分。
-   **权重可视化**: 旭日图（Sunburst）直观展示评价体系的权重分布。

#### ⏳ 版本时间轴 (全新!)
-   **演进追踪**: 清晰展示竞品或自身产品的版本迭代历史。
-   **智能排布算法**: 采用 "Best-Fit" 算法，在事件密集时自动寻找最优空位，避免重叠且保持紧凑。
-   **完美缩放 (Perfect Zoom)**: 支持无级缩放，无论查看十年跨度还是单月细节，都能保持最佳阅读体验。
-   **智能轴中断**: 自动隐藏无事件的长跨度时间段，聚焦关键信息。
-   **自定义事件类型**: 支持按类型定义事件颜色，底部图例支持点击筛选与自动重排。

#### ☁️ 云端协作
-   **云端同步**: 支持 Google 和 GitHub 账号登录，通过 Supabase 实时保存数据。
-   **跨设备访问**: 随时随地访问您的分析报告。
-   **安全分享**: (开发中) 通过链接快速分享分析结果。

### 技术栈

-   **前端框架**: React 18, Vite, TypeScript
-   **UI 组件**: Ant Design 5
-   **可视化**: ECharts 5 (雷达图), 自研 SVG/Canvas 渲染 (时间轴)
-   **状态管理**: Zustand
-   **交互库**: @dnd-kit
-   **后端/Auth**: Supabase
-   **路由**: React Router 6

### 快速开始

#### 环境要求
-   Node.js 18+

#### 安装与运行

```bash
git clone https://github.com/your-username/radar-compare.git
cd radar-compare
npm install
npm run dev
```
访问 `http://localhost:3000`。需配置 `.env.local` 中的 Supabase 环境变量以使用完整功能。

### 开源协议
MIT License
