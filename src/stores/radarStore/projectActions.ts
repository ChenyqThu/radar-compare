import { nanoid } from 'nanoid'
import type { Project } from '@/types'
import { db, getAllProjects, getProject } from '@/services/db'
import { isSupabaseConfigured, deleteCloudProject } from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSave } from './utils'

export function createProjectActions(set: StoreSetter, get: StoreGetter) {
  return {
    refreshProjectList: async () => {
      const list = await getAllProjects()
      set({ projectList: list })
    },

    loadProject: async (projectId: string) => {
      set({ isLoading: true })
      const project = await getProject(projectId)
      const list = await getAllProjects()
      set({ currentProject: project ?? null, projectList: list, isLoading: false })
    },

    createProject: async (name: string) => {
      const now = Date.now()
      const radarId = nanoid()
      const newProject: Project = {
        id: nanoid(),
        name,
        description: '',
        radarCharts: [{
          id: radarId,
          name: '竞品对比',
          order: 0,
          dimensions: [],
          vendors: [],
          createdAt: now,
          updatedAt: now,
        }],
        activeRadarId: radarId,
        createdAt: now,
        updatedAt: now,
      }
      await db.projects.add(newProject)
      await get().refreshProjectList()

      // Sync to cloud if logged in
      debouncedSave(newProject)

      return newProject.id
    },

    deleteProject: async (projectId: string) => {
      // Delete from local
      await db.projects.delete(projectId)

      // Delete from cloud if logged in
      if (isSupabaseConfigured) {
        const user = useAuthStore.getState().user
        if (user) {
          deleteCloudProject(projectId).catch(() => {})
        }
      }

      const { currentProject } = get()
      if (currentProject?.id === projectId) {
        const list = await getAllProjects()
        if (list.length > 0) {
          await get().loadProject(list[0].id)
        } else {
          set({ currentProject: null, projectList: [] })
        }
      } else {
        await get().refreshProjectList()
      }
    },

    renameProject: (projectId: string, name: string) => {
      const { currentProject, projectList } = get()
      if (currentProject?.id === projectId) {
        const updated = { ...currentProject, name }
        set({
          currentProject: updated,
          projectList: projectList.map((p) => (p.id === projectId ? { ...p, name } : p)),
        })
        debouncedSave(updated)
      }
    },
  }
}
