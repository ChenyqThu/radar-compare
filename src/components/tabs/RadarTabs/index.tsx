import { Tabs, Button, Dropdown, Input, Modal } from 'antd'
import { PlusOutlined, MoreOutlined, EditOutlined, CopyOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { useState, useRef, useEffect } from 'react'
import { useRadarStore } from '@/stores/radarStore'
import { useI18n } from '@/locales'
import styles from './RadarTabs.module.css'

export function RadarTabs() {
  const { currentProject, setActiveRadar, addRadarChart, deleteRadarChart, duplicateRadarChart, renameRadarChart } = useRadarStore()
  const { t } = useI18n()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<any>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  if (!currentProject) return null

  const { radarCharts, activeRadarId } = currentProject

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
    if (radarCharts.length <= 1) {
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

  const getMenuItems = (id: string, name: string) => [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: t.tabs.rename,
      onClick: () => handleRename(id, name),
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: t.tabs.duplicate,
      onClick: () => duplicateRadarChart(id),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: t.tabs.delete,
      danger: true,
      onClick: () => handleDelete(id),
    },
  ]

  const items = radarCharts.map((radar) => ({
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
            <span
              className={styles.tabName}
              onClick={(e) => {
                // 单击进入编辑模式（仅当是当前激活的 tab 时）
                if (radar.id === activeRadarId) {
                  e.stopPropagation()
                  handleRename(radar.id, radar.name)
                }
              }}
            >
              {radar.name}
            </span>
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
  }))

  return (
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
  )
}
