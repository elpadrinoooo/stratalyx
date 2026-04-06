import type { AppState } from '../types'

const MIGRATION_FLAG_PREFIX = 'stratalyx_migrated_v1'
const STORAGE_KEY = 'stratalyx_state_v2'

function getMigrationFlag(userId: string): string {
  return `${MIGRATION_FLAG_PREFIX}_${userId}`
}

export async function migrateLocalStorageToSupabase(
  userId: string,
  token: string,
  apiOrigin: string,
): Promise<void> {
  // Never run twice for the same user
  if (localStorage.getItem(getMigrationFlag(userId))) return

  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return
  }

  if (!raw) {
    // Nothing to migrate — mark as done so we don't try again
    localStorage.setItem(getMigrationFlag(userId), '1')
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return
  }

  if (typeof parsed !== 'object' || parsed === null) return

  const slice = parsed as Partial<Pick<AppState, 'analyses' | 'watchlist'>>

  try {
    const res = await fetch(`${apiOrigin}/api/user/migrate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        analyses: slice.analyses ?? {},
        watchlist: slice.watchlist ?? [],
      }),
    })

    if (res.ok) {
      localStorage.setItem(getMigrationFlag(userId), '1')
    }
  } catch {
    // Network error — will retry on next sign-in
  }
}
