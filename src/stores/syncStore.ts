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

export interface SyncConflict {
  projectId: string
  projectName: string
  localUpdatedAt: number
  remoteUpdatedAt: number
  localData: Project
  remoteData: Project
}

export interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
  pendingChanges: number
  error: string | null
  isOnline: boolean
  conflicts: SyncConflict[]

  // Actions
  syncToCloud: (project: Project) => Promise<boolean>
  deleteFromCloud: (projectId: string) => Promise<boolean>
  uploadAllLocal: () => Promise<number>
  checkAndSync: () => Promise<void>
  setStatus: (status: SyncStatus, error?: string) => void
  setOnline: (online: boolean) => void
  retrySync: () => Promise<void>
  addConflict: (conflict: SyncConflict) => void
  resolveConflict: (projectId: string, resolution: 'local' | 'remote') => Promise<void>
  clearConflicts: () => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  conflicts: [],

  setStatus: (status: SyncStatus, error?: string) => {
    set({ status, error: error || null })
  },

  setOnline: (online: boolean) => {
    set({
      isOnline: online,
      status: online ? 'idle' : 'offline',
    })
  },

  addConflict: (conflict: SyncConflict) => {
    set((state) => ({
      conflicts: [...state.conflicts, conflict],
    }))
  },

  resolveConflict: async (projectId: string, resolution: 'local' | 'remote') => {
    const { conflicts } = get()
    const conflict = conflicts.find((c) => c.projectId === projectId)
    if (!conflict) return

    if (resolution === 'local') {
      // Keep local version, upload to cloud
      await saveCloudProject(conflict.localData)
    } else {
      // Keep remote version, save to local
      await db.projects.put(conflict.remoteData)
    }

    // Remove resolved conflict
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.projectId !== projectId),
    }))
  },

  clearConflicts: () => {
    set({ conflicts: [] })
  },

  /**
   * Sync a single project to cloud
   */
  syncToCloud: async (project: Project) => {
    // Check if offline
    if (!get().isOnline) {
      set({ status: 'offline', pendingChanges: get().pendingChanges + 1 })
      return false
    }

    set({ status: 'syncing', error: null })

    const success = await saveCloudProject(project)

    if (success) {
      set({ status: 'success', lastSyncAt: Date.now(), pendingChanges: 0 })
    } else {
      set({ status: 'error', error: 'Failed to sync to cloud' })
    }

    return success
  },

  /**
   * Delete a project from cloud
   */
  deleteFromCloud: async (projectId: string) => {
    if (!get().isOnline) return false
    const success = await deleteCloudProject(projectId)
    return success
  },

  /**
   * Upload all local projects to cloud (first-time sync)
   */
  uploadAllLocal: async () => {
    if (!get().isOnline) {
      set({ status: 'offline' })
      return 0
    }

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
   * Retry sync after error or coming back online
   */
  retrySync: async () => {
    if (!get().isOnline) return

    const { pendingChanges } = get()
    if (pendingChanges > 0) {
      // Re-sync current project
      await get().checkAndSync()
    }
  },

  /**
   * Check if first-time sync is needed and perform it
   */
  checkAndSync: async () => {
    if (!get().isOnline) {
      set({ status: 'offline' })
      return
    }

    set({ status: 'syncing' })

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

/**
 * Initialize network status listener
 * Call this once when the app starts
 */
export function initializeNetworkListener(): () => void {
  const handleOnline = () => {
    useSyncStore.getState().setOnline(true)
    // Retry sync when coming back online
    useSyncStore.getState().retrySync()
  }

  const handleOffline = () => {
    useSyncStore.getState().setOnline(false)
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Set initial state
  useSyncStore.getState().setOnline(navigator.onLine)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
