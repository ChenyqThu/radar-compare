import styles from './styles.module.css'

interface BorderBeamProps {
    children: React.ReactNode
    className?: string
    duration?: number
    borderWidth?: number
    colorFrom?: string
    colorTo?: string
}

export function BorderBeam({
    children,
    className = '',
    duration = 8,
    borderWidth = 1,
    colorFrom = '#ffaa40',
    colorTo = '#9c40ff',
}: BorderBeamProps) {
    return (
        <div className={`${styles.container} ${className}`} style={{ '--border-width': `${borderWidth}px` } as any}>
            <div className={styles.content}>{children}</div>
            <div
                className={styles.beam}
                style={{
                    '--duration': `${duration}s`,
                    '--color-from': colorFrom,
                    '--color-to': colorTo,
                } as any}
            />
        </div>
    )
}
