import { describe, it, expect } from '@jest/globals'
import { parseShareSource, parseComparisonShare } from '../../state/shareParser'

const loc = (overrides: Partial<Location>): Location => ({
  pathname: '/', search: '', hash: '', host: '', hostname: '', href: '',
  origin: '', port: '', protocol: '', ancestorOrigins: {} as DOMStringList,
  assign: () => {}, reload: () => {}, replace: () => {},
  ...overrides,
}) as Location

describe('parseShareSource', () => {
  it('reads /share/TICKER/investor from the pathname (the post-rewrite path)', () => {
    expect(parseShareSource(loc({ pathname: '/share/AAPL/buffett' }), {}))
      .toEqual({ ticker: 'AAPL', investorId: 'buffett' })
  })

  it('uppercases the ticker and lowercases the investor id', () => {
    expect(parseShareSource(loc({ pathname: '/share/aapl/Buffett' }), {}))
      .toEqual({ ticker: 'AAPL', investorId: 'buffett' })
  })

  it('tolerates a trailing slash', () => {
    expect(parseShareSource(loc({ pathname: '/share/NVDA/lynch/' }), {}))
      .toEqual({ ticker: 'NVDA', investorId: 'lynch' })
  })

  it('handles tickers with dots like BRK.B', () => {
    expect(parseShareSource(loc({ pathname: '/share/BRK.B/buffett' }), {}))
      .toEqual({ ticker: 'BRK.B', investorId: 'buffett' })
  })

  it('falls back to injected globals (Railway dist/ path)', () => {
    expect(parseShareSource(loc({}), { __SHARE_TICKER__: 'TSLA', __SHARE_INVESTOR__: 'wood' }))
      .toEqual({ ticker: 'TSLA', investorId: 'wood' })
  })

  it('path beats injected globals when both are present', () => {
    expect(parseShareSource(
      loc({ pathname: '/share/MSFT/gates' }),
      { __SHARE_TICKER__: 'TSLA', __SHARE_INVESTOR__: 'wood' },
    )).toEqual({ ticker: 'MSFT', investorId: 'gates' })
  })

  it('falls back to ?share query param', () => {
    expect(parseShareSource(loc({ search: '?share=AAPL/buffett' }), {}))
      .toEqual({ ticker: 'AAPL', investorId: 'buffett' })
  })

  it('falls back to legacy #/analysis/... hash', () => {
    expect(parseShareSource(loc({ hash: '#/analysis/AAPL/buffett' }), {}))
      .toEqual({ ticker: 'AAPL', investorId: 'buffett' })
  })

  it('returns null for unrelated paths', () => {
    expect(parseShareSource(loc({ pathname: '/' }), {})).toBeNull()
    expect(parseShareSource(loc({ pathname: '/share/' }), {})).toBeNull()
    expect(parseShareSource(loc({ pathname: '/share/AAPL' }), {})).toBeNull()
    expect(parseShareSource(loc({ pathname: '/share/AAPL/buffett/extra' }), {})).toBeNull()
  })

  it('rejects shell-injection-y characters in the ticker', () => {
    expect(parseShareSource(loc({ pathname: '/share/AAPL;rm/buffett' }), {})).toBeNull()
    expect(parseShareSource(loc({ pathname: '/share/<script>/buffett' }), {})).toBeNull()
  })
})

describe('parseComparisonShare', () => {
  it('reads /share/comparison/TICKER/inv1,inv2 from the pathname', () => {
    expect(parseComparisonShare(loc({ pathname: '/share/comparison/AAPL/buffett,graham' }), {}))
      .toEqual({ ticker: 'AAPL', investorIds: ['buffett', 'graham'] })
  })

  it('requires at least two investor ids', () => {
    expect(parseComparisonShare(loc({ pathname: '/share/comparison/AAPL/buffett' }), {}))
      .toBeNull()
  })

  it('falls back to injected global', () => {
    expect(parseComparisonShare(
      loc({}),
      { __SHARE_COMPARISON__: { ticker: 'NVDA', investors: 'wood,burry' } },
    )).toEqual({ ticker: 'NVDA', investorIds: ['wood', 'burry'] })
  })

  it('falls back to ?comparison query param', () => {
    expect(parseComparisonShare(loc({ search: '?comparison=AAPL/buffett,lynch' }), {}))
      .toEqual({ ticker: 'AAPL', investorIds: ['buffett', 'lynch'] })
  })

  it('returns null for unrelated paths', () => {
    expect(parseComparisonShare(loc({ pathname: '/' }), {})).toBeNull()
    expect(parseComparisonShare(loc({ pathname: '/share/AAPL/buffett' }), {})).toBeNull()
  })
})
