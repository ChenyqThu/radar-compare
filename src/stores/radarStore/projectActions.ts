import { nanoid } from 'nanoid'
import type { Project, AnyRadarChart, Dimension, SubDimension, Vendor } from '@/types'
import type { VersionEvent } from '@/types/versionTimeline'
import {
  isSupabaseConfigured,
  deleteCloudProject,
  getCollaboratedProjects,
  getCloudProjects,
  getOrCreateDefaultProject,
  getChartsByProject,
  createChart,
  updateProjectMeta,
} from '@/services/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { StoreGetter, StoreSetter, ProjectListItem } from './types'

/**
 * Deep clone a radar chart with new IDs
 */
function cloneRadarChartWithNewIds(chart: AnyRadarChart): AnyRadarChart {
  const now = Date.now()
  const newId = nanoid()

  // Deep clone the chart
  const cloned = JSON.parse(JSON.stringify(chart)) as AnyRadarChart

  // Assign new IDs
  cloned.id = newId
  cloned.createdAt = now
  cloned.updatedAt = now
  cloned.name = `${chart.name} (副本)`

  // Update dimension IDs and sub-dimension IDs if present
  if ('dimensions' in cloned && Array.isArray(cloned.dimensions)) {
    const dimensions = cloned.dimensions as Dimension[]
    cloned.dimensions = dimensions.map((dim) => {
      const newDimId = nanoid()
      const newDim: Dimension = {
        ...dim,
        id: newDimId,
      }

      // Update sub-dimension IDs
      if (Array.isArray(newDim.subDimensions)) {
        newDim.subDimensions = newDim.subDimensions.map((subDim: SubDimension) => ({
          ...subDim,
          id: nanoid(),
        }))
      }

      return newDim
    }) as Dimension[]
  }

  // Update vendor IDs if present
  if ('vendors' in cloned && Array.isArray(cloned.vendors)) {
    const vendorIdMap = new Map<string, string>()
    const vendors = cloned.vendors as Vendor[]

    cloned.vendors = vendors.map((vendor) => {
      const newVendorId = nanoid()
      vendorIdMap.set(vendor.id, newVendorId)
      return {
        ...vendor,
        id: newVendorId,
      }
    }) as Vendor[]

    // Update score references in dimensions to use new vendor IDs
    if ('dimensions' in cloned && Array.isArray(cloned.dimensions)) {
      const dimensions = cloned.dimensions as Dimension[]
      cloned.dimensions = dimensions.map((dim) => {
        const newScores: Record<string, number> = {}
        for (const [oldId, score] of Object.entries(dim.scores || {})) {
          const newVendorId = vendorIdMap.get(oldId) || oldId
          newScores[newVendorId] = score
        }

        const newDim: Dimension = {
          ...dim,
          scores: newScores,
        }

        // Update sub-dimension scores
        if (Array.isArray(newDim.subDimensions)) {
          newDim.subDimensions = newDim.subDimensions.map((subDim: SubDimension) => {
            const newSubScores: Record<string, number> = {}
            for (const [oldId, score] of Object.entries(subDim.scores || {})) {
              const newVendorId = vendorIdMap.get(oldId) || oldId
              newSubScores[newVendorId] = score
            }
            return { ...subDim, scores: newSubScores }
          })
        }

        return newDim
      }) as Dimension[]
    }
  }

  // Update event IDs for version timeline
  if ('events' in cloned && Array.isArray(cloned.events)) {
    const events = cloned.events as VersionEvent[]
    cloned.events = events.map((event) => ({
      ...event,
      id: nanoid(),
    })) as VersionEvent[]
  }

  return cloned
}

/**
 * Assemble a Project object from project metadata and charts
 */
function assembleProject(
  projectId: string,
  projectName: string,
  description: string,
  charts: AnyRadarChart[],
  activeChartId: string | null
): Project {
  const now = Date.now()
  return {
    id: projectId,
    name: projectName,
    description,
    radarCharts: charts,
    activeRadarId: activeChartId || charts[0]?.id || null,
    createdAt: now,
    updatedAt: now,
  }
}

