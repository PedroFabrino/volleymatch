import { ActionError, type ActionErrorCode } from '@/types/action-error'

type ErrorsTranslator = (key: ActionErrorCode) => string

export function getActionErrorMessage(
  error: unknown,
  t: ErrorsTranslator,
  fallback: string
): string {
  if (error instanceof ActionError) {
    return t(error.code)
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
