import { ReactNode } from 'react'
import styles from './ShinyButton.module.css'

interface ShinyButtonProps {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  className?: string
}

export function ShinyButton({ children, onClick, loading, className }: ShinyButtonProps) {
  return (
    <button
      className={`${styles.shinyButton} ${className || ''}`}
      onClick={onClick}
      disabled={loading}
      data-magnetic
    >
      <span className={styles.buttonContent}>
        {loading ? <span className={styles.spinner} /> : children}
      </span>
    </button>
  )
}
