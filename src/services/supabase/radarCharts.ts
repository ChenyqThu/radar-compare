import { supabase, isSupabaseConfigured } from './client'
import type { AnyRadarChart, RadarChart, TimeMarker } from '@/types'
import type { TimelineRadarChart } from '@/types/radar'
import type { VersionTimeline, TimelineInfo, VersionEvent } from '@/types/versionTimeline'
import type {
  ManpowerChart,
  ManpowerTeam,
  ManpowerProject,
  ManpowerTimePoint,
  AllocationMatrix,
  ManpowerMetadata,
} from '@/types/manpower'
import type { Database, RadarChartRow } from '@/types/supabase'
import { isTimelineRadar } from '@/types'
import { isVersionTimeline } from '@/types/versionTimeline'
import { isManpowerChart } from '@/types/manpower'
import { isProductMatrixChart, type ProductMatrixChart } from '@/types/productMatrix'

type ChartInsert = Database['radar_compare']['Tables']['radar_charts']['Insert']
type ChartUpdate = Database['radar_compare']['Tables']['radar_charts']['Update']

/**
 * Convert database row to frontend chart type
 */
function rowToChart(row: RadarChartRow): AnyRadarChart {
  const baseData = row.data as Record<string, unknown>

  if (row.chart_type === 'timeline') {
    // TimelineRadarChart
    return {
      id: row.id,
      name: row.name,
      order: row.order_index,
      isTimeline: true,
      sourceRadarIds: (baseData.sourceRadarIds as string[]) || [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    } as TimelineRadarChart
  }

  if (row.chart_type === 'version_timeline') {
    // VersionTimeline
    return {
      id: row.id,
      name: row.name,
      order: row.order_index,
      isVersionTimeline: true,
      info: (baseData.info as TimelineInfo) || { title: '大事记' },
      events: (baseData.events as VersionEvent[]) || [],
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    } as VersionTimeline
  }

  if (row.chart_type === 'manpower') {
    // ManpowerChart
    return {
      id: row.id,
      name: row.name,
      order: row.order_index,
      isManpowerChart: true,
      metadata: (baseData.metadata as ManpowerMetadata) || {
        title: '研发人力排布',
        version: '1.0.0',
        totalPersons: 0,
      },
      teams: (baseData.teams as ManpowerTeam[]) || [],
      projects: (baseData.projects as ManpowerProject[]) || [],
      timePoints: (baseData.timePoints as ManpowerTimePoint[]) || [],
      allocations: (baseData.allocations as AllocationMatrix) || {},
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    } as ManpowerChart
  }

  if (row.chart_type === 'product_matrix') {
    // ProductMatrixChart
    return {
      id: row.id,
      name: row.name,
      order: row.order_index,
      isProductMatrixChart: true,
      vendors: (baseData.vendors as ProductMatrixChart['vendors']) || [],
      dimensions: (baseData.dimensions as ProductMatrixChart['dimensions']) || [],
      products: (baseData.products as ProductMatrixChart['products']) || [],
      matrixConfig: (baseData.matrixConfig as ProductMatrixChart['matrixConfig']),
      petalConfig: (baseData.petalConfig as ProductMatrixChart['petalConfig']),
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    } as ProductMatrixChart
  }

  // Regular RadarChart
  return {
    id: row.id,
    name: row.name,
    order: row.order_index,
    dimensions: (baseData.dimensions as RadarChart['dimensions']) || [],
    vendors: (baseData.vendors as RadarChart['vendors']) || [],
    timeMarker: row.time_marker as unknown as TimeMarker | undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  } as RadarChart
}

/**
 * Convert frontend chart to database row data
 */
function chartToRowData(chart: AnyRadarChart): {
  chartType: 'radar' | 'timeline' | 'version_timeline' | 'manpower' | 'product_matrix'
  data: Record<string, unknown>
  timeMarker: TimeMarker | null
} {
  if (isTimelineRadar(chart)) {
    return {
      chartType: 'timeline',
      data: { sourceRadarIds: chart.sourceRadarIds },
      timeMarker: null,
    }
  }

  if (isVersionTimeline(chart)) {
    return {
      chartType: 'version_timeline',
      data: {
        isVersionTimeline: true,
        info: chart.info,
        events: chart.events,
      },
      timeMarker: null,
    }
  }

  if (isManpowerChart(chart)) {
    return {
      chartType: 'manpower',
      data: {
        isManpowerChart: true,
        metadata: chart.metadata,
        teams: chart.teams,
        projects: chart.projects,
        timePoints: chart.timePoints,
        allocations: chart.allocations,
      },
      timeMarker: null,
    }
  }

  if (isProductMatrixChart(chart)) {
    return {
      chartType: 'product_matrix',
      data: {
        isProductMatrixChart: true,
        vendors: chart.vendors,
        dimensions: chart.dimensions,
        products: chart.products,
        matrixConfig: chart.matrixConfig,
        petalConfig: chart.petalConfig,
      },
      timeMarker: null,
    }
  }

  // Regular RadarChart
  const regularChart = chart as RadarChart
  return {
    chartType: 'radar',
    data: {
      dimensions: regularChart.dimensions,
      vendors: regularChart.vendors,
    },
    timeMarker: regularChart.timeMarker || null,
  }
}

/**
 * Get all charts for a project
 */
export async function getChartsByProject(projectId: string): Promise<AnyRadarChart[]> {
  if (!isSupabaseConfigured) {
    console.log('[Charts] Supabase not configured')
    return []
  }

  const { data, error } = await supabase
    .from('radar_charts')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[Charts] Failed to fetch charts:', error)
    return []
  }

  return (data as RadarChartRow[]).map(rowToChart)
}

