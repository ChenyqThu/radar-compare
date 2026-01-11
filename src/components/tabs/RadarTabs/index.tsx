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
import { useState, useRef, useEffect } from 'react'
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
import { isTimelineRadar, isRegularRadar } from '@/types'
import { isVersionTimeline } from '@/types/versionTimeline'
import { TimeMarkerPicker, formatTimeMarker } from '@/components/settings/TimeMarkerPicker'
import styles from './RadarTabs.module.css'

// 可拖拽的 Tab 项
interface DraggableTabPaneProps {
  id: string
  children: React.ReactNode
}

function DraggableTabPane({ id, children }: DraggableTabPaneProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} className={styles.dragTrigger}>
        {children}
      </div>
    </div>
  )
}


export function RadarTabs() {
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
  } = useRadarStore()
  const { appMode, lastRadarModeTabId, lastTimelineModeTabId, setLastTabForMode } = useUIStore()
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
    const currentModeCharts = appMode === 'timeline'
      ? radarCharts.filter(isVersionTimeline)
      : radarCharts.filter(r => isRegularRadar(r) || isTimelineRadar(r))

    // 如果当前模式没有任何 chart，不做处理
    if (currentModeCharts.length === 0) return

    // 检查当前 activeRadarId 是否属于当前模式
    const isActiveInCurrentMode = activeRadarId &&
      currentModeCharts.some(c => c.id === activeRadarId)

    // 如果当前 activeRadarId 不属于当前模式（或为空），需要切换
    if (!isActiveInCurrentMode) {
      // 获取目标模式上次选中的 tab
      const lastTabId = appMode === 'timeline' ? lastTimelineModeTabId : lastRadarModeTabId

      // 检查上次的 tab 是否还在目标模式的列表中，否则用第一个
      const targetTab = lastTabId && currentModeCharts.find(c => c.id === lastTabId)
        ? lastTabId
        : currentModeCharts[0].id

      setActiveRadar(targetTab)
    }
  }, [appMode, currentProject, lastRadarModeTabId, lastTimelineModeTabId, setActiveRadar])

  // 当 activeRadarId 变化时，保存到对应模式的记忆
  useEffect(() => {
    if (!currentProject?.activeRadarId) return

    const { radarCharts, activeRadarId } = currentProject
    const activeChart = radarCharts.find(c => c.id === activeRadarId)

    if (activeChart) {
      // 根据 tab 的实际类型来更新对应模式的记忆
      if (isVersionTimeline(activeChart)) {
        setLastTabForMode('timeline', activeRadarId)
      } else {
        setLastTabForMode('radar', activeRadarId)
      }
    }
  }, [currentProject?.activeRadarId, currentProject?.radarCharts, setLastTabForMode])

  if (!currentProject) return null

  const { radarCharts, activeRadarId } = currentProject

  // 根据 appMode 过滤显示的 Tab
  const filteredCharts = appMode === 'timeline'
    ? radarCharts.filter(isVersionTimeline)
    : radarCharts.filter(r => isRegularRadar(r) || isTimelineRadar(r))

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
    const isTimeline = isTimelineRadar(chart)
    const isReferenced = !isTimeline && !isVersionTimelineChart && isRadarReferencedByTimeline(id)

    const baseItems = [
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: t.tabs.rename,
        onClick: () => handleRename(id, name),
      },
    ]

    // 版本时间轴只有复制和删除
    if (isVersionTimelineChart) {
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
          {editingId === chart.id ? (
            <div className={styles.editContainer}>
              <Input
                ref={inputRef}
                size="small"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onPressEnter={handleRenameConfirm}
                onKeyDown={(e) => e.key === 'Escape' && handleRenameCancel()}
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
              <HolderOutlined className={styles.dragHandle} />
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
                <Dropdown menu={{ items: getMenuItems(chart.id, chart.name) }} trigger={['click']}>
                  <MoreOutlined
                    className={styles.moreIcon}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
              {!isVersionTimelineChart && (
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
  const handleAdd = () => {
    if (appMode === 'timeline') {
      addVersionTimeline()
    } else {
      addRadarChart()
    }
  }

  // 获取添加按钮文本
  const addButtonText = appMode === 'timeline' ? t.versionTimeline.addTimeline : t.tabs.newTab

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                  <DraggableTabPane key={node.key} id={node.key as string}>
                    {node}
                  </DraggableTabPane>
                )}
              </DefaultTabBar>
            )}
          />
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            className={styles.addBtn}
          >
            {addButtonText}
          </Button>
        </div>
      </SortableContext>
    </DndContext>
  )
}
