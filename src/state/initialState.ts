import type { AppState } from '../types'

export const INIT: AppState = {
  screen: 'Screener',
  investor: 'buffett',
  provider: 'google',
  model: 'gemini-2.5-flash',
  modalOpen: false,
  modalTicker: '',
  analyses: {},
  comparisons: [],
  watchlist: [],
  toasts: [],
}
