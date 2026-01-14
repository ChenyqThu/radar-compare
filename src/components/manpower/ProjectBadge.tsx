import React from 'react'
import { Tooltip } from 'antd'
import type { Project } from './types/data'
import styles from './styles.module.css'

interface ProjectBadgeProps {
  project: Project
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

export const ProjectBadge: React.FC<ProjectBadgeProps> = ({
  project,
  size = 'md',
  showText = false,
  className = '',
  title,
}) => {
  const dimension = sizeMap[size]
  const tooltipTitle = title || `${project.name}${project.releaseDate ? ` (${project.releaseDate})` : ''}`

  const getPatternStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = { backgroundColor: project.color }

    switch (project.pattern) {
      case 'stripes':
        return {
          ...baseStyle,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            ${project.color},
            ${project.color} 2px,
            rgba(255,255,255,0.3) 2px,
            rgba(255,255,255,0.3) 4px
          )`,
        }
      case 'dots':
        return {
          ...baseStyle,
          backgroundImage: `radial-gradient(
            circle at 25% 25%,
            rgba(255,255,255,0.4) 1px,
            transparent 1px
          )`,
          backgroundSize: '4px 4px',
        }
      default:
        return baseStyle
    }
  }

  const badgeContent = (
    <div className={`${styles.projectBadge} ${className}`}>
      <div
        style={{
          width: dimension,
          height: dimension,
          borderRadius: '50%',
          flexShrink: 0,
          ...getPatternStyle(),
        }}
      />
      {showText && (
        <span
          style={{
            fontSize: 14,
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {project.name}
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
