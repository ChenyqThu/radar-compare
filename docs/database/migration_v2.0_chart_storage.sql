-- =============================================================================
-- Migration v2.0: Chart-Level Storage
--
-- 将图表从 projects.data JSON blob 迁移到独立的 radar_charts 表
-- 每个图表独立存储，支持细粒度更新和更好的协作支持
--
-- 执行顺序:
-- 1. 创建 radar_charts 表和相关对象
-- 2. 迁移现有数据
-- 3. 更新 projects 表
-- 4. 更新 get_project_by_share_token 函数
--
-- 注意: 执行此迁移后，旧版前端代码将无法正常工作
-- =============================================================================

-- =============================================================================
-- 1. 创建 radar_charts 表
-- =============================================================================

CREATE TABLE IF NOT EXISTS radar_compare.radar_charts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES radar_compare.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  chart_type TEXT NOT NULL DEFAULT 'radar' CHECK (chart_type IN ('radar', 'timeline', 'version_timeline')),
  order_index INTEGER NOT NULL DEFAULT 0,
  data JSONB NOT NULL,                        -- { dimensions, vendors, ... } 或 { sourceRadarIds } 或 { events }
  time_marker JSONB,                          -- { year, month? }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE radar_compare.radar_charts IS '雷达图表数据，每个 Tab 对应一条记录';
COMMENT ON COLUMN radar_compare.radar_charts.chart_type IS '图表类型: radar=普通雷达图, timeline=时间轴雷达图, version_timeline=版本时间轴';
COMMENT ON COLUMN radar_compare.radar_charts.data IS '图表数据，根据 chart_type 不同结构不同';
COMMENT ON COLUMN radar_compare.radar_charts.time_marker IS '时间标记，用于时间轴功能';

