import type { AnalysisResult } from './analysis'

export type Screen = 'Markets' | 'Screener' | 'Strategies' | 'Watchlist' | 'History' | 'Comparisons' | 'MarketEvents' | 'News' | 'Admin' | 'Account'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  action?: ToastAction
}

export interface Comparison {
  id: string
  ticker: string
  investorIds: string[]
  timestamp: number
}

export interface AppState {
  screen: Screen
  investor: string
  provider: string
  model: string
  modalOpen: boolean
  modalTicker: string
  analyses: Record<string, AnalysisResult>
  comparisons: Comparison[]
  archivedComparisons: string[]
  watchlist: string[]
  archived: string[]
  toasts: Toast[]
  user: { id: string; email: string; tier: 'free' | 'pro'; isAdmin: boolean } | null
  authLoading: boolean
}

export type Action =
  | { type: 'SET_SCREEN'; payload: Screen }
  | { type: 'SET_INVESTOR'; payload: string }
  | { type: 'SET_PROVIDER'; payload: string }
  | { type: 'SET_MODEL'; payload: string }
  | { type: 'OPEN_MODAL'; payload: string }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_ANALYSIS'; payload: AnalysisResult }
  | { type: 'CLEAR_ANALYSIS'; payload: string }
  | { type: 'CLEAR_ALL_ANALYSES' }
  | { type: 'ARCHIVE_ANALYSIS'; payload: string }
  | { type: 'UNARCHIVE_ANALYSIS'; payload: string }
  | { type: 'ADD_COMPARISON'; payload: Comparison }
  | { type: 'REMOVE_COMPARISON'; payload: string }
  | { type: 'CLEAR_COMPARISONS' }
  | { type: 'ARCHIVE_COMPARISON'; payload: string }
  | { type: 'UNARCHIVE_COMPARISON'; payload: string }
  | { type: 'ADD_TO_WATCHLIST'; payload: string }
  | { type: 'REMOVE_FROM_WATCHLIST'; payload: string }
  | { type: 'TOAST'; payload: { message: string; type: Toast['type']; action?: ToastAction } }
  | { type: 'DISMISS_TOAST'; payload: string }
  | { type: 'SET_USER'; payload: AppState['user'] }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'HYDRATE_USER_DATA'; payload: { analyses: Record<string, AnalysisResult>; watchlist: string[] } }
