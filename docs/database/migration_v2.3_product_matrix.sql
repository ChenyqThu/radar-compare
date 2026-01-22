-- Migration v2.3: Support Product Matrix Chart Type
--
-- Changes:
-- - Update radar_charts.chart_type check constraint to include 'product_matrix'

-- 1. Drop existing check constraint
ALTER TABLE radar_compare.radar_charts
  DROP CONSTRAINT IF EXISTS radar_charts_chart_type_check;

-- 2. Add updated check constraint
ALTER TABLE radar_compare.radar_charts
  ADD CONSTRAINT radar_charts_chart_type_check
  CHECK (chart_type IN ('radar', 'timeline', 'version_timeline', 'manpower', 'product_matrix'));

-- 3. Add comment for documentation
COMMENT ON COLUMN radar_compare.radar_charts.chart_type IS '图表类型: radar=普通雷达图, timeline=时间轴雷达图, version_timeline=版本时间轴, manpower=人力排布, product_matrix=产品矩阵';
