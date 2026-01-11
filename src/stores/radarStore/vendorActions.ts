import { nanoid } from 'nanoid'
import type { Vendor } from '@/types'
import { PRESET_COLORS, PRESET_MARKERS, isRegularRadar } from '@/types'
import type { StoreGetter, StoreSetter } from './types'
import { debouncedSave } from './utils'

export function createVendorActions(set: StoreSetter, get: StoreGetter) {
  return {
    addVendor: (vendor?: Partial<Vendor>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const usedColors = activeRadar.vendors.map((v) => v.color)
      const availableColor = PRESET_COLORS.find((c) => !usedColors.includes(c)) ?? PRESET_COLORS[0]
      const usedMarkers = activeRadar.vendors.map((v) => v.markerType)
      const availableMarker = PRESET_MARKERS.find((m) => !usedMarkers.includes(m)) ?? PRESET_MARKERS[0]
      const newVendor: Vendor = {
        id: nanoid(),
        name: vendor?.name ?? `Vendor ${activeRadar.vendors.length + 1}`,
        color: vendor?.color ?? availableColor,
        markerType: vendor?.markerType ?? availableMarker,
        order: activeRadar.vendors.length,
        visible: true,
        ...vendor,
      }
      const updatedRadar = { ...activeRadar, vendors: [...activeRadar.vendors, newVendor], updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    updateVendor: (vendorId: string, updates: Partial<Vendor>) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const updatedRadar = {
        ...activeRadar,
        vendors: activeRadar.vendors.map((v) => (v.id === vendorId ? { ...v, ...updates } : v)),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    deleteVendor: (vendorId: string) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const updatedRadar = {
        ...activeRadar,
        vendors: activeRadar.vendors.filter((v) => v.id !== vendorId),
        dimensions: activeRadar.dimensions.map((d) => {
          const newScores = { ...d.scores }
          delete newScores[vendorId]
          return {
            ...d,
            scores: newScores,
            subDimensions: d.subDimensions.map((sub) => {
              const newSubScores = { ...sub.scores }
              delete newSubScores[vendorId]
              return { ...sub, scores: newSubScores }
            }),
          }
        }),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    reorderVendors: (fromIndex: number, toIndex: number) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const vendors = [...activeRadar.vendors]
      const [removed] = vendors.splice(fromIndex, 1)
      vendors.splice(toIndex, 0, removed)
      vendors.forEach((v, i) => (v.order = i))
      const updatedRadar = { ...activeRadar, vendors, updatedAt: Date.now() }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },

    toggleVendorVisibility: (vendorId: string) => {
      const { currentProject, getActiveRadar } = get()
      const activeRadar = getActiveRadar()
      if (!currentProject || !activeRadar || !isRegularRadar(activeRadar)) return
      const updatedRadar = {
        ...activeRadar,
        vendors: activeRadar.vendors.map((v) => (v.id === vendorId ? { ...v, visible: !v.visible } : v)),
        updatedAt: Date.now(),
      }
      const updated = {
        ...currentProject,
        radarCharts: currentProject.radarCharts.map((r) => (r.id === activeRadar.id ? updatedRadar : r)),
      }
      set({ currentProject: updated })
      debouncedSave(updated)
    },
  }
}
