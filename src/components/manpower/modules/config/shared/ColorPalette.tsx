import { COLOR_PALETTE } from '../../../constants'
import styles from '../ConfigTable.module.css'

interface ColorPaletteProps {
  value: string
  onChange: (color: string) => void
}

/**
 * PowerPoint style color palette picker component
 * Shared between TeamConfig and ProjectConfig
 */
export function ColorPalette({ value, onChange }: ColorPaletteProps) {
  return (
    <div className={styles.colorPalette}>
      {COLOR_PALETTE.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.colorRow}>
          {row.map((color) => (
            <button
              key={color}
              className={`${styles.colorSwatch} ${value === color ? styles.colorSwatchActive : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
