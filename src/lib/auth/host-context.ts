import { cookies } from 'next/headers'
import type { HostContextCookie } from '@/types/host-access'

export const HOST_CONTEXT_COOKIE = 'vm_host_context'

export async function getHostContextFromCookie(): Promise<HostContextCookie | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(HOST_CONTEXT_COOKIE)?.value
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as HostContextCookie
    if (parsed.ownerHosterId && parsed.grantId) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

export async function resolveEffectiveHosterId(userId: string): Promise<string> {
  const context = await getHostContextFromCookie()
  return context?.ownerHosterId ?? userId
}

export function serializeHostContext(context: HostContextCookie | null): string {
  if (!context) return ''
  return JSON.stringify(context)
}
