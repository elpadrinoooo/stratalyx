import type { AppState, Action } from '../types'

const MAX_COMPARISONS = 20

/** Pure reducer — zero side effects. No fetch, no console.log, no Date.now() (except TOAST for ID). */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload }

    case 'SET_INVESTOR':
      return { ...state, investor: action.payload }

    case 'SET_PROVIDER':
      return { ...state, provider: action.payload }

    case 'SET_MODEL':
      return { ...state, model: action.payload }

    case 'OPEN_MODAL':
      return { ...state, modalOpen: true, modalTicker: action.payload }

    case 'CLOSE_MODAL':
      return { ...state, modalOpen: false, modalTicker: '' }

    case 'SET_ANALYSIS': {
      const key = `${action.payload.ticker}:${action.payload.investorId}`
      return {
        ...state,
        analyses: { ...state.analyses, [key]: action.payload },
      }
    }

    case 'CLEAR_ANALYSIS': {
      const next = { ...state.analyses }
      delete next[action.payload]
      return { ...state, analyses: next }
    }

    case 'CLEAR_ALL_ANALYSES':
      return { ...state, analyses: {} }

    case 'ARCHIVE_ANALYSIS':
      if (state.archived.includes(action.payload)) return state
      return { ...state, archived: [...state.archived, action.payload] }

    case 'UNARCHIVE_ANALYSIS':
      return { ...state, archived: state.archived.filter((k) => k !== action.payload) }

    case 'ADD_COMPARISON': {
      const existing = state.comparisons.filter((c) => c.id !== action.payload.id)
      const updated = [action.payload, ...existing].slice(0, MAX_COMPARISONS)
      return { ...state, comparisons: updated }
    }

    case 'REMOVE_COMPARISON':
      return {
        ...state,
        comparisons: state.comparisons.filter((c) => c.id !== action.payload),
      }

    case 'CLEAR_COMPARISONS':
      return { ...state, comparisons: [] }

    case 'ARCHIVE_COMPARISON':
      if (state.archivedComparisons.includes(action.payload)) return state
      return { ...state, archivedComparisons: [...state.archivedComparisons, action.payload] }

    case 'UNARCHIVE_COMPARISON':
      return { ...state, archivedComparisons: state.archivedComparisons.filter((id) => id !== action.payload) }

    case 'ADD_TO_WATCHLIST':
      if (state.watchlist.includes(action.payload)) return state
      return { ...state, watchlist: [...state.watchlist, action.payload] }

    case 'REMOVE_FROM_WATCHLIST':
      return {
        ...state,
        watchlist: state.watchlist.filter((t) => t !== action.payload),
      }

    case 'TOAST': {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { id, message: action.payload.message, type: action.payload.type, action: action.payload.action },
        ],
      }
    }

    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      }

    case 'SET_USER':
      return { ...state, user: action.payload, authLoading: false }

    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload }

    case 'HYDRATE_USER_DATA': {
      // Merge server-side analyses + watchlist over whatever is in memory.
      // In-memory wins for keys present in both — this preserves analyses
      // the user just ran (and the server already persisted) without
      // clobbering them if the GET response races the SET_ANALYSIS dispatch.
      const mergedAnalyses = { ...action.payload.analyses, ...state.analyses }
      const mergedWatchlist = Array.from(new Set([...action.payload.watchlist, ...state.watchlist]))
      return { ...state, analyses: mergedAnalyses, watchlist: mergedWatchlist }
    }

    default:
      return state
  }
}
