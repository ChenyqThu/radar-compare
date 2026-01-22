import { COLOR_PALETTE } from '@/utils/colorPalette'

interface ColorPaletteProps {
    value?: string
    onChange: (color: string) => void
}

export function ColorPalette({ value, onChange }: ColorPaletteProps) {
    return (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {COLOR_PALETTE.map((row, rowIndex) => (
                <div key={rowIndex} style={{ display: 'flex', gap: 4 }}>
                    {row.map((color) => (
                        <button
                            key={color}
                            style={{
                                width: 20,
                                height: 20,
                                backgroundColor: color,
                                border: value === color ? '2px solid #1890ff' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: 2,
                                cursor: 'pointer',
                                padding: 0,
                            }}
                            onClick={() => onChange(color)}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}
