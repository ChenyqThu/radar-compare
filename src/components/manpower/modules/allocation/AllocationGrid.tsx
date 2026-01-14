import React, { useMemo } from 'react'
import { Card, Button, InputNumber, Switch, Space, Dropdown, Popconfirm, Tooltip, message } from 'antd'
import {
  CalculatorOutlined,
  ReloadOutlined,
  SettingOutlined,
  RightOutlined,
  DownOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useConfigStore, useDataStore } from '../../stores'
import { useI18n } from '@/locales'
import { TeamBadge } from '../../TeamBadge'
import { ProjectBadge } from '../../ProjectBadge'
import {
  getUtilizationStyle,
  getUtilizationTextColor,
  getProjectStatusStyle,
} from '../../constants'
import { useCollapsedState, useShowTeamDetails, useAllocationData } from './hooks'
import styles from '../../styles.module.css'

interface AllocationGridProps {
  readonly?: boolean
}

// 格式化数字，去掉不必要的小数点
const formatNumber = (num: number): string => {
  return num % 1 === 0 ? num.toString() : num.toFixed(1)
}

export const AllocationGrid: React.FC<AllocationGridProps> = ({ readonly = false }) => {
  const { t } = useI18n()
  const m = t.manpower
  const { teams, projects, timePoints } = useConfigStore()
  const { allocations, updateAllocation, getStatistics, resetAllocations } = useDataStore()

  // 使用拆分的 hooks
  const { showTeamDetails, setShowTeamDetails } = useShowTeamDetails()
  const { collapsedProjects, toggleProjectCollapse } = useCollapsedState()
  const {
    sortedTimePoints,
    getCellValue,
    setCellValue,
    getTeamUtilization,
    getOverallUtilization,
    getProjectSummary,
    autoCalculatePrerelease,
  } = useAllocationData({
    teams,
    projects,
    timePoints,
    allocations,
    updateAllocation,
  })

  // 显示所有项目
  const visibleProjects = useMemo(() => projects, [projects])

  // 缓存项目对应的团队列表
  const projectTeamsMap = useMemo(() => {
    const map = new Map<string, typeof teams>()
    for (const project of projects) {
      if (!project.teams || project.teams.length === 0) {
        map.set(project.id, teams)
      } else {
        map.set(project.id, teams.filter((team) => project.teams!.includes(team.id)))
      }
    }
    return map
  }, [projects, teams])

  // 获取项目应该显示的团队
  const getProjectTeams = (project: typeof projects[0]) => {
    return projectTeamsMap.get(project.id) || teams
  }

  // 缓存状态标签映射
  const statusLabels = useMemo(() => ({
    development: m.statusDevelopment || '开发中',
    planning: m.statusPlanning || '规划中',
    release: m.statusRelease || '即将发布',
    completed: m.statusCompleted || '已完成',
  }), [m.statusDevelopment, m.statusPlanning, m.statusRelease, m.statusCompleted])

  // 人力预释自动校准功能
  const handleAutoCalculatePrerelease = () => {
    const updatedCount = autoCalculatePrerelease()
    message.success(m.autoCalcSuccess.replace('{count}', String(updatedCount)))
  }

  const statistics = getStatistics()

  const settingsMenuItems = [
    {
      key: 'teamDetails',
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 140 }}>
          <span>{m.teamDetails}</span>
          <Switch size="small" checked={showTeamDetails} onChange={setShowTeamDetails} />
        </div>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card
        title={
          <Space>
            <span>{m.allocationGrid}</span>
            <Tooltip
              title={
                <div style={{ maxWidth: 400 }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>{m.instructions}</div>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li><strong>{m.occupied}</strong>: {m.occupiedTip}</li>
                    <li><strong>{m.prerelease}</strong>: {m.prereleaseTip}</li>
                    <li><strong>{m.autoCalculate}</strong>: {m.autoCalcTip}</li>
                    <li><strong>{m.limitRule}</strong>: {m.limitRuleTip}</li>
                    <li><strong>{m.utilizationColor}</strong>: {m.utilizationColorTip}</li>
                  </ul>
                </div>
              }
              overlayStyle={{ maxWidth: 500 }}
            >
              <InfoCircleOutlined style={{ color: 'var(--color-text-tertiary)', cursor: 'help' }} />
            </Tooltip>
          </Space>
        }
        extra={
          <Space size="middle">
            <Space style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
              <span>{m.totalCapacity}: {statistics.totalCapacity}</span>
              <span>{m.allocated}: {formatNumber(statistics.totalAllocated)}</span>
              <span>{m.utilizationRate}: {formatNumber((statistics.totalAllocated / statistics.totalCapacity) * 100)}%</span>
            </Space>
            {!readonly && (
              <>
                <div style={{ width: 1, height: 24, backgroundColor: 'var(--color-border)' }} />
                <Space>
                  <Dropdown menu={{ items: settingsMenuItems }} trigger={['click']}>
                    <Button icon={<SettingOutlined />} type="text" />
                  </Dropdown>
                  <Tooltip title={m.autoCalculate}>
                    <Button icon={<CalculatorOutlined />} type="text" onClick={handleAutoCalculatePrerelease} />
                  </Tooltip>
                  <Popconfirm
                    title={m.resetDataConfirm}
                    description={m.resetDataDescription}
                    onConfirm={resetAllocations}
                    okText={t.common.confirm}
                    cancelText={t.common.cancel}
                  >
                    <Tooltip title={m.resetData}>
                      <Button icon={<ReloadOutlined />} type="text" danger />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </>
            )}
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh + 200px)' }}>
          <table className={styles.allocationTable} style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 20 }} className={styles.tableHeader}>
              <tr>
                <th
                  className={styles.stickyCol}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    minWidth: 160,
                    width: 160,
                  }}
                >
                  {m.projectTeamHeader}
                </th>
                {sortedTimePoints.map((timePoint) => (
                  <th
                    key={timePoint.id}
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      borderRight: '1px solid var(--color-border)',
                      borderBottom: '1px solid var(--color-border)',
                      minWidth: 180,
                      width: 180,
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <div>{timePoint.name}</div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>{timePoint.date}</div>
                      </div>
                      {/* 团队总体占用信息 */}
                      <div>
                        {(() => {
                          const overallUtil = getOverallUtilization(timePoint.id)
                          return (
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 12,
                                fontWeight: 500,
                                ...getUtilizationStyle(overallUtil.percentage),
                              }}
                            >
                              {m.totalOccupied}: {formatNumber(overallUtil.used)}/{overallUtil.capacity} ({formatNumber(overallUtil.percentage)}%)
                            </span>
                          )
                        })()}
                      </div>
                      {/* 团队利用率显示 */}
                      {showTeamDetails && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                          {teams
                            .map((team) => {
                              const utilization = getTeamUtilization(team.id, timePoint.id)
                              return { team, utilization }
                            })
                            .filter(({ utilization }) => utilization.used > 0)
                            .map(({ team, utilization }) => (
                              <div
                                key={`header-util-${team.id}-${timePoint.id}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                title={`${team.name}: ${formatNumber(utilization.used)}/${utilization.capacity}${m.personUnit} (${formatNumber(utilization.percentage)}%)`}
                              >
                                <TeamBadge
                                  team={team}
                                  size="sm"
                                  title={`${team.name}: ${formatNumber(utilization.used)}/${utilization.capacity}${m.personUnit} (${formatNumber(utilization.percentage)}%)`}
                                />
                                <span style={{ fontSize: 11, color: getUtilizationTextColor(utilization.percentage) }}>
                                  {formatNumber(utilization.used)}/{utilization.capacity}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((project) => {
                const projectTeams = getProjectTeams(project)
                const isCollapsed = collapsedProjects.has(project.id)

                return (
                  <React.Fragment key={project.id}>
                    {/* 项目标题行 */}
                    <tr
                      className={styles.projectRow}
                      onClick={() => toggleProjectCollapse(project.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td
                        className={styles.stickyCol}
                        style={{
                          padding: '12px 8px',
                          borderRight: '1px solid var(--color-border)',
                          borderBottom: '1px solid var(--color-border)',
                          minWidth: 160,
                          width: 160,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isCollapsed ? (
                              <RightOutlined style={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                            ) : (
                              <DownOutlined style={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
                            )}
                            <ProjectBadge project={project} size="sm" title={project.name} />
                            <span
                              style={{
                                fontWeight: 500,
                                fontSize: 13,
                                color: 'var(--color-text)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={project.name}
                            >
                              {project.name}
                            </span>
                            {/* 状态徽标 */}
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: 11,
                                padding: '1px 6px',
                                borderRadius: 10,
                                fontWeight: 500,
                                ...getProjectStatusStyle(project.status),
                              }}
                            >
                              {statusLabels[project.status as keyof typeof statusLabels]}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 24 }}>
                            <span>{m.teamsCount.replace('{count}', String(projectTeams.length))}</span>
                            {project.releaseDate && (
                              <span style={{ backgroundColor: 'var(--color-bg-container-secondary)', padding: '1px 4px', borderRadius: 4 }}>
                                {project.releaseDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {sortedTimePoints.map((timePoint) => {
                        const summary = getProjectSummary(project.id, timePoint.id, projectTeams)

                        return (
                          <td
                            key={`${project.id}-${timePoint.id}-header`}
                            style={{
                              padding: '8px',
                              textAlign: 'center',
                              borderRight: '1px solid var(--color-border)',
                              borderBottom: '1px solid var(--color-border)',
                              minWidth: 180,
                              width: 180,
                            }}
                            className={styles.projectHeaderCell}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {/* 人力数据 */}
                              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                {m.occupied}({formatNumber(summary.totalOccupied)}) | {m.prerelease}({formatNumber(summary.totalPrerelease)})
                              </div>

                              {/* 团队细分 */}
                              {showTeamDetails && summary.teamBreakdown.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                                  {summary.teamBreakdown.map((teamInfo, index) => {
                                    const teamData = teams.find((t) => t.id === teamInfo.teamId)
                                    return (
                                      <React.Fragment key={teamInfo.teamId}>
                                        <div
                                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                          title={`${teamInfo.teamName}: ${teamInfo.occupied}${m.personUnit}`}
                                        >
                                          {teamData && (
                                            <TeamBadge team={teamData} size="sm" title={`${teamInfo.teamName}: ${teamInfo.occupied}${m.personUnit}`} />
                                          )}
                                          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                                            {formatNumber(teamInfo.occupied)}
                                          </span>
                                        </div>
                                        {index < summary.teamBreakdown.length - 1 && (
                                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>|</span>
                                        )}
                                      </React.Fragment>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>

                    {/* 团队分配行 */}
                    {!isCollapsed &&
                      projectTeams.map((team) => (
                        <tr key={`${project.id}-${team.id}`} className={styles.teamRow}>
                          <td
                            className={styles.stickyCol}
                            style={{
                              padding: '8px 8px 8px 32px',
                              borderRight: '1px solid var(--color-border)',
                              borderBottom: '1px solid var(--color-border)',
                              minWidth: 160,
                              width: 160,
                              backgroundColor: 'var(--color-bg-container)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <TeamBadge team={team} size="sm" title={team.name} />
                              <span
                                style={{
                                  fontSize: 13,
                                  color: 'var(--color-text-secondary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={team.name}
                              >
                                {team.name}
                              </span>
                            </div>
                          </td>
                          {sortedTimePoints.map((timePoint) => {
                            const cellValue = getCellValue(timePoint.id, project.id, team.id)
                            const cellId = `${timePoint.id}-${project.id}-${team.id}`

                            return (
                              <td
                                key={cellId}
                                style={{
                                  padding: '8px',
                                  textAlign: 'center',
                                  borderRight: '1px solid var(--color-border)',
                                  borderBottom: '1px solid var(--color-border)',
                                  minWidth: 180,
                                  width: 180,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                  <InputNumber
                                    size="small"
                                    min={0}
                                    max={team.capacity}
                                    step={0.5}
                                    value={cellValue.occupied || undefined}
                                    onChange={(value) => setCellValue(timePoint.id, project.id, team.id, 'occupied', value || 0)}
                                    style={{ width: '48%', minWidth: 40, maxWidth: 80 }}
                                    className={styles.allocationInput}
                                    placeholder="0"
                                    controls
                                    disabled={readonly}
                                  />
                                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>|</span>
                                  <Tooltip title={cellValue.occupied > 0 ? m.maxPrerelease.replace('{count}', String(cellValue.occupied)) : m.setOccupiedFirst}>
                                    <InputNumber
                                      size="small"
                                      min={0}
                                      max={cellValue.occupied}
                                      step={0.5}
                                      value={cellValue.prerelease || undefined}
                                      onChange={(value) => setCellValue(timePoint.id, project.id, team.id, 'prerelease', value || 0)}
                                      style={{
                                        width: '48%',
                                        minWidth: 40,
                                        maxWidth: 80,
                                        ...(cellValue.prerelease >= cellValue.occupied && cellValue.occupied > 0
                                          ? { borderColor: 'var(--color-warning)', backgroundColor: 'rgba(250, 173, 20, 0.1)' }
                                          : {}),
                                      }}
                                      className={styles.allocationInput}
                                      placeholder="0"
                                      controls
                                      disabled={readonly}
                                    />
                                  </Tooltip>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
