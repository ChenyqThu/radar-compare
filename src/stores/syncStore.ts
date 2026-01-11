import { create } from 'zustand'
import { db } from '@/services/db'
import {
  getCloudProjects,
  getCloudProject,
  saveCloudProject,
  deleteCloudProject,
  hasCloudProjects,
  uploadLocalProjects,
} from '@/services/supabase'
import type { Project } from '@/types'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
  pendingChanges: number
  error: string | null

  // Actions
  syncToCloud: (project: Project) => Promise<boolean>
  deleteFromCloud: (projectId: string) => Promise<boolean>
  uploadAllLocal: () => Promise<number>
  checkAndSync: () => Promise<void>
  setStatus: (status: SyncStatus, error?: string) => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,

  setStatus: (status: SyncStatus, error?: string) => {
    set({ status, error: error || null })
  },

  /**
   * Sync a single project to cloud
   */
  syncToCloud: async (project: Project) => {
    set({ status: 'syncing', error: null })

    const success = await saveCloudProject(project)

    if (success) {
      set({ status: 'success', lastSyncAt: Date.now() })
    } else {
      set({ status: 'error', error: 'Failed to sync to cloud' })
    }

    return success
  },

  /**
   * Delete a project from cloud
   */
  deleteFromCloud: async (projectId: string) => {
    const success = await deleteCloudProject(projectId)
    return success
  },

  /**
   * Upload all local projects to cloud (first-time sync)
   */
  uploadAllLocal: async () => {
    set({ status: 'syncing', error: null })

    // Get all local projects
    const localProjects = await db.projects.toArray()

    if (localProjects.length === 0) {
      set({ status: 'idle' })
      return 0
    }

    const count = await uploadLocalProjects(localProjects)

    if (count > 0) {
      set({ status: 'success', lastSyncAt: Date.now() })
    } else {
      set({ status: 'error', error: 'Failed to upload local projects' })
    }

    return count
  },

  /**
   * Check if first-time sync is needed and perform it
   */
  checkAndSync: async () => {
    // Check if user has cloud projects
    const hasCloud = await hasCloudProjects()

    if (!hasCloud) {
      // First-time login: upload local projects
      await get().uploadAllLocal()
    } else {
      // User has cloud data, merge with local
      await mergeCloudAndLocal()
    }
  },
}))

/**
 * Merge cloud and local projects
 * Strategy: Cloud data wins for conflicts (based on updatedAt)
 */
async function mergeCloudAndLocal(): Promise<void> {
  const cloudMetas = await getCloudProjects()
  const localProjects = await db.projects.toArray()

  const localMap = new Map(localProjects.map(p => [p.id, p]))
  const cloudIds = new Set(cloudMetas.map(m => m.id))

  // 1. Download cloud projects that don't exist locally
  for (const meta of cloudMetas) {
    if (!localMap.has(meta.id)) {
      const cloudProject = await getCloudProject(meta.id)
      if (cloudProject) {
        await db.projects.put(cloudProject)
      }
    } else {
      // Project exists both locally and in cloud - check which is newer
      const local = localMap.get(meta.id)!
      const cloudUpdated = new Date(meta.updatedAt).getTime()
      const localUpdated = local.updatedAt

      if (cloudUpdated > localUpdated) {
        // Cloud is newer, download it
        const cloudProject = await getCloudProject(meta.id)
        if (cloudProject) {
          await db.projects.put(cloudProject)
        }
      } else if (localUpdated > cloudUpdated) {
        // Local is newer, upload it
        await saveCloudProject(local)
      }
    }
  }

  // 2. Upload local projects that don't exist in cloud
  for (const local of localProjects) {
    if (!cloudIds.has(local.id)) {
      await saveCloudProject(local)
    }
  }

  useSyncStore.setState({ status: 'success', lastSyncAt: Date.now() })
}