-- =============================================================================
-- 2. 创建索引
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_rc_charts_project ON radar_compare.radar_charts(project_id);
CREATE INDEX IF NOT EXISTS idx_rc_charts_order ON radar_compare.radar_charts(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_rc_charts_type ON radar_compare.radar_charts(chart_type);

-- =============================================================================
-- 3. 创建更新时间触发器
-- =============================================================================

DROP TRIGGER IF EXISTS update_rc_charts_updated_at ON radar_compare.radar_charts;
CREATE TRIGGER update_rc_charts_updated_at
  BEFORE UPDATE ON radar_compare.radar_charts
  FOR EACH ROW EXECUTE FUNCTION radar_compare.update_updated_at();

-- =============================================================================
-- 4. 启用 RLS 并创建策略
-- =============================================================================

ALTER TABLE radar_compare.radar_charts ENABLE ROW LEVEL SECURITY;

-- SELECT: 项目所有者可读
DROP POLICY IF EXISTS "charts_select_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_select_owner" ON radar_compare.radar_charts FOR SELECT
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- SELECT: 协作者可读
DROP POLICY IF EXISTS "charts_select_collaborator" ON radar_compare.radar_charts;
CREATE POLICY "charts_select_collaborator" ON radar_compare.radar_charts FOR SELECT
  USING (project_id IN (SELECT radar_compare.get_collaborated_project_ids()));

-- INSERT: 项目所有者可插入
DROP POLICY IF EXISTS "charts_insert_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_insert_owner" ON radar_compare.radar_charts FOR INSERT
  WITH CHECK (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- INSERT: 编辑者可插入
DROP POLICY IF EXISTS "charts_insert_editor" ON radar_compare.radar_charts;
CREATE POLICY "charts_insert_editor" ON radar_compare.radar_charts FOR INSERT
  WITH CHECK (radar_compare.is_project_editor(project_id));

-- UPDATE: 项目所有者可更新
DROP POLICY IF EXISTS "charts_update_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_update_owner" ON radar_compare.radar_charts FOR UPDATE
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- UPDATE: 编辑者可更新
DROP POLICY IF EXISTS "charts_update_editor" ON radar_compare.radar_charts;
CREATE POLICY "charts_update_editor" ON radar_compare.radar_charts FOR UPDATE
  USING (radar_compare.is_project_editor(project_id));

-- DELETE: 项目所有者可删除
DROP POLICY IF EXISTS "charts_delete_owner" ON radar_compare.radar_charts;
CREATE POLICY "charts_delete_owner" ON radar_compare.radar_charts FOR DELETE
  USING (project_id IN (SELECT radar_compare.get_owned_project_ids()));

-- =============================================================================
-- 5. 修改 projects 表: 添加 active_chart_id 字段
-- =============================================================================

ALTER TABLE radar_compare.projects ADD COLUMN IF NOT EXISTS active_chart_id TEXT;

-- =============================================================================
-- 6. 迁移现有数据
-- =============================================================================

-- 将 projects.data.radarCharts 拆分到 radar_charts 表
INSERT INTO radar_compare.radar_charts (id, project_id, name, chart_type, order_index, data, time_marker, created_at, updated_at)
SELECT
  chart->>'id' AS id,
  p.id AS project_id,
  COALESCE(chart->>'name', '未命名图表') AS name,
  CASE
    WHEN (chart->>'isTimeline')::boolean = true THEN 'timeline'
    WHEN (chart->>'isVersionTimeline')::boolean = true THEN 'version_timeline'
    ELSE 'radar'
  END AS chart_type,
  COALESCE((chart->>'order')::integer, 0) AS order_index,
  -- 移除元数据字段，只保留图表数据
  chart - 'id' - 'name' - 'order' - 'timeMarker' - 'createdAt' - 'updatedAt' AS data,
  chart->'timeMarker' AS time_marker,
  COALESCE(
    to_timestamp((chart->>'createdAt')::bigint / 1000),
    NOW()
  ) AS created_at,
  COALESCE(
    to_timestamp((chart->>'updatedAt')::bigint / 1000),
    NOW()
  ) AS updated_at
FROM radar_compare.projects p,
     jsonb_array_elements(p.data->'radarCharts') AS chart
WHERE p.data->'radarCharts' IS NOT NULL
  AND jsonb_array_length(p.data->'radarCharts') > 0
ON CONFLICT (id) DO NOTHING;

-- 更新 active_chart_id
UPDATE radar_compare.projects p
SET active_chart_id = p.data->>'activeRadarId'
WHERE p.data->>'activeRadarId' IS NOT NULL
  AND p.active_chart_id IS NULL;

-- =============================================================================
-- 7. 更新 get_project_by_share_token 函数
-- =============================================================================

CREATE OR REPLACE FUNCTION radar_compare.get_project_by_share_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_share radar_compare.shares%ROWTYPE;
  v_project radar_compare.projects%ROWTYPE;
  v_charts jsonb;
BEGIN
  -- 查找有效的分享链接
  SELECT * INTO v_share
  FROM radar_compare.shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_views IS NULL OR view_count < max_views);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 查找项目元数据
  SELECT * INTO v_project
  FROM radar_compare.projects
  WHERE id = v_share.project_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 查找图表数据 (从新的 radar_charts 表)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'chartType', c.chart_type,
      'order', c.order_index,
      'data', c.data,
      'timeMarker', c.time_marker,
      'createdAt', extract(epoch from c.created_at) * 1000,
      'updatedAt', extract(epoch from c.updated_at) * 1000
    ) ORDER BY c.order_index
  ) INTO v_charts
  FROM radar_compare.radar_charts c
  WHERE c.project_id = v_share.project_id
    AND (v_share.shared_tab_ids IS NULL OR c.id = ANY(v_share.shared_tab_ids));

  -- 返回项目和图表数据
  RETURN jsonb_build_object(
    'project', jsonb_build_object(
      'id', v_project.id,
      'name', v_project.name,
      'description', v_project.description,
      'activeChartId', v_project.active_chart_id
    ),
    'charts', COALESCE(v_charts, '[]'::jsonb),
    'share', jsonb_build_object(
      'id', v_share.id,
      'shareType', v_share.share_type,
      'shareScope', v_share.share_scope,
      'sharedTabIds', v_share.shared_tab_ids,
      'ownerId', v_share.created_by
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- 8. 授予权限
-- =============================================================================

GRANT ALL ON radar_compare.radar_charts TO anon, authenticated;

-- =============================================================================
-- 9. 验证迁移结果
-- =============================================================================

-- 检查迁移后的数据
DO $$
DECLARE
  v_project_count integer;
  v_chart_count integer;
BEGIN
  SELECT COUNT(*) INTO v_project_count FROM radar_compare.projects;
  SELECT COUNT(*) INTO v_chart_count FROM radar_compare.radar_charts;

  RAISE NOTICE '迁移完成: % 个项目, % 个图表', v_project_count, v_chart_count;
END $$;

-- =============================================================================
-- Schema Version: 2.0.0 (2026-01-11)
-- Changes:
--   - 新增 radar_charts 表，支持图表级独立存储
--   - 新增 projects.active_chart_id 字段
--   - 更新 get_project_by_share_token 函数以支持新表结构
--   - 迁移现有 projects.data.radarCharts 数据到 radar_charts 表
--
-- 注意:
--   - 迁移后 projects.data 字段不再使用，但保留以防回滚
--   - 后续版本可移除 projects.data 字段
-- =============================================================================
