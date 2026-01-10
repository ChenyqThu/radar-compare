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
} from '@dnd-kit/sortable'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import { isTimelineRadar, isRegularRadar } from '@/types'
import { TimeMarkerPicker, formatTimeMarker } from '@/components/settings/TimeMarkerPicker'
import styles from './RadarTabs.module.css'

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
  } = useRadarStore()
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

  if (!currentProject) return null

  const { radarCharts, activeRadarId } = currentProject

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = radarCharts.findIndex((r) => r.id === active.id)
    const newIndex = radarCharts.findIndex((r) => r.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderRadarCharts(oldIndex, newIndex)
    }
  }

  const handleRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditValue(currentName)
  }

  const handleRenameConfirm = () => {
    if (editingId && editValue.trim()) {
      renameRadarChart(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  const handleRenameCancel = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleDelete = (id: string) => {
    const radar = radarCharts.find((r) => r.id === id)
    if (!radar) return

    // 时间轴雷达图直接删除
    if (isTimelineRadar(radar)) {
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
    const radar = radarCharts.find((r) => r.id === id)
    if (!radar) return []

    const isTimeline = isTimelineRadar(radar)
    const isReferenced = !isTimeline && isRadarReferencedByTimeline(id)

    const baseItems = [
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: t.tabs.rename,
        onClick: () => handleRename(id, name),
      },
    ]

    // 普通雷达图才有复制和时间标记选项
    if (!isTimeline) {
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

  const items = radarCharts.map((radar) => {
    const isTimeline = isTimelineRadar(radar)
    const isReferenced = !isTimeline && isRadarReferencedByTimeline(radar.id)
    const timeMarker = !isTimeline && isRegularRadar(radar) ? radar.timeMarker : undefined

    return {
      key: radar.id,
      label: (
        <div className={styles.tabLabel}>
          {editingId === radar.id ? (
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
              <span className={styles.tabName}>
                {radar.name}
              </span>
              {timeMarker && (
                <span className={styles.timeMarkerBadge}>
                  {formatTimeMarker(timeMarker, language)}
                </span>
              )}
              <Popover
                open={timeMarkerPopoverId === radar.id}
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
                          setRadarTimeMarker(radar.id, value.year, value.month)
                          setTimeMarkerPopoverId(null)
                        }
                      }}
                    />
                  </div>
                }
              >
                <span />
              </Popover>
              <Dropdown menu={{ items: getMenuItems(radar.id, radar.name) }} trigger={['click']}>
                <MoreOutlined
                  className={styles.moreIcon}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>
            </>
          )}
        </div>
      ),
    }
  })

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={radarCharts.map((r) => r.id)} strategy={horizontalListSortingStrategy}>
        <div className={styles.container}>
          <Tabs
            activeKey={activeRadarId ?? undefined}
            onChange={setActiveRadar}
            type="card"
            items={items}
            className={styles.tabs}
          />
          <Button
            type="text"
            icon={<PlusOutlined />}
            onClick={() => addRadarChart()}
            className={styles.addBtn}
          >
            {t.tabs.newTab}
          </Button>
        </div>
      </SortableContext>
    </DndContext>
  )
}
