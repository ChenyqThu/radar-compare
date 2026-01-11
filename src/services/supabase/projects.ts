import { supabase, isSupabaseConfigured } from './client'
import type { Project } from '@/types'
import type { Database } from '@/types/supabase'

// Type aliases for Supabase tables
type ProjectRow = Database['radar_compare']['Tables']['projects']['Row']
type ProjectInsert = Database['radar_compare']['Tables']['projects']['Insert']

// Cloud project metadata (without full data)
export interface CloudProjectMeta {
  id: string
  name: string
  description: string
  version: number
  updatedAt: string
  createdAt: string
}

/**
 * Get all projects for the current user
 */
export async function getCloudProjects(): Promise<CloudProjectMeta[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, version, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[Cloud] Failed to fetch projects:', error)
    return []
  }

  // Cast data to expected type since Supabase schema types aren't inferred correctly
  const rows = data as unknown as Pick<ProjectRow, 'id' | 'name' | 'description' | 'version' | 'created_at' | 'updated_at'>[]

  return (rows || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    version: p.version,
    updatedAt: p.updated_at,
    createdAt: p.created_at,
  }))
}

/**
 * Get a single project by ID
 */
export async function getCloudProject(id: string): Promise<Project | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Cloud] Failed to fetch project:', error)
    return null
  }

  // Cast and extract data
  const row = data as unknown as ProjectRow
  return row?.data as unknown as Project || null
}

/**
 * Save a project to cloud (upsert)
 */
export async function saveCloudProject(project: Project): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const insertData: ProjectInsert = {
    id: project.id,
    owner_id: user.id,
    name: project.name,
    description: project.description || '',
    data: project as unknown as Database['radar_compare']['Tables']['projects']['Row']['data'],
    version: 1,
  }

  const { error } = await supabase
    .from('projects')
    .upsert(insertData as never, {
      onConflict: 'id',
    })

  if (error) {
    console.error('[Cloud] Failed to save project:', error)
    return false
  }

  console.log('[Cloud] Project saved:', project.name)
  return true
}

/**
 * Delete a project from cloud
 */
export async function deleteCloudProject(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[Cloud] Failed to delete project:', error)
    return false
  }

  console.log('[Cloud] Project deleted:', id)
  return true
}

/**
 * Upload multiple projects to cloud (for first-time sync)
 */
export async function uploadLocalProjects(projects: Project[]): Promise<number> {
  if (!isSupabaseConfigured || projects.length === 0) return 0

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  let successCount = 0

  for (const project of projects) {
    const success = await saveCloudProject(project)
    if (success) successCount++
  }

  console.log(`[Cloud] Uploaded ${successCount}/${projects.length} projects`)
  return successCount
}

/**
 * Check if user has any cloud projects
 */
export async function hasCloudProjects(): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('[Cloud] Failed to check projects:', error)
    return false
  }

  return (count || 0) > 0
}
