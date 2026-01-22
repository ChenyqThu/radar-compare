/**
 * DimensionConfig component for Product Matrix module
 *
 * Manages dimension (维度) configuration with:
 * - Two types: discrete (选项型) and continuous (连续型)
 * - Name editing
 * - Options management for discrete dimensions
 * - Range configuration for continuous dimensions
 * - Drag-to-reorder
 */

import { useState } from 'react'
import { Input, InputNumber, Button, Modal, Popconfirm } from 'antd'

import {
  PlusOutlined,
  DeleteOutlined,
  HolderOutlined,
  RightOutlined,
  // TagOutlined removed
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
import { useConfigStore } from '../../stores/configStore'
import { useI18n } from '@/locales'
import type { MatrixDimension, DimensionOption, DimensionType } from '@/types/productMatrix'
import { nanoid } from 'nanoid'
import styles from './DimensionConfig.module.css'

import { NotionIconPicker } from '../../common/NotionIconPicker'
import { NotionIcon } from '../../common/NotionIcon'

// NotionIconDisplay removed, unused


// Dimension card component with expand/collapse
interface DimensionCardProps {
  dimension: MatrixDimension
  expanded: boolean
  onToggle: () => void
}

interface SortableOptionRowProps {
  option: DimensionOption
  dimensionId: string
  index: number
}

function SortableOptionRow({ option, dimensionId, index }: SortableOptionRowProps) {
  const { updateOption, removeOption } = useConfigStore()
  const { t } = useI18n()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  // Numbered circle for option
  const numberIconStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: '#f0f0f0',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    marginRight: 8,
    flexShrink: 0,
    border: '1px solid #d9d9d9'
  }

  // Handle value change: sync to label as well
  const handleChange = (val: string) => {
    updateOption(dimensionId, option.id, { value: val, label: val })
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.optionRow}>
      <div className={styles.optionDragHandle} {...attributes} {...listeners}>
        <HolderOutlined />
      </div>

      {/* Numbered Icon */}
      <div style={numberIconStyle}>
        {index + 1}
      </div>

      {/* Single Input for Value (Label hidden/synced) */}
      <Input
        className={styles.optionValue}
        value={option.value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t.productMatrix.optionValue}
        size="small"
        variant="borderless"
        style={{ flex: 1 }}
      />
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        size="small"
        className={styles.optionDelete}
        onClick={() => removeOption(dimensionId, option.id)}
      />
    </div>
  )
}