export function createProjectActions(set: StoreSetter, get: StoreGetter) {
  return {
    /**
     * Initialize: load project and charts
     */
    initialize: async () => {
      set({ isLoading: true })

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) {
        set({ isLoading: false })
        return
      }

      // Get or create default project
      const projectId = await getOrCreateDefaultProject()
      if (!projectId) {
        console.error('[Project] Failed to get or create default project')
        set({ isLoading: false })
        return
      }

      // Get project metadata
      const projects = await getCloudProjects()
      const project = projects.find(p => p.id === projectId)
      if (!project) {
        console.error('[Project] Project not found:', projectId)
        set({ isLoading: false })
        return
      }

      // Get charts from radar_charts table
      let charts = await getChartsByProject(projectId)

      // If no charts exist, create a default one
      if (charts.length === 0) {
        const defaultChart: AnyRadarChart = {
          id: nanoid(),
          name: '竞品对比',
          order: 0,
          dimensions: [],
          vendors: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        await createChart(projectId, defaultChart)
        charts = [defaultChart]
        // Update active_chart_id
        await updateProjectMeta(projectId, { activeChartId: defaultChart.id })
      }

      // Assemble project
      const assembledProject = assembleProject(
        projectId,
        project.name,
        project.description,
        charts,
        project.activeChartId
      )

      // Build project list
      const projectList: ProjectListItem[] = projects.map(p => ({
        id: p.id,
        name: p.name,
        isCollaborated: false,
        role: 'owner' as const,
      }))

      // Add collaborated projects
      const collaboratedList = await getCollaboratedProjects()
      for (const collab of collaboratedList) {
        if (projectList.some(p => p.id === collab.projectId)) continue
        const collabCharts = await getChartsByProject(collab.projectId)
        if (collabCharts.length > 0) {
          // Get project name
          const collabProject = projects.find(p => p.id === collab.projectId)
          projectList.push({
            id: collab.projectId,
            name: collabProject?.name || '协作项目',
            isCollaborated: true,
            role: collab.role === 'editor' ? 'editor' : 'viewer',
          })
        }
      }

      set({
        currentProject: assembledProject,
        currentProjectId: projectId,
        currentProjectName: project.name,
        projectList,
        isLoading: false,
      })
    },

    /**
     * Refresh project list from cloud
     */
    refreshProjectList: async () => {
      const projectList: ProjectListItem[] = []

      // Get owned projects from cloud
      if (isSupabaseConfigured) {
        const user = useAuthStore.getState().user
        if (user) {
          const cloudProjects = await getCloudProjects()
          for (const p of cloudProjects) {
            projectList.push({
              id: p.id,
              name: p.name,
              isCollaborated: false,
              role: 'owner' as const,
            })
          }

          // Get collaborated projects
          const collaboratedList = await getCollaboratedProjects()
          for (const collab of collaboratedList) {
            // Skip if already in own projects
            if (projectList.some((p) => p.id === collab.projectId)) continue

            // Fetch project name
            const collabCharts = await getChartsByProject(collab.projectId)
            if (collabCharts.length > 0) {
              projectList.push({
                id: collab.projectId,
                name: '协作项目',
                isCollaborated: true,
                role: collab.role === 'editor' ? 'editor' : 'viewer',
              })
            }
          }
        }
      }

      set({ projectList })
    },

    /**
     * Load a project from cloud
     */
    loadProject: async (projectId: string) => {
      set({ isLoading: true })

      if (!isSupabaseConfigured) {
        set({ isLoading: false })
        return
      }

      const user = useAuthStore.getState().user
      if (!user) {
        set({ isLoading: false })
        return
      }

      // Get project metadata
      const projects = await getCloudProjects()
      const project = projects.find(p => p.id === projectId)

      // Get charts
      const charts = await getChartsByProject(projectId)

      if (charts.length === 0) {
        console.warn('[Project] No charts found for project:', projectId)
        set({ isLoading: false })
        return
      }

      // Assemble project
      const assembledProject = assembleProject(
        projectId,
        project?.name || '项目',
        project?.description || '',
        charts,
        project?.activeChartId || null
      )

      set({
        currentProject: assembledProject,
        currentProjectId: projectId,
        currentProjectName: project?.name || '',
        isLoading: false,
      })
    },

    /**
     * Create a new project in cloud
     */
    createProject: async (name: string): Promise<string | null> => {
      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) {
        console.warn('[Project] Cannot create project: not logged in')
        return null
      }

      // Import createProject from supabase service
      const { createProject: createProjectInCloud } = await import('@/services/supabase')
      const projectId = await createProjectInCloud(name)

      if (!projectId) {
        console.error('[Project] Failed to create project in cloud')
        return null
      }

      // Create a default chart
      const now = Date.now()
      const defaultChart: AnyRadarChart = {
        id: nanoid(),
        name: '竞品对比',
        order: 0,
        dimensions: [],
        vendors: [],
        createdAt: now,
        updatedAt: now,
      }

      const chartCreated = await createChart(projectId, defaultChart)
      if (!chartCreated) {
        console.error('[Project] Failed to create default chart')
      }

      // Update active_chart_id
      await updateProjectMeta(projectId, { activeChartId: defaultChart.id })

      await get().refreshProjectList()
      return projectId
    },

    /**
     * Delete a project from cloud
     */
    deleteProject: async (projectId: string) => {
      // Delete from cloud (CASCADE will delete charts)
      if (isSupabaseConfigured) {
        const user = useAuthStore.getState().user
        if (user) {
          await deleteCloudProject(projectId)
        }
      }

      const { currentProject, projectList } = get()
      if (currentProject?.id === projectId) {
        // Load another project
        const remainingProjects = projectList.filter((p) => p.id !== projectId)
        if (remainingProjects.length > 0) {
          await get().loadProject(remainingProjects[0].id)
        } else {
          set({ currentProject: null, projectList: [], currentProjectId: null, currentProjectName: '' })
        }
      }

      await get().refreshProjectList()
    },

    /**
     * Rename a project
     */
    renameProject: (projectId: string, name: string) => {
      const { currentProject, projectList } = get()
      if (currentProject?.id === projectId) {
        const updated = { ...currentProject, name, updatedAt: Date.now() }
        set({
          currentProject: updated,
          currentProjectName: name,
          projectList: projectList.map((p) => (p.id === projectId ? { ...p, name } : p)),
        })
        // Save to cloud
        updateProjectMeta(projectId, { name })
      }
    },

    /**
     * Copy shared tabs to user's own project
     * This is used when a collaborator wants to "fork" the shared content
     * If targetProjectId is not provided, adds to user's default project
     */
    copySharedTabsToMyProject: async (
      tabIds: string[],
      targetProjectId?: string
    ): Promise<string | null> => {
      const { currentProject } = get()
      if (!currentProject) return null

      const user = useAuthStore.getState().user
      if (!user || !isSupabaseConfigured) {
        console.warn('[Project] Cannot copy: not logged in')
        return null
      }

      // Get the tabs to copy
      const tabsToCopy =
        tabIds.length > 0
          ? currentProject.radarCharts.filter((chart) => tabIds.includes(chart.id))
          : currentProject.radarCharts

      if (tabsToCopy.length === 0) return null

      // Clone the tabs with new IDs
      const clonedTabs = tabsToCopy.map(cloneRadarChartWithNewIds)

      let finalProjectId: string

      // Determine target project
      let actualTargetId: string | null = targetProjectId || null
      if (!actualTargetId) {
        // Get user's default project (first owned project)
        actualTargetId = await getOrCreateDefaultProject()
        if (!actualTargetId) {
          console.error('[Project] Failed to get default project')
          return null
        }
      }

      // Add to existing project
      const existingCharts = await getChartsByProject(actualTargetId)
      const maxOrder = existingCharts.length > 0
        ? Math.max(...existingCharts.map((r) => r.order))
        : -1

      // Create charts in target project
      for (let i = 0; i < clonedTabs.length; i++) {
        clonedTabs[i].order = maxOrder + 1 + i
        await createChart(actualTargetId, clonedTabs[i])
      }

      finalProjectId = actualTargetId

      // Refresh project list
      await get().refreshProjectList()

      return finalProjectId
    },
  }
}
