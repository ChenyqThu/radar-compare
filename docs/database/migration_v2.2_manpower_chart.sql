-- Migration: Add manpower chart type
-- Version: 2.2.0
-- Date: 2026-01-13
-- Description: 新增人力排布图表类型 (manpower) 支持
--
-- 此迁移添加 'manpower' 到 radar_charts.chart_type 的 CHECK 约束中
-- manpower 图表用于研发人力排布可视化，包含：
--   - teams: 团队列表
--   - projects: 项目列表
--   - timePoints: 时间节点
--   - allocations: 分配矩阵

-- =============================================================================
-- 1. Update chart_type CHECK constraint
-- =============================================================================

-- Drop existing constraint
ALTER TABLE radar_compare.radar_charts
DROP CONSTRAINT IF EXISTS radar_charts_chart_type_check;

-- Add new constraint with 'manpower' type
ALTER TABLE radar_compare.radar_charts
ADD CONSTRAINT radar_charts_chart_type_check
CHECK (chart_type IN ('radar', 'timeline', 'version_timeline', 'manpower'));

-- =============================================================================
-- 2. Update column comments
-- =============================================================================

COMMENT ON COLUMN radar_compare.radar_charts.chart_type IS
'图表类型: radar=普通雷达图, timeline=时间轴雷达图, version_timeline=版本时间轴, manpower=人力排布';

COMMENT ON COLUMN radar_compare.radar_charts.data IS
'图表数据: radar={dimensions,vendors}, timeline={sourceRadarIds}, version_timeline={info,events}, manpower={metadata,teams,projects,timePoints,allocations}';

-- =============================================================================
-- Migration Notes
-- =============================================================================
--
-- manpower data 结构说明:
-- {
--   "isManpowerChart": true,
--   "metadata": {
--     "title": "研发人力排布",
--     "version": "1.0.0",
--     "totalPersons": 0
--   },
--   "teams": [
--     { "id": "...", "name": "前端团队", "capacity": 10, "color": "#5470c6" }
--   ],
--   "projects": [
--     { "id": "...", "name": "CRM系统", "status": "development", "color": "#91cc75" }
--   ],
--   "timePoints": [
--     { "id": "...", "name": "2024 Q1", "date": "2024-01", "type": "current" }
--   ],
--   "allocations": {
--     "timePointId": {
--       "projectId": {
--         "teamId": { "occupied": 5, "prerelease": 2 }
--       }
--     }
--   }
-- }
--
-- 回滚命令:
-- ALTER TABLE radar_compare.radar_charts
-- DROP CONSTRAINT IF EXISTS radar_charts_chart_type_check;
-- ALTER TABLE radar_compare.radar_charts
-- ADD CONSTRAINT radar_charts_chart_type_check
-- CHECK (chart_type IN ('radar', 'timeline', 'version_timeline'));
