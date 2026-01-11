import { nanoid } from 'nanoid'
import type { VersionTimeline, VersionEvent, TimelineInfo } from '@/types/versionTimeline'
import { isVersionTimeline } from '@/types/versionTimeline'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSave } from './utils'

export function createVersionTimelineActions(set: StoreSetter, get: StoreGetter) {
  return {
    getActiveVersionTimeline: () => {
      const { currentProject } = get()
      if (!currentProject?.activeRadarId) return null
      const chart = currentProject.radarCharts.find((r) => r.id === currentProject.activeRadarId)
      return chart && isVersionTimeline(chart) ? chart : null
    },

    getVersionTimelineById: (id: string) => {
      const { currentProject } = get()
      if (!currentProject) return null
      const chart = currentProject.radarCharts.find((r) => r.id === id)
      return chart && isVersionTimeline(chart) ? chart : null
    },

    addVersionTimeline: (name?: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const now = Date.now()
      const newTimeline: VersionTimeline = {
        id: nanoid(),
        name: name ?? `时间轴 ${currentProject.radarCharts.filter(isVersionTimeline).length + 1}`,
        order: currentProject.radarCharts.length,
        isVersionTimeline: true,
        info: { title: '大事记' },
        events: [],
        createdAt: now,
        updatedAt: now,
      }
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newTimeline],
        activeRadarId: newTimeline.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteVersionTimeline: (id: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const chart = currentProject.radarCharts.find((r) => r.id === id)
      if (!chart || !isVersionTimeline(chart)) return

      // 找到被删除 Tab 的索引，以便切换到前一个
      const deletedIndex = currentProject.radarCharts.findIndex((r) => r.id === id)
      const newRadars = currentProject.radarCharts.filter((r) => r.id !== id)

      let newActiveId = currentProject.activeRadarId
      if (currentProject.activeRadarId === id) {
        // 优先切换到前一个 Tab，如果没有则切换到当前位置的 Tab（原来的后一个）
        const targetIndex = deletedIndex > 0 ? deletedIndex - 1 : 0
        newActiveId = newRadars[targetIndex]?.id ?? null
      }

      const updated = { ...currentProject, radarCharts: newRadars, activeRadarId: newActiveId }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    renameVersionTimeline: (id: string, name: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === id && isVersionTimeline(r) ? { ...r, name, updatedAt: Date.now() } : r
        ),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    duplicateVersionTimeline: (id: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const source = currentProject.radarCharts.find((r) => r.id === id)
      if (!source || !isVersionTimeline(source)) return
      const now = Date.now()
      const newTimeline: VersionTimeline = {
        ...JSON.parse(JSON.stringify(source)),
        id: nanoid(),
        name: `${source.name} (副本)`,
        order: currentProject.radarCharts.length,
        createdAt: now,
        updatedAt: now,
        events: source.events.map((e) => ({ ...e, id: nanoid() })),
      }
      const updated = {
        ...currentProject,
        radarCharts: [...currentProject.radarCharts, newTimeline],
        activeRadarId: newTimeline.id,
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    updateTimelineInfo: (id: string, info: Partial<TimelineInfo>) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === id && isVersionTimeline(r) ? { ...r, info: { ...r.info, ...info }, updatedAt: Date.now() } : r
        ),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    // 版本事件操作
    addVersionEvent: (timelineId: string, event?: Partial<VersionEvent>) => {
      const { currentProject } = get()
      if (!currentProject) return
      const timeline = currentProject.radarCharts.find((r) => r.id === timelineId)
      if (!timeline || !isVersionTimeline(timeline)) return
      const newEvent: VersionEvent = {
        id: nanoid(),
        year: event?.year ?? new Date().getFullYear(),
        title: event?.title ?? '新事件',
        description: event?.description,
        type: event?.type ?? 'minor',
        position: 'top',
        highlight: event?.highlight,
        icon: event?.icon,
        order: timeline.events.filter((e) => e.year === (event?.year ?? new Date().getFullYear())).length,
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === timelineId && isVersionTimeline(r)
            ? { ...r, events: [...r.events, newEvent], updatedAt: Date.now() }
            : r
        ),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    updateVersionEvent: (timelineId: string, eventId: string, updates: Partial<VersionEvent>) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === timelineId && isVersionTimeline(r)
            ? {
                ...r,
                events: r.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
                updatedAt: Date.now(),
              }
            : r
        ),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteVersionEvent: (timelineId: string, eventId: string) => {
      const { currentProject } = get()
      if (!currentProject) return
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) =>
          r.id === timelineId && isVersionTimeline(r)
            ? { ...r, events: r.events.filter((e) => e.id !== eventId), updatedAt: Date.now() }
            : r
        ),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    importVersionTimeline: (data: VersionTimeline) => {
      const { currentProject } = get()
      if (!currentProject) return
      const now = Date.now()
      const imported: VersionTimeline = {
        ...data,
        id: nanoid(),
        name: `${data.name} (导入)`,
        order: currentProject.radarCharts.length,
        isVersionTimeline: true,
        events: data.events.map((e) => ({ ...e, id: nanoid() })),
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
  }
}
