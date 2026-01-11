import { debounce } from 'lodash-es'
import type { Project } from '@/types'
import { saveProject } from '@/services/db'
import type { RadarState } from './types'

// Store reference for debouncedSave to update lastSavedAt
let storeRef: { setState: (partial: Partial<RadarState>) => void } | null = null

export function setStoreRef(ref: { setState: (partial: Partial<RadarState>) => void }) {
  storeRef = ref
}

export const debouncedSave = debounce(async (project: Project) => {
  await saveProject(project)
  if (storeRef) {
    storeRef.setState({ lastSavedAt: Date.now() })
  }
}, 500)
