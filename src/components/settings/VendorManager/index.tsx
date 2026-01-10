import { useState } from 'react'
import { Input, Popconfirm, Popover, Switch, Button } from 'antd'
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
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import type { Vendor, MarkerType } from '@/types'
import { PRESET_MARKERS, isRegularRadar } from '@/types'
import styles from './VendorManager.module.css'

// PowerPoint 风格的预设颜色调色板
const COLOR_PALETTE = [
  // 主色调
  ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'],
  // 浅色调
  ['#F8CBAD', '#FCE4D6', '#FFF2CC', '#FFFFCC', '#E2EFDA', '#C6EFCE', '#DAEEF3', '#BDD7EE', '#B4C6E7', '#E4DFEC'],
  // 中等色调
  ['#F4B183', '#F8CBA0', '#FFE699', '#FFFF99', '#C5E0B3', '#A9D08E', '#9DC3E6', '#8FAADC', '#8EA9DB', '#CCC0DA'],
  // 深色调
  ['#ED7D31', '#F4A460', '#FFD966', '#FFCC00', '#A8D08D', '#70AD47', '#5B9BD5', '#4472C4', '#305496', '#7B68EE'],
  // 更深色调
  ['#C65911', '#BF8F00', '#BF9000', '#806000', '#548235', '#375623', '#2F75B5', '#2E5A8B', '#1F4E79', '#5B3D87'],
]

// 标记形状 SVG 组件
function MarkerShape({ type, size = 16, color = 'currentColor' }: { type: MarkerType; size?: number; color?: string }) {
  const halfSize = size / 2

  switch (type) {
    case 'circle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={halfSize} cy={halfSize} r={halfSize - 1} fill={color} />
        </svg>
      )
    case 'rect':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={1} y={1} width={size - 2} height={size - 2} fill={color} />
        </svg>
      )
    case 'roundRect':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x={1} y={1} width={size - 2} height={size - 2} rx={3} ry={3} fill={color} />
        </svg>
      )
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={`${halfSize},1 ${size - 1},${size - 1} 1,${size - 1}`} fill={color} />
        </svg>
      )
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={`${halfSize},1 ${size - 1},${halfSize} ${halfSize},${size - 1} 1,${halfSize}`} fill={color} />
        </svg>
      )
    case 'pin':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={halfSize} cy={halfSize - 2} r={halfSize - 3} fill={color} />
          <polygon points={`${halfSize - 2},${halfSize + 1} ${halfSize + 2},${halfSize + 1} ${halfSize},${size - 1}`} fill={color} />
        </svg>
      )
    case 'arrow':
      return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <polygon points={`${halfSize},1 ${size - 1},${size - 3} ${halfSize},${size - 6} 1,${size - 3}`} fill={color} />
          <rect x={halfSize - 2} y={halfSize} width={4} height={halfSize - 1} fill={color} />
        </svg>
      )
    default:
      return null
  }
}

// 颜色选择器组件
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

// 标记选择器组件
function MarkerSelector({ value, onChange, color }: { value: MarkerType; onChange: (marker: MarkerType) => void; color: string }) {
  return (
    <div className={styles.markerPalette}>
      {PRESET_MARKERS.map((marker) => (
        <button
          key={marker}
          className={`${styles.markerSwatch} ${value === marker ? styles.markerSwatchActive : ''}`}
          onClick={() => onChange(marker)}
        >
          <MarkerShape type={marker} size={20} color={color} />
        </button>
      ))}
    </div>
  )
}

interface SortableVendorRowProps {
  vendor: Vendor
}

function SortableVendorRow({ vendor }: SortableVendorRowProps) {
  const { updateVendor, deleteVendor, toggleVendorVisibility } = useRadarStore()
  const { t } = useI18n()

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
      <div className={styles.nameCell}>
        <Input
          value={vendor.name}
          onChange={(e) => updateVendor(vendor.id, { name: e.target.value })}
          placeholder={t.vendor.name}
          variant="borderless"
          className={styles.nameInput}
        />
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
      <div className={styles.markerCell}>
        <Popover
          content={<MarkerSelector value={vendor.markerType} onChange={(marker) => updateVendor(vendor.id, { markerType: marker })} color={vendor.color} />}
          trigger="click"
          placement="bottomLeft"
        >
          <button className={styles.markerBtn}>
            <MarkerShape type={vendor.markerType} size={18} color={vendor.color} />
          </button>
        </Popover>
      </div>
      <div className={styles.visibleCell}>
        <Switch
          size="small"
          checked={vendor.visible}
          onChange={() => toggleVendorVisibility(vendor.id)}
        />
      </div>
      <div className={styles.actionCell}>
        <Popconfirm
          title={t.vendor.confirmDelete}
          onConfirm={() => deleteVendor(vendor.id)}
          okText={t.common.confirm}
          cancelText={t.common.cancel}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" className={styles.actionBtn} />
        </Popconfirm>
      </div>
    </div>
  )
}

function DragOverlayRow({ vendor }: { vendor: Vendor }) {
  return (
    <div className={`${styles.row} ${styles.dragOverlay}`}>
      <div className={styles.dragHandle}>
        <HolderOutlined />
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
      <div className={styles.markerCell}>
        <MarkerShape type={vendor.markerType} size={18} color={vendor.color} />
      </div>
      <div className={styles.visibleCell} />
      <div className={styles.actionCell} />
    </div>
  )
}

export function VendorManager() {
  const { getActiveRadar, addVendor, reorderVendors } = useRadarStore()
  const { t } = useI18n()
  const activeRadar = getActiveRadar()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 只有普通雷达图才能管理 Vendor
  const regularRadar = activeRadar && isRegularRadar(activeRadar) ? activeRadar : null
  if (!regularRadar) return null

  const { vendors } = regularRadar

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
        <div className={styles.nameCell}>{t.vendor.name}</div>
        <div className={styles.colorCell}>{t.vendor.color}</div>
        <div className={styles.markerCell}>{t.vendor.marker}</div>
        <div className={styles.visibleCell}>{t.vendor.visible}</div>
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
        <span>{t.vendor.addVendor}</span>
      </div>

      {vendors.length === 0 && (
        <div className={styles.empty}>{t.vendor.noVendor}</div>
      )}
    </div>
  )
}
