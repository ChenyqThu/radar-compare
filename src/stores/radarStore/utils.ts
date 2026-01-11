import { debounce } from 'lodash-es'
import type { Project } from '@/types'
import { saveProject } from '@/services/db'
import { isSupabaseConfigured } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useSyncStore } from '@/stores/syncStore'
import type { RadarState } from './types'

// Store reference for debouncedSave to update lastSavedAt
let storeRef: { setState: (partial: Partial<RadarState>) => void } | null = null

export function setStoreRef(ref: { setState: (partial: Partial<RadarState>) => void }) {
  storeRef = ref
}

export const debouncedSave = debounce(async (project: Project) => {
  // Always save to local IndexedDB
  await saveProject(project)

  if (storeRef) {
    storeRef.setState({ lastSavedAt: Date.now() })
  }

  // If user is logged in, also sync to cloud
  if (isSupabaseConfigured) {
    const user = useAuthStore.getState().user
    if (user) {
      useSyncStore.getState().syncToCloud(project)
    }
  }
}, 500)
