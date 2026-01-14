import { useState, useEffect, useCallback, useRef } from 'react'
import { debounce } from 'lodash-es'
import { STORAGE_KEYS } from '../../../constants'

// Debounce delay for localStorage writes (ms)
const STORAGE_DEBOUNCE_DELAY = 300

/**
 * 管理项目折叠状态和 localStorage 持久化
 * 使用防抖优化 localStorage 写入性能
 */
export function useCollapsedState() {
  // 从localStorage加载折叠状态
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.collapsedProjects)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // 使用防抖保存折叠状态到localStorage
  const debouncedSaveRef = useRef(
    debounce((projects: Set<string>) => {
      localStorage.setItem(STORAGE_KEYS.collapsedProjects, JSON.stringify([...projects]))
    }, STORAGE_DEBOUNCE_DELAY)
  )

  useEffect(() => {
    debouncedSaveRef.current(collapsedProjects)
    // Cleanup: flush on unmount to ensure state is saved
    return () => {
      debouncedSaveRef.current.flush()
    }
  }, [collapsedProjects])

  // 切换项目折叠状态
  const toggleProjectCollapse = useCallback((projectId: string) => {
    setCollapsedProjects(prev => {
      const newCollapsed = new Set(prev)
      if (newCollapsed.has(projectId)) {
        newCollapsed.delete(projectId)
      } else {
        newCollapsed.add(projectId)
      }
      return newCollapsed
    })
  }, [])

  return {
    collapsedProjects,
    toggleProjectCollapse,
  }
}

/**
 * 管理团队详情显示状态
 * 使用防抖优化 localStorage 写入性能
 */
export function useShowTeamDetails() {
  const [showTeamDetails, setShowTeamDetails] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.showTeamDetails)
      return saved ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  // 使用防抖保存显示控制状态到localStorage
  const debouncedSaveRef = useRef(
    debounce((value: boolean) => {
      localStorage.setItem(STORAGE_KEYS.showTeamDetails, JSON.stringify(value))
    }, STORAGE_DEBOUNCE_DELAY)
  )

  useEffect(() => {
    debouncedSaveRef.current(showTeamDetails)
    // Cleanup: flush on unmount to ensure state is saved
    return () => {
      debouncedSaveRef.current.flush()
    }
  }, [showTeamDetails])

  return {
    showTeamDetails,
    setShowTeamDetails,
  }
}
