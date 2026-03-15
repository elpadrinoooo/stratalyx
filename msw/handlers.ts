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
