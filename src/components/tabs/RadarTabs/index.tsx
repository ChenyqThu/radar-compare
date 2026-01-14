import { Tabs, Button, Dropdown, Input, Modal, Popover, message } from 'antd'
import {
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  CalendarOutlined,
  HistoryOutlined,
  LockOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import React, { useState, useRef, useEffect, useContext, createContext } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import { isTimelineRadar, isRegularRadar, type AnyRadarChart } from '@/types'
import { isVersionTimeline } from '@/types/versionTimeline'
import { isManpowerChart } from '@/types/manpower'
import { TimeMarkerPicker, formatTimeMarker } from '@/components/settings/TimeMarkerPicker'
import styles from './RadarTabs.module.css'

// Context to pass drag listeners to the handle
// useSortable listeners type is inferred
const DragHandleContext = createContext<ReturnType<typeof useSortable>['listeners']>(undefined)

// Component that consumes listeners and renders the handle
function DragHandle() {
  const listeners = useContext(DragHandleContext)
  return <HolderOutlined {...listeners} className={styles.dragHandle} />
}

// 可拖拽的 Tab 项
interface DraggableTabPaneProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
}

function DraggableTabPane({ id, children, disabled }: DraggableTabPaneProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <DragHandleContext.Provider value={listeners}>
        <div className={styles.dragTrigger}>
          {children}
        </div>
      </DragHandleContext.Provider>
    </div>
  )
}


interface RadarTabsProps {
  readonly?: boolean
}

