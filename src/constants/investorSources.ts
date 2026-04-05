export type SourceType = 'book' | 'letter' | 'report' | 'speech' | 'interview' | 'research'

export interface InvestorSource {
  title: string
  type:  SourceType
  url?:  string
  /** One-line description of what stock-selection methodology is documented here */
  note?: string
}

/**
 * Primary sources for each investor's documented framework.
 * URLs point directly to the page/document where the investment methodology is described.
 */
export const INVESTOR_SOURCES: Record<string, InvestorSource[]> = {
  buffett: [
    {
      title: 'Berkshire Hathaway Annual Shareholder Letters (1977–present)',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://www.berkshirehathaway.com/letters/letters.html'),
      note: 'Annual letters define how Buffett identifies durable moats, evaluates management, and calculates owner earnings — his complete criteria in his own words',
    },
    {
      title: 'The Essays of Warren Buffett — Lawrence Cunningham (4th ed.)',
      type: 'book',
      note: 'Curated letters grouped by theme covering business-quality assessment, capital allocation principles, and how Buffett thinks about price vs intrinsic value',
    },
    {
      title: 'The Superinvestors of Graham-and-Doddsville — Warren Buffett (1984)',
      type: 'speech',
      url: '/api/link?url=' + encodeURIComponent('https://www8.gsb.columbia.edu/sites/valueinvesting/files/files/Buffett1984.pdf'),
      note: 'Directly presents Graham-Dodd stock-selection criteria and documents the audited track records of seven value investors trained by Graham',
    },
  ],
  graham: [
    {
      title: 'Security Analysis — Graham & Dodd (1934, 6th ed. 2008)',
      type: 'book',
      note: 'The foundational text — defines quantitative screening criteria: earnings stability, asset coverage, debt limits, and the margin-of-safety principle in full technical detail',
    },
    {
      title: 'The Intelligent Investor — Benjamin Graham (1949, rev. ed. 1973)',
      type: 'book',
      note: 'Chapters 14–15 contain the exact numerical tests for Defensive and Enterprising investor stock selection — P/E, P/B, current ratio, and 10-year earnings thresholds',
    },
    {
      title: 'The Interpretation of Financial Statements — Benjamin Graham (1937)',
      type: 'book',
      note: 'Practical guide to reading balance sheets and income statements through Graham\'s analytical lens — what ratios to examine and what disqualifies a stock',
    },
  ],
  lynch: [
    {
      title: 'One Up on Wall Street — Peter Lynch (1989)',
      type: 'book',
      note: 'Defines Lynch\'s six stock categories and the PEG ratio as the primary valuation metric — his complete stock-selection methodology and fast-grower criteria',
    },
    {
      title: 'Beating the Street — Peter Lynch (1993)',
      type: 'book',
      note: 'Applies GARP criteria to real portfolio decisions: verifying earnings growth rates, using PEG to determine fair value, and the "invest in what you know" process',
    },
    {
      title: 'Learn to Earn — Peter Lynch (1995)',
      type: 'book',
      note: 'Accessible introduction to Lynch\'s principles for identifying multibaggers from consumer observation before Wall Street discovers them',
    },
  ],
  munger: [
    {
      title: "Poor Charlie's Almanack — Peter Kaufman, ed. (2005)",
      type: 'book',
      note: 'The "Worldly Wisdom" speech (Chapter 2) lays out the latticework of mental models and documents exactly what Munger looks for in a business worth owning',
    },
    {
      title: 'Berkshire Hathaway Annual Meeting Transcripts (1994–2023)',
      type: 'speech',
      url: '/api/link?url=' + encodeURIComponent('https://www.berkshirehathaway.com/meetings.html'),
      note: 'Annual Q&A transcripts where Munger explains his mental models and evaluates specific industries, moats, and management quality in real investment contexts',
    },
    {
      title: 'The Psychology of Human Misjudgement — Charlie Munger (1995)',
      type: 'speech',
      url: '/api/link?url=' + encodeURIComponent('https://fs.blog/the-psychology-of-human-misjudgment/'),
      note: 'Lists 25 cognitive biases Munger applies as an inversion checklist to stress-test any investment thesis — his primary analytical tool before committing capital',
    },
  ],
  greenblatt: [
    {
      title: 'The Little Book That Beats the Market — Joel Greenblatt (2005)',
      type: 'book',
      url: '/api/link?url=' + encodeURIComponent('https://www.magicformulainvesting.com'),
      note: 'Chapters 4–7 define the Magic Formula step-by-step: earnings yield (EBIT/EV) and return on capital calculations and how to build the combined ranking screen',
    },
    {
      title: 'You Can Be a Stock Market Genius — Joel Greenblatt (1997)',
      type: 'book',
      note: 'Documents special-situation strategies — spinoffs, mergers, restructurings, rights offerings — where market complexity creates measurable mispricing',
    },
    {
      title: 'The Big Secret for the Small Investor — Joel Greenblatt (2011)',
      type: 'book',
      note: 'Applies Magic Formula logic to index construction and explains why systematic earnings yield + return on capital screening outperforms discretionary picking',
    },
  ],
  dalio: [
    {
      title: 'Principles — Ray Dalio (2017)',
      type: 'book',
      url: '/api/link?url=' + encodeURIComponent('https://www.principles.com'),
      note: 'Investment principles section describes how Dalio evaluates companies in the context of the long-term debt cycle, productivity trends, and "All Weather" scenario analysis',
    },
    {
      title: 'Principles for Navigating Big Debt Crises — Ray Dalio (2018)',
      type: 'book',
      url: '/api/link?url=' + encodeURIComponent('https://www.principles.com/big-debt-crises/'),
      note: 'Framework for assessing how companies hold up across deleveraging phases — essential for Dalio\'s macro overlay on balance sheet resilience and sector selection',
    },
    {
      title: 'How the Economic Machine Works — Ray Dalio (Bridgewater, 2013)',
      type: 'research',
      url: '/api/link?url=' + encodeURIComponent('https://www.economicprinciples.org'),
      note: 'Explains the credit cycle, productivity growth, and deleveraging template that Dalio uses to contextualise every equity position in a macro regime',
    },
  ],
  marks: [
    {
      title: 'The Most Important Thing — Howard Marks (2011)',
      type: 'book',
      note: 'Chapters 5–6 define second-level thinking and risk — precisely how Marks evaluates whether a stock\'s price represents a genuine bargain relative to consensus expectations',
    },
    {
      title: 'Mastering the Market Cycle — Howard Marks (2018)',
      type: 'book',
      note: 'Details how to assess cycle positioning to calibrate when to be aggressive vs defensive — the macro overlay Marks applies before any individual stock selection',
    },
    {
      title: 'Oaktree Capital Memos (1990–present)',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://www.oaktreecapital.com/insights/howard-marks-memos'),
      note: 'Seek the "The Most Important Thing" (2003), "Risk" (2014), and "You Bet" memos — they document his investment selection and risk/reward criteria directly',
    },
  ],
  klarman: [
    {
      title: 'Margin of Safety — Seth Klarman (1991)',
      type: 'book',
      note: 'Chapters 6–8 define Klarman\'s absolute-value criteria: liquidation analysis, private market value, and the minimum margin-of-safety thresholds required before investing',
    },
    {
      title: 'Baupost Group Letters to Investors (selected public excerpts)',
      type: 'letter',
      note: 'Selected excerpts describe how Klarman applies value catalysts, tangible asset-backing, and absolute-return thinking to screen and size positions',
    },
    {
      title: 'Klarman on Value Investing — Various interviews and speeches',
      type: 'interview',
      note: 'Public interviews (CFA Institute, MIT Sloan, Bloomberg) document how Klarman applies the Margin of Safety principle to distressed and out-of-favour equities',
    },
  ],
  pabrai: [
    {
      title: 'The Dhandho Investor — Mohnish Pabrai (2007)',
      type: 'book',
      note: 'Chapters 1–5 define the Dhandho setup — high uncertainty/low actual risk — and the asymmetric payoff structure ("heads I win, tails I don\'t lose much") used to screen investments',
    },
    {
      title: 'Mosaic: Perspectives on Investing — Mohnish Pabrai (2004)',
      type: 'book',
      note: 'Early essays on concentrated value investing, Kelly Criterion position sizing, and the checklist methodology Pabrai uses to avoid investment errors',
    },
    {
      title: 'Pabrai Investment Funds Annual Letters',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://www.pabraifunds.com'),
      note: 'Annual letters document his cloning methodology, checklist in action, and real-time thesis construction — the best source for seeing his criteria applied to actual stocks',
    },
  ],
  wood: [
    {
      title: 'ARK Invest Big Ideas Annual Report (2017–present)',
      type: 'research',
      url: '/api/link?url=' + encodeURIComponent('https://ark-invest.com/big-ideas/'),
      note: 'Annual report defining ARK\'s 5-year disruptive themes with TAM estimates, Wright\'s Law cost-curve projections, and the convergence thesis that drives stock selection',
    },
    {
      title: 'ARK Invest Research Papers and White Papers',
      type: 'research',
      url: '/api/link?url=' + encodeURIComponent('https://ark-invest.com/research/'),
      note: 'White papers detailing individual stock theses within each innovation category — directly shows how stocks are selected, sized, and valued using 5-year price targets',
    },
    {
      title: 'Cathie Wood — Various investor conference presentations',
      type: 'speech',
      note: 'Conference talks explain how technology convergence is identified and how Wright\'s Law cost-curve declines are translated into 5-year price targets from first principles',
    },
  ],
  fisher: [
    {
      title: 'Common Stocks and Uncommon Profits — Philip Fisher (1958)',
      type: 'book',
      note: 'Chapters 3–4 contain the 15-point Scuttlebutt checklist — the definitive source for Fisher\'s qualitative stock-selection criteria including R&D, sales organisation, and management integrity',
    },
    {
      title: 'Conservative Investors Sleep Well — Philip Fisher (1975)',
      type: 'book',
      note: 'Defines four dimensions of conservative investing: superior products, financial capability, management strength, and investment characteristics — applied as an elimination screen',
    },
    {
      title: 'Developing an Investment Philosophy — Philip Fisher (1980)',
      type: 'book',
      note: 'Short monograph where Fisher explains how he derived his investment principles through decades of practice — the reasoning behind each Scuttlebutt criterion',
    },
  ],
  druckenmiller: [
    {
      title: 'The New Market Wizards — Jack Schwager (1992)',
      type: 'book',
      note: 'Chapter on Druckenmiller describes his macro-equity synthesis: how central bank policy and liquidity conditions set the backdrop before any individual stock is considered',
    },
    {
      title: 'Duquesne Family Office — Selected investor presentations',
      type: 'report',
      note: 'Presentation materials reveal how Druckenmiller combines a macro overlay (monetary policy, earnings revisions) with relative-strength momentum in stock selection',
    },
    {
      title: 'Invest Like the Best — Patrick O\'Shaughnessy (Colossus podcast)',
      type: 'interview',
      url: '/api/link?url=' + encodeURIComponent('https://www.joincolossus.com/episodes/druckenmiller'),
      note: 'In-depth discussion covering how Druckenmiller identifies asymmetric setups, uses 6–18 month catalyst windows, sizes positions with conviction, and exits when the thesis changes',
    },
  ],
  soros: [
    {
      title: 'The Alchemy of Finance — George Soros (1987)',
      type: 'book',
      note: 'Chapters 1–3 introduce reflexivity theory — how Soros identifies mispriced assets at turning points in boom/bust sequences, and the criteria he uses to enter positions',
    },
    {
      title: 'Soros on Soros — George Soros (1995)',
      type: 'book',
      note: 'Direct Q&A format covering how reflexivity is applied in practice: what signals Soros looks for to time a trade and his criteria for exiting when the thesis plays out',
    },
    {
      title: 'The New Paradigm for Financial Markets — George Soros (2008)',
      type: 'book',
      note: 'Crisis-era application of reflexivity — shows how Soros evaluates systemic risk when deciding to avoid or short entire sectors during financial regime changes',
    },
  ],
  ackman: [
    {
      title: 'Pershing Square Capital Management — Annual Letters to Investors',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://pershingsquareholdings.com/performance-and-financials/annual-reports/'),
      note: 'Annual letters document each investment thesis: business quality assessment, activist catalyst identification, management evaluation, and position-sizing rationale',
    },
    {
      title: 'Pershing Square — Investor Day Presentations (various years)',
      type: 'report',
      note: 'Formal presentations showing how Ackman evaluates management quality, corporate governance, and fair value when building concentrated activist positions',
    },
    {
      title: 'Bill Ackman — Pershing Square Foundation and Conference Lectures',
      type: 'speech',
      note: 'Public lectures where Ackman explains his concentrated, activist investment philosophy and the specific business characteristics that qualify a stock for investment',
    },
  ],
  burry: [
    {
      title: 'The Big Short — Michael Lewis (2010)',
      type: 'book',
      note: 'Documents Burry\'s bottoms-up research process — how he constructs a contrarian thesis, validates it with primary sources, and holds conviction against Wall Street consensus',
    },
    {
      title: 'Scion Asset Management — Selected Investor Letters',
      type: 'letter',
      note: 'Selected letters document Burry\'s checklist-based deep value approach: balance sheet quality, liquidation value, and the catalyst required before investing',
    },
    {
      title: 'Michael Burry — MSN Money columns and interviews (2000–2001)',
      type: 'interview',
      note: 'Early articles where Burry explains his stock-selection criteria: what makes a stock genuinely cheap vs fairly valued, and balance sheet red flags that eliminate candidates',
    },
  ],
  smith: [
    {
      title: 'Fundsmith Annual Reports and Letters to Shareholders',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://www.fundsmith.eu/fund-literature/annual-letters'),
      note: 'Annual letters directly explain Smith\'s three-step criteria — buy good businesses, don\'t overpay, do nothing — with specific financial thresholds and real holding examples',
    },
    {
      title: 'Invest for the Long Term — Terry Smith (2012)',
      type: 'book',
      note: 'Defines Terry Smith\'s quality metrics: high return on capital employed, strong operating profit-to-cash conversion, minimal debt, and sustainable competitive advantage',
    },
    {
      title: 'Fundsmith Annual Shareholder Meetings',
      type: 'speech',
      url: '/api/link?url=' + encodeURIComponent('https://www.fundsmith.eu/fund-literature'),
      note: 'Annual meeting videos and slides document how Smith evaluates new ideas against his quality screen and explains why specific holdings pass or fail his criteria',
    },
  ],
  einhorn: [
    {
      title: 'Fooling Some of the People All of the Time — David Einhorn (2008)',
      type: 'book',
      note: 'Documents Einhorn\'s thesis-building process against Allied Capital — illustrates his accounting-based analysis: where to look for misrepresented assets and earnings quality',
    },
    {
      title: 'Greenlight Capital Letters to Partners (selected public excerpts)',
      type: 'letter',
      note: 'Excerpts reveal how Einhorn constructs value theses, identifies accounting irregularities, and reasons through position sizing on both long and short sides',
    },
    {
      title: 'Greenlight Capital — Ira Sohn Conference Presentations',
      type: 'speech',
      note: 'Conference presentations are the most accessible public source for Einhorn\'s thesis construction — each presentation documents his full investment analysis on a specific stock',
    },
  ],
  miller: [
    {
      title: 'Miller Value Partners — Annual Letters to Investors',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://millervalue.com/letters/'),
      note: 'Annual letters document Miller\'s eclectic value approach: DCF-based intrinsic value, Kelly Criterion sizing, and unconventional valuation of businesses the market misprices',
    },
    {
      title: 'Legg Mason Capital Management — Annual Reports (1990–2016)',
      type: 'report',
      note: 'Reports from the 15-consecutive-year market-beating streak document the specific financial metrics Miller used to find value in technology, financial, and consumer stocks',
    },
    {
      title: 'Bill Miller — Various investor conference interviews and transcripts',
      type: 'interview',
      note: 'Interviews explain Miller\'s core conviction: all value investing is ultimately DCF, and price is the only reliable guide — how he applies this to screen seemingly expensive stocks',
    },
  ],
  watsa: [
    {
      title: 'Fairfax Financial Holdings — Annual Reports and Letters to Shareholders',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://www.fairfax.ca/news/financial-reports/'),
      note: 'Annual letters document Watsa\'s combined approach: Graham-Dodd equity selection with macro hedging overlay — how balance sheet resilience and cheap price interact in his screen',
    },
    {
      title: 'Prem Watsa — Annual General Meeting Speeches',
      type: 'speech',
      note: 'AGM addresses explain how Watsa applies Graham\'s margin-of-safety criteria with insurance-float leverage and how he sizes positions based on downside risk',
    },
    {
      title: 'The Definitive Guide to Business Finance (references Fairfax approach)',
      type: 'book',
      note: 'Secondary reference illustrating the value investing with macro-hedging approach that characterises Fairfax — useful for context on Watsa\'s combined equity and risk framework',
    },
  ],
  lilu: [
    {
      title: 'Moving the Mountain — Li Lu (autobiography, 1994)',
      type: 'book',
      note: 'Autobiography providing context for Li Lu\'s value-investing conviction and the circle-of-competence discipline he applies before committing to any position',
    },
    {
      title: 'Li Lu — Columbia University Business School Lectures',
      type: 'speech',
      url: '/api/link?url=' + encodeURIComponent('https://www8.gsb.columbia.edu/valueinvesting/resources/videos'),
      note: 'Video lectures document Li Lu\'s framework for identifying businesses at the early stages of durable competitive advantage — especially his process for evaluating emerging-market companies',
    },
    {
      title: 'Himalaya Capital — Selected investor letters and presentations',
      type: 'letter',
      url: '/api/link?url=' + encodeURIComponent('https://www.himalayacapital.com'),
      note: 'Letters document Li Lu\'s concentrated, long-term approach to selecting businesses in transforming economies — how he evaluates management, moat durability, and reinvestment potential',
    },
  ],
  schloss: [
    {
      title: 'The Superinvestors of Graham-and-Doddsville — Warren Buffett (1984)',
      type: 'speech',
      url: '/api/link?url=' + encodeURIComponent('https://www8.gsb.columbia.edu/sites/valueinvesting/files/files/Buffett1984.pdf'),
      note: 'Contains Buffett\'s direct summary of Schloss\'s methodology: buy cheap by net asset value, diversify widely, avoid management meetings, hold until fair value is reached',
    },
    {
      title: 'Walter & Edwin Schloss Associates — Annual Reports',
      type: 'report',
      note: 'Partnership reports document Schloss\'s mechanistic value approach in practice — low P/B, diversified portfolio of asset-backed stocks, no macro forecasting required',
    },
    {
      title: 'Factors Needed to Make Money in the Stock Market — Walter Schloss (1994)',
      type: 'speech',
      note: 'The 16-factor checklist is the most direct source for Schloss\'s stock-selection criteria: price below book value, financial stability, and management with skin in the game',
    },
  ],
  templeton: [
    {
      title: 'The Templeton Touch — William Proctor (2012)',
      type: 'book',
      note: 'Documents Templeton\'s "maximum pessimism" strategy — how he systematically identified countries and sectors at the point of maximum fear and applied P/E and P/B screens globally',
    },
    {
      title: 'Investing the Templeton Way — Lauren Templeton & Scott Phillips (2008)',
      type: 'book',
      note: 'Details Templeton\'s global screening criteria: P/E relative to normalised earnings, bargain lists updated monthly, and his method for comparing stocks across international markets',
    },
    {
      title: 'John Templeton — 16 Investment Principles (Franklin Templeton Legacy)',
      type: 'report',
      url: '/api/link?url=' + encodeURIComponent('https://www.templeton.org'),
      note: 'Templeton Foundation preservation of his 22 investment maxims including his specific criteria for cheap stocks at the global level and his contrarian decision-making framework',
    },
  ],
}

/** Source type labels and icons */
export const SOURCE_TYPE_META: Record<SourceType, { label: string; icon: string }> = {
  book:      { label: 'Book',      icon: '📖' },
  letter:    { label: 'Letter',    icon: '✉️' },
  report:    { label: 'Report',    icon: '📄' },
  speech:    { label: 'Speech',    icon: '🎤' },
  interview: { label: 'Interview', icon: '🎙️' },
  research:  { label: 'Research',  icon: '🔬' },
}
