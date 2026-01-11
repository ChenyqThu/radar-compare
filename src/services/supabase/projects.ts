import { nanoid } from 'nanoid'
import { supabase, isSupabaseConfigured } from './client'
import type { Database, CloudProjectMeta } from '@/types/supabase'

type ProjectRow = Database['radar_compare']['Tables']['projects']['Row']
type ProjectInsert = Database['radar_compare']['Tables']['projects']['Insert']

/**
 * Get all projects owned by the current user (metadata only)
 */
export async function getCloudProjects(): Promise<CloudProjectMeta[]> {
  if (!isSupabaseConfigured) {
    console.log('[Cloud] Supabase not configured')
    return []
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[Cloud] No authenticated user')
    return []
  }

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, active_chart_id, created_at, updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[Cloud] Failed to fetch projects:', error)
    return []
  }

  type ProjectMetaRow = Pick<ProjectRow, 'id' | 'name' | 'description' | 'active_chart_id' | 'created_at' | 'updated_at'>

  return (data as ProjectMetaRow[] || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    activeChartId: p.active_chart_id,
    updatedAt: p.updated_at,
    createdAt: p.created_at,
  }))
}

/**
 * Get or create the user's default project
 * Returns the project ID
 */
export async function getOrCreateDefaultProject(): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check for existing projects
  const projects = await getCloudProjects()
  if (projects.length > 0) {
    return projects[0].id
  }

  // Create default project
  const projectId = nanoid()
  const insertData: ProjectInsert = {
    id: projectId,
    owner_id: user.id,
    name: '默认项目',
    description: '',
  }

  const { error } = await supabase
    .from('projects')
    .insert(insertData as never)

  if (error) {
    console.error('[Cloud] Failed to create default project:', error)
    return null
  }

  return projectId
}

/**
 * Create a new project
 */
export async function createProject(name: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const projectId = nanoid()
  const insertData: ProjectInsert = {
    id: projectId,
    owner_id: user.id,
    name,
    description: '',
  }

  const { error } = await supabase
    .from('projects')
    .insert(insertData as never)

  if (error) {
    console.error('[Cloud] Failed to create project:', error)
    return null
  }

  return projectId
}

/**
 * Update project metadata
 */
export async function updateProjectMeta(
  projectId: string,
  meta: { name?: string; description?: string; activeChartId?: string | null }
): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const updateData: Record<string, unknown> = {}
  if (meta.name !== undefined) updateData.name = meta.name
  if (meta.description !== undefined) updateData.description = meta.description
  if (meta.activeChartId !== undefined) updateData.active_chart_id = meta.activeChartId

  if (Object.keys(updateData).length === 0) return true

  const { error } = await supabase
    .from('projects')
    .update(updateData as never)
    .eq('id', projectId)

  if (error) {
    console.error('[Cloud] Failed to update project:', error)
    return false
  }

  return true
}

/**
 * Delete a project (cascades to charts)
 */
export async function deleteCloudProject(projectId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('[Cloud] Failed to delete project:', error)
    return false
  }

  return true
}

/**
 * Check if the current user is the owner of a project
 */
export async function isProjectOwner(projectId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .maybeSingle()

    if (error || !data) {
      return true // Local project
    }

    return (data as { owner_id: string }).owner_id === user.id
  } catch {
    return true
  }
}

/**
 * Check if user has any cloud projects
 */
export async function hasCloudProjects(): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  if (error) {
    console.error('[Cloud] Failed to check projects:', error)
    return false
  }

  return (count || 0) > 0
}
