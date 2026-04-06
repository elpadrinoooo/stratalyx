import type { AppState } from '../types'
import { INIT } from './initialState'
import { PROV } from '../constants/providers'

const STORAGE_KEY = 'stratalyx_state_v2'

interface PersistedSlice {
  analyses: AppState['analyses']
  comparisons: AppState['comparisons']
  archivedComparisons: AppState['archivedComparisons']
  watchlist: AppState['watchlist']
  archived: AppState['archived']
  provider: AppState['provider']
  model: AppState['model']
}

/** Load persisted state slices from localStorage, merging into INIT defaults. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return INIT
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return INIT
    const slice = parsed as Partial<PersistedSlice>
    return {
      ...INIT,
      analyses: (typeof slice.analyses === 'object' && slice.analyses !== null && !Array.isArray(slice.analyses))
        ? slice.analyses
        : INIT.analyses,
      comparisons: Array.isArray(slice.comparisons) ? slice.comparisons : INIT.comparisons,
      archivedComparisons: Array.isArray(slice.archivedComparisons) ? slice.archivedComparisons : INIT.archivedComparisons,
      watchlist: Array.isArray(slice.watchlist) ? slice.watchlist : INIT.watchlist,
      archived: Array.isArray(slice.archived) ? slice.archived : INIT.archived,
      provider: typeof slice.provider === 'string' && PROV[slice.provider] ? slice.provider : INIT.provider,
      model: (() => {
        const provider = typeof slice.provider === 'string' && PROV[slice.provider] ? slice.provider : INIT.provider
        return typeof slice.model === 'string' && PROV[provider]?.models.some(m => m.id === slice.model)
          ? slice.model : INIT.model
      })(),
    }
  } catch {
    return INIT
  }
}

/** Persist the durable state slices to localStorage.
 *  When skipUserData is true (logged-in users), analyses and watchlist are
 *  omitted because Supabase is now the authoritative store for those. */
export function saveState(state: AppState, opts: { skipUserData?: boolean } = {}): void {
  try {
    const slice: PersistedSlice = {
      analyses: opts.skipUserData ? {} : state.analyses,
      comparisons: state.comparisons,
      archivedComparisons: state.archivedComparisons,
      watchlist: opts.skipUserData ? [] : state.watchlist,
      archived: state.archived,
      provider: state.provider,
      model: state.model,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice))
  } catch {
    // Storage full or unavailable — silently degrade
  }
}
