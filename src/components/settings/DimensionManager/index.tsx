import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Button,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Tooltip,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
  RightOutlined,
  RadarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  FullscreenOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useRadarStore } from '@/stores/radarStore'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/locales'
import type { Dimension, Vendor, SubDimension } from '@/types'
import { isRegularRadar } from '@/types'
import { getDimensionScore } from '@/utils/calculation'
import styles from './DimensionManager.module.css'

const { Text } = Typography

// 拖拽项类型
type DragItemType = 'dimension' | 'sub-dimension'

interface DragItem {
  type: DragItemType
  id: string
  parentId?: string
}

interface RowData {
  id: string
  key: string
  dimension: Dimension
  isSubDimension: boolean
  parentId?: string
  subIndex?: number
  subDimension?: SubDimension
}

interface SortableRowProps {
  row: RowData
  vendors: Vendor[]
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  onEnsureExpanded: (id: string) => void
  editingId: string | null
  onStartEdit: (id: string, name: string) => void
  onConfirmEdit: () => void
  onCancelEdit: () => void
  editValue: string
  onEditValueChange: (value: string) => void
}

function SortableRow({
  row,
  vendors,
  isExpanded,
  onToggleExpand,
  onEnsureExpanded,
  editingId,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  editValue,
  onEditValueChange,
}: SortableRowProps) {
  const {
    updateDimension,
    updateSubDimension,
    deleteDimension,
    deleteSubDimension,
    addSubDimension,
    setDimensionScore,
    setSubDimensionScore,
  } = useRadarStore()
  const { openSubRadarDrawer } = useUIStore()
  const { t } = useI18n()
  const inputRef = useRef<any>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    data: {
      type: row.isSubDimension ? 'sub-dimension' : 'dimension',
      parentId: row.parentId,
    } as DragItem,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const dim = row.dimension
  const hasSubDimensions = !row.isSubDimension && dim.subDimensions?.length > 0
  const isEditing = editingId === row.id

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleWeightChange = (value: number | null) => {
    if (row.isSubDimension && row.parentId && row.subDimension) {
      updateSubDimension(row.parentId, row.subDimension.id, { weight: value ?? 0 })
    } else {
      updateDimension(dim.id, { weight: value ?? 0 })
    }
  }

  const handleScoreChange = (vendorId: string, value: number | null) => {
    if (row.isSubDimension && row.parentId && row.subDimension) {
      setSubDimensionScore(row.parentId, row.subDimension.id, vendorId, value ?? 0)
    } else {
      setDimensionScore(dim.id, vendorId, value ?? 0)
    }
  }

  const handleDelete = () => {
    if (row.isSubDimension && row.parentId && row.subDimension) {
      deleteSubDimension(row.parentId, row.subDimension.id)
    } else {
      deleteDimension(dim.id)
    }
  }

  const getScore = (vendorId: string): number => {
    if (row.isSubDimension && row.subDimension) {
      return row.subDimension.scores[vendorId] ?? 0
    }
    return dim.scores?.[vendorId] ?? 0
  }

  const getName = (): string => {
    if (row.isSubDimension && row.subDimension) {
      return row.subDimension.name
    }
    return dim.name
  }

  const getWeight = (): number => {
    if (row.isSubDimension && row.subDimension) {
      return row.subDimension.weight
    }
    return dim.weight
  }

  const getDescription = (): string => {
    if (row.isSubDimension && row.subDimension) {
      return row.subDimension.description || ''
    }
    return dim.description || ''
  }

  const handleViewSubRadar = () => {
    openSubRadarDrawer(dim.id)
  }

  const handleAddSubDimension = () => {
    addSubDimension(dim.id)
    onEnsureExpanded(dim.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${row.isSubDimension ? styles.subRow : ''}`}
    >
      {/* 拖拽手柄 */}
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <HolderOutlined />
      </div>

      {/* 展开按钮 */}
      <div className={styles.expandCell}>
        {hasSubDimensions && (
          <span
            className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
            onClick={() => onToggleExpand(dim.id)}
          >
            <RightOutlined />
          </span>
        )}
      </div>

      {/* 维度名称 */}
      <div className={styles.nameCell}>
        {row.isSubDimension && <span className={styles.subPrefix}>└</span>}
        {isEditing ? (
          <div className={styles.editContainer}>
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              onPressEnter={onConfirmEdit}
              onKeyDown={(e) => e.key === 'Escape' && onCancelEdit()}
              placeholder="维度名称"
              size="small"
              className={styles.editInput}
            />
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={onConfirmEdit}
              className={styles.confirmBtn}
            />
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onCancelEdit}
              className={styles.cancelBtn}
            />
          </div>
        ) : (
          <div className={styles.nameWrapper}>
            <span className={styles.nameText}>
              {getName() || '未命名'}
            </span>
            {getDescription() && (
              <Tooltip title={getDescription()} placement="topLeft" overlayStyle={{ maxWidth: 400 }}>
                <InfoCircleOutlined className={styles.infoIcon} />
              </Tooltip>
            )}
            <Tooltip title="编辑名称">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onStartEdit(row.id, getName())}
                className={styles.editBtn}
              />
            </Tooltip>
          </div>
        )}
      </div>

      {/* 权重 */}
      <div className={styles.weightCell}>
        <InputNumber
          value={getWeight()}
          onChange={handleWeightChange}
          min={0}
          max={100}
          size="small"
          className={styles.weightInput}
          formatter={(value) => `${value}%`}
          parser={(value) => Number(value?.replace('%', '') || 0)}
        />
      </div>

      {/* 各 Vendor 分数 */}
      {vendors.map((vendor) => (
        <div key={vendor.id} className={styles.scoreCell}>
          {hasSubDimensions ? (
            <span className={styles.calculatedScore}>
              {getDimensionScore(dim, vendor.id).toFixed(1)}
            </span>
          ) : (
            <InputNumber
              value={getScore(vendor.id)}
              onChange={(v) => handleScoreChange(vendor.id, v)}
              min={0}
              max={10}
              size="small"
              className={styles.scoreInput}
            />
          )}
        </div>
      ))}

      {/* 操作按钮 */}
      <div className={styles.actionCell}>
        {hasSubDimensions && (
          <Tooltip title="查看子维度雷达图">
            <Button
              type="text"
              size="small"
              icon={<RadarChartOutlined />}
              onClick={handleViewSubRadar}
              className={styles.radarBtn}
            />
          </Tooltip>
        )}
        {!row.isSubDimension && (
          <Tooltip title={t.dimension.addSubDimension}>
            <Button
              type="text"
              icon={<PlusOutlined />}
              size="small"
              onClick={handleAddSubDimension}
              className={styles.actionBtn}
            />
          </Tooltip>
        )}
        <Popconfirm
          title={row.isSubDimension ? t.dimension.confirmDeleteSub : t.dimension.confirmDelete}
          onConfirm={handleDelete}
          okText={t.common.confirm}
          cancelText={t.common.cancel}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" className={styles.actionBtn} />
        </Popconfirm>
      </div>
    </div>
  )
}

function DragOverlayRow({ row, vendors }: { row: RowData; vendors: Vendor[] }) {
  const name = row.isSubDimension && row.subDimension ? row.subDimension.name : row.dimension.name
  return (
    <div className={`${styles.row} ${styles.dragOverlay} ${row.isSubDimension ? styles.subRow : ''}`}>
      <div className={styles.dragHandle}>
        <HolderOutlined />
      </div>
      <div className={styles.expandCell} />
      <div className={styles.nameCell}>
        {row.isSubDimension && <span className={styles.subPrefix}>└</span>}
        <span className={styles.nameText}>{name}</span>
      </div>
      <div className={styles.weightCell} />
      {vendors.map((v) => (
        <div key={v.id} className={styles.scoreCell} />
      ))}
      <div className={styles.actionCell} />
    </div>
  )
}

export function DimensionManager() {
  const {
    getActiveRadar,
    reorderDimensions,
    reorderSubDimensions,
    addDimension,
    moveSubToOtherParent,
    promoteSubToDimension,
    demoteDimensionToSub,
    updateDimension,
    updateSubDimension,
  } = useRadarStore()
  const { theme } = useUIStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()

  // 只有普通雷达图才能管理维度 - 提前定义以便后续 hooks 使用
  const regularRadar = activeRadar && isRegularRadar(activeRadar) ? activeRadar : null
  const vendors = regularRadar?.vendors ?? []
  const dimensions = regularRadar?.dimensions ?? []

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sunburstModalVisible, setSunburstModalVisible] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 生成旭日图配置
  const createSunburstOption = useCallback((showLabel: boolean): EChartsOption => {
    if (dimensions.length === 0) return {}

    const isDark = theme === 'dark'

    // 参考 sunburst-book 的渐变色系，适配明暗主题
    const colors = isDark
      ? ['#4992ff', '#7cffb2', '#fddd60', '#ff6e76', '#58d9f9', '#05c091', '#ff8a45', '#8d48e3', '#dd79ff']
      : ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']

    // 计算维度权重总和用于归一化
    const totalDimWeight = dimensions.reduce((sum, d) => sum + d.weight, 0)

    const data = dimensions.map((dim, i) => {
      // 归一化后的维度权重
      const normalizedDimWeight = totalDimWeight > 0 ? (dim.weight / totalDimWeight) * 100 : 0
      // 子维度权重总和
      const totalSubWeight = dim.subDimensions.reduce((sum, s) => sum + s.weight, 0)

      return {
        name: dim.name || t.dimension.unnamed,
        value: normalizedDimWeight,
        itemStyle: { color: colors[i % colors.length] },
        children: dim.subDimensions.length > 0
          ? dim.subDimensions.map((sub) => ({
              name: sub.name || t.dimension.unnamed,
              // 子维度权重 = (子维度权重 / 子维度权重总和) * 父维度权重
              value: totalSubWeight > 0 ? (sub.weight / totalSubWeight) * normalizedDimWeight : 0,
            }))
          : undefined,
      }
    })

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const ancestors = params.treePathInfo || []
          if (ancestors.length > 2) {
            // 子维度 - 显示相对于父维度的百分比
            const parentValue = ancestors[ancestors.length - 2]?.value || 1
            const percent = parentValue > 0 ? ((params.value / parentValue) * 100).toFixed(1) : '0'
            return `${params.name}: ${percent}%`
          }
          return `${params.name}: ${params.value.toFixed(1)}%`
        },
      },
      series: [
        {
          type: 'sunburst',
          data,
          radius: ['20%', '90%'],
          sort: undefined,
          emphasis: {
            focus: 'ancestor',
          },
          label: {
            show: showLabel,
            rotate: 'radial',
            fontSize: 11,
            color: isDark ? '#f0f0f0' : '#333',
            overflow: 'truncate',
            width: 60,
          },
          itemStyle: {
            borderRadius: 6,
            borderWidth: 2,
            borderColor: isDark ? '#1f1f1f' : '#fff',
          },
          levels: [
            {},
            {
              r0: '20%',
              r: '50%',
              label: {
                show: showLabel,
                fontSize: 12,
                fontWeight: 500,
                color: isDark ? '#ffffff' : '#333',
              },
              itemStyle: {
                shadowBlur: 2,
                shadowColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              },
            },
            {
              r0: '50%',
              r: '90%',
              label: {
                show: showLabel,
                fontSize: 10,
                color: isDark ? '#d0d0d0' : '#666',
              },
              itemStyle: {
                opacity: 0.85,
              },
            },
          ],
        },
      ],
      animation: true,
      animationDuration: 500,
      animationEasing: 'cubicOut',
    }
  }, [dimensions, theme, t.dimension.unnamed])

  // 小图配置（不显示文本）
  const sunburstOption = useMemo(() => createSunburstOption(false), [createSunburstOption])
  // 大图配置（显示文本）
  const sunburstModalOption = useMemo(() => createSunburstOption(true), [createSunburstOption])

  const ensureExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      if (prev.has(id)) return prev
      return new Set([...prev, id])
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleStartEdit = useCallback((id: string, name: string) => {
    setEditingId(id)
    setEditValue(name)
  }, [])

  const handleConfirmEdit = useCallback(() => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null)
      return
    }

    const dim = dimensions.find((d) => d.id === editingId)
    if (dim) {
      updateDimension(editingId, { name: editValue.trim() })
    } else {
      for (const d of dimensions) {
        const sub = d.subDimensions.find((s) => s.id === editingId)
        if (sub) {
          updateSubDimension(d.id, editingId, { name: editValue.trim() })
          break
        }
      }
    }
    setEditingId(null)
  }, [editingId, editValue, dimensions, updateDimension, updateSubDimension])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  // 所有 hooks 已调用完毕，现在可以提前返回
  if (!regularRadar) return null

  const rows: RowData[] = []
  dimensions.forEach((dim) => {
    rows.push({
      id: dim.id,
      key: dim.id,
      dimension: dim,
      isSubDimension: false,
    })
    if (expandedIds.has(dim.id) && dim.subDimensions.length > 0) {
      dim.subDimensions.forEach((sub, idx) => {
        rows.push({
          id: sub.id,
          key: sub.id,
          dimension: dim,
          isSubDimension: true,
          parentId: dim.id,
          subIndex: idx,
          subDimension: sub,
        })
      })
    }
  })

  const findRowById = (id: string): RowData | undefined => {
    const row = rows.find((r) => r.id === id)
    if (row) return row

    for (const dim of dimensions) {
      if (dim.id === id) {
        return { id: dim.id, key: dim.id, dimension: dim, isSubDimension: false }
      }
      const sub = dim.subDimensions.find((s) => s.id === id)
      if (sub) {
        return {
          id: sub.id,
          key: sub.id,
          dimension: dim,
          isSubDimension: true,
          parentId: dim.id,
          subIndex: dim.subDimensions.indexOf(sub),
          subDimension: sub,
        }
      }
    }
    return undefined
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeRow = findRowById(active.id as string)
    const overRow = findRowById(over.id as string)

    if (!activeRow || !overRow) return

    const activeIsSubDim = activeRow.isSubDimension
    const overIsSubDim = overRow.isSubDimension

    if (!activeIsSubDim && !overIsSubDim) {
      const oldIndex = dimensions.findIndex((d) => d.id === active.id)
      const newIndex = dimensions.findIndex((d) => d.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderDimensions(oldIndex, newIndex)
      }
      return
    }

    if (activeIsSubDim && overIsSubDim && activeRow.parentId === overRow.parentId) {
      const parentId = activeRow.parentId!
      const parent = dimensions.find((d) => d.id === parentId)
      if (parent) {
        const oldIndex = parent.subDimensions.findIndex((s) => s.id === active.id)
        const newIndex = parent.subDimensions.findIndex((s) => s.id === over.id)
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderSubDimensions(parentId, oldIndex, newIndex)
        }
      }
      return
    }

    if (activeIsSubDim && overIsSubDim && activeRow.parentId !== overRow.parentId) {
      const toParent = dimensions.find((d) => d.id === overRow.parentId)
      if (toParent) {
        const toIndex = toParent.subDimensions.findIndex((s) => s.id === over.id)
        moveSubToOtherParent(activeRow.parentId!, active.id as string, overRow.parentId!, toIndex)
      }
      return
    }

    if (activeIsSubDim && !overIsSubDim) {
      const overDimIndex = dimensions.findIndex((d) => d.id === over.id)
      promoteSubToDimension(activeRow.parentId!, active.id as string, overDimIndex)
      return
    }

    if (!activeIsSubDim && overIsSubDim) {
      const toParentId = overRow.parentId!
      const toParent = dimensions.find((d) => d.id === toParentId)
      if (toParent && active.id !== toParentId) {
        const toIndex = toParent.subDimensions.findIndex((s) => s.id === over.id)
        demoteDimensionToSub(active.id as string, toParentId, toIndex)
        setExpandedIds((prev) => new Set([...prev, toParentId]))
      }
      return
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const allIds = rows.map((r) => r.id)
  const activeRow = activeId ? findRowById(activeId) : null

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>
        <div className={styles.dragHandle} />
        <div className={styles.expandCell} />
        <div className={styles.nameCell}>{t.dimension.title}</div>
        <div className={styles.weightCell}>{t.dimension.weight}</div>
        {vendors.map((v) => (
          <div key={v.id} className={styles.scoreCell} style={{ color: v.color }}>
            {v.name}
          </div>
        ))}
        <div className={styles.actionCell}>{t.common.action}</div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
          <div className={styles.tableBody}>
            {rows.map((row) => (
              <SortableRow
                key={row.key}
                row={row}
                vendors={vendors}
                isExpanded={expandedIds.has(row.dimension.id)}
                onToggleExpand={toggleExpand}
                onEnsureExpanded={ensureExpanded}
                editingId={editingId}
                onStartEdit={handleStartEdit}
                onConfirmEdit={handleConfirmEdit}
                onCancelEdit={handleCancelEdit}
                editValue={editValue}
                onEditValueChange={setEditValue}
              />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeRow ? <DragOverlayRow row={activeRow} vendors={vendors} /> : null}
        </DragOverlay>
      </DndContext>

      <div className={styles.addRow} onClick={() => addDimension()}>
        <PlusOutlined />
        <span>{t.dimension.addDimension}</span>
      </div>

      {dimensions.length === 0 && (
        <div className={styles.empty}>
          <Text type="secondary">{t.dimension.pleaseAddDimension}</Text>
        </div>
      )}

      {vendors.length === 0 && dimensions.length > 0 && (
        <div className={styles.hint}>
          <Text type="secondary">{t.dimension.pleaseAddVendor}</Text>
        </div>
      )}

      {dimensions.length > 0 && (
        <div className={styles.dragHint}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t.dimension.dragHint}
          </Text>
        </div>
      )}

      {dimensions.length > 0 && (
        <div className={styles.sunburstContainer}>
          <div className={styles.sunburstHeader}>
            <Text type="secondary" style={{ fontSize: 12 }}>{t.dimension.weightDistribution}</Text>
            <Tooltip title={t.common.expand}>
              <Button
                type="text"
                size="small"
                icon={<FullscreenOutlined />}
                onClick={() => setSunburstModalVisible(true)}
                className={styles.expandBtn}
              />
            </Tooltip>
          </div>
          <ReactECharts
            option={sunburstOption}
            style={{ height: 180, width: '100%' }}
            notMerge={true}
          />
        </div>
      )}

      <Modal
        open={sunburstModalVisible}
        onCancel={() => setSunburstModalVisible(false)}
        footer={null}
        width={600}
        centered
        title={t.dimension.weightDistribution}
      >
        <ReactECharts
          option={sunburstModalOption}
          style={{ height: 450, width: '100%' }}
          notMerge={true}
        />
      </Modal>
    </div>
  )
}
