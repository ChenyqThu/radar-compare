import { nanoid } from 'nanoid'
import type { RadarChart } from '@/types'
import { isRegularRadar } from '@/types'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSave } from './utils'

export function createRadarChartActions(set: StoreSetter, get: StoreGetter) {
  return {
    setActiveRadar: (radarId: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = { ...currentProject, activeRadarId: radarId }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    addRadarChart: (name?: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const now = Date.now()
      const newRadar: RadarChart = {
        id: nanoid(),
        name: name ?? `对比图 ${currentProject.radarCharts.length + 1}`,
        order: currentProject.radarCharts.length,
        dimensions: [],
        vendors: [],
        createdAt: now,
        updatedAt: now,
      }
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newRadar],
        activeRadarId: newRadar.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteRadarChart: (radarId: string) => {
      const { currentProject, isRadarReferencedByTimeline } = get()
      if (!currentProject) return

      // 检查是否被时间轴引用
      if (isRadarReferencedByTimeline(radarId)) {
        return // 被引用的雷达图不能删除
      }

      // 统计普通雷达图数量（排除时间轴）
      const regularRadars = currentProject.radarCharts.filter(isRegularRadar)
      if (regularRadars.length <= 1 && regularRadars.some((r) => r.id === radarId)) {
        return // 至少保留一个普通雷达图
      }

      // 找到被删除 Tab 的索引，以便切换到前一个
      const deletedIndex = currentProject.radarCharts.findIndex((r) => r.id === radarId)
      const newRadars = currentProject.radarCharts.filter((r) => r.id !== radarId)

      let newActiveId = currentProject.activeRadarId
      if (currentProject.activeRadarId === radarId) {
        // 优先切换到前一个 Tab，如果没有则切换到当前位置的 Tab（原来的后一个）
        const targetIndex = deletedIndex > 0 ? deletedIndex - 1 : 0
        newActiveId = newRadars[targetIndex]?.id ?? null
      }

      const updated = { ...currentProject, radarCharts: newRadars, activeRadarId: newActiveId }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    duplicateRadarChart: (radarId: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const source = currentProject.radarCharts.find((r) => r.id === radarId)
      if (!source) return
      const now = Date.now()
      const newRadar: RadarChart = {
        ...JSON.parse(JSON.stringify(source)),
        id: nanoid(),
        name: `${source.name} (副本)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
      }
      const vendorIdMap: Record<string, string> = {}
      newRadar.vendors = newRadar.vendors.map((v) => {
        const newId = nanoid()
        vendorIdMap[v.id] = newId
        return { ...v, id: newId }
      })
      newRadar.dimensions = newRadar.dimensions.map((d) => {
        const newScores: Record<string, number> = {}
        Object.entries(d.scores).forEach(([oldId, score]) => {
          const newId = vendorIdMap[oldId]
          if (newId) newScores[newId] = score
        })
        return {
          ...d,
          id: nanoid(),
          scores: newScores,
          subDimensions: d.subDimensions.map((sub) => {
            const newSubScores: Record<string, number> = {}
            Object.entries(sub.scores).forEach(([oldId, score]) => {
              const newId = vendorIdMap[oldId]
              if (newId) newSubScores[newId] = score
            })
            return { ...sub, id: nanoid(), scores: newSubScores }
          }),
        }
      })
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newRadar],
        activeRadarId: newRadar.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    renameRadarChart: (radarId: string, name: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === radarId ? { ...r, name, updatedAt: Date.now() } : r
        ),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    reorderRadarCharts: (fromIndex: number, toIndex: number) => {
      const { currentProject } = get()
      if (!currentProject) return
      const radars = [...currentProject.radarCharts]
      const [removed] = radars.splice(fromIndex, 1)
      radars.splice(toIndex, 0, removed)
      radars.forEach((r, i) => (r.order = i))
      const updated = { ...currentProject, radarCharts: radars }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    importRadarChart: (data: RadarChart) => {
      const { currentProject } = get()
      if (!currentProject) return
      const now = Date.now()
      const imported: RadarChart = {
        ...data,
        id: nanoid(),
        name: `${data.name} (导入)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
      }
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, imported],
        activeRadarId: imported.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    importMultipleRadarCharts: (data: RadarChart[]) => {
      const { currentProject } = get()
      if (!currentProject || data.length === 0) return
      const now = Date.now()
      const importedRadars: RadarChart[] = data.map((radar, idx) => ({
        ...radar,
        id: nanoid(),
        name: radar.name,
        order: currentProject.radarCharts.length + idx,
        createdAt: now,
        updatedAt: now,
      }))
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, ...importedRadars],
        activeRadarId: importedRadars[0].id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },
  }
}
