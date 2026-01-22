/**
 * VendorConfig component for Product Matrix module
 *
 * Manages vendor (厂商) configuration with:
 * - Name editing
 * - Color selection (PowerPoint-style palette)
 * - Drag-to-reorder
 * - Delete with confirmation
 */

import { useState } from 'react'
import { Input, Popconfirm, Popover, Button } from 'antd'
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons'
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
import type { MatrixVendor } from '@/types/productMatrix'
import { COLOR_PALETTE } from '@/utils/colorPalette'
import styles from './VendorConfig.module.css'

// Color palette picker component
function ColorPalette({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className={styles.colorPalette}>
      {COLOR_PALETTE.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.colorRow}>
          {row.map((color) => (
            <button
              key={color}
              className={`${styles.colorSwatch} ${value === color ? styles.colorSwatchActive : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface SortableVendorRowProps {
  vendor: MatrixVendor
}

import { VendorLogo } from '../../common/VendorLogo'

// ... (previous imports)

function SortableVendorRow({ vendor }: SortableVendorRowProps) {
  const { updateVendor, removeVendor } = useConfigStore()
  const { t } = useI18n()
  const [showLogoInput, setShowLogoInput] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vendor.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.row}>
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <HolderOutlined />
      </div>

      {/* Logo Preview / Toggle */}
      <div
        className={styles.logoCell}
        onClick={() => setShowLogoInput(!showLogoInput)}
        title="Click to edit Logo URL"
        style={{ cursor: 'pointer', marginRight: 8 }}
      >
        <VendorLogo vendor={vendor} size={24} />
      </div>

      <div className={styles.nameCell}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Input
            value={vendor.name}
            onChange={(e) => updateVendor(vendor.id, { name: e.target.value })}
            placeholder={t.productMatrix.vendorName}
            variant="borderless"
            className={styles.nameInput}
            size="small"
          />
          {showLogoInput && (
            <Input
              value={vendor.logoUrl || ''}
              onChange={(e) => updateVendor(vendor.id, { logoUrl: e.target.value })}
              placeholder="Logo URL (https://...)"
              variant="borderless"
              size="small"
              style={{ fontSize: 11, color: '#999' }}
            />
          )}
        </div>
      </div>

      <div className={styles.colorCell}>
        <Popover
          content={<ColorPalette value={vendor.color} onChange={(color) => updateVendor(vendor.id, { color })} />}
          trigger="click"
          placement="bottomLeft"
        >
          <button
            className={styles.colorBtn}
            style={{ backgroundColor: vendor.color }}
          />
        </Popover>
      </div>
      <div className={styles.actionCell}>
        <Popconfirm
          title={t.productMatrix.confirmDeleteVendor}
          onConfirm={() => removeVendor(vendor.id)}
          okText={t.common.confirm}
          cancelText={t.common.cancel}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" className={styles.actionBtn} />
        </Popconfirm>
      </div>
    </div>
  )
}

function DragOverlayRow({ vendor }: { vendor: MatrixVendor }) {
  return (
    <div className={`${styles.row} ${styles.dragOverlay}`}>
      <div className={styles.dragHandle}>
        <HolderOutlined />
      </div>
      <div style={{ marginRight: 8 }}>
        <VendorLogo vendor={vendor} size={24} />
      </div>
      <div className={styles.nameCell}>
        <span>{vendor.name}</span>
      </div>
      <div className={styles.colorCell}>
        <div
          className={styles.colorBtn}
          style={{ backgroundColor: vendor.color }}
        />
      </div>
      <div className={styles.actionCell} />
    </div>
  )
}

export function VendorConfig() {
  const { vendors, addVendor, reorderVendors } = useConfigStore()
  const { t } = useI18n()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = vendors.findIndex((v) => v.id === active.id)
    const newIndex = vendors.findIndex((v) => v.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderVendors(oldIndex, newIndex)
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  const activeVendor = activeId ? vendors.find((v) => v.id === activeId) : null

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>
        <div className={styles.dragHandle} />
        <div className={styles.nameCell}>{t.productMatrix.vendorName}</div>
        <div className={styles.colorCell}>{t.productMatrix.vendorColor}</div>
        <div className={styles.actionCell}>{t.common.action}</div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={vendors.map((v) => v.id)} strategy={verticalListSortingStrategy}>
          <div className={styles.tableBody}>
            {vendors.map((vendor) => (
              <SortableVendorRow key={vendor.id} vendor={vendor} />
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeVendor ? <DragOverlayRow vendor={activeVendor} /> : null}
        </DragOverlay>
      </DndContext>

      <div className={styles.addRow} onClick={() => addVendor()}>
        <PlusOutlined />
        <span>{t.productMatrix.addVendor}</span>
      </div>

      {vendors.length === 0 && (
        <div className={styles.empty}>{t.productMatrix.noVendors}</div>
      )}
    </div>
  )
}
