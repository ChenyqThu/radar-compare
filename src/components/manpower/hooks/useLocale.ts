/**
 * i18n hook for manpower module
 *
 * Provides access to the main application's i18n system.
 */

import { useI18n } from '@/locales'

export function useManpowerLocale() {
  const { t } = useI18n()
  return t.manpower
}

export function useCommonLocale() {
  const { t } = useI18n()
  return t.common
}
