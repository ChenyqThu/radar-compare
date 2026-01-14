import { Input, InputNumber, Popconfirm, Popover, Button } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useConfigStore } from '../../stores'
import { useI18n } from '@/locales'
import { BADGE_OPTIONS } from '../../constants'
import { ColorPalette } from './shared'
import type { Team } from '../../types/data'
import styles from './ConfigTable.module.css'

// Badge picker component
function BadgePicker({ value, onChange }: { value: string; onChange: (badge: string) => void }) {
  return (
    <div className={styles.badgePalette}>
      {BADGE_OPTIONS.map((badge) => (
        <button
          key={badge}
          className={`${styles.badgeSwatch} ${value === badge ? styles.badgeSwatchActive : ''}`}
          onClick={() => onChange(badge)}
        >
          {badge}
        </button>
      ))}
    </div>
  )
}

interface TeamRowProps {
  team: Team
}

function TeamRow({ team }: TeamRowProps) {
  const { updateTeam, removeTeam } = useConfigStore()
  const { t } = useI18n()
  const m = t.manpower

  return (
    <div className={styles.row}>
      <div className={styles.nameCell}>
        <Input
          value={team.name}
          onChange={(e) => updateTeam(team.id, { name: e.target.value })}
          placeholder={m.teamName}
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.capacityCell}>
        <InputNumber
          value={team.capacity}
          onChange={(val) => updateTeam(team.id, { capacity: val || 0 })}
          placeholder={m.capacity}
          variant="borderless"
          className={styles.inputNumber}
          min={0}
          step={0.5}
          controls={false}
        />
      </div>
      <div className={styles.colorCell}>
        <Popover
          content={<ColorPalette value={team.color} onChange={(color) => updateTeam(team.id, { color })} />}
          trigger="click"
          placement="bottomLeft"
        >
          <button className={styles.colorBtn} style={{ backgroundColor: team.color }} />
        </Popover>
      </div>
      <div className={styles.badgeCell}>
        <Popover
          content={<BadgePicker value={team.badge || ''} onChange={(badge) => updateTeam(team.id, { badge })} />}
          trigger="click"
          placement="bottomLeft"
        >
          <button className={styles.badgeBtn}>
            {team.badge || '-'}
          </button>
        </Popover>
      </div>
      <div className={styles.descCell}>
        <Input
          value={team.description || ''}
          onChange={(e) => updateTeam(team.id, { description: e.target.value })}
          placeholder={m.description}
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.actionCell}>
        <Popconfirm
          title={m.confirmDeleteTeam}
          onConfirm={() => removeTeam(team.id)}
          okText={t.common.confirm}
          cancelText={t.common.cancel}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" className={styles.actionBtn} />
        </Popconfirm>
      </div>
    </div>
  )
}

export function TeamConfig() {
  const { teams, addTeam } = useConfigStore()
  const { t } = useI18n()
  const m = t.manpower

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>
        <div className={styles.nameCell}>{m.teamName}</div>
        <div className={styles.capacityCell}>{m.capacity}</div>
        <div className={styles.colorCell}>{m.color}</div>
        <div className={styles.badgeCell}>{m.badge}</div>
        <div className={styles.descCell}>{m.description}</div>
        <div className={styles.actionCell}>{t.common.action}</div>
      </div>

      <div className={styles.tableBody}>
        {teams.map((team) => (
          <TeamRow key={team.id} team={team} />
        ))}
      </div>

      <div className={styles.addRow} onClick={() => addTeam({ name: '', capacity: 10, color: '#3498db', badge: '', description: '' })}>
        <PlusOutlined />
        <span>{m.addTeam}</span>
      </div>

      {teams.length === 0 && (
        <div className={styles.empty}>{m.noData || '暂无数据'}</div>
      )}
    </div>
  )
}
