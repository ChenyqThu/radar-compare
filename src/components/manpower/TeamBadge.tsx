import React from 'react'
import { Tooltip } from 'antd'
import type { Team } from './types/data'
import styles from './styles.module.css'

interface TeamBadgeProps {
  team: Team
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  title?: string
}

const sizeMap = {
  sm: 12,
  md: 16,
  lg: 24,
}

const fontSizeMap = {
  sm: 8,
  md: 10,
  lg: 12,
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  team,
  size = 'md',
  showText = false,
  className = '',
  title,
}) => {
  const dimension = sizeMap[size]
  const fontSize = fontSizeMap[size]
  const tooltipTitle = title || `${team.name}: ${team.capacity}人`

  const badgeContent = (
    <div className={`${styles.teamBadge} ${className}`}>
      <div
        style={{
          width: dimension,
          height: dimension,
          backgroundColor: team.color,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize,
          flexShrink: 0,
        }}
      >
        {team.badge && <span>{team.badge}</span>}
      </div>
      {showText && (
        <span style={{ fontSize: 14, color: 'var(--color-text)' }}>
          {team.name}
        </span>
      )}
    </div>
  )

  return (
    <Tooltip title={tooltipTitle}>
      {badgeContent}
    </Tooltip>
  )
}
