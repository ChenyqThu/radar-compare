import React from 'react'
import * as AntdIcons from '@ant-design/icons'

interface NotionIconProps {
    icon?: string
    color?: string
    size?: number
    iconSize?: number
    style?: React.CSSProperties
    className?: string
}

export function NotionIcon({
    icon = 'TagOutlined',
    color = '#999',
    size = 24,
    iconSize = 14,
    style,
    className,
    variant = 'filled'
}: NotionIconProps & { variant?: 'filled' | 'text' }) {
    // Dynamic icon lookup
    const IconCmp = (AntdIcons as any)[icon] || AntdIcons.TagOutlined

    const isText = variant === 'text'
    // If text variant, use provided color for text, transparent bg
    // If filled variant (default), use provided color for bg, white text

    return (
        <div
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                borderRadius: 4,
                backgroundColor: isText ? 'transparent' : color,
                color: isText ? (color === '#999' ? 'currentColor' : color) : '#fff', // If default #999, inherit. Else usage color
                fontSize: iconSize,
                flexShrink: 0,
                ...style
            }}
        >
            <IconCmp />
        </div>
    )
}
