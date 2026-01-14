/**
 * ManpowerView - Main entry component for manpower module
 *
 * This component provides tab-based layout for allocation grid and visualizations.
 */

import React, { useMemo } from 'react'
import { Tabs, Empty, Button } from 'antd'
import { TableOutlined, BarChartOutlined } from '@ant-design/icons'
import { AllocationGrid } from './modules/allocation/AllocationGrid'
import { SankeyChart } from './modules/visualization/SankeyChart'
import { DistributionChart } from './modules/visualization/DistributionChart'
import { ProjectBarChart } from './modules/visualization/ProjectBarChart'
import { useConfigStore } from './stores'
import { useI18n } from '@/locales'
import { useUIStore } from '@/stores/uiStore'
import styles from './ManpowerView.module.css'

type TabType = 'allocation' | 'visualization'

interface ManpowerViewProps {
  readonly?: boolean
}

export const ManpowerView: React.FC<ManpowerViewProps> = ({ readonly = false }) => {
  const { teams, projects, timePoints } = useConfigStore()
  const { t } = useI18n()
  const m = t.manpower
  const { openSettingsDrawer } = useUIStore()

  // Check if there's enough data to show visualizations
  const hasData = teams.length > 0 && projects.length > 0 && timePoints.length > 0

  // Tab items with i18n
  const tabItems = useMemo(() => [
    {
      key: 'allocation' as TabType,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TableOutlined />
          {m.allocationGrid}
        </span>
      ),
      children: hasData ? (
        <AllocationGrid readonly={readonly} />
      ) : (
        <Empty
          description={
            <div>
              <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>{m.noData}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{m.noTeams}</div>
            </div>
          }
        >
          {!readonly && (
            <Button type="primary" onClick={() => openSettingsDrawer()}>
              {m.config}
            </Button>
          )}
        </Empty>
      ),
    },
    {
      key: 'visualization' as TabType,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChartOutlined />
          {m.manpowerAnalysis}
        </span>
      ),
      children: hasData ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SankeyChart />
          <DistributionChart />
          <ProjectBarChart />
        </div>
      ) : (
        <Empty
          description={
            <div>
              <div style={{ marginBottom: 8, fontSize: 16, fontWeight: 500 }}>{m.noData}</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>{m.noTeams}</div>
            </div>
          }
        />
      ),
    },
  ], [m, hasData])

  return (
    <div className={styles.container}>
      <Tabs
        defaultActiveKey="allocation"
        items={tabItems}
        size="large"
        className={styles.tabs}
      />
    </div>
  )
}

export default ManpowerView
