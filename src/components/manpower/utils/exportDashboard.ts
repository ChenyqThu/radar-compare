// 导出Dashboard为HTML文件的工具函数

interface ExportData {
  teams: any[];
  projects: any[];
  timePoints: any[];
  allocations: any;
}

export const exportDashboardToHTML = async (data: ExportData) => {
  const { teams, projects, timePoints, allocations } = data;
  
  // 准备桑基图数据 - 使用与组件相同的复杂算法
  const prepareSankeyData = () => {
    const nodes: any[] = [];
    const links: any[] = [];
    
    // 排序时间点，只取前3个
    const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    
    // 添加团队节点
    teams.forEach((team) => {
      nodes.push({
        name: team.name,
        value: team.capacity,
        itemStyle: { color: team.color },
        category: 0,
      });
    });

    // 为每个时间点创建项目节点
    sortedTimePoints.forEach((timePoint, timeIndex) => {
      projects.forEach((project) => {
        let totalPersons = 0;
        teams.forEach((team) => {
          const allocation = allocations[timePoint.id]?.[project.id]?.[team.id];
          if (allocation) {
            totalPersons += allocation.occupied;
          }
        });
        
        if (totalPersons > 0) {
          const nodeId = `${project.name}_${timeIndex}`;
          nodes.push({
            name: nodeId,
            value: totalPersons,
            itemStyle: { color: project.color },
            category: timeIndex + 1,
          });
        }
      });
    });

    // 创建连接 - 每列只与前一列相关
    sortedTimePoints.forEach((timePoint, timeIndex) => {
      if (timeIndex === 0) {
        // 第一个时间点：从团队到项目的直接分配
        projects.forEach((project) => {
          const projectNodeId = `${project.name}_${timeIndex}`;
          if (nodes.some(node => node.name === projectNodeId)) {
            teams.forEach((team) => {
              const allocation = allocations[timePoint.id]?.[project.id]?.[team.id];
              if (allocation && allocation.occupied > 0) {
                links.push({
                  source: team.name,
                  target: projectNodeId,
                  value: allocation.occupied,
                  teamDetails: {
                    [team.id]: {
                      name: team.name,
                      value: allocation.occupied,
                      color: team.color
                    }
                  }
                });
              }
            });
          }
        });
      } else {
        // 后续时间点：只从上一列的项目节点流向当前列
        const prevTimePoint = sortedTimePoints[timeIndex - 1];
        
        // 收集上一个时间点的所有项目及其人力分布（按团队分组）
        const prevProjectResources: {[projectId: string]: {[teamId: string]: number}} = {};
        projects.forEach((project) => {
          const prevNodeId = `${project.name}_${timeIndex - 1}`;
          if (nodes.some(node => node.name === prevNodeId)) {
            prevProjectResources[project.id] = {};
            teams.forEach((team) => {
              const allocation = allocations[prevTimePoint.id]?.[project.id]?.[team.id];
              if (allocation && allocation.occupied > 0) {
                prevProjectResources[project.id][team.id] = allocation.occupied;
              }
            });
          }
        });

        // 为当前时间点的每个项目分配人力
        projects.forEach((currentProject) => {
          const currentNodeId = `${currentProject.name}_${timeIndex}`;
          if (!nodes.some(node => node.name === currentNodeId)) return;

          // 获取当前项目需要的人力（按团队）
          const currentNeeds: {[teamId: string]: number} = {};
          teams.forEach((team) => {
            const allocation = allocations[timePoint.id]?.[currentProject.id]?.[team.id];
            if (allocation && allocation.occupied > 0) {
              currentNeeds[team.id] = allocation.occupied;
            }
          });

          // 优先从同一项目的上一时间点继承
          const prevNodeId = `${currentProject.name}_${timeIndex - 1}`;
          if (nodes.some(node => node.name === prevNodeId)) {
            // 计算可继承的人力
            let inheritedTotal = 0;
            const inheritedTeamDetails: {[teamId: string]: {name: string, value: number, color: string}} = {};
            
            teams.forEach((team) => {
              const prevAllocation = allocations[prevTimePoint.id]?.[currentProject.id]?.[team.id]?.occupied || 0;
              const currentNeed = currentNeeds[team.id] || 0;
              const inherited = Math.min(prevAllocation, currentNeed);
              
              if (inherited > 0) {
                inheritedTotal += inherited;
                inheritedTeamDetails[team.id] = {
                  name: team.name,
                  value: inherited,
                  color: team.color
                };
                // 从需求中减去已继承的部分
                currentNeeds[team.id] = Math.max(0, currentNeed - inherited);
                // 从上一项目的资源中减去已使用的部分
                if (prevProjectResources[currentProject.id]) {
                  prevProjectResources[currentProject.id][team.id] = Math.max(0, 
                    (prevProjectResources[currentProject.id][team.id] || 0) - inherited
                  );
                }
              }
            });

            if (inheritedTotal > 0) {
              links.push({
                source: prevNodeId,
                target: currentNodeId,
                value: inheritedTotal,
                teamDetails: inheritedTeamDetails
              });
            }
          }

          // 从其他项目释放的资源中分配剩余需求
          Object.entries(currentNeeds).forEach(([teamId, needAmount]) => {
            if (needAmount <= 0) return;

            let remainingNeed = needAmount;
            
            // 遍历所有上一时间点的项目，寻找可用的同团队资源
            Object.entries(prevProjectResources).forEach(([prevProjectId, teamResources]) => {
              if (remainingNeed <= 0) return;
              
              const availableFromTeam = teamResources[teamId] || 0;
              if (availableFromTeam > 0) {
                const transferAmount = Math.min(remainingNeed, availableFromTeam);
                
                const prevProject = projects.find(p => p.id === prevProjectId);
                const team = teams.find(t => t.id === teamId);
                if (prevProject && team) {
                  const prevNodeId = `${prevProject.name}_${timeIndex - 1}`;
                  
                  links.push({
                    source: prevNodeId,
                    target: currentNodeId,
                    value: transferAmount,
                    teamDetails: {
                      [teamId]: {
                        name: team.name,
                        value: transferAmount,
                        color: team.color
                      }
                    }
                  });
                  
                  // 更新剩余需求和可用资源
                  remainingNeed -= transferAmount;
                  teamResources[teamId] -= transferAmount;
                }
              }
            });
          });
        });

        // 处理上一时间点剩余的未分配资源
        Object.entries(prevProjectResources).forEach(([prevProjectId, teamResources]) => {
          const prevProject = projects.find(p => p.id === prevProjectId);
          if (!prevProject) return;
          
          const prevNodeId = `${prevProject.name}_${timeIndex - 1}`;
          
          Object.entries(teamResources).forEach(([teamId, remainingAmount]) => {
            if (remainingAmount > 0.5) {
              // 尝试分配给当前时间点需要该团队人力的其他项目
              let allocated = false;
              
              projects.forEach((targetProject) => {
                if (allocated || targetProject.id === prevProjectId) return;
                
                const targetNodeId = `${targetProject.name}_${timeIndex}`;
                if (nodes.some(node => node.name === targetNodeId)) {
                  const targetAllocation = allocations[timePoint.id]?.[targetProject.id]?.[teamId];
                  if (targetAllocation && targetAllocation.occupied > 0) {
                    // 分配一部分剩余资源
                    const transferAmount = Math.min(remainingAmount, targetAllocation.occupied * 0.2);
                    
                    if (transferAmount > 0.5) {
                      const team = teams.find(t => t.id === teamId);
                      if (team) {
                        links.push({
                          source: prevNodeId,
                          target: targetNodeId,
                          value: Math.round(transferAmount * 10) / 10,
                          teamDetails: {
                            [teamId]: {
                              name: team.name,
                              value: Math.round(transferAmount * 10) / 10,
                              color: team.color
                            }
                          }
                        });
                        allocated = true;
                      }
                    }
                  }
                }
              });
            }
          });
        });
      }
    });

    // 合并相同source和target的links，并收集团队详情
    const mergedLinksMap = new Map<string, any>();
    
    links.forEach(link => {
      const key = `${link.source}->${link.target}`;
      if (mergedLinksMap.has(key)) {
        const existingLink = mergedLinksMap.get(key)!;
        existingLink.value += link.value;
        // 合并团队详情
        if (link.teamDetails) {
          if (!existingLink.teamDetails) existingLink.teamDetails = {};
          Object.entries(link.teamDetails).forEach(([teamId, details]: [string, any]) => {
            if (existingLink.teamDetails![teamId]) {
              existingLink.teamDetails![teamId].value += details.value;
            } else {
              existingLink.teamDetails![teamId] = { ...details };
            }
          });
        }
      } else {
        mergedLinksMap.set(key, { ...link });
      }
    });
    
    const mergedLinks = Array.from(mergedLinksMap.values());
    return { nodes, links: mergedLinks };
  };
  
  // 准备分布图数据
  const prepareDistributionData = () => {
    const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date));
    const source: any[][] = [
      ['project', ...sortedTimePoints.map(tp => tp.name)]
    ];

    projects.forEach(project => {
      const row: (string | number)[] = [project.name];
      sortedTimePoints.forEach(timePoint => {
        let totalOccupied = 0;
        teams.forEach(team => {
          const allocation = allocations[timePoint.id]?.[project.id]?.[team.id];
          if (allocation) {
            totalOccupied += allocation.occupied;
          }
        });
        row.push(totalOccupied);
      });
      source.push(row);
    });

    return { source, sortedTimePoints };
  };

  // 生成颜色渐变的工具函数
  const generateColorGradient = (baseColor: string, steps: number): string[] => {
    const colors: string[] = [];
    
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const rgb = hexToRgb(baseColor);
    
    for (let i = 0; i < steps; i++) {
      const ratio = 1 - (i * 0.4 / Math.max(1, steps - 1));
      const newR = Math.round(rgb.r + (255 - rgb.r) * (1 - ratio));
      const newG = Math.round(rgb.g + (255 - rgb.g) * (1 - ratio));
      const newB = Math.round(rgb.b + (255 - rgb.b) * (1 - ratio));
      
      colors.push(`rgb(${newR}, ${newG}, ${newB})`);
    }
    
    return colors;
  };

  // 计算两个时间点之间的天数差
  const calculateDaysBetween = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 准备ProjectBarChart数据
  const prepareProjectBarData = () => {
    const sortedTimePoints = [...timePoints].sort((a, b) => a.date.localeCompare(b.date));
    const currentYear = new Date().getFullYear();
    const endDate = `${currentYear}-12-31`;

    const projectStatistics = projects.map(project => {
      let totalManpower = 0;
      const timePeriods: any[] = [];
      
      const colors = generateColorGradient(project.color, sortedTimePoints.length);
      
      if (sortedTimePoints.length === 1) {
        const timePoint = sortedTimePoints[0];
        let singlePeriodManpower = 0;
        teams.forEach(team => {
          const allocation = allocations[timePoint.id]?.[project.id]?.[team.id];
          if (allocation) {
            singlePeriodManpower += allocation.occupied;
          }
        });
        const days = 30;
        const manDays = singlePeriodManpower * days;
        totalManpower = manDays;
        
        timePeriods.push({
          name: `${timePoint.name} (30天)`,
          fromTimePoint: timePoint.name,
          toTimePoint: '(30天)',
          manpower: singlePeriodManpower,
          days,
          totalManDays: manDays,
          color: colors[0] || project.color,
        });
      } else if (sortedTimePoints.length > 1) {
        for (let i = 0; i < sortedTimePoints.length - 1; i++) {
          const currentTimePoint = sortedTimePoints[i];
          const nextTimePoint = sortedTimePoints[i + 1];
          
          const daysBetween = calculateDaysBetween(currentTimePoint.date, nextTimePoint.date);
          
          let currentPeriodManpower = 0;
          teams.forEach(team => {
            const allocation = allocations[currentTimePoint.id]?.[project.id]?.[team.id];
            if (allocation) {
              currentPeriodManpower += allocation.occupied;
            }
          });
          
          const manDays = currentPeriodManpower * daysBetween;
          totalManpower += manDays;
          
          timePeriods.push({
            name: `${currentTimePoint.name} → ${nextTimePoint.name}`,
            fromTimePoint: currentTimePoint.name,
            toTimePoint: nextTimePoint.name,
            manpower: currentPeriodManpower,
            days: daysBetween,
            totalManDays: manDays,
            color: colors[i] || project.color,
          });
        }
        
        const lastTimePoint = sortedTimePoints[sortedTimePoints.length - 1];
        const daysToEnd = calculateDaysBetween(lastTimePoint.date, endDate);
        
        let lastPeriodManpower = 0;
        teams.forEach(team => {
          const allocation = allocations[lastTimePoint.id]?.[project.id]?.[team.id];
          if (allocation) {
            lastPeriodManpower += allocation.occupied;
          }
        });
        
        const lastManDays = lastPeriodManpower * daysToEnd;
        totalManpower += lastManDays;
        
        const endDateStr = new Date(endDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        timePeriods.push({
          name: `${lastTimePoint.name} → ${endDateStr}`,
          fromTimePoint: lastTimePoint.name,
          toTimePoint: endDateStr,
          manpower: lastPeriodManpower,
          days: daysToEnd,
          totalManDays: lastManDays,
          color: colors[sortedTimePoints.length - 1] || project.color,
        });
      }
      
      return {
        id: project.id,
        name: project.name,
        status: project.status,
        color: project.color,
        totalManpower,
        releaseDate: project.releaseDate,
        pattern: project.pattern,
        timePeriods,
      };
    }).sort((a, b) => b.totalManpower - a.totalManpower);

    // 获取所有时间段的名称用于图例
    const allTimePeriods = new Set<string>();
    projectStatistics.forEach(project => {
      project.timePeriods.forEach((period: any) => {
        allTimePeriods.add(period.name);
      });
    });
    const timePeriodNames = Array.from(allTimePeriods);

    // 准备Y轴数据（项目名称）
    const projectNames = projectStatistics.map(p => p.name);

    // 为每个时间段创建一个series
    const series = timePeriodNames.map(periodName => {
      const data = projectStatistics.map(project => {
        const period = project.timePeriods.find((p: any) => p.name === periodName);
        return period ? {
          value: period.totalManDays,
          itemStyle: { color: period.color },
          periodData: period,
          projectData: {
            id: project.id,
            name: project.name,
            status: project.status,
            releaseDate: project.releaseDate,
          }
        } : {
          value: 0,
          itemStyle: { color: 'transparent' },
          periodData: null,
          projectData: {
            id: project.id,
            name: project.name,
            status: project.status,
            releaseDate: project.releaseDate,
          }
        };
      });

      return {
        name: periodName,
        type: 'bar',
        stack: '总量',
        data: data.reverse(),
        barWidth: 20,
        emphasis: {
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
          },
        },
      };
    });

    return { projectStatistics, timePeriodNames, projectNames, series };
  };
  
  const sankeyData = prepareSankeyData();
  const distributionData = prepareDistributionData();
  const projectBarData = prepareProjectBarData();
  
  // 生成HTML内容
  const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Omada 研发人力排布 Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background-color: #f9fafb;
            color: #374151;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 10px;
        }
        
        .header .meta {
            display: flex;
            gap: 20px;
            font-size: 14px;
            color: #6b7280;
        }
        
        .chart-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .chart-title {
            font-size: 18px;
            font-weight: 500;
            color: #111827;
            margin-bottom: 15px;
        }
        
        .chart {
            width: 100%;
            height: 500px;
        }
        
        .legend-container {
            background: #f9fafb;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .legend-title {
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 10px;
        }
        
        .legend-items {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            background: white;
            border-radius: 4px;
            font-size: 12px;
            border: 1px solid #e5e7eb;
        }
        
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 6px;
        }
        
        .description {
            font-size: 14px;
            color: #6b7280;
            margin-top: 15px;
        }
        
        .description p {
            margin-bottom: 5px;
        }
        
        .export-info {
            text-align: center;
            padding: 15px;
            background: #eff6ff;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
            color: #1e40af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Omada 研发人力排布 Dashboard</h1>
            <div class="meta">
                <span>导出时间: ${new Date().toLocaleString('zh-CN')}</span>
                <span>总人力: ${teams.reduce((sum, team) => sum + team.capacity, 0)}人</span>
                <span>团队数: ${teams.length}</span>
                <span>项目数: ${projects.length}</span>
                <span>时间点: ${timePoints.length}</span>
            </div>
        </div>
        
        <div class="chart-container">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <h2 class="chart-title" style="margin: 0;">版本人力投入总览（按时间段分组）</h2>
                <div style="display: flex; gap: 16px; font-size: 14px; color: #6b7280;">
                    <span>项目: ${projects.length}</span>
                    <span>时间段: ${projectBarData.timePeriodNames.length}</span>
                    <span>总计: ${projectBarData.projectStatistics.reduce((sum: number, p: any) => sum + p.totalManpower, 0)}人·天</span>
                </div>
            </div>
            
            <div class="legend-container">
                <div class="legend-title" style="display: flex; align-items: center;">
                    <span style="width: 12px; height: 12px; background-color: #6366f1; border-radius: 50%; margin-right: 8px;"></span>
                    时间段筛选
                </div>
                <div class="legend-items">
                    ${projectBarData.timePeriodNames.map(periodName => `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: #6366f1; opacity: 0.8;"></div>
                            ${periodName}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div id="projectBarChart" class="chart"></div>
            
            <div class="description" style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border-radius: 6px;">
                <h4 style="font-size: 14px; font-weight: 500; color: #111827; margin-bottom: 8px;">图表说明</h4>
                <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                    <p style="margin-bottom: 4px;">• <strong>分段柱状图</strong>：每个版本按时间段分组显示人力投入</p>
                    <p style="margin-bottom: 4px;">• <strong>颜色渐变</strong>：同项目不同时间段使用同色系渐变</p>
                    <p style="margin-bottom: 4px;">• <strong>悬浮提示</strong>：显示详细的时间段、人力投入和人·天统计</p>
                    <p style="margin-bottom: 4px;">• <strong>图例筛选</strong>：点击图例可筛选显示特定时间段</p>
                    <p style="margin-bottom: 0;">• <strong>智能计算</strong>：自动计算时间跨度和人力投入的人·天数</p>
                </div>
            </div>
        </div>
        
        <div class="chart-container">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <h2 class="chart-title" style="margin: 0;">人力流动分析</h2>
                <div style="display: flex; gap: 16px; font-size: 14px; color: #6b7280;">
                    <span>团队: ${teams.length}</span>
                    <span>项目: ${projects.length}</span>
                    <span>节点: ${sankeyData.nodes.length}</span>
                    <span>连接: ${sankeyData.links.length}</span>
                </div>
            </div>
            
            <div class="legend-container">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <div class="legend-title" style="display: flex; align-items: center;">
                            <span style="width: 12px; height: 12px; background-color: #3b82f6; border-radius: 50%; margin-right: 8px;"></span>
                            团队筛选
                        </div>
                        <div class="legend-items">
                            ${teams.map(team => `
                                <div class="legend-item">
                                    <div class="legend-color" style="background-color: ${team.color}"></div>
                                    ${team.name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <div class="legend-title" style="display: flex; align-items: center;">
                            <span style="width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; margin-right: 8px;"></span>
                            项目筛选
                        </div>
                        <div class="legend-items">
                            ${projects.map(project => `
                                <div class="legend-item">
                                    <div class="legend-color" style="background-color: ${project.color}; ${
                                        project.pattern === 'stripes' ? 
                                        `background: repeating-linear-gradient(45deg, ${project.color}, ${project.color} 2px, transparent 2px, transparent 4px);` : 
                                        ''
                                    } ${project.pattern === 'dots' ? 'border-radius: 50%;' : ''}"></div>
                                    ${project.name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="sankeyChart" class="chart"></div>
            
            <div class="description" style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border-radius: 6px;">
                <h4 style="font-size: 14px; font-weight: 500; color: #111827; margin-bottom: 8px;">图表说明</h4>
                <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                    <p style="margin-bottom: 4px;">• <strong>4列布局</strong>：团队 → 7月项目 → 9月项目 → 11月项目</p>
                    <p style="margin-bottom: 4px;">• <strong>人员流动</strong>：每列只与前一列相关，优先项目继承，再从其他项目转移</p>
                    <p style="margin-bottom: 4px;">• <strong>团队匹配</strong>：人员转移时考虑团队类型对应关系</p>
                    <p style="margin-bottom: 4px;">• <strong>筛选功能</strong>：点击图例可筛选显示的团队和项目</p>
                    <p style="margin-bottom: 0;">• <strong>鼠标悬停</strong>：显示详细的人力分配和流动信息</p>
                </div>
            </div>
        </div>
        
        <div class="chart-container">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                <h2 class="chart-title" style="margin: 0;">版本人力投入分析</h2>
                <div style="display: flex; gap: 16px; font-size: 14px; color: #6b7280;">
                    <span>项目: ${projects.length}</span>
                    <span>时间点: ${timePoints.length}</span>
                    <span>总人力: ${teams.reduce((sum, team) => sum + team.capacity, 0)}</span>
                </div>
            </div>
            
            <div class="legend-container">
                <div class="legend-title" style="display: flex; align-items: center;">
                    <span style="width: 12px; height: 12px; background-color: #8b5cf6; border-radius: 50%; margin-right: 8px;"></span>
                    项目版本
                </div>
                <div class="legend-items">
                    ${projects.map(project => `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: ${project.color}; ${
                                project.pattern === 'stripes' ? 
                                `background: repeating-linear-gradient(45deg, ${project.color}, ${project.color} 2px, transparent 2px, transparent 4px);` : 
                                ''
                            } ${project.pattern === 'dots' ? 'border-radius: 50%;' : ''}"></div>
                            ${project.name}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div id="distributionChart" class="chart"></div>
            
            <div class="description" style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border-radius: 6px;">
                <h4 style="font-size: 14px; font-weight: 500; color: #111827; margin-bottom: 8px;">图表说明</h4>
                <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                    <p style="margin-bottom: 4px;">• <strong>左侧饼图</strong>：显示选中时间点的项目人力分布情况</p>
                    <p style="margin-bottom: 4px;">• <strong>右侧折线图</strong>：显示各项目在不同时间点的人力投入趋势</p>
                    <p style="margin-bottom: 4px;">• <strong>联动交互</strong>：鼠标悬停在折线图上可实时更新饼图数据</p>
                    <p style="margin-bottom: 4px;">• <strong>数据统计</strong>：按项目版本统计人力投入，支持时间轴分析</p>
                    <p style="margin-bottom: 0;">• <strong>点击图例</strong>：可筛选显示特定项目的数据趋势</p>
                </div>
            </div>
        </div>
        
        <div class="export-info">
            此文件由 Omada 研发人力排布系统 自动生成，包含完整的图表数据和交互功能
        </div>
    </div>
    
    <script>
        // ProjectBarChart配置 - 第一个图表
        const projectBarChart = echarts.init(document.getElementById('projectBarChart'));
        const projectBarData = ${JSON.stringify(projectBarData)};
        
        const projectBarOption = {
            title: {
                text: '版本人力投入总览（按时间段分组）',
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'bold',
                },
            },
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    const { data } = params;
                    if (!data.periodData || data.value === 0) return '';
                    
                    const statusMap = {
                        'development': '开发中',
                        'planning': '规划中',
                        'release': '已发布',
                        'completed': '已完成',
                    };
                    
                    return \`
                        <div style="margin: 0; padding: 8px;">
                            <div style="font-weight: bold; margin-bottom: 4px;">\${data.projectData.name}</div>
                            <div style="color: #666; margin-bottom: 4px;">状态: \${statusMap[data.projectData.status] || data.projectData.status}</div>
                            \${data.projectData.releaseDate ? \`<div style="color: #666; margin-bottom: 4px;">发布时间: \${data.projectData.releaseDate}</div>\` : ''}
                            <div style="border-top: 1px solid #eee; margin: 8px 0; padding-top: 8px;">
                                <div style="font-weight: bold; color: \${params.color}; margin-bottom: 4px;">\${data.periodData.name}</div>
                                <div style="color: #666;">人力投入: \${data.periodData.manpower}人</div>
                                <div style="color: #666;">时间跨度: \${data.periodData.days}天</div>
                                <div style="font-weight: bold; color: \${params.color};">总人·天: \${data.periodData.totalManDays}</div>
                            </div>
                        </div>
                    \`;
                },
            },
            legend: {
                type: 'scroll',
                orient: 'horizontal',
                top: 'bottom',
                data: projectBarData.timePeriodNames,
                selector: false, // 禁用图例的全选/反选按钮
            },
            grid: {
                left: '15%',
                right: '10%',
                top: '15%',
                bottom: '20%',
                containLabel: true,
            },
            xAxis: {
                type: 'value',
                name: '人力投入 (人·天)',
                nameLocation: 'middle',
                nameGap: 30,
                nameTextStyle: {
                    fontSize: 12,
                },
                axisLine: {
                    lineStyle: {
                        color: '#e5e5e5',
                    },
                },
                axisTick: {
                    lineStyle: {
                        color: '#e5e5e5',
                    },
                },
                axisLabel: {
                    color: '#666',
                    fontSize: 11,
                },
                splitLine: {
                    lineStyle: {
                        color: '#f0f0f0',
                        type: 'dashed',
                    },
                },
            },
            yAxis: {
                type: 'category',
                data: projectBarData.projectNames.reverse(),
                axisLine: {
                    show: false,
                },
                axisTick: {
                    show: false,
                },
                axisLabel: {
                    color: '#333',
                    fontSize: 11,
                    width: 120,
                    overflow: 'truncate',
                },
            },
            series: projectBarData.series,
        };
        
        projectBarChart.setOption(projectBarOption);
        
        // 桑基图配置 - 第二个图表
        const sankeyChart = echarts.init(document.getElementById('sankeyChart'));
        const sankeyOption = {
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove',
                formatter: function (params) {
                    if (params.dataType === 'node') {
                        const nodeName = params.name;
                        
                        // 检查是否是团队节点（在第一列）
                        const isTeamNode = ${JSON.stringify(teams)}.some(team => team.name === nodeName);
                        
                        if (isTeamNode) {
                            // 团队节点
                            const team = ${JSON.stringify(teams)}.find(t => t.name === nodeName);
                            return '<div style="font-size: 13px;"><strong>' + nodeName + '</strong><br/>团队总人力: ' + (team ? team.capacity : 0) + '人</div>';
                        } else {
                            // 项目节点，解析项目名称和时间点索引
                            const match = nodeName.match(/^(.+)_(\\d+)$/);
                            if (match) {
                                const projectName = match[1];
                                const timeIndex = parseInt(match[2]);
                                const project = ${JSON.stringify(projects)}.find(p => p.name === projectName);
                                const timePoint = ${JSON.stringify(timePoints.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3))}[timeIndex];
                                
                                if (project && timePoint) {
                                    let tooltipContent = '<div style="font-size: 13px;"><strong>' + projectName + '</strong> @ ' + timePoint.name + '<br/>总人力: ' + (params.value || 0) + '人<br/>团队分布：';
                                    
                                    ${JSON.stringify(teams)}.forEach(team => {
                                        const allocation = ${JSON.stringify(allocations)}[timePoint.id] && ${JSON.stringify(allocations)}[timePoint.id][project.id] && ${JSON.stringify(allocations)}[timePoint.id][project.id][team.id];
                                        if (allocation && allocation.occupied > 0) {
                                            tooltipContent += '<br/><span style="display:inline-block;width:8px;height:8px;background-color:' + team.color + ';border-radius:50%;margin-right:6px;"></span><span style="font-size:11px;">' + team.name + ': ' + allocation.occupied + '人</span>';
                                        }
                                    });
                                    
                                    tooltipContent += '</div>';
                                    return tooltipContent;
                                }
                            }
                        }
                        
                        return '<div style="font-size: 13px;"><strong>' + params.name + '</strong><br/>人力: ' + (params.value || 0) + '人</div>';
                    } else if (params.dataType === 'edge') {
                        // 连接线的详细流动信息
                        let sourceName = params.data.source;
                        let targetName = params.data.target;
                        
                        // 如果是项目节点，提取项目名称和时间点
                        const sourceMatch = sourceName.match(/^(.+)_(\\d+)$/);
                        const targetMatch = targetName.match(/^(.+)_(\\d+)$/);
                        
                        let sourceDisplayName = sourceName;
                        let targetDisplayName = targetName;
                        
                        if (sourceMatch) {
                            sourceDisplayName = sourceMatch[1];
                        }
                        
                        if (targetMatch) {
                            targetDisplayName = targetMatch[1];
                        }
                        
                        let tooltipContent = '<div style="font-size: 13px;"><strong>' + sourceDisplayName + ' → ' + targetDisplayName + '</strong><br/>总流动: ' + params.data.value + '人';
                        
                        // 使用teamDetails显示详细的团队流动信息
                        if (params.data.teamDetails) {
                            tooltipContent += '<br/>团队流动详情：';
                            Object.values(params.data.teamDetails).forEach(function(teamDetail) {
                                tooltipContent += '<br/><span style="display:inline-block;width:8px;height:8px;background-color:' + teamDetail.color + ';border-radius:50%;margin-right:6px;"></span><span style="font-size:11px;">' + teamDetail.name + ': ' + teamDetail.value + '人</span>';
                            });
                        }
                        
                        return tooltipContent + '</div>';
                    }
                    return '';
                }
            },
            series: [{
                type: 'sankey',
                layout: 'none',
                emphasis: { focus: 'adjacency' },
                lineStyle: { color: 'gradient', curveness: 0.5 },
                label: {
                    fontSize: 12,
                    fontWeight: 'bold',
                    formatter: function(params) {
                        const match = params.name.match(/^(.+)_(\\\d+)$/);
                        if (match) {
                            const projectName = match[1];
                            return projectName.length > 15 ? projectName.substring(0, 15) + '...' : projectName;
                        }
                        return params.name;
                    }
                },
                data: ${JSON.stringify(sankeyData.nodes)},
                links: ${JSON.stringify(sankeyData.links)},
                left: '5%',
                right: '5%',
                top: '12%',
                bottom: '8%',
                nodeWidth: 20,
                nodeGap: 12,
                nodeAlign: 'justify',
                layoutIterations: 0,
                orient: 'horizontal',
                draggable: false
            }]
        };
        sankeyChart.setOption(sankeyOption);
        
        // 分布图配置
        const distributionChart = echarts.init(document.getElementById('distributionChart'));
        const distributionSource = ${JSON.stringify(distributionData.source)};
        const projects = ${JSON.stringify(projects)};
        
        // 为饼图准备初始数据
        const initialPieData = projects.map((project, index) => ({
            name: project.name,
            value: distributionSource[index + 1] ? distributionSource[index + 1][1] : 0,
            itemStyle: { color: project.color }
        }));
        
        const distributionOption = {
            color: projects.map(project => project.color),
            legend: { top: 10 },
            tooltip: { trigger: 'axis', showContent: false },
            dataset: { source: distributionSource },
            xAxis: { 
                type: 'category',
                axisLabel: { rotate: 45 }
            },
            yAxis: { 
                gridIndex: 0,
                name: '人力投入',
                nameLocation: 'middle',
                nameGap: 50
            },
            grid: { 
                top: '25%',
                left: '55%',
                right: '2%',
                bottom: '25%'
            },
            series: [
                ...projects.map(() => ({
                    type: 'line',
                    smooth: false,
                    seriesLayoutBy: 'row',
                    emphasis: { focus: 'series' },
                    lineStyle: { width: 2 },
                    symbol: 'circle',
                    symbolSize: 6
                })),
                {
                    type: 'pie',
                    id: 'pie',
                    radius: '40%',
                    center: ['20%', '50%'],
                    data: initialPieData,
                    emphasis: {
                        focus: 'self',
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    },
                    label: {
                        formatter: '{b}: {c} ({d}%)',
                        fontSize: 12
                    },
                    labelLine: { show: true }
                }
            ]
        };
        
        // 设置图表联动
        distributionChart.on('updateAxisPointer', function (event) {
            const xAxisInfo = event.axesInfo[0];
            if (xAxisInfo) {
                const dimension = xAxisInfo.value + 1;
                const updatedPieData = projects.map((project, index) => ({
                    name: project.name,
                    value: distributionSource[index + 1] ? distributionSource[index + 1][dimension] : 0,
                    itemStyle: { color: project.color }
                }));
                
                distributionChart.setOption({
                    series: {
                        id: 'pie',
                        data: updatedPieData,
                        label: { formatter: '{b}: {c} ({d}%)' }
                    }
                });
            }
        });
        
        distributionChart.setOption(distributionOption);
        
        // 响应式处理
        window.addEventListener('resize', function() {
            projectBarChart.resize();
            sankeyChart.resize();
            distributionChart.resize();
        });
    </script>
</body>
</html>`;

  // 创建并下载文件
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Omada-人力排布-Dashboard-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}; 