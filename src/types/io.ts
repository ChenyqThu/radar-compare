export type ExportFormat = 'excel' | 'json' | 'png' | 'svg'

export interface ExportOptions {
  format: ExportFormat
  scope: 'current' | 'all'
  pixelRatio?: number
  backgroundColor?: string
  includeSubDimensions?: boolean
}

export interface ImportOptions {
  mode: 'replace' | 'merge'
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  preview: import('./radar').RadarChart | null
}

export interface ValidationError {
  row?: number
  field: string
  message: string
}

export interface ValidationWarning {
  row?: number
  field: string
  message: string
}