function DimensionCard({ dimension, expanded, onToggle }: DimensionCardProps) {
  const {
    updateDimension,
    removeDimension,
    addOption,
    reorderOptions,
  } = useConfigStore()
  const { t } = useI18n()
  const [optionActiveId, setOptionActiveId] = useState<string | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dimension.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleOptionDragStart = (event: DragStartEvent) => {
    setOptionActiveId(event.active.id as string)
  }

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setOptionActiveId(null)

    if (!over || active.id === over.id) return
    if (!dimension.options) return

    const oldIndex = dimension.options.findIndex((o) => o.id === active.id)
    const newIndex = dimension.options.findIndex((o) => o.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderOptions(dimension.id, oldIndex, newIndex)
    }
  }

  const activeOption = optionActiveId
    ? dimension.options?.find((o) => o.id === optionActiveId)
    : null

  return (
    <div ref={setNodeRef} style={style} className={styles.dimensionCard}>
      <div className={styles.dimensionHeader} onClick={onToggle}>
        <div className={styles.dragHandle} {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>
          <HolderOutlined />
        </div>
        <RightOutlined
          className={`${styles.expandIcon} ${expanded ? styles.expanded : ''}`}
        />

        {/* Unified Icon Picker */}
        <div onClick={(e) => e.stopPropagation()} style={{ marginRight: 4 }}>
          <NotionIconPicker
            icon={dimension.icon || 'TagOutlined'}
            color={dimension.color || '#999'}
            onChange={(icon, color) => updateDimension(dimension.id, { icon, color })}
            variant="text"
          />
        </div>

        <div className={styles.dimensionName}>
          <Input
            value={dimension.name}
            onChange={(e) => updateDimension(dimension.id, { name: e.target.value })}
            placeholder={t.productMatrix.dimensionName}
            variant="borderless"
            className={styles.nameInput}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <span className={`${styles.dimensionType} ${styles[dimension.type]}`}>
          {dimension.type === 'discrete' ? t.productMatrix.discrete : t.productMatrix.continuous}
        </span>
        <div className={styles.dimensionActions} onClick={(e) => e.stopPropagation()}>
          <Popconfirm
            title={t.productMatrix.confirmDeleteDimension}
            onConfirm={() => removeDimension(dimension.id)}
            okText={t.common.confirm}
            cancelText={t.common.cancel}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" className={styles.actionBtn} />
          </Popconfirm>
        </div>
      </div>

      {expanded && (
        <div className={styles.dimensionContent}>
          {dimension.type === 'discrete' ? (
            <div style={{ paddingLeft: 34 }}> {/* Indentation */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleOptionDragStart}
                onDragEnd={handleOptionDragEnd}
              >
                <SortableContext
                  items={(dimension.options ?? []).map((o) => o.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={styles.optionsList}>
                    {(dimension.options ?? []).map((option, index) => (
                      <SortableOptionRow
                        key={option.id}
                        option={option}
                        dimensionId={dimension.id}
                        index={index}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeOption && (
                    <div className={`${styles.optionRow} ${styles.dragOverlay}`}>
                      <HolderOutlined />
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', backgroundColor: '#f0f0f0', color: '#666', border: '1px solid #d9d9d9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, marginRight: 8
                      }}>#</div>
                      <span>{activeOption.value}</span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
              <div className={styles.addOptionRow} onClick={() => addOption(dimension.id)}>
                <PlusOutlined />
                <span>{t.productMatrix.addOption}</span>
              </div>
            </div>
          ) : (
            // Continuous config ...
            <div className={styles.continuousConfig} style={{ paddingLeft: 34 }}>
              {/* ... existing continuous config ... */}
              <div className={styles.configRow}>
                <span className={styles.configLabel}>{t.productMatrix.unit}</span>
                <Input
                  className={styles.configValue}
                  value={dimension.unit ?? ''}
                  onChange={(e) => updateDimension(dimension.id, { unit: e.target.value })}
                  placeholder={t.productMatrix.unit}
                  size="small"
                />
              </div>
              <div className={styles.configRow}>
                <span className={styles.configLabel}>{t.productMatrix.minValue}</span>
                <InputNumber
                  className={styles.configValue}
                  value={dimension.min}
                  onChange={(val) => updateDimension(dimension.id, { min: val ?? undefined })}
                  placeholder={t.productMatrix.minValue}
                  size="small"
                />
              </div>
              <div className={styles.configRow}>
                <span className={styles.configLabel}>{t.productMatrix.maxValue}</span>
                <InputNumber
                  className={styles.configValue}
                  value={dimension.max}
                  onChange={(val) => updateDimension(dimension.id, { max: val ?? undefined })}
                  placeholder={t.productMatrix.maxValue}
                  size="small"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Drag overlay for dimension
function DimensionDragOverlay({ dimension }: { dimension: MatrixDimension }) {
  const { t } = useI18n()

  return (
    <div className={`${styles.dimensionCard} ${styles.dragOverlay}`}>
      <div className={styles.dimensionHeader}>
        <div className={styles.dragHandle}>
          <HolderOutlined />
        </div>
        <RightOutlined className={styles.expandIcon} />

        <div style={{ marginRight: 8, display: 'flex', alignItems: 'center' }}>
          <NotionIcon icon={dimension.icon} variant="text" size={16} iconSize={14} />
        </div>

        <div className={styles.dimensionName}>
          <span className={styles.nameInput}>{dimension.name}</span>
        </div>
        <span className={`${styles.dimensionType} ${styles[dimension.type]}`}>
          {dimension.type === 'discrete' ? t.productMatrix.discrete : t.productMatrix.continuous}
        </span>
      </div>
    </div>
  )
}


export function DimensionConfig() {
  const { dimensions, addDimension, reorderDimensions } = useConfigStore()
  const { t } = useI18n()

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [newDimensionType, setNewDimensionType] = useState<DimensionType>('discrete')
  const [newDimensionName, setNewDimensionName] = useState('')
  const [newDimensionColor, setNewDimensionColor] = useState('#5470c6')
  const [newDimensionIcon, setNewDimensionIcon] = useState<string>('TagOutlined')

  // Dynamic Options (List of strings)
  const [newOptionsList, setNewOptionsList] = useState<string[]>([''])

  const [newDimensionMin, setNewDimensionMin] = useState<number | null>(null)
  const [newDimensionMax, setNewDimensionMax] = useState<number | null>(null)
  const [newDimensionUnit, setNewDimensionUnit] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = dimensions.findIndex((d) => d.id === active.id)
    const newIndex = dimensions.findIndex((d) => d.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderDimensions(oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const handleAddDimension = () => {
    if (!newDimensionName.trim()) return

    const dimensionData: Partial<MatrixDimension> = {
      name: newDimensionName.trim(),
      type: newDimensionType,
      color: newDimensionColor,
      icon: newDimensionIcon,
    }

    if (newDimensionType === 'discrete') {
      const options = newOptionsList
        .filter(s => s.trim())
        .map((label, index) => ({
          id: nanoid(),
          label,
          value: label,
          order: index,
        }))

      // If no options added, add at least one empty? No, ok to be empty.
      dimensionData.options = options
    } else {
      dimensionData.min = newDimensionMin ?? undefined
      dimensionData.max = newDimensionMax ?? undefined
      dimensionData.unit = newDimensionUnit.trim() || undefined
    }

    addDimension(dimensionData)

    setModalOpen(false)
    resetModal()
  }

  const resetModal = () => {
    setNewDimensionName('')
    setNewDimensionType('discrete')
    setNewDimensionColor('#5470c6')
    setNewDimensionIcon('TagOutlined')
    setNewOptionsList([''])
    setNewDimensionMin(null)
    setNewDimensionMax(null)
    setNewDimensionUnit('')
  }

  const activeDimension = activeId ? dimensions.find((d) => d.id === activeId) : null

  // Helper to update option in new list
  const updateNewOption = (index: number, val: string) => {
    const list = [...newOptionsList]
    list[index] = val
    setNewOptionsList(list)
  }

  const addNewOptionInput = () => {
    setNewOptionsList([...newOptionsList, ''])
  }

  const removeNewOptionInput = (index: number) => {
    const list = [...newOptionsList]
    list.splice(index, 1)
    setNewOptionsList(list)
  }

  return (
    <div className={styles.container}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={dimensions.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {dimensions.map((dimension) => (
            <DimensionCard
              key={dimension.id}
              dimension={dimension}
              expanded={expandedIds.has(dimension.id)}
              onToggle={() => toggleExpand(dimension.id)}
            />
          ))}
        </SortableContext>
        <DragOverlay>
          {activeDimension ? <DimensionDragOverlay dimension={activeDimension} /> : null}
        </DragOverlay>
      </DndContext>

      <div className={styles.addDimensionRow} onClick={() => { resetModal(); setModalOpen(true); }}>
        <PlusOutlined />
        <span>{t.productMatrix.addDimension}</span>
      </div>

      {dimensions.length === 0 && (
        <div className={styles.empty}>{t.productMatrix.noDimensions}</div>
      )}

      <Modal
        title={t.productMatrix.addDimension}
        open={modalOpen}
        onOk={handleAddDimension}
        onCancel={() => setModalOpen(false)}
        okText={t.common.confirm}
        cancelText={t.common.cancel}
        okButtonProps={{ disabled: !newDimensionName.trim() }}
        width={500}
      >
        <div className={styles.formItem}>
          <label className={styles.formLabel}>{t.productMatrix.dimensionName}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Unified Icon Picker */}
            <NotionIconPicker
              icon={newDimensionIcon}
              color={newDimensionColor}
              onChange={(icon, color) => { setNewDimensionIcon(icon); setNewDimensionColor(color); }}
              variant="text"
            />
            <Input
              value={newDimensionName}
              onChange={(e) => setNewDimensionName(e.target.value)}
              placeholder={t.productMatrix.dimensionName}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className={styles.formItem}>
          <label className={styles.formLabel}>{t.productMatrix.dimensionType}</label>
          <div className={styles.typeSelector}>
            <div
              className={`${styles.typeOption} ${newDimensionType === 'discrete' ? styles.selected : ''}`}
              onClick={() => setNewDimensionType('discrete')}
            >
              <div className={styles.typeOptionTitle}>{t.productMatrix.discrete}</div>
              <div className={styles.typeOptionDesc}>{t.productMatrix.options}</div>
            </div>
            <div
              className={`${styles.typeOption} ${newDimensionType === 'continuous' ? styles.selected : ''}`}
              onClick={() => setNewDimensionType('continuous')}
            >
              <div className={styles.typeOptionTitle}>{t.productMatrix.continuous}</div>
              <div className={styles.typeOptionDesc}>{t.productMatrix.minValue} / {t.productMatrix.maxValue}</div>
            </div>
          </div>
        </div>

        {newDimensionType === 'discrete' ? (
          <div className={styles.formItem}>
            <label className={styles.formLabel}>{t.productMatrix.options}</label>
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {newOptionsList.map((val, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#666' }}>
                    {idx + 1}
                  </div>
                  <Input
                    value={val}
                    onChange={(e) => updateNewOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    size="small"
                  />
                  {newOptionsList.length > 1 && (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => removeNewOptionInput(idx)}
                    />
                  )}
                </div>
              ))}
              <div onClick={addNewOptionInput} style={{ cursor: 'pointer', color: '#1890ff', padding: '4px 0', marginLeft: 28 }}>
                <PlusOutlined style={{ marginRight: 4 }} /> {t.productMatrix.addOption}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>{t.productMatrix.unit}</label>
              <Input
                value={newDimensionUnit}
                onChange={(e) => setNewDimensionUnit(e.target.value)}
                placeholder={t.productMatrix.unit}
              />
            </div>
            <div className={styles.formItem} style={{ flexDirection: 'row', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label className={styles.formLabel}>{t.productMatrix.minValue}</label>
                <InputNumber
                  value={newDimensionMin}
                  onChange={setNewDimensionMin}
                  placeholder={t.productMatrix.minValue}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className={styles.formLabel}>{t.productMatrix.maxValue}</label>
                <InputNumber
                  value={newDimensionMax}
                  onChange={setNewDimensionMax}
                  placeholder={t.productMatrix.maxValue}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
