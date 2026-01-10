import Dexie, { Table } from 'dexie'
import type { Project } from '@/types'
import { nanoid } from 'nanoid'
import { PRESET_COLORS, PRESET_MARKERS } from '@/types'

export class RadarDatabase extends Dexie {
  projects!: Table<Project, string>

  constructor() {
    super('RadarCompareDB')

    this.version(1).stores({
      projects: 'id, name, createdAt, updatedAt',
    })
  }
}

export const db = new RadarDatabase()

export async function initializeDatabase(): Promise<void> {
  const count = await db.projects.count()
  if (count === 0) {
    const defaultProject = createDefaultProject()
    await db.projects.add(defaultProject)
  }
}

export function createDefaultProject(): Project {
  const now = Date.now()
  const radarId = nanoid()
  const vendorIds = [nanoid(), nanoid(), nanoid()]

  return {
    id: nanoid(),
    name: '默认项目',
    description: '',
    radarCharts: [
      {
        id: radarId,
        name: '竞品对比',
        order: 0,
        dimensions: [
          {
            id: nanoid(),
            name: '功能完整性',
            description: '产品功能覆盖范围和完整程度',
            weight: 25,
            order: 0,
            scores: {
              [vendorIds[0]]: 8,
              [vendorIds[1]]: 7,
              [vendorIds[2]]: 6,
            },
            subDimensions: [],
          },
          {
            id: nanoid(),
            name: '性能表现',
            description: '系统吞吐量、延迟等性能指标',
            weight: 20,
            order: 1,
            scores: {
              [vendorIds[0]]: 7,
              [vendorIds[1]]: 8,
              [vendorIds[2]]: 7,
            },
            subDimensions: [],
          },
          {
            id: nanoid(),
            name: '易用性',
            description: '用户界面友好程度和学习成本',
            weight: 20,
            order: 2,
            scores: {
              [vendorIds[0]]: 9,
              [vendorIds[1]]: 6,
              [vendorIds[2]]: 7,
            },
            subDimensions: [],
          },
          {
            id: nanoid(),
            name: '可扩展性',
            description: '系统扩展能力和灵活性',
            weight: 15,
            order: 3,
            scores: {
              [vendorIds[0]]: 7,
              [vendorIds[1]]: 8,
              [vendorIds[2]]: 6,
            },
            subDimensions: [],
          },
          {
            id: nanoid(),
            name: '性价比',
            description: '价格与功能的综合比较',
            weight: 20,
            order: 4,
            scores: {
              [vendorIds[0]]: 8,
              [vendorIds[1]]: 6,
              [vendorIds[2]]: 9,
            },
            subDimensions: [],
          },
        ],
        vendors: [
          {
            id: vendorIds[0],
            name: 'Omada',
            color: PRESET_COLORS[0],
            markerType: PRESET_MARKERS[0],
            order: 0,
            visible: true,
          },
          {
            id: vendorIds[1],
            name: 'UniFi',
            color: PRESET_COLORS[1],
            markerType: PRESET_MARKERS[1],
            order: 1,
            visible: true,
          },
          {
            id: vendorIds[2],
            name: 'Reyee',
            color: PRESET_COLORS[2],
            markerType: PRESET_MARKERS[2],
            order: 2,
            visible: true,
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    activeRadarId: radarId,
    createdAt: now,
    updatedAt: now,
  }
}

export async function getAllProjects(): Promise<Pick<Project, 'id' | 'name'>[]> {
  const projects = await db.projects.toArray()
  return projects.map((p) => ({ id: p.id, name: p.name }))
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({
    ...project,
    updatedAt: Date.now(),
  })
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id)
}
