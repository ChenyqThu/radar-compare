import React, { useMemo, useState, useEffect } from 'react'
import { Card, Space, Tag, Typography, Row, Col, Statistic, Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { SankeyChart as SankeyChartType } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useConfigStore, useDataStore } from '../../stores'
import { useI18n } from '@/locales'
import { getCSSVariable } from '../../utils'
import styles from '../../styles.module.css'

const { Text, Title } = Typography
const { CheckableTag } = Tag

interface FilterState {
  teams: Set<string>
  projects: Set<string>
}

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  SankeyChartType,
  CanvasRenderer,
])

interface SankeyNode {
  name: string
  value?: number
  itemStyle?: {
    color: string
  }
  category?: number
}

interface SankeyLink {
  source: string
  target: string
  value: number
  teamDetails?: { [teamId: string]: { name: string; value: number; color: string } }
}

export const SankeyChart: React.FC = () => {
  const { t } = useI18n()
  const m = t.manpower
  const { teams, projects, timePoints } = useConfigStore()
  const { allocations } = useDataStore()

  const [filters, setFilters] = useState<FilterState>({
    teams: new Set(teams.map((t) => t.id)),
    projects: new Set(projects.map((p) => p.id)),
  })

  // 当 teams 或 projects 变化时（切换 tab），重置筛选状态
  useEffect(() => {
    setFilters({
      teams: new Set(teams.map((t) => t.id)),
      projects: new Set(projects.map((p) => p.id)),
    })
  }, [teams, projects])

  // 切换筛选状态
  const toggleFilter = (type: 'teams' | 'projects', id: string) => {
    setFilters((prev) => {
      const newSet = new Set(prev[type])
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return { ...prev, [type]: newSet }
    })
  }

  // 计算桑基图数据
  const sankeyData = useMemo(() => {
    const nodes: SankeyNode[] = []
    const links: SankeyLink[] = []

    // 按日期排序时间点，只取前3个时间点
    const sortedTimePoints = [...timePoints]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)

    // 过滤的团队和项目
    const filteredTeams = teams.filter((t) => filters.teams.has(t.id))
    const filteredProjects = projects.filter((p) => filters.projects.has(p.id))

    // 第一列：添加团队节点
    filteredTeams.forEach((team) => {
      nodes.push({
        name: team.name,
        value: team.capacity,
        itemStyle: { color: team.color },
        category: 0,
      })
    })

    // 为每个时间点创建项目节点
    sortedTimePoints.forEach((timePoint, timeIndex) => {
      filteredProjects.forEach((project) => {
        let totalPersons = 0
        filteredTeams.forEach((team) => {
          const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
          if (allocation) {
            totalPersons += allocation.occupied
          }
        })

        if (totalPersons > 0) {
          const nodeId = `${project.name}_${timeIndex}`
          nodes.push({
            name: nodeId,
            value: totalPersons,
            itemStyle: { color: project.color },
            category: timeIndex + 1,
          })
        }
      })
    })

    // 创建连接 - 每列只与前一列相关
    sortedTimePoints.forEach((timePoint, timeIndex) => {
      if (timeIndex === 0) {
        // 第一个时间点：从团队到项目的直接分配
        filteredProjects.forEach((project) => {
          const projectNodeId = `${project.name}_${timeIndex}`
          if (nodes.some((node) => node.name === projectNodeId)) {
            filteredTeams.forEach((team) => {
              const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
              if (allocation && allocation.occupied > 0) {
                links.push({
                  source: team.name,
                  target: projectNodeId,
                  value: allocation.occupied,
                  teamDetails: {
                    [team.id]: {
                      name: team.name,
                      value: allocation.occupied,
                      color: team.color,
                    },
                  },
                })
              }
            })
          }
        })
      } else {
        // 后续时间点：只从上一列的项目节点流向当前列
        const prevTimePoint = sortedTimePoints[timeIndex - 1]

        // 收集上一个时间点的所有项目及其人力分布
        const prevProjectResources: { [projectId: string]: { [teamId: string]: number } } = {}
        filteredProjects.forEach((project) => {
          const prevNodeId = `${project.name}_${timeIndex - 1}`
          if (nodes.some((node) => node.name === prevNodeId)) {
            prevProjectResources[project.id] = {}
            filteredTeams.forEach((team) => {
              const allocation = allocations[prevTimePoint.id]?.[project.id]?.[team.id]
              if (allocation && allocation.occupied > 0) {
                prevProjectResources[project.id][team.id] = allocation.occupied
              }
            })
          }
        })

        // 为当前时间点的每个项目分配人力
        filteredProjects.forEach((currentProject) => {
          const currentNodeId = `${currentProject.name}_${timeIndex}`
          if (!nodes.some((node) => node.name === currentNodeId)) return

          // 获取当前项目需要的人力
          const currentNeeds: { [teamId: string]: number } = {}
          filteredTeams.forEach((team) => {
            const allocation = allocations[timePoint.id]?.[currentProject.id]?.[team.id]
            if (allocation && allocation.occupied > 0) {
              currentNeeds[team.id] = allocation.occupied
            }
          })

          // 优先从同一项目的上一时间点继承
          const prevNodeId = `${currentProject.name}_${timeIndex - 1}`
          if (nodes.some((node) => node.name === prevNodeId)) {
            let inheritedTotal = 0
            const inheritedTeamDetails: {
              [teamId: string]: { name: string; value: number; color: string }
            } = {}

            filteredTeams.forEach((team) => {
              const prevAllocation =
                allocations[prevTimePoint.id]?.[currentProject.id]?.[team.id]?.occupied || 0
              const currentNeed = currentNeeds[team.id] || 0
              const inherited = Math.min(prevAllocation, currentNeed)

              if (inherited > 0) {
                inheritedTotal += inherited
                inheritedTeamDetails[team.id] = {
                  name: team.name,
                  value: inherited,
                  color: team.color,
                }
                currentNeeds[team.id] = Math.max(0, currentNeed - inherited)
                if (prevProjectResources[currentProject.id]) {
                  prevProjectResources[currentProject.id][team.id] = Math.max(
                    0,
                    (prevProjectResources[currentProject.id][team.id] || 0) - inherited
                  )
                }
              }
            })

            if (inheritedTotal > 0) {
              links.push({
                source: prevNodeId,
                target: currentNodeId,
                value: inheritedTotal,
                teamDetails: inheritedTeamDetails,
              })
            }
          }

          // 从其他项目释放的资源中分配剩余需求
          Object.entries(currentNeeds).forEach(([teamId, needAmount]) => {
            if (needAmount <= 0) return

            let remainingNeed = needAmount

            Object.entries(prevProjectResources).forEach(([prevProjectId, teamResources]) => {
              if (remainingNeed <= 0) return

              const availableFromTeam = teamResources[teamId] || 0
              if (availableFromTeam > 0) {
                const transferAmount = Math.min(remainingNeed, availableFromTeam)

                const prevProject = filteredProjects.find((p) => p.id === prevProjectId)
                const team = filteredTeams.find((t) => t.id === teamId)
                if (prevProject && team) {
                  const prevNodeId = `${prevProject.name}_${timeIndex - 1}`

                  links.push({
                    source: prevNodeId,
                    target: currentNodeId,
                    value: transferAmount,
                    teamDetails: {
                      [teamId]: {
                        name: team.name,
                        value: transferAmount,
                        color: team.color,
                      },
                    },
                  })

                  remainingNeed -= transferAmount
                  teamResources[teamId] -= transferAmount
                }
              }
            })
          })
        })

        // 处理剩余未分配资源
        Object.entries(prevProjectResources).forEach(([prevProjectId, teamResources]) => {
          const prevProject = filteredProjects.find((p) => p.id === prevProjectId)
          if (!prevProject) return

          const prevNodeId = `${prevProject.name}_${timeIndex - 1}`

          Object.entries(teamResources).forEach(([teamId, remainingAmount]) => {
            if (remainingAmount > 0.5) {
              let allocated = false

              filteredProjects.forEach((targetProject) => {
                if (allocated || targetProject.id === prevProjectId) return

                const targetNodeId = `${targetProject.name}_${timeIndex}`
                if (nodes.some((node) => node.name === targetNodeId)) {
                  const targetAllocation = allocations[timePoint.id]?.[targetProject.id]?.[teamId]
                  if (targetAllocation && targetAllocation.occupied > 0) {
                    const transferAmount = Math.min(remainingAmount, targetAllocation.occupied * 0.2)

                    if (transferAmount > 0.5) {
                      const team = filteredTeams.find((t) => t.id === teamId)
                      if (team) {
                        links.push({
                          source: prevNodeId,
                          target: targetNodeId,
                          value: Math.round(transferAmount * 10) / 10,
                          teamDetails: {
                            [teamId]: {
                              name: team.name,
                              value: Math.round(transferAmount * 10) / 10,
                              color: team.color,
                            },
                          },
                        })
                        allocated = true
                      }
                    }
                  }
                }
              })
            }
          })
        })
      }
    })

    // 合并相同source和target的links
    const mergedLinksMap = new Map<string, SankeyLink>()

    links.forEach((link) => {
      const key = `${link.source}->${link.target}`
      if (mergedLinksMap.has(key)) {
        const existingLink = mergedLinksMap.get(key)!
        existingLink.value += link.value
        if (link.teamDetails) {
          if (!existingLink.teamDetails) existingLink.teamDetails = {}
          Object.entries(link.teamDetails).forEach(([teamId, details]) => {
            if (existingLink.teamDetails![teamId]) {
              existingLink.teamDetails![teamId].value += details.value
            } else {
              existingLink.teamDetails![teamId] = { ...details }
            }
          })
        }
      } else {
        mergedLinksMap.set(key, { ...link })
      }
    })

    const mergedLinks = Array.from(mergedLinksMap.values())
    return { nodes, links: mergedLinks }
  }, [teams, projects, timePoints, allocations, filters])

  // 为tooltip使用的变量
  const sortedTimePoints = [...timePoints]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const filteredTeams = teams.filter((t) => filters.teams.has(t.id))
  const filteredProjects = projects.filter((p) => filters.projects.has(p.id))

  // 获取 CSS 变量颜色
  const textColor = getCSSVariable('--chart-text-color')

  const option = {
    title: {
      text: m.sankeyTitle,
      left: 'center',
      top: '2%',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: textColor,
      },
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: function (params: any) {
        if (params.dataType === 'node') {
          const nodeName = params.name
          const isTeamNode = filteredTeams.some((team) => team.name === nodeName)

          if (isTeamNode) {
            const team = filteredTeams.find((t) => t.name === nodeName)
            return `<div style="font-size: 13px;"><strong>${nodeName}</strong><br/>团队总人力: ${team?.capacity || 0}人</div>`
          } else {
            const match = nodeName.match(/^(.+)_(\d+)$/)
            if (match) {
              const [, projectName, timeIndexStr] = match
              const timeIndex = parseInt(timeIndexStr)
              const project = filteredProjects.find((p) => p.name === projectName)
              const timePoint = sortedTimePoints[timeIndex]

              if (project && timePoint) {
                let tooltipContent = `<div style="font-size: 13px;"><strong>${projectName}</strong> @ ${timePoint.name}<br/>总人力: ${params.value || 0}人<br/>团队分布：`

                filteredTeams.forEach((team) => {
                  const allocation = allocations[timePoint.id]?.[project.id]?.[team.id]
                  if (allocation && allocation.occupied > 0) {
                    tooltipContent += `<br/><span style="display:inline-block;width:8px;height:8px;background-color:${team.color};border-radius:50%;margin-right:6px;"></span><span style="font-size:11px;">${team.name}: ${allocation.occupied}人</span>`
                  }
                })

                return tooltipContent + '</div>'
              }
            }
          }

          return `<div style="font-size: 13px;"><strong>${params.name}</strong><br/>人力: ${params.value || 0}人</div>`
        } else if (params.dataType === 'edge') {
          let sourceName = params.data.source
          let targetName = params.data.target

          const sourceMatch = sourceName.match(/^(.+)_(\d+)$/)
          const targetMatch = targetName.match(/^(.+)_(\d+)$/)

          let sourceDisplayName = sourceName
          let targetDisplayName = targetName

          if (sourceMatch) {
            sourceDisplayName = sourceMatch[1]
          }

          if (targetMatch) {
            targetDisplayName = targetMatch[1]
          }

          let tooltipContent = `<div style="font-size: 13px;"><strong>${sourceDisplayName} → ${targetDisplayName}</strong><br/>总流动: ${params.data.value}人`

          if (params.data.teamDetails) {
            tooltipContent += '<br/>团队流动详情：'
            Object.values(params.data.teamDetails).forEach((teamDetail: any) => {
              tooltipContent += `<br/><span style="display:inline-block;width:8px;height:8px;background-color:${teamDetail.color};border-radius:50%;margin-right:6px;"></span><span style="font-size:11px;">${teamDetail.name}: ${teamDetail.value}人</span>`
            })
          }

          return tooltipContent + '</div>'
        }
        return ''
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
        label: {
          fontSize: 12,
          fontWeight: 'bold',
          color: textColor,
          formatter: function (params: any) {
            const match = params.name.match(/^(.+)_(\d+)$/)
            if (match) {
              const projectName = match[1]
              return projectName.length > 15 ? projectName.substring(0, 15) + '...' : projectName
            }
            return params.name
          },
        },
        data: sankeyData.nodes,
        links: sankeyData.links,
        left: '5%',
        right: '10%',
        top: '12%',
        bottom: '8%',
        nodeWidth: 20,
        nodeGap: 12,
        nodeAlign: 'justify',
        layoutIterations: 0,
        orient: 'horizontal',
        draggable: false,
      },
    ],
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>{m.sankey}</Title>
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>{m.instructions}</div>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>{m.multiColumnLayout}</li>
                  <li>{m.personnelFlow}</li>
                  <li>{m.teamMatching}</li>
                  <li>{m.filterFunction}</li>
                  <li>{m.hoverTip}</li>
                </ul>
              </div>
            }
            overlayStyle={{ maxWidth: 400 }}
          >
            <InfoCircleOutlined style={{ color: 'var(--color-text-tertiary)', cursor: 'help' }} />
          </Tooltip>
        </Space>
        <Space size="large">
          <Statistic
            title={m.team}
            value={`${teams.filter((t) => filters.teams.has(t.id)).length}/${teams.length}`}
            valueStyle={{ fontSize: 14 }}
          />
          <Statistic
            title={m.project}
            value={`${projects.filter((p) => filters.projects.has(p.id)).length}/${projects.length}`}
            valueStyle={{ fontSize: 14 }}
          />
          <Statistic
            title={m.node}
            value={sankeyData.nodes.length}
            valueStyle={{ fontSize: 14 }}
          />
          <Statistic
            title={m.link}
            value={sankeyData.links.length}
            valueStyle={{ fontSize: 14 }}
          />
        </Space>
      </div>

      {/* 图例和筛选 */}
      <Card size="small" style={{ marginBottom: 24, backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
        <Row gutter={16}>
          {/* 团队筛选 */}
          <Col xs={24} lg={12}>
            <div className={`${styles.sankeyFilterContainer} ${styles.sankeyTeamFilter}`}>
              <div className={styles.sankeyFilterHeader}>
                <div className={`${styles.sankeyFilterDot} ${styles.sankeyFilterDotTeam}`} />
                <Text strong style={{ fontSize: 13 }}>{m.teamFilter}</Text>
              </div>
              <div className={styles.filterTags} style={{ marginBottom: 0 }}>
                {teams.map((team) => {
                  const isChecked = filters.teams.has(team.id)
                  return (
                    <CheckableTag
                      key={team.id}
                      checked={isChecked}
                      onChange={() => toggleFilter('teams', team.id)}
                      className={`${styles.filterTagCheckable} ${styles.filterTagCheckableTeam} ${isChecked ? styles.checked : ''}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <div
                          className={styles.filterTagIcon}
                          style={{
                            backgroundColor: isChecked ? team.color : 'var(--color-text-quaternary)',
                          }}
                        />
                        <span>{team.name}</span>
                      </span>
                    </CheckableTag>
                  )
                })}
              </div>
            </div>
          </Col>

          {/* 项目筛选 */}
          <Col xs={24} lg={12}>
            <div className={`${styles.sankeyFilterContainer} ${styles.sankeyProjectFilter}`}>
              <div className={styles.sankeyFilterHeader}>
                <div className={`${styles.sankeyFilterDot} ${styles.sankeyFilterDotProject}`} />
                <Text strong style={{ fontSize: 13 }}>{m.projectFilter}</Text>
              </div>
              <div className={styles.filterTags} style={{ marginBottom: 0 }}>
                {projects.map((project) => {
                  const isChecked = filters.projects.has(project.id)
                  return (
                    <CheckableTag
                      key={project.id}
                      checked={isChecked}
                      onChange={() => toggleFilter('projects', project.id)}
                      className={`${styles.filterTagCheckable} ${styles.filterTagCheckableProject} ${isChecked ? styles.checked : ''}`}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <div
                          className={styles.filterTagIcon}
                          style={{
                            borderRadius: project.pattern === 'dots' ? '50%' : 4,
                            backgroundColor: isChecked ? project.color : 'var(--color-text-quaternary)',
                          }}
                        />
                        <span>{project.name}</span>
                      </span>
                    </CheckableTag>
                  )
                })}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <div className={styles.chartContainer}>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    </Card>
  )
}
