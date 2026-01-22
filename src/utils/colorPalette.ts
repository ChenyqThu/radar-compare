/**
 * Shared color palette utilities
 * 共享颜色调色板工具
 *
 * PowerPoint-style preset color palette used across multiple modules:
 * - Radar Chart VendorManager
 * - Product Matrix VendorConfig
 * - Manpower module configs
 */

/**
 * PowerPoint-style preset color palette
 * 5 rows x 10 columns = 50 colors
 *
 * Row 0: Primary/Bold colors (主色调)
 * Row 1: Light tints (浅色调)
 * Row 2: Medium tints (中等色调)
 * Row 3: Saturated colors (深色调)
 * Row 4: Dark shades (更深色调)
 */
export const COLOR_PALETTE = [
  // Primary/Bold colors
  ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0'],
  // Light tints
  ['#F8CBAD', '#FCE4D6', '#FFF2CC', '#FFFFCC', '#E2EFDA', '#C6EFCE', '#DAEEF3', '#BDD7EE', '#B4C6E7', '#E4DFEC'],
  // Medium tints
  ['#F4B183', '#F8CBA0', '#FFE699', '#FFFF99', '#C5E0B3', '#A9D08E', '#9DC3E6', '#8FAADC', '#8EA9DB', '#CCC0DA'],
  // Saturated colors
  ['#ED7D31', '#F4A460', '#FFD966', '#FFCC00', '#A8D08D', '#70AD47', '#5B9BD5', '#4472C4', '#305496', '#7B68EE'],
  // Dark shades
  ['#C65911', '#BF8F00', '#BF9000', '#806000', '#548235', '#375623', '#2F75B5', '#2E5A8B', '#1F4E79', '#5B3D87'],
] as const

/** Type for a single color from the palette */
export type PaletteColor = (typeof COLOR_PALETTE)[number][number]

/** Flat array of all palette colors for iteration */
export const ALL_PALETTE_COLORS: readonly string[] = COLOR_PALETTE.flat()

/**
 * Get a color from the palette by index (wraps around if index exceeds palette size)
 * @param index - Zero-based index
 * @returns A color from the palette
 */
export function getColorByIndex(index: number): string {
  const flatColors = ALL_PALETTE_COLORS
  return flatColors[index % flatColors.length]
}

/**
 * Get a random color from the palette
 * @returns A random color from the palette
 */
export function getRandomPaletteColor(): string {
  const flatColors = ALL_PALETTE_COLORS
  return flatColors[Math.floor(Math.random() * flatColors.length)]
}

/**
 * Get primary colors (first row of palette)
 * Useful for assigning distinct colors to items
 */
export const PRIMARY_COLORS = COLOR_PALETTE[0]

/**
 * Get a primary color by index (wraps around)
 * @param index - Zero-based index
 * @returns A primary color from the first row
 */
export function getPrimaryColorByIndex(index: number): string {
  return PRIMARY_COLORS[index % PRIMARY_COLORS.length]
}
