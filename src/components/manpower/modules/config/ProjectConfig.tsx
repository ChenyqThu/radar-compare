import { Input, Popconfirm, Popover, Button, Select } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useConfigStore } from '../../stores'
import { ProjectBadge } from '../../ProjectBadge'
import { useI18n } from '@/locales'
import { ColorPalette } from './shared'
import type { Project, ProjectStatus } from '../../types/data'
import styles from './ConfigTable.module.css'

// Pattern picker component
function PatternPicker({ value, onChange, color }: { value: 'solid' | 'stripes' | 'dots'; onChange: (pattern: 'solid' | 'stripes' | 'dots') => void; color: string }) {
  const patterns: Array<'solid' | 'stripes' | 'dots'> = ['solid', 'stripes', 'dots']

  return (
    <div className={styles.patternPalette}>
      {patterns.map((pattern) => (
        <button
          key={pattern}
          className={`${styles.patternSwatch} ${value === pattern ? styles.patternSwatchActive : ''}`}
          onClick={() => onChange(pattern)}
        >
          <ProjectBadge project={{ ...({} as Project), pattern, color }} size="sm" />
        </button>
      ))}
    </div>
  )
}

interface ProjectRowProps {
  project: Project
}

function ProjectRow({ project }: ProjectRowProps) {
  const { updateProject, removeProject } = useConfigStore()
  const { t } = useI18n()
  const m = t.manpower

  const statusOptions: { value: ProjectStatus; label: string; color: string }[] = [
    { value: 'planning', label: m.statusPlanning, color: 'default' },
    { value: 'development', label: m.statusDevelopment, color: 'processing' },
    { value: 'release', label: m.statusRelease, color: 'warning' },
    { value: 'completed', label: m.statusCompleted, color: 'success' },
  ]

  return (
    <div className={styles.row}>
      <div className={styles.nameCell}>
        <Input
          value={project.name}
          onChange={(e) => updateProject(project.id, { name: e.target.value })}
          placeholder={m.projectName}
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.statusCell}>
        <Select
          value={project.status}
          onChange={(val) => updateProject(project.id, { status: val })}
          variant="borderless"
          className={styles.select}
          options={statusOptions}
          size="small"
        />
      </div>
      <div className={styles.colorCell}>
        <Popover
          content={<ColorPalette value={project.color} onChange={(color) => updateProject(project.id, { color })} />}
          trigger="click"
          placement="bottomLeft"
        >
          <button className={styles.colorBtn} style={{ backgroundColor: project.color }} />
        </Popover>
      </div>
      <div className={styles.patternCell}>
        <Popover
          content={<PatternPicker value={project.pattern || 'solid'} onChange={(pattern) => updateProject(project.id, { pattern })} color={project.color} />}
          trigger="click"
          placement="bottomLeft"
        >
          <button className={styles.patternBtn}>
            <ProjectBadge project={project} size="sm" />
          </button>
        </Popover>
      </div>
      <div className={styles.dateCell}>
        <Input
          value={project.releaseDate || ''}
          onChange={(e) => updateProject(project.id, { releaseDate: e.target.value })}
          placeholder="YYYY-MM"
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.descCell}>
        <Input
          value={project.description || ''}
          onChange={(e) => updateProject(project.id, { description: e.target.value })}
          placeholder={m.description}
          variant="borderless"
          className={styles.input}
        />
      </div>
      <div className={styles.actionCell}>
        <Popconfirm
          title={m.confirmDeleteProject}
          onConfirm={() => removeProject(project.id)}
          okText={t.common.confirm}
          cancelText={t.common.cancel}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small" className={styles.actionBtn} />
        </Popconfirm>
      </div>
    </div>
  )
}

export function ProjectConfig() {
  const { projects, addProject } = useConfigStore()
  const { t } = useI18n()
  const m = t.manpower

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>
        <div className={styles.nameCell}>{m.projectName}</div>
        <div className={styles.statusCell}>{m.status}</div>
        <div className={styles.colorCell}>{m.color}</div>
        <div className={styles.patternCell}>{m.pattern}</div>
        <div className={styles.dateCell}>{m.releaseDate}</div>
        <div className={styles.descCell}>{m.description}</div>
        <div className={styles.actionCell}>{t.common.action}</div>
      </div>

      <div className={styles.tableBody}>
        {projects.map((project) => (
          <ProjectRow key={project.id} project={project} />
        ))}
      </div>

      <div className={styles.addRow} onClick={() => addProject({ name: '', status: 'planning', color: '#e74c3c', pattern: 'solid', description: '', teams: [], releaseDate: '' })}>
        <PlusOutlined />
        <span>{m.addProject}</span>
      </div>

      {projects.length === 0 && (
        <div className={styles.empty}>{m.noData || '暂无数据'}</div>
      )}
    </div>
  )
}
