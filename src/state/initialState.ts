import type { AppState } from '../types'

export const INIT: AppState = {
  screen: 'Screener',
  investor: 'buffett',
  provider: 'anthropic',
  model: 'claude-haiku-4-5-20251001',
  modalOpen: false,
  modalTicker: '',
  analyses: {},
  comparisons: [],
  archivedComparisons: [],
  watchlist: [],
  archived: [],
  toasts: [],
  user: null,
  authLoading: true,
}
