import { useState, useEffect } from 'react'
import { STOCKS } from '../constants/stocks'
import type { Stock } from '../types'

const CACHE_KEY = 'stratalyx_stock_list'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface FMPListItem {
  symbol: string
  name: string
  exchangeShortName: string
  type: string
}

interface CacheEntry {
  stocks: Stock[]
  ts: number
}

const US_EXCHANGES = new Set(['NYSE', 'NASDAQ', 'AMEX', 'NYSE ARCA'])

function loadCache(): Stock[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    return entry.stocks
  } catch {
    return null
  }
}

function saveCache(stocks: Stock[]): void {
  try {
    const entry: CacheEntry = { stocks, ts: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // localStorage full — skip caching
  }
}

/**
 * Returns the stock list for the screener.
 * - Always starts with the curated static STOCKS list.
 * - Attempts to fetch the full FMP US stock list from the server proxy.
 *   Merges FMP results in, keeping static stocks with their richer metadata.
 * - Caches the merged list in localStorage for 24 hours.
 */
export function useStockList(): { stocks: Stock[]; loading: boolean; total: number } {
  const [stocks, setStocks] = useState<Stock[]>(STOCKS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Try cache first
    const cached = loadCache()
    if (cached && cached.length > STOCKS.length) {
      setStocks(cached)
      return
    }

    // Fetch full list from FMP via proxy
    setLoading(true)
    fetch('/api/fmp/stock/list')
      .then((r) => {
        if (!r.ok) throw new Error('FMP stock list unavailable')
        return r.json() as Promise<FMPListItem[]>
      })
      .then((items) => {
        // Filter to US common stocks only
        const usStocks = items.filter(
          (i) => i.type === 'stock' && US_EXCHANGES.has(i.exchangeShortName) && i.symbol && i.name
        )

        // Build a map of existing tickers for O(1) lookup
        const staticMap = new Map(STOCKS.map((s) => [s.ticker, s]))

        // Build merged list: static stocks first (with full metadata), then dynamic additions
        const dynamicAdditions: Stock[] = usStocks
          .filter((i) => !staticMap.has(i.symbol))
          .map((i) => ({
            ticker: i.symbol,
            name: i.name,
            sector: '',
            description: '',
          }))

        const merged = [...STOCKS, ...dynamicAdditions]
        saveCache(merged)
        setStocks(merged)
      })
      .catch(() => {
        // Server has no FMP key or fetch failed — static list is fine
      })
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  return { stocks, loading, total: stocks.length }
}
