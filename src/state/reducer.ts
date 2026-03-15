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
          { id, message: action.payload.message, type: action.payload.type },
        ],
      }
    }

    case 'DISMISS_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      }

    default:
      return state
  }
}
