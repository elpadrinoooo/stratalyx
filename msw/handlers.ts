import { http, HttpResponse } from 'msw'
import claudeSuccess from '../fixtures/claude-success.json'
import fmpProfile    from '../fixtures/fmp-profile.json'
import fmpRatios     from '../fixtures/fmp-ratios.json'
import fmpQuote      from '../fixtures/fmp-quote.json'

export const handlers = [
  // Claude proxy
  http.post('http://localhost/api/claude', () => {
    return HttpResponse.json(claudeSuccess)
  }),

  // Yahoo price proxy (called by runAnalysis to get current price for valuation)
  http.get('http://localhost/api/price/:ticker', ({ params }) => {
    return HttpResponse.json({
      ticker: params['ticker'],
      price: 185,
      previousClose: 183,
      currency: 'USD',
      shortName: String(params['ticker']),
      exchange: 'NMS',
    })
  }),

  // Yahoo history proxy (used by chart components)
  http.get('http://localhost/api/history/:ticker', () => {
    return HttpResponse.json({ ticker: 'AAPL', range: '1mo', points: [], currency: 'USD', previousClose: 183 })
  }),

  // Finnhub news + symbol search — return empty so screens that fetch them stay quiet
  http.get('http://localhost/api/news', () => HttpResponse.json({ articles: [], page: 0, hasMore: false })),
  http.get('http://localhost/api/search', () => HttpResponse.json({ results: [] })),

  // Market movers
  http.get('http://localhost/api/market-movers', () => HttpResponse.json({ gainers: [], losers: [] })),

  // FMP profile
  http.get('http://localhost/api/fmp/profile/:ticker', () => {
    return HttpResponse.json(fmpProfile)
  }),

  // FMP ratios-ttm
  http.get('http://localhost/api/fmp/ratios-ttm/:ticker', () => {
    return HttpResponse.json(fmpRatios)
  }),

  // FMP quote
  http.get('http://localhost/api/fmp/quote/:ticker', () => {
    return HttpResponse.json(fmpQuote)
  }),

  // FMP income-statement
  http.get('http://localhost/api/fmp/income-statement/:ticker', () => {
    return HttpResponse.json([])
  }),

  // FMP cash-flow-statement
  http.get('http://localhost/api/fmp/cash-flow-statement/:ticker', () => {
    return HttpResponse.json([])
  }),
]