/**
 * Get a single chart by ID
 */
export async function getChart(chartId: string): Promise<AnyRadarChart | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('radar_charts')
    .select('*')
    .eq('id', chartId)
    .single()

  if (error) {
    console.error('[Charts] Failed to fetch chart:', error)
    return null
  }

  return rowToChart(data as RadarChartRow)
}

/**
 * Create a new chart
 */
export async function createChart(projectId: string, chart: AnyRadarChart): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { chartType, data, timeMarker } = chartToRowData(chart)

  const insertData: ChartInsert = {
    id: chart.id,
    project_id: projectId,
    name: chart.name,
    chart_type: chartType,
    order_index: chart.order,
    data: data as Database['radar_compare']['Tables']['radar_charts']['Insert']['data'],
    time_marker: timeMarker as Database['radar_compare']['Tables']['radar_charts']['Insert']['time_marker'],
  }

  const { error } = await supabase
    .from('radar_charts')
    .insert(insertData as never)

  if (error) {
    console.error('[Charts] Failed to create chart:', error)
    return false
  }

  return true
}

/**
 * Update a chart
 */
export async function updateChart(chart: AnyRadarChart): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { chartType, data, timeMarker } = chartToRowData(chart)

  const updateData: ChartUpdate = {
    name: chart.name,
    chart_type: chartType,
    order_index: chart.order,
    data: data as Database['radar_compare']['Tables']['radar_charts']['Update']['data'],
    time_marker: timeMarker as Database['radar_compare']['Tables']['radar_charts']['Update']['time_marker'],
  }

  const { error } = await supabase
    .from('radar_charts')
    .update(updateData as never)
    .eq('id', chart.id)

  if (error) {
    console.error('[Charts] Failed to update chart:', error)
    return false
  }

  return true
}

/**
 * Delete a chart
 */
export async function deleteChart(chartId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { error } = await supabase
    .from('radar_charts')
    .delete()
    .eq('id', chartId)

  if (error) {
    console.error('[Charts] Failed to delete chart:', error)
    return false
  }

  return true
}

/**
 * Batch update chart order
 */
export async function reorderCharts(
  charts: { id: string; orderIndex: number }[]
): Promise<boolean> {
  if (!isSupabaseConfigured || charts.length === 0) return false

  // Use upsert with only order_index update
  const updates = charts.map((c) => ({
    id: c.id,
    order_index: c.orderIndex,
  }))

  // Execute updates one by one (Supabase doesn't support bulk partial updates easily)
  for (const update of updates) {
    const { error } = await supabase
      .from('radar_charts')
      .update({ order_index: update.order_index } as never)
      .eq('id', update.id)

    if (error) {
      console.error('[Charts] Failed to reorder chart:', update.id, error)
      return false
    }
  }

  return true
}

/**
 * Duplicate a chart with new ID
 */
export async function duplicateChart(
  projectId: string,
  newChart: AnyRadarChart
): Promise<boolean> {
  return createChart(projectId, newChart)
}
