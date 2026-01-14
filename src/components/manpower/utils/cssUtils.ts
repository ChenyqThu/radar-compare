/**
 * CSS 工具函数 - 统一管理 CSS 变量访问
 */

/**
 * 获取 CSS 变量值
 * @param name CSS 变量名（包括 -- 前缀）
 * @returns 变量值（去除首尾空白）
 */
export function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * 批量获取 CSS 变量值
 * @param names CSS 变量名数组
 * @returns 变量值对象
 */
export function getCSSVariables(names: string[]): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  const result: Record<string, string> = {}
  for (const name of names) {
    result[name] = style.getPropertyValue(name).trim()
  }
  return result
}
