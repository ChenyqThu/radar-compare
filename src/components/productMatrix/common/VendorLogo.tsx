import React from 'react'
import type { MatrixVendor } from '@/types/productMatrix'

interface VendorLogoProps {
    vendor: MatrixVendor
    size?: number
    showName?: boolean
    className?: string
    style?: React.CSSProperties
}

export const VendorLogo: React.FC<VendorLogoProps> = ({
    vendor,
    size = 24,
    showName = false,
    className,
    style,
}) => {
    const hasLogo = !!vendor.logoUrl

    // Base styles
    const containerStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        ...style,
    }

    const logoStyle: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: 4, // Slight rounding for squares
        objectFit: 'contain',
        flexShrink: 0,
    }

    const avatarStyle: React.CSSProperties = {
        width: size,
        height: size,
        backgroundColor: vendor.color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, Math.floor(size * 0.6)),
        fontWeight: 600,
        borderRadius: 4, // Default square for consistency
        flexShrink: 0,
    }

    return (
        <div className={className} style={containerStyle}>
            {hasLogo ? (
                <img src={vendor.logoUrl} alt={vendor.name} style={logoStyle} onError={(e) => {
                    // Fallback to avatar if image fails?
                    // For now simple hide/broken icon or just keeping broken image is standard
                    // but we could switch displays.
                    // Let's keep it simple.
                    (e.target as HTMLImageElement).style.display = 'none'
                    // If we hide it, we might want to show fallback sibling? 
                    // Advanced impl would use state.
                }} />
            ) : (
                <div style={avatarStyle}>
                    {vendor.name.charAt(0).toUpperCase()}
                </div>
            )}

            {showName && (
                <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                    {vendor.name}
                </span>
            )}
        </div>
    )
}