export function RadarTabs({ readonly = false }: RadarTabsProps) {
  const {
    currentProject,
    setActiveRadar,
    addRadarChart,
    deleteRadarChart,
    duplicateRadarChart,
    renameRadarChart,
    setRadarTimeMarker,
    isRadarReferencedByTimeline,
    deleteTimelineRadar,
    reorderRadarCharts,
    addVersionTimeline,
    deleteVersionTimeline,
    renameVersionTimeline,
    duplicateVersionTimeline,
    addManpowerChart,
    deleteManpowerChart,
    renameManpowerChart,
    duplicateManpowerChart,
  } = useRadarStore()
  const { appMode, lastRadarModeTabId, lastTimelineModeTabId, lastManpowerModeTabId, setLastTabForMode, shareMode, shareInfo } = useUIStore()
  const { t, language } = useI18n()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [timeMarkerPopoverId, setTimeMarkerPopoverId] = useState<string | null>(null)
  const inputRef = useRef<any>(null)

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8px后才触发拖拽，避免误触
      },
    })
  )

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // 确保当前模式有正确的 activeRadarId
  useEffect(() => {
    if (!currentProject) return

    const { radarCharts, activeRadarId } = currentProject

    // 获取当前模式的 tab 列表
    let currentModeCharts: AnyRadarChart[] =
      appMode === 'timeline'
        ? radarCharts.filter(isVersionTimeline)
        : appMode === 'manpower'
          ? radarCharts.filter(isManpowerChart)
          : radarCharts.filter(r => isRegularRadar(r) || isTimelineRadar(r))

    // 在分享模式下，进一步过滤只显示分享的 Tab
    if (shareMode && shareInfo?.sharedTabIds && shareInfo.sharedTabIds.length > 0) {
      const sharedTabIds = new Set(shareInfo.sharedTabIds)
      currentModeCharts = currentModeCharts.filter(chart => sharedTabIds.has(chart.id))
    }

    // 如果当前模式没有任何 chart，不做处理
    if (currentModeCharts.length === 0) return

    // 检查当前 activeRadarId 是否属于当前模式
    const isActiveInCurrentMode = activeRadarId &&
      currentModeCharts.some(c => c.id === activeRadarId)

    // 如果当前 activeRadarId 不属于当前模式（或为空），需要切换
    if (!isActiveInCurrentMode) {
      // 获取目标模式上次选中的 tab
      const lastTabId =
        appMode === 'timeline'
          ? lastTimelineModeTabId
          : appMode === 'manpower'
            ? lastManpowerModeTabId
            : lastRadarModeTabId

      // 检查上次的 tab 是否还在目标模式的列表中，否则用第一个
      const targetTab = lastTabId && currentModeCharts.find(c => c.id === lastTabId)
        ? lastTabId
        : currentModeCharts[0].id

      setActiveRadar(targetTab)
    }
  }, [appMode, currentProject, lastRadarModeTabId, lastTimelineModeTabId, lastManpowerModeTabId, setActiveRadar, shareMode, shareInfo])

  // 当 activeRadarId 变化时，保存到对应模式的记忆
  useEffect(() => {
    if (!currentProject?.activeRadarId) return

    const { radarCharts, activeRadarId } = currentProject
    const activeChart = radarCharts.find(c => c.id === activeRadarId)

    if (activeChart) {
      // 根据 tab 的实际类型来更新对应模式的记忆
      if (isVersionTimeline(activeChart)) {
        setLastTabForMode('timeline', activeRadarId)
      } else if (isManpowerChart(activeChart)) {
        setLastTabForMode('manpower', activeRadarId)
      } else {
        setLastTabForMode('radar', activeRadarId)
      }
    }
  }, [currentProject?.activeRadarId, currentProject?.radarCharts, setLastTabForMode])

  if (!currentProject) return null

  const { radarCharts, activeRadarId } = currentProject

  // 根据 appMode 过滤显示的 Tab
  let filteredCharts: AnyRadarChart[] =
    appMode === 'timeline'
      ? radarCharts.filter(isVersionTimeline)
      : appMode === 'manpower'
        ? radarCharts.filter(isManpowerChart)
        : radarCharts.filter(r => isRegularRadar(r) || isTimelineRadar(r))

  // 在分享模式下，进一步过滤只显示分享的 Tab
  if (shareMode && shareInfo?.sharedTabIds && shareInfo.sharedTabIds.length > 0) {
    const sharedTabIds = new Set(shareInfo.sharedTabIds)
    filteredCharts = filteredCharts.filter(chart => sharedTabIds.has(chart.id))
  }

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = filteredCharts.findIndex((r) => r.id === active.id)
    const newIndex = filteredCharts.findIndex((r) => r.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      // 需要在全局列表中找到实际位置
      const globalOldIndex = radarCharts.findIndex((r) => r.id === active.id)
      const globalNewIndex = radarCharts.findIndex((r) => r.id === over.id)
      reorderRadarCharts(globalOldIndex, globalNewIndex)
    }
  }

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditValue(currentName)
  }

  const handleRenameConfirm = () => {
    if (editingId && editValue.trim()) {
      if (appMode === 'timeline') {
        renameVersionTimeline(editingId, editValue.trim())
      } else if (appMode === 'manpower') {
        renameManpowerChart(editingId, editValue.trim())
      } else {
        renameRadarChart(editingId, editValue.trim())
      }
    }
    setEditingId(null)
  }

  const handleRenameCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleDelete = (id: string) => {
    const chart = radarCharts.find((r) => r.id === id)
    if (!chart) return

    // 人力排布图
    if (isManpowerChart(chart)) {
      const manpowerCharts = radarCharts.filter(isManpowerChart)
      if (manpowerCharts.length <= 1) {
        Modal.warning({
          title: t.common.delete,
          content: t.tabs.confirmDelete,
        })
        return
      }
      Modal.confirm({
        title: t.common.confirm,
        content: t.tabs.confirmDelete,
        okText: t.common.confirm,
        cancelText: t.common.cancel,
        onOk: async () => {
          const success = await deleteManpowerChart(id)
          if (!success) {
            message.error(t.common?.saveFailed || '删除失败')
          }
        },
      })
      return
    }

    // 版本时间轴模式
    if (isVersionTimeline(chart)) {
      const versionTimelines = radarCharts.filter(isVersionTimeline)
      if (versionTimelines.length <= 1) {
        Modal.warning({
          title: t.common.delete,
          content: t.tabs.confirmDelete,
        })
        return
      }
      Modal.confirm({
        title: t.common.confirm,
        content: t.tabs.confirmDelete,
        okText: t.common.confirm,
        cancelText: t.common.cancel,
        onOk: () => deleteVersionTimeline(id),
      })
      return
    }

    // 时间轴雷达图直接删除
    if (isTimelineRadar(chart)) {
      Modal.confirm({
        title: t.common.confirm,
        content: t.tabs.confirmDelete,
        okText: t.common.confirm,
        cancelText: t.common.cancel,
        onOk: () => deleteTimelineRadar(id),
      })
      return
    }

    // 检查是否被时间轴引用
    if (isRadarReferencedByTimeline(id)) {
      message.warning(t.timeline.cannotDeleteReferenced)
      return
    }

    // 检查普通雷达图数量
    const regularRadars = radarCharts.filter(isRegularRadar)
    if (regularRadars.length <= 1) {
      Modal.warning({
        title: t.common.delete,
        content: t.tabs.confirmDelete,
      })
      return
    }

    Modal.confirm({
      title: t.common.confirm,
      content: t.tabs.confirmDelete,
      okText: t.common.confirm,
      cancelText: t.common.cancel,
      onOk: () => deleteRadarChart(id),
    })
  }

  const getMenuItems = (id: string, name: string) => {
    const chart = radarCharts.find((r) => r.id === id)
    if (!chart) return []

    const isVersionTimelineChart = isVersionTimeline(chart)
    const isManpowerChartType = isManpowerChart(chart)
    const isTimeline = isTimelineRadar(chart)
    const isReferenced = !isTimeline && !isVersionTimelineChart && !isManpowerChartType && isRadarReferencedByTimeline(id)

    const baseItems = [
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: t.tabs.rename,
        onClick: () => handleRename(id, name),
      },
    ]

    // 人力排布图只有复制和删除
    if (isManpowerChartType) {
      baseItems.push({
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: t.tabs.duplicate,
        onClick: async () => {
          const success = await duplicateManpowerChart(id)
          if (!success) {
            message.error(t.common?.saveFailed || '复制失败')
          }
        },
      })
    } else if (isVersionTimelineChart) {
      // 版本时间轴只有复制和删除
      baseItems.push({
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: t.tabs.duplicate,
        onClick: () => duplicateVersionTimeline(id),
      })
    } else if (!isTimeline) {
      // 普通雷达图才有复制和时间标记选项
      baseItems.push({
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: t.tabs.duplicate,
        onClick: () => duplicateRadarChart(id),
      })
      baseItems.push({
        key: 'timeMarker',
        icon: <CalendarOutlined />,
        label: t.timeline.setTimeMarker,
        onClick: () => setTimeMarkerPopoverId(id),
      })
    }

    baseItems.push({ type: 'divider' as const } as any)

    // 删除选项
    baseItems.push({
      key: 'delete',
      icon: isReferenced ? <LockOutlined /> : <DeleteOutlined />,
      label: isReferenced ? t.timeline.cannotDeleteReferenced : t.tabs.delete,
      danger: !isReferenced,
      disabled: isReferenced,
      onClick: () => !isReferenced && handleDelete(id),
    } as any)

    return baseItems
  }

  const items = filteredCharts.map((chart) => {
    const isTimeline = isTimelineRadar(chart)
    const isVersionTimelineChart = isVersionTimeline(chart)
    const isReferenced = !isTimeline && !isVersionTimelineChart && isRadarReferencedByTimeline(chart.id)
    const timeMarker = !isTimeline && !isVersionTimelineChart && isRegularRadar(chart) ? chart.timeMarker : undefined

    return {
      key: chart.id,
      label: (
        <div className={styles.tabLabel}>
          {editingId === chart.id && !readonly ? (
            <div className={styles.editContainer}>
              <Input
                ref={inputRef}
                size="small"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onPressEnter={handleRenameConfirm}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleRenameCancel()
                    return
                  }
                  // 阻止左右键冒泡，避免触发 Tabs 切换或 VersionTimeline滚动
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.stopPropagation()
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className={styles.editInput}
              />
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRenameConfirm()
                }}
                className={styles.confirmBtn}
              />
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRenameCancel()
                }}
                className={styles.cancelBtn}
              />
            </div>
          ) : (
            <>
              {!readonly && <DragHandle />}
              {isTimeline && <HistoryOutlined className={styles.timelineIcon} />}
              {isReferenced && <LockOutlined className={styles.lockIcon} />}
              <div className={styles.tabContent}>
                <span className={styles.tabName}>
                  {chart.name}
                </span>
                {timeMarker && (
                  <span className={styles.timeMarkerBadge}>
                    {formatTimeMarker(timeMarker, language)}
                  </span>
                )}
                {!readonly && (
                  <Dropdown menu={{ items: getMenuItems(chart.id, chart.name) }} trigger={['click']}>
                    <MoreOutlined
                      className={styles.moreIcon}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                )}
              </div>
              {!readonly && !isVersionTimelineChart && (
                <Popover
                  open={timeMarkerPopoverId === chart.id}
                  onOpenChange={(open) => !open && setTimeMarkerPopoverId(null)}
                  trigger="click"
                  placement="bottom"
                  content={
                    <div className={styles.timeMarkerPopover}>
                      <TimeMarkerPicker
                        value={timeMarker}
                        onChange={(value) => {
                          if (value === null) {
                            // 取消或清除
                            setTimeMarkerPopoverId(null)
                          } else {
                            // 确认选择
                            setRadarTimeMarker(chart.id, value.year, value.month)
                            setTimeMarkerPopoverId(null)
                          }
                        }}
                      />
                    </div>
                  }
                >
                  <span />
                </Popover>
              )}
            </>
          )}
        </div>
      ),
    }
  })

  // 处理添加按钮点击
  const handleAdd = async () => {
    if (appMode === 'timeline') {
      addVersionTimeline()
    } else if (appMode === 'manpower') {
      const success = await addManpowerChart()
      if (!success) {
        message.error(t.common?.saveFailed || '保存失败')
      }
    } else {
      addRadarChart()
    }
  }

  // 获取添加按钮文本
  const addButtonText = t.tabs.newTab

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={readonly ? undefined : handleDragEnd}>
      <SortableContext items={filteredCharts.map((r) => r.id)} strategy={horizontalListSortingStrategy}>
        <div className={styles.container}>
          <Tabs
            activeKey={activeRadarId ?? undefined}
            onChange={setActiveRadar}
            type="card"
            items={items}
            className={styles.tabs}
            renderTabBar={(props, DefaultTabBar) => (
              <DefaultTabBar {...props}>
                {(node) => (
                  <DraggableTabPane key={node.key} id={node.key as string} disabled={readonly}>
                    {node}
                  </DraggableTabPane>
                )}
              </DefaultTabBar>
            )}
          />
          {!readonly && (
            <Button
              type="text"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              className={styles.addBtn}
            >
              {addButtonText}
            </Button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
