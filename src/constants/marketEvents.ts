export type EventType = 'crash' | 'bear' | 'crisis' | 'bull' | 'recovery'

export interface MarketEvent {
  id: string
  date: string        // ISO – start of event
  endDate?: string    // ISO – end (for multi-month events)
  title: string
  shortTitle: string  // ≤ 16 chars for chart label
  type: EventType
  sp500?: number      // % change during event period (negative = loss)
  nasdaq?: number
  dow?: number
  cause: string
  impact: string
  recovery: string
  sources: { title: string; url: string }[]
}

export const MARKET_EVENTS: MarketEvent[] = [
  // ── Pre-1950s ──────────────────────────────────────────────────────────────
  {
    id: 'bankers_panic_1907',
    date: '1907-10-14',
    endDate: '1907-11-15',
    title: "Banker's Panic of 1907",
    shortTitle: "Panic of 1907",
    type: 'crash',
    dow: -48,
    cause:
      "Speculative lending by trust companies outside the Federal Reserve system (which did not yet exist) fuelled a credit bubble. When the Knickerbocker Trust Company failed on October 22, a nationwide bank run began. J.P. Morgan personally orchestrated a private bailout to stop the collapse.",
    impact:
      "The Dow Jones fell 48% from its peak. More than 25 major banks and trust companies failed. The US economy contracted sharply, unemployment doubled, and industrial production fell 11%. The panic directly led to the passage of the Federal Reserve Act of 1913.",
    recovery:
      "Markets recovered within 18 months, supported by J.P. Morgan's private credit injections. The creation of the Federal Reserve in 1913 was the direct institutional response to prevent a future recurrence.",
    sources: [
      { title: 'Federal Reserve History: The Panic of 1907', url: 'https://www.federalreservehistory.org/essays/panic-of-1907' },
      { title: 'NBER: The Panic of 1907', url: 'https://www.nber.org/papers/w12866' },
    ],
  },
  {
    id: 'great_crash_1929',
    date: '1929-09-03',
    endDate: '1932-07-08',
    title: 'Great Crash & Great Depression',
    shortTitle: 'Great Crash 1929',
    type: 'crash',
    dow: -89,
    cause:
      "A decade of loose credit, rampant stock speculation on margin (often 10:1 leverage), and overvalued equities drove the Dow Jones to an all-time high of 381 on September 3, 1929. The subsequent unwind triggered bank failures across the US, deflationary spirals, and the Smoot–Hawley Tariff Act (1930), which collapsed global trade.",
    impact:
      "The Dow Jones fell 89% from its September 1929 peak to its July 1932 trough — the worst drawdown in US equity market history. Over 9,000 banks failed. US GDP contracted 30%. Unemployment reached 25%. Global trade fell 65% due to protectionist tariffs. Over $30 billion in stock market wealth was wiped out.",
    recovery:
      "Full recovery of the Dow Jones to its 1929 peak did not occur until November 1954 — 25 years later. The New Deal programmes (1933–1939) and eventually WWII-era defence spending drove the economic recovery.",
    sources: [
      { title: 'Federal Reserve History: Great Depression', url: 'https://www.federalreservehistory.org/essays/great-depression' },
      { title: 'Milton Friedman & Schwartz: A Monetary History of the United States', url: 'https://press.princeton.edu/books/paperback/9780691003467/a-monetary-history-of-the-united-states-1867-1960' },
    ],
  },
  {
    id: 'recession_1937',
    date: '1937-08-14',
    endDate: '1938-03-31',
    title: 'Roosevelt Recession',
    shortTitle: 'Recession 1937',
    type: 'bear',
    dow: -49,
    cause:
      "The Federal Reserve doubled reserve requirements in 1936–37, and the Roosevelt administration prematurely tightened fiscal policy by cutting spending and raising taxes, fearing the recovery was complete. This abrupt policy reversal choked off the nascent recovery from the Great Depression.",
    impact:
      "The Dow Jones fell 49% in 7 months. US GDP contracted 10%. Unemployment surged back to 19% from 14%. Industrial production fell 33%. The recession remains a textbook example of premature austerity cutting short a fragile recovery.",
    recovery:
      "Roosevelt reversed course in 1938, resuming government spending. The economy began recovering, and WWII mobilisation in 1941–42 completed the recovery.",
    sources: [
      { title: 'Federal Reserve History: Recession of 1937–1938', url: 'https://www.federalreservehistory.org/essays/recession-of-1937-38' },
      { title: "Keynes: How to Avoid a Slump (The Times, 1937)", url: 'https://www.economist.com' },
    ],
  },
  {
    id: 'wwii_bull_1942',
    date: '1942-04-28',
    endDate: '1946-05-29',
    title: 'World War II Recovery Bull Market',
    shortTitle: 'WWII Bull 1942',
    type: 'bull',
    dow: 129,
    cause:
      "US entry into WWII following Pearl Harbor (December 1941) triggered massive government defence spending — equivalent to 40% of GDP. Industrial production surged. War bonds, rationing, and workforce mobilisation channelled savings into equities. Once the tide turned at Midway (June 1942), markets began a sustained rally.",
    impact:
      "The Dow Jones rose 129% from its April 1942 low to its May 1946 high. Corporate profits reached record levels. Unemployment fell from 14% to effectively zero. The US emerged from WWII as the world's dominant economic superpower, holding approximately 50% of global GDP.",
    recovery:
      "N/A — this was a bull market. It ended in 1946 as post-war demobilisation and reconversion fears caused a temporary correction.",
    sources: [
      { title: 'NYSE Historical Data', url: 'https://www.nyse.com' },
      { title: 'Robert Gordon: The Rise and Fall of American Growth (2016)', url: 'https://press.princeton.edu/books/paperback/9780691175805/the-rise-and-fall-of-american-growth' },
    ],
  },
  // ── 1970s ──────────────────────────────────────────────────────────────────
  {
    id: 'oil_crisis_1973',
    date: '1973-01-11',
    endDate: '1974-10-03',
    title: '1973–74 Oil Crisis & Bear Market',
    shortTitle: 'Oil Crisis 1973',
    type: 'bear',
    sp500: -48,
    dow: -45,
    cause:
      "OPEC's oil embargo (October 1973) against nations supporting Israel in the Yom Kippur War sent oil prices from $3 to $12 per barrel overnight — a 400% spike. This was compounded by the Nixon administration ending the gold standard (1971), soaring inflation, and the Watergate political crisis eroding business confidence.",
    impact:
      "The S&P 500 fell 48% and the Dow Jones 45% from early 1973 to October 1974. Inflation surged to 12%. The US GDP contracted for five consecutive quarters. Long petrol queues became a symbol of economic dysfunction. The combined hit of stagflation (high inflation + recession) defied conventional Keynesian economic models.",
    recovery:
      "Markets recovered gradually through 1975–76 after OPEC lifted the embargo. However, inflation remained elevated through the decade, culminating in the Volcker rate shock of the early 1980s.",
    sources: [
      { title: 'Federal Reserve History: 1973–75 Recession', url: 'https://www.federalreservehistory.org/essays/recession-of-1973-75' },
      { title: 'EIA: History of Oil Price Shocks', url: 'https://www.eia.gov/finance/markets/crudeoil/spot_prices.php' },
    ],
  },
  // ── 1980s ──────────────────────────────────────────────────────────────────
  {
    id: 'volcker_bear_1980',
    date: '1980-11-28',
    endDate: '1982-08-12',
    title: 'Volcker Rate Shock Bear Market',
    shortTitle: 'Volcker Bear 1980',
    type: 'bear',
    sp500: -27,
    dow: -24,
    cause:
      "Fed Chairman Paul Volcker deliberately engineered a recession to kill double-digit inflation. He raised the Federal Funds Rate to 20% — the highest in US history — forcing a sharp economic contraction. Mortgage rates hit 18%, collapsing the housing market. The medicine was intentionally painful.",
    impact:
      "The S&P 500 fell 27% and unemployment peaked at 10.8% — the highest since the Great Depression. Hundreds of savings and loan associations (S&Ls) failed. The construction, auto, and farming sectors were devastated. Volcker's approach was deeply unpopular, but it broke the back of inflation.",
    recovery:
      "The S&P 500 bottomed on August 12, 1982 and subsequently began one of the longest bull markets in US history — the Reagan-era bull run from 1982 to 1987. Inflation fell from 14% to 3% by 1983.",
    sources: [
      { title: 'Federal Reserve History: Volcker Disinflation', url: 'https://www.federalreservehistory.org/essays/volcker-disinflation' },
      { title: "Robert Hetzel: The Monetary Policy of the Federal Reserve (2008)", url: 'https://www.cambridge.org/us/universitypress/subjects/economics/macroeconomics-and-monetary-economics/monetary-policy-federal-reserve-history' },
    ],
  },
  // ── 1990s ──────────────────────────────────────────────────────────────────
  {
    id: 'gulf_war_recession_1990',
    date: '1990-07-16',
    endDate: '1990-10-11',
    title: 'Gulf War Recession',
    shortTitle: 'Gulf War 1990',
    type: 'bear',
    sp500: -20,
    dow: -21,
    cause:
      "Iraq's invasion of Kuwait (August 2, 1990) sent oil prices surging 70% in weeks, tipping a slowing US economy into recession. The savings & loan crisis was simultaneously draining government resources. Consumer and business confidence collapsed.",
    impact:
      "The S&P 500 fell 20% and the Dow 21% in under 90 days. US GDP contracted for three consecutive quarters. Unemployment rose to 7.8%. The recession lasted from July 1990 to March 1991 — brief but sharp.",
    recovery:
      "Markets recovered rapidly once Operation Desert Storm successfully expelled Iraqi forces from Kuwait (February 1991). The S&P 500 returned to pre-recession levels by February 1991 and then rallied through the rest of the decade.",
    sources: [
      { title: 'Federal Reserve History: 1990–91 Recession', url: 'https://www.federalreservehistory.org/essays/recession-of-1990-91' },
      { title: 'EIA: Oil Prices and the Gulf War', url: 'https://www.eia.gov' },
    ],
  },
  {
    id: 'ltcm_russia_1998',
    date: '1998-07-17',
    endDate: '1998-10-08',
    title: 'Russia Default & LTCM Collapse',
    shortTitle: 'LTCM/Russia 1998',
    type: 'crisis',
    sp500: -19,
    nasdaq: -25,
    cause:
      "Russia defaulted on its sovereign debt on August 17, 1998 and devalued the ruble, triggering global financial contagion. Long-Term Capital Management (LTCM), a hedge fund run by Nobel Prize-winning economists, had $125 billion in assets and over $1 trillion in notional derivatives exposure. Its near-collapse threatened global financial system stability.",
    impact:
      "The S&P 500 fell 19% and the Nasdaq 25% in 83 days. The Federal Reserve orchestrated a $3.6 billion private bailout of LTCM by 14 major banks to prevent disorderly unwinding. The event exposed the systemic dangers of excessive leverage and complex derivatives strategies.",
    recovery:
      "The Fed cut rates three times in quick succession (October–November 1998). Markets fully recovered within months, resuming the dot-com bull market into 2000.",
    sources: [
      { title: "Roger Lowenstein: When Genius Failed (2000)", url: 'https://www.penguinrandomhouse.com/books/292168/when-genius-failed-by-roger-lowenstein/' },
      { title: 'Federal Reserve History: LTCM and the 1998 Crisis', url: 'https://www.federalreservehistory.org/essays/ltcm-crisis' },
    ],
  },
  {
    id: 'black_monday_1987',
    date: '1987-10-19',
    title: 'Black Monday',
    shortTitle: 'Black Monday',
    type: 'crash',
    sp500: -20.5,
    dow: -22.6,
    cause:
      'Portfolio insurance strategies (automated stop-loss selling) triggered a self-reinforcing cascade across global markets. Overvalued equities, rising interest rates, and a widening US trade deficit created the underlying fragility.',
    impact:
      'The Dow Jones fell 22.6% in a single session — the largest one-day percentage drop in its history. S&P 500 lost 20.5%. Markets in Hong Kong, Australia, and the UK fell 40–45% over subsequent days. Total losses exceeded $500 billion in the US alone.',
    recovery:
      'US markets recovered within two years. The Fed, led by Alan Greenspan, rapidly cut rates and injected liquidity, preventing the crash from becoming a broader economic recession.',
    sources: [
      { title: 'SEC: The October 1987 Market Break', url: 'https://www.sec.gov/files/market1987.pdf' },
      { title: 'Federal Reserve History: Black Monday', url: 'https://www.federalreservehistory.org/essays/stock-market-crash-of-1987' },
    ],
  },
  {
    id: 'dotcom_bubble',
    date: '2000-03-10',
    endDate: '2002-10-09',
    title: 'Dot-com Bubble Burst',
    shortTitle: 'Dot-com Bust',
    type: 'bear',
    sp500: -49,
    nasdaq: -78,
    cause:
      'Speculative excess in internet and technology stocks during the late 1990s drove valuations to unsustainable levels. Companies with no earnings or viable business models commanded multi-billion-dollar market caps. Rising interest rates in 2000 accelerated the unwind.',
    impact:
      'The Nasdaq Composite fell 78% from its March 2000 peak to its October 2002 trough — losing $5 trillion in market value. The S&P 500 fell 49%. Hundreds of internet companies went bankrupt. The telecom sector lost over $2 trillion.',
    recovery:
      'The S&P 500 did not fully recover to its 2000 peak until 2007. The Nasdaq took until 2015 to surpass its dot-com high.',
    sources: [
      { title: 'Federal Reserve History: Dot-com Bubble', url: 'https://www.federalreservehistory.org/essays/dot-com-bubble' },
      { title: 'Investopedia: Dot-com Bubble', url: 'https://www.investopedia.com/terms/d/dotcom-bubble.asp' },
    ],
  },
  {
    id: '9_11',
    date: '2001-09-11',
    endDate: '2001-09-21',
    title: '9/11 Terror Attacks',
    shortTitle: '9/11 Attacks',
    type: 'crash',
    sp500: -11.6,
    dow: -14.3,
    cause:
      'The September 11, 2001 terrorist attacks in New York and Washington D.C. caused US stock markets to close for four trading days — the longest closure since the 1933 bank holiday. The attacks killed nearly 3,000 people and caused an estimated $40 billion in insurance losses.',
    impact:
      'When markets reopened on September 17, the Dow fell 684 points (7.1%) — its largest single-day point drop at the time. By the end of the week, the Dow was down 14.3% and the S&P 500 had lost 11.6%. The airline and insurance sectors were hardest hit.',
    recovery:
      'Markets recovered to pre-9/11 levels within a month, though the broader dot-com bear market continued until October 2002.',
    sources: [
      { title: 'Federal Reserve History: September 11', url: 'https://www.federalreservehistory.org/essays/stock-market-crash-of-2001' },
      { title: 'NYSE: Market Reopening 2001', url: 'https://www.nyse.com' },
    ],
  },
  {
    id: 'gfc_2008',
    date: '2008-09-15',
    endDate: '2009-03-09',
    title: 'Global Financial Crisis',
    shortTitle: 'GFC 2008',
    type: 'crash',
    sp500: -56,
    dow: -54,
    nasdaq: -55,
    cause:
      "Collapse of the US subprime mortgage market, enabled by excessive leverage, opaque mortgage-backed securities (CDOs, CMOs), and inadequate regulatory oversight. Lehman Brothers' bankruptcy on September 15, 2008 triggered a global credit freeze.",
    impact:
      'The S&P 500 fell 56% from its October 2007 peak to its March 2009 trough — the largest drawdown since the Great Depression. Global equity markets lost approximately $37 trillion in value. Unemployment in the US rose to 10%. The US government deployed $700 billion in TARP bailout funds.',
    recovery:
      'The S&P 500 bottomed on March 9, 2009 and recovered to pre-crisis levels by April 2013. The economic recovery was slow and uneven, taking years to restore employment levels.',
    sources: [
      { title: 'Federal Reserve History: Financial Crisis', url: 'https://www.federalreservehistory.org/essays/financial-crisis-of-2007-09' },
      { title: 'IMF: Global Financial Crisis', url: 'https://www.imf.org/external/pubs/ft/fandd/2008/12/kiff.htm' },
    ],
  },
  {
    id: 'flash_crash_2010',
    date: '2010-05-06',
    title: 'Flash Crash',
    shortTitle: 'Flash Crash',
    type: 'crash',
    sp500: -9,
    dow: -9,
    cause:
      "A large sell order in S&P 500 futures executed via an automated algorithm without regard to price or time triggered a self-reinforcing cascade of high-frequency trading (HFT) sell orders. The Dow fell nearly 1,000 points in minutes before partially recovering within the same session.",
    impact:
      'At its intraday low, the Dow Jones had fallen 998.5 points (9.2%) — erasing nearly $1 trillion in market value temporarily. Several blue-chip stocks briefly traded at absurd prices (e.g. Accenture traded at $0.01). Markets partially recovered by the close.',
    recovery:
      'Most losses were recovered within the same trading day. The event prompted regulators to introduce circuit breakers and new HFT oversight rules.',
    sources: [
      { title: 'CFTC/SEC: Findings Regarding the Market Events of May 6, 2010', url: 'https://www.cftc.gov/sites/default/files/idc/groups/public/@economicanalysis/documents/file/oce_flashcrash0314.pdf' },
    ],
  },
  {
    id: 'us_debt_downgrade_2011',
    date: '2011-08-05',
    endDate: '2011-10-03',
    title: "US Debt Downgrade & European Debt Crisis",
    shortTitle: 'Debt Crisis 2011',
    type: 'crisis',
    sp500: -19,
    dow: -16,
    cause:
      "Standard & Poor's downgraded US sovereign debt from AAA to AA+ for the first time in history on August 5, 2011, citing political dysfunction over the debt ceiling. This coincided with escalating fears over sovereign debt contagion in Europe (Greece, Italy, Spain, Portugal).",
    impact:
      'The S&P 500 fell 19% from its April 2011 high to its October 2011 low. European equity markets fell further. Gold surged to record highs above $1,900/oz as investors sought safe havens.',
    recovery:
      'Markets recovered by early 2012, aided by the ECB\'s "whatever it takes" commitment from Mario Draghi in July 2012 and continued Fed accommodation.',
    sources: [
      { title: 'S&P: US Long-Term Rating Lowered', url: 'https://www.standardandpoors.com' },
      { title: 'Federal Reserve: 2011 Financial Stress', url: 'https://www.federalreservehistory.org' },
    ],
  },
  {
    id: 'china_oil_2015',
    date: '2015-08-18',
    endDate: '2016-02-11',
    title: 'China Slowdown & Oil Price Collapse',
    shortTitle: 'China/Oil 2015',
    type: 'bear',
    sp500: -14,
    nasdaq: -18,
    cause:
      "China's surprise currency devaluation in August 2015 triggered fears of a global growth slowdown. Simultaneously, a global oil supply glut (US shale production + OPEC refusing to cut) sent crude oil prices from $100/barrel to below $30 — a 70% collapse over 18 months.",
    impact:
      'The S&P 500 entered a brief correction (-14%), while energy stocks fell 40%+. Emerging markets were hit hardest. The Dow fell 1,000 points on the opening tick of August 24, 2015.',
    recovery:
      'Markets recovered by mid-2016 after oil prices stabilised, the Fed delayed rate hikes, and Chinese stimulus measures calmed growth fears.',
    sources: [
      { title: 'IMF: Global Implications of Chinese Growth Slowdown', url: 'https://www.imf.org' },
      { title: 'EIA: Oil Price History', url: 'https://www.eia.gov' },
    ],
  },
  {
    id: 'q4_2018_selloff',
    date: '2018-10-03',
    endDate: '2018-12-24',
    title: 'Q4 2018 Rate-Hike Selloff',
    shortTitle: 'Q4 2018 Selloff',
    type: 'bear',
    sp500: -20,
    nasdaq: -24,
    cause:
      "The Federal Reserve raised interest rates four times in 2018 while simultaneously reducing its balance sheet (quantitative tightening). Fed Chair Powell's comment that rates were \"a long way from neutral\" in October 2018 spooked markets, combined with US–China trade war escalation.",
    impact:
      'The S&P 500 fell 20% in the final quarter of 2018 — its worst December since 1931. The Nasdaq fell 24%. The sell-off pushed the US market into official bear-market territory on Christmas Eve.',
    recovery:
      'The Fed pivoted in early 2019, signalling a pause in rate hikes. Markets recovered nearly all losses by April 2019.',
    sources: [
      { title: 'Federal Reserve: FOMC Minutes 2018', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
    ],
  },
  {
    id: 'covid_crash_2020',
    date: '2020-02-19',
    endDate: '2020-03-23',
    title: 'COVID-19 Market Crash',
    shortTitle: 'COVID Crash',
    type: 'crash',
    sp500: -34,
    dow: -37,
    nasdaq: -30,
    cause:
      'The rapid global spread of COVID-19 prompted governments worldwide to implement lockdowns and travel bans, bringing large parts of the global economy to a halt. The speed and uncertainty of the crisis caused the fastest bear market in recorded stock market history.',
    impact:
      'The S&P 500 fell 34% in just 33 calendar days — reaching bear-market territory in only 22 trading sessions. The VIX (fear index) surpassed 80, a level exceeding the 2008 crisis. Oil futures briefly went negative in April 2020. Global GDP contracted sharply in Q2 2020.',
    recovery:
      'The S&P 500 recovered to pre-crash levels by August 2020 — the fastest recovery from a bear market ever — driven by unprecedented fiscal stimulus ($2.2 trillion CARES Act) and Fed asset purchases ($120 billion/month).',
    sources: [
      { title: 'BIS: COVID-19 and the Financial System', url: 'https://www.bis.org/publ/work873.htm' },
      { title: 'Federal Reserve: Response to COVID', url: 'https://www.federalreserve.gov/covid-19.htm' },
    ],
  },
  {
    id: 'covid_bull_2020',
    date: '2020-03-23',
    endDate: '2021-11-22',
    title: 'COVID-Era Bull Market',
    shortTitle: 'COVID Bull Run',
    type: 'bull',
    sp500: 114,
    nasdaq: 145,
    cause:
      'Unprecedented monetary and fiscal stimulus — including near-zero interest rates, massive Fed asset purchases, and trillions in government spending — drove a historic bull run. The accelerated digital transformation benefited technology stocks in particular.',
    impact:
      'The S&P 500 more than doubled from its March 2020 lows. The Nasdaq rose 145%. FAANG stocks and high-growth tech companies reached record valuations. Meme stocks (GME, AMC) and cryptocurrency markets also surged.',
    recovery:
      'N/A — this was a bull market. It ended in late 2021 as the Fed began signalling rate hikes to combat rising inflation.',
    sources: [
      { title: 'Federal Reserve: Asset Purchases 2020–2022', url: 'https://www.federalreserve.gov' },
      { title: 'IMF: World Economic Outlook 2021', url: 'https://www.imf.org/en/Publications/WEO' },
    ],
  },
  {
    id: 'bear_2022',
    date: '2022-01-03',
    endDate: '2022-10-12',
    title: '2022 Inflation & Rate-Hike Bear Market',
    shortTitle: 'Bear Market 2022',
    type: 'bear',
    sp500: -25,
    nasdaq: -36,
    cause:
      'Post-COVID inflation surged to 40-year highs (CPI peaked at 9.1% in June 2022), driven by supply chain disruptions, energy price shocks from the Russia–Ukraine war, and excess monetary stimulus. The Federal Reserve responded with the most aggressive rate-hiking cycle since the 1980s — raising rates from 0.25% to 4.5% in 12 months.',
    impact:
      'The S&P 500 fell 25% and officially entered a bear market. The Nasdaq fell 36%, with high-multiple growth stocks losing 50–80%. The bond market suffered its worst year in decades. Total US equity market capitalisation fell by approximately $12 trillion.',
    recovery:
      'A rally began in October 2022 after inflation showed signs of peaking. The S&P 500 recovered fully by February 2024.',
    sources: [
      { title: 'Federal Reserve: Rate Hike Decisions 2022', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
      { title: 'BLS: CPI Data 2022', url: 'https://www.bls.gov/cpi/' },
    ],
  },
  {
    id: 'svb_crisis_2023',
    date: '2023-03-08',
    endDate: '2023-03-24',
    title: 'SVB & Regional Banking Crisis',
    shortTitle: 'SVB Crisis',
    type: 'crisis',
    sp500: -5,
    cause:
      'Silicon Valley Bank (SVB) collapsed on March 10, 2023 — the second-largest US bank failure in history — after a run on deposits triggered by unrealised losses in its long-duration bond portfolio. Signature Bank and First Republic Bank also failed. The crisis raised systemic concerns about deposit insurance and interest-rate risk management.',
    impact:
      "SVB's $209 billion in assets were seized by regulators in 48 hours. The KBW Bank Index fell 25% in two weeks. The broader S&P 500 fell 5%. The US Treasury, FDIC, and Fed created an emergency lending facility (BTFP) to prevent contagion.",
    recovery:
      'The Fed\'s Bank Term Funding Program (BTFP) quickly stabilised the broader banking system. Regional bank stocks remained under pressure for several months but systemic contagion was avoided.',
    sources: [
      { title: 'FDIC: SVB Failure Report', url: 'https://www.fdic.gov/bank/individual/failed/silicon-valley-bank.html' },
      { title: 'Federal Reserve: BTFP Programme', url: 'https://www.federalreserve.gov/monetarypolicy/bank-term-funding-program.htm' },
    ],
  },
  {
    id: 'ai_bull_2023',
    date: '2023-10-27',
    endDate: '2024-07-10',
    title: 'AI-Driven Bull Market',
    shortTitle: 'AI Bull Run',
    type: 'bull',
    sp500: 53,
    nasdaq: 70,
    cause:
      "The launch of ChatGPT in November 2022 and subsequent AI product announcements from major technology companies triggered massive investor enthusiasm for artificial intelligence. NVIDIA's GPU dominance in AI training made it the world's most valuable company.",
    impact:
      'The S&P 500 rose 53% and the Nasdaq 70% from their October 2022 lows to mid-2024 highs. The "Magnificent Seven" (AAPL, MSFT, NVDA, GOOGL, AMZN, META, TSLA) accounted for the majority of index gains. NVIDIA became the first semiconductor company to surpass $3 trillion in market capitalisation.',
    recovery:
      'N/A — this was a bull market phase.',
    sources: [
      { title: 'Goldman Sachs: Generative AI Research', url: 'https://www.goldmansachs.com/intelligence/pages/generative-ai-could-raise-global-gdp-by-7-percent.html' },
      { title: 'NVIDIA Annual Report 2024', url: 'https://investor.nvidia.com' },
    ],
  },
]

/** Lookup by id */
export const EVENTS_BY_ID: Record<string, MarketEvent> = Object.fromEntries(
  MARKET_EVENTS.map((e) => [e.id, e])
)
