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
        const now = Date.now()

        // Create default radar chart with sample data
        const defaultRadarChart: AnyRadarChart = {
          id: nanoid(),
          name: '竞品对比示例',
          order: 0,
          dimensions: [
            {
              id: nanoid(),
              name: '功能完整性',
              description: '产品功能的丰富程度和完整性',
              weight: 30,
              order: 0,
              scores: {},
              subDimensions: [],
            },
            {
              id: nanoid(),
              name: '性能表现',
              description: '系统响应速度和稳定性',
              weight: 25,
              order: 1,
              scores: {},
              subDimensions: [],
            },
            {
              id: nanoid(),
              name: '用户体验',
              description: '界面设计和交互体验',
              weight: 25,
              order: 2,
              scores: {},
              subDimensions: [],
            },
            {
              id: nanoid(),
              name: '价格',
              description: '产品定价和性价比',
              weight: 20,
              order: 3,
              scores: {},
              subDimensions: [],
            },
          ],
          vendors: [
            {
              id: nanoid(),
              name: '产品 A',
              color: '#1890ff',
              markerType: 'circle',
              order: 0,
              visible: true,
            },
            {
              id: nanoid(),
              name: '产品 B',
              color: '#52c41a',
              markerType: 'rect',
              order: 1,
              visible: true,
            },
            {
              id: nanoid(),
              name: '产品 C',
              color: '#faad14',
              markerType: 'triangle',
              order: 2,
              visible: true,
            },
          ],
          createdAt: now,
          updatedAt: now,
        }

        // Assign sample scores
        const vendors = defaultRadarChart.vendors as Vendor[]
        const dimensions = defaultRadarChart.dimensions as Dimension[]

        // Sample scores matrix (3 vendors x 4 dimensions)
        const sampleScores = [
          [8, 7, 6], // 功能完整性: A=8, B=7, C=6
          [7, 8, 7], // 性能表现: A=7, B=8, C=7
          [6, 9, 8], // 用户体验: A=6, B=9, C=8
          [5, 7, 9], // 价格: A=5, B=7, C=9
        ]

        dimensions.forEach((dim, dimIdx) => {
          const scores: Record<string, number> = {}
          vendors.forEach((vendor, vendorIdx) => {
            scores[vendor.id] = sampleScores[dimIdx][vendorIdx]
          })
          dim.scores = scores
        })

        // Create default timeline with sample events
        const defaultTimeline: AnyRadarChart = {
          id: nanoid(),
          name: '发展历程示例',
          isVersionTimeline: true,
          order: 1,
          events: [
            {
              id: nanoid(),
              year: 2020,
              month: 1,
              title: '公司成立',
              description: '在深圳成立，专注于企业级软件研发',
              type: 'milestone',
            },
            {
              id: nanoid(),
              year: 2020,
              month: 6,
              title: '推出 v1.0',
              description: '首个正式版本发布，支持基础功能',
              type: 'major',
            },
            {
              id: nanoid(),
              year: 2021,
              month: 3,
              title: '获得 A 轮融资',
              description: '融资金额 $5000万，估值达 $2亿',
              type: 'funding',
              highlight: ['$5000万', '$2亿'],
            },
            {
              id: nanoid(),
              year: 2021,
              month: 9,
              title: '推出 v2.0',
              description: '全新架构，性能提升 300%',
              type: 'major',
              highlight: ['300%'],
            },
            {
              id: nanoid(),
              year: 2022,
              month: 2,
              title: '海外市场拓展',
              description: '进入欧美市场，设立海外办事处',
              type: 'milestone',
            },
            {
              id: nanoid(),
              year: 2022,
              month: 8,
              title: '推出企业版',
              description: '支持私有化部署和定制化服务',
              type: 'major',
            },
            {
              id: nanoid(),
              year: 2023,
              month: 5,
              title: '用户突破 100 万',
              description: '全球活跃用户达到 100 万，覆盖 50+ 国家',
              type: 'achievement',
              highlight: ['100 万', '50+'],
            },
            {
              id: nanoid(),
              year: 2024,
              month: 1,
              title: '推出 v3.0',
              description: 'AI 驱动的智能分析功能上线',
              type: 'major',
              highlight: ['AI'],
            },
          ],
          info: {
            title: '产品发展大事记',
            company: 'Example Inc.',
            theme: 'teal',
            eventTypes: {
              milestone: {
                label: '里程碑',
                color: '#1890ff',
              },
              major: {
                label: '主要版本',
                color: '#52c41a',
              },
              funding: {
                label: '融资',
                color: '#fa8c16',
              },
              achievement: {
                label: '成就',
                color: '#13c2c2',
              },
            },
          },
          createdAt: now,
          updatedAt: now,
        }

        // Create default manpower chart with sample data
        const teamIds = [nanoid(), nanoid(), nanoid(), nanoid()]
        const projectIds = [nanoid(), nanoid(), nanoid(), nanoid()]
        const timePointIds = [nanoid(), nanoid(), nanoid(), nanoid()]

        const defaultManpower: AnyRadarChart = {
          id: nanoid(),
          name: '人力排布示例',
          isManpowerChart: true,
          order: 2,
          metadata: {
            title: '研发人力排布',
            version: '1.0.0',
            totalPersons: 32,
          },
          teams: [
            { id: teamIds[0], name: '前端团队', capacity: 8, color: '#5470c6', badge: 'FE' },
            { id: teamIds[1], name: '后端团队', capacity: 10, color: '#91cc75', badge: 'BE' },
            { id: teamIds[2], name: '测试团队', capacity: 6, color: '#fac858', badge: 'QA' },
            { id: teamIds[3], name: 'UI团队', capacity: 4, color: '#ee6666', badge: 'UI' },
          ],
          projects: [
            { id: projectIds[0], name: 'CRM 系统', status: 'development', color: '#5470c6' },
            { id: projectIds[1], name: 'ERP 升级', status: 'planning', color: '#91cc75' },
            { id: projectIds[2], name: '移动 App', status: 'development', color: '#fac858' },
            { id: projectIds[3], name: '数据平台', status: 'release', color: '#73c0de' },
          ],
          timePoints: [
            { id: timePointIds[0], name: '2024 Q1', date: '2024-01', type: 'current' },
            { id: timePointIds[1], name: '2024 Q2', date: '2024-04', type: 'planning' },
            { id: timePointIds[2], name: '2024 Q3', date: '2024-07', type: 'planning' },
            { id: timePointIds[3], name: '2024 Q4', date: '2024-10', type: 'release' },
          ],
          allocations: {
            // Q1 allocations
            [timePointIds[0]]: {
              [projectIds[0]]: {
                [teamIds[0]]: { occupied: 4, prerelease: 1 },
                [teamIds[1]]: { occupied: 5, prerelease: 2 },
                [teamIds[2]]: { occupied: 3, prerelease: 1 },
                [teamIds[3]]: { occupied: 2, prerelease: 0 },
              },
              [projectIds[1]]: {
                [teamIds[0]]: { occupied: 2, prerelease: 0 },
                [teamIds[1]]: { occupied: 3, prerelease: 0 },
                [teamIds[2]]: { occupied: 1, prerelease: 0 },
                [teamIds[3]]: { occupied: 1, prerelease: 0 },
              },
              [projectIds[2]]: {
                [teamIds[0]]: { occupied: 2, prerelease: 0 },
                [teamIds[1]]: { occupied: 2, prerelease: 0 },
                [teamIds[2]]: { occupied: 2, prerelease: 0 },
                [teamIds[3]]: { occupied: 1, prerelease: 0 },
              },
              [projectIds[3]]: {
                [teamIds[0]]: { occupied: 0, prerelease: 0 },
                [teamIds[1]]: { occupied: 0, prerelease: 0 },
                [teamIds[2]]: { occupied: 0, prerelease: 0 },
                [teamIds[3]]: { occupied: 0, prerelease: 0 },
              },
            },
            // Q2 allocations
            [timePointIds[1]]: {
              [projectIds[0]]: {
                [teamIds[0]]: { occupied: 3, prerelease: 2 },
                [teamIds[1]]: { occupied: 3, prerelease: 2 },
                [teamIds[2]]: { occupied: 4, prerelease: 2 },
                [teamIds[3]]: { occupied: 1, prerelease: 1 },
              },
              [projectIds[1]]: {
                [teamIds[0]]: { occupied: 3, prerelease: 0 },
                [teamIds[1]]: { occupied: 4, prerelease: 0 },
                [teamIds[2]]: { occupied: 1, prerelease: 0 },
                [teamIds[3]]: { occupied: 2, prerelease: 0 },
              },
              [projectIds[2]]: {
                [teamIds[0]]: { occupied: 2, prerelease: 1 },
                [teamIds[1]]: { occupied: 3, prerelease: 1 },
                [teamIds[2]]: { occupied: 1, prerelease: 0 },
                [teamIds[3]]: { occupied: 1, prerelease: 0 },
              },
              [projectIds[3]]: {
                [teamIds[0]]: { occupied: 0, prerelease: 0 },
                [teamIds[1]]: { occupied: 0, prerelease: 0 },
                [teamIds[2]]: { occupied: 0, prerelease: 0 },
                [teamIds[3]]: { occupied: 0, prerelease: 0 },
              },
            },
            // Q3 allocations
            [timePointIds[2]]: {
              [projectIds[0]]: {
                [teamIds[0]]: { occupied: 1, prerelease: 1 },
                [teamIds[1]]: { occupied: 1, prerelease: 1 },
                [teamIds[2]]: { occupied: 2, prerelease: 2 },
                [teamIds[3]]: { occupied: 0, prerelease: 0 },
              },
              [projectIds[1]]: {
                [teamIds[0]]: { occupied: 4, prerelease: 1 },
                [teamIds[1]]: { occupied: 6, prerelease: 2 },
                [teamIds[2]]: { occupied: 2, prerelease: 0 },
                [teamIds[3]]: { occupied: 2, prerelease: 1 },
              },
              [projectIds[2]]: {
                [teamIds[0]]: { occupied: 2, prerelease: 2 },
                [teamIds[1]]: { occupied: 2, prerelease: 2 },
                [teamIds[2]]: { occupied: 2, prerelease: 2 },
                [teamIds[3]]: { occupied: 1, prerelease: 1 },
              },
              [projectIds[3]]: {
                [teamIds[0]]: { occupied: 1, prerelease: 0 },
                [teamIds[1]]: { occupied: 1, prerelease: 0 },
                [teamIds[2]]: { occupied: 0, prerelease: 0 },
                [teamIds[3]]: { occupied: 1, prerelease: 0 },
              },
            },
            // Q4 allocations
            [timePointIds[3]]: {
              [projectIds[0]]: {
                [teamIds[0]]: { occupied: 0, prerelease: 0 },
                [teamIds[1]]: { occupied: 0, prerelease: 0 },
                [teamIds[2]]: { occupied: 0, prerelease: 0 },
                [teamIds[3]]: { occupied: 0, prerelease: 0 },
              },
              [projectIds[1]]: {
                [teamIds[0]]: { occupied: 3, prerelease: 2 },
                [teamIds[1]]: { occupied: 4, prerelease: 3 },
                [teamIds[2]]: { occupied: 4, prerelease: 2 },
                [teamIds[3]]: { occupied: 1, prerelease: 1 },
              },
              [projectIds[2]]: {
                [teamIds[0]]: { occupied: 0, prerelease: 0 },
                [teamIds[1]]: { occupied: 0, prerelease: 0 },
                [teamIds[2]]: { occupied: 0, prerelease: 0 },
                [teamIds[3]]: { occupied: 0, prerelease: 0 },
              },
              [projectIds[3]]: {
                [teamIds[0]]: { occupied: 5, prerelease: 0 },
                [teamIds[1]]: { occupied: 6, prerelease: 0 },
                [teamIds[2]]: { occupied: 2, prerelease: 0 },
                [teamIds[3]]: { occupied: 3, prerelease: 0 },
              },
            },
          },
          createdAt: now,
          updatedAt: now,
        }

        await createChart(projectId, defaultRadarChart)
        await createChart(projectId, defaultTimeline)
        await createChart(projectId, defaultManpower)
        charts = [defaultRadarChart, defaultTimeline, defaultManpower]
        // Update active_chart_id
        await updateProjectMeta(projectId, { activeChartId: defaultRadarChart.id })
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

      // Create default radar chart with sample data
      const defaultRadarChart: AnyRadarChart = {
        id: nanoid(),
        name: '竞品对比示例',
        order: 0,
        dimensions: [
          {
            id: nanoid(),
            name: '功能完整性',
            description: '产品功能的丰富程度和完整性',
            weight: 30,
            order: 0,
            scores: {},
            subDimensions: [],
          },
          {
            id: nanoid(),
            name: '性能表现',
            description: '系统响应速度和稳定性',
            weight: 25,
            order: 1,
            scores: {},
            subDimensions: [],
          },
          {
            id: nanoid(),
            name: '用户体验',
            description: '界面设计和交互体验',
            weight: 25,
            order: 2,
            scores: {},
            subDimensions: [],
          },
          {
            id: nanoid(),
            name: '价格',
            description: '产品定价和性价比',
            weight: 20,
            order: 3,
            scores: {},
            subDimensions: [],
          },
        ],
        vendors: [
          {
            id: nanoid(),
            name: '产品 A',
            color: '#1890ff',
            markerType: 'circle',
            order: 0,
            visible: true,
          },
          {
            id: nanoid(),
            name: '产品 B',
            color: '#52c41a',
            markerType: 'rect',
            order: 1,
            visible: true,
          },
          {
            id: nanoid(),
            name: '产品 C',
            color: '#faad14',
            markerType: 'triangle',
            order: 2,
            visible: true,
          },
        ],
        createdAt: now,
        updatedAt: now,
      }

      // Assign sample scores
      const vendors = defaultRadarChart.vendors as Vendor[]
      const dimensions = defaultRadarChart.dimensions as Dimension[]

      // Sample scores matrix (3 vendors x 4 dimensions)
      const sampleScores = [
        [8, 7, 6], // 功能完整性: A=8, B=7, C=6
        [7, 8, 7], // 性能表现: A=7, B=8, C=7
        [6, 9, 8], // 用户体验: A=6, B=9, C=8
        [5, 7, 9], // 价格: A=5, B=7, C=9
      ]

      dimensions.forEach((dim, dimIdx) => {
        const scores: Record<string, number> = {}
        vendors.forEach((vendor, vendorIdx) => {
          scores[vendor.id] = sampleScores[dimIdx][vendorIdx]
        })
        dim.scores = scores
      })

      // Create default timeline with sample events
      const defaultTimeline: AnyRadarChart = {
        id: nanoid(),
        name: '发展历程示例',
        isVersionTimeline: true,
        order: 1,
        events: [
          {
            id: nanoid(),
            year: 2020,
            month: 1,
            title: '公司成立',
            description: '在深圳成立，专注于企业级软件研发',
            type: 'milestone',
          },
          {
            id: nanoid(),
            year: 2020,
            month: 6,
            title: '推出 v1.0',
            description: '首个正式版本发布，支持基础功能',
            type: 'major',
          },
          {
            id: nanoid(),
            year: 2021,
            month: 3,
            title: '获得 A 轮融资',
            description: '融资金额 $5000万，估值达 $2亿',
            type: 'funding',
            highlight: ['$5000万', '$2亿'],
          },
          {
            id: nanoid(),
            year: 2021,
            month: 9,
            title: '推出 v2.0',
            description: '全新架构，性能提升 300%',
            type: 'major',
            highlight: ['300%'],
          },
          {
            id: nanoid(),
            year: 2022,
            month: 2,
            title: '海外市场拓展',
            description: '进入欧美市场，设立海外办事处',
            type: 'milestone',
          },
          {
            id: nanoid(),
            year: 2022,
            month: 8,
            title: '推出企业版',
            description: '支持私有化部署和定制化服务',
            type: 'major',
          },
          {
            id: nanoid(),
            year: 2023,
            month: 5,
            title: '用户突破 100 万',
            description: '全球活跃用户达到 100 万，覆盖 50+ 国家',
            type: 'achievement',
            highlight: ['100 万', '50+'],
          },
          {
            id: nanoid(),
            year: 2024,
            month: 1,
            title: '推出 v3.0',
            description: 'AI 驱动的智能分析功能上线',
            type: 'major',
            highlight: ['AI'],
          },
        ],
        info: {
          title: '产品发展大事记',
          company: 'Example Inc.',
          theme: 'teal',
          eventTypes: {
            milestone: {
              label: '里程碑',
              color: '#1890ff',
            },
            major: {
              label: '主要版本',
              color: '#52c41a',
            },
            funding: {
              label: '融资',
              color: '#fa8c16',
            },
            achievement: {
              label: '成就',
              color: '#13c2c2',
            },
          },
        },
        createdAt: now,
        updatedAt: now,
      }

      // Create default manpower chart with sample data
      const teamIds = [nanoid(), nanoid(), nanoid(), nanoid()]
      const projectIdsManpower = [nanoid(), nanoid(), nanoid(), nanoid()]
      const timePointIds = [nanoid(), nanoid(), nanoid(), nanoid()]

      const defaultManpower: AnyRadarChart = {
        id: nanoid(),
        name: '人力排布示例',
        isManpowerChart: true,
        order: 2,
        metadata: {
          title: '研发人力排布',
          version: '1.0.0',
          totalPersons: 32,
        },
        teams: [
          { id: teamIds[0], name: '前端团队', capacity: 8, color: '#5470c6', badge: 'FE' },
          { id: teamIds[1], name: '后端团队', capacity: 10, color: '#91cc75', badge: 'BE' },
          { id: teamIds[2], name: '测试团队', capacity: 6, color: '#fac858', badge: 'QA' },
          { id: teamIds[3], name: 'UI团队', capacity: 4, color: '#ee6666', badge: 'UI' },
        ],
        projects: [
          { id: projectIdsManpower[0], name: 'CRM 系统', status: 'development', color: '#5470c6' },
          { id: projectIdsManpower[1], name: 'ERP 升级', status: 'planning', color: '#91cc75' },
          { id: projectIdsManpower[2], name: '移动 App', status: 'development', color: '#fac858' },
          { id: projectIdsManpower[3], name: '数据平台', status: 'release', color: '#73c0de' },
        ],
        timePoints: [
          { id: timePointIds[0], name: '2024 Q1', date: '2024-01', type: 'current' },
          { id: timePointIds[1], name: '2024 Q2', date: '2024-04', type: 'planning' },
          { id: timePointIds[2], name: '2024 Q3', date: '2024-07', type: 'planning' },
          { id: timePointIds[3], name: '2024 Q4', date: '2024-10', type: 'release' },
        ],
        allocations: {
          [timePointIds[0]]: {
            [projectIdsManpower[0]]: {
              [teamIds[0]]: { occupied: 4, prerelease: 1 },
              [teamIds[1]]: { occupied: 5, prerelease: 2 },
              [teamIds[2]]: { occupied: 3, prerelease: 1 },
              [teamIds[3]]: { occupied: 2, prerelease: 0 },
            },
            [projectIdsManpower[1]]: {
              [teamIds[0]]: { occupied: 2, prerelease: 0 },
              [teamIds[1]]: { occupied: 3, prerelease: 0 },
              [teamIds[2]]: { occupied: 1, prerelease: 0 },
              [teamIds[3]]: { occupied: 1, prerelease: 0 },
            },
            [projectIdsManpower[2]]: {
              [teamIds[0]]: { occupied: 2, prerelease: 0 },
              [teamIds[1]]: { occupied: 2, prerelease: 0 },
              [teamIds[2]]: { occupied: 2, prerelease: 0 },
              [teamIds[3]]: { occupied: 1, prerelease: 0 },
            },
            [projectIdsManpower[3]]: {
              [teamIds[0]]: { occupied: 0, prerelease: 0 },
              [teamIds[1]]: { occupied: 0, prerelease: 0 },
              [teamIds[2]]: { occupied: 0, prerelease: 0 },
              [teamIds[3]]: { occupied: 0, prerelease: 0 },
            },
          },
          [timePointIds[1]]: {
            [projectIdsManpower[0]]: {
              [teamIds[0]]: { occupied: 3, prerelease: 2 },
              [teamIds[1]]: { occupied: 3, prerelease: 2 },
              [teamIds[2]]: { occupied: 4, prerelease: 2 },
              [teamIds[3]]: { occupied: 1, prerelease: 1 },
            },
            [projectIdsManpower[1]]: {
              [teamIds[0]]: { occupied: 3, prerelease: 0 },
              [teamIds[1]]: { occupied: 4, prerelease: 0 },
              [teamIds[2]]: { occupied: 1, prerelease: 0 },
              [teamIds[3]]: { occupied: 2, prerelease: 0 },
            },
            [projectIdsManpower[2]]: {
              [teamIds[0]]: { occupied: 2, prerelease: 1 },
              [teamIds[1]]: { occupied: 3, prerelease: 1 },
              [teamIds[2]]: { occupied: 1, prerelease: 0 },
              [teamIds[3]]: { occupied: 1, prerelease: 0 },
            },
            [projectIdsManpower[3]]: {
              [teamIds[0]]: { occupied: 0, prerelease: 0 },
              [teamIds[1]]: { occupied: 0, prerelease: 0 },
              [teamIds[2]]: { occupied: 0, prerelease: 0 },
              [teamIds[3]]: { occupied: 0, prerelease: 0 },
            },
          },
          [timePointIds[2]]: {
            [projectIdsManpower[0]]: {
              [teamIds[0]]: { occupied: 1, prerelease: 1 },
              [teamIds[1]]: { occupied: 1, prerelease: 1 },
              [teamIds[2]]: { occupied: 2, prerelease: 2 },
              [teamIds[3]]: { occupied: 0, prerelease: 0 },
            },
            [projectIdsManpower[1]]: {
              [teamIds[0]]: { occupied: 4, prerelease: 1 },
              [teamIds[1]]: { occupied: 6, prerelease: 2 },
              [teamIds[2]]: { occupied: 2, prerelease: 0 },
              [teamIds[3]]: { occupied: 2, prerelease: 1 },
            },
            [projectIdsManpower[2]]: {
              [teamIds[0]]: { occupied: 2, prerelease: 2 },
              [teamIds[1]]: { occupied: 2, prerelease: 2 },
              [teamIds[2]]: { occupied: 2, prerelease: 2 },
              [teamIds[3]]: { occupied: 1, prerelease: 1 },
            },
            [projectIdsManpower[3]]: {
              [teamIds[0]]: { occupied: 1, prerelease: 0 },
              [teamIds[1]]: { occupied: 1, prerelease: 0 },
              [teamIds[2]]: { occupied: 0, prerelease: 0 },
              [teamIds[3]]: { occupied: 1, prerelease: 0 },
            },
          },
          [timePointIds[3]]: {
            [projectIdsManpower[0]]: {
              [teamIds[0]]: { occupied: 0, prerelease: 0 },
              [teamIds[1]]: { occupied: 0, prerelease: 0 },
              [teamIds[2]]: { occupied: 0, prerelease: 0 },
              [teamIds[3]]: { occupied: 0, prerelease: 0 },
            },
            [projectIdsManpower[1]]: {
              [teamIds[0]]: { occupied: 3, prerelease: 2 },
              [teamIds[1]]: { occupied: 4, prerelease: 3 },
              [teamIds[2]]: { occupied: 4, prerelease: 2 },
              [teamIds[3]]: { occupied: 1, prerelease: 1 },
            },
            [projectIdsManpower[2]]: {
              [teamIds[0]]: { occupied: 0, prerelease: 0 },
              [teamIds[1]]: { occupied: 0, prerelease: 0 },
              [teamIds[2]]: { occupied: 0, prerelease: 0 },
              [teamIds[3]]: { occupied: 0, prerelease: 0 },
            },
            [projectIdsManpower[3]]: {
              [teamIds[0]]: { occupied: 5, prerelease: 0 },
              [teamIds[1]]: { occupied: 6, prerelease: 0 },
              [teamIds[2]]: { occupied: 2, prerelease: 0 },
              [teamIds[3]]: { occupied: 3, prerelease: 0 },
            },
          },
        },
        createdAt: now,
        updatedAt: now,
      }

      const chartCreated = await createChart(projectId, defaultRadarChart)
      if (!chartCreated) {
        console.error('[Project] Failed to create default chart')
      }

      const timelineCreated = await createChart(projectId, defaultTimeline)
      if (!timelineCreated) {
        console.error('[Project] Failed to create default timeline')
      }

      const manpowerCreated = await createChart(projectId, defaultManpower)
      if (!manpowerCreated) {
        console.error('[Project] Failed to create default manpower chart')
      }

      // Update active_chart_id
      await updateProjectMeta(projectId, { activeChartId: defaultRadarChart.id })

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
     * Returns { projectId, copiedTabIds } on success
     */
    copySharedTabsToMyProject: async (
      tabIds: string[],
      targetProjectId?: string
    ): Promise<{ projectId: string; copiedTabIds: string[] } | null> => {
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
      const copiedTabIds: string[] = []

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
        copiedTabIds.push(clonedTabs[i].id)
      }

      finalProjectId = actualTargetId

      // Refresh project list
      await get().refreshProjectList()

      return { projectId: finalProjectId, copiedTabIds }
    },

    /**
     * Clear current project state (for exiting share mode)
     */
    clearCurrentProject: () => {
      set({
        currentProject: null,
        currentProjectId: null,
        currentProjectName: '',
        isLoading: false,
      })
    },
  }
}
