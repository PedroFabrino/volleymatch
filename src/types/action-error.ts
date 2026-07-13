export type ActionErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'saveMatchFailed'
  | 'grantFailed'

export class ActionError extends Error {
  readonly code: ActionErrorCode

  constructor(code: ActionErrorCode) {
    super(code)
    this.name = 'ActionError'
    this.code = code
  }
}

export function assertAuthenticated(
  user: { id: string } | null
): asserts user is { id: string } {
  if (!user) throw new ActionError('unauthorized')
}
