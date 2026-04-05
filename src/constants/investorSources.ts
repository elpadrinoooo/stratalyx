export type SourceType = 'book' | 'letter' | 'report' | 'speech' | 'interview' | 'research'

export interface InvestorSource {
  title: string
  type: SourceType
  url?: string
}

/**
 * Primary sources for each investor's documented framework.
 * Only well-known, publicly accessible, institutionally recognised references.
 */
export const INVESTOR_SOURCES: Record<string, InvestorSource[]> = {
  buffett: [
    { title: 'Berkshire Hathaway Annual Shareholder Letters (1977–present)', type: 'letter', url: 'https://www.berkshirehathaway.com/letters/letters.html' },
    { title: 'The Essays of Warren Buffett — Lawrence Cunningham (4th ed.)', type: 'book' },
    { title: 'The Superinvestors of Graham-and-Doddsville — Warren Buffett (1984)', type: 'speech', url: 'https://www8.gsb.columbia.edu/sites/valueinvesting/files/files/Buffett1984.pdf' },
  ],
  graham: [
    { title: 'Security Analysis — Graham & Dodd (1934, 6th ed. 2008)', type: 'book' },
    { title: 'The Intelligent Investor — Benjamin Graham (1949, rev. ed. 1973)', type: 'book' },
    { title: 'The Interpretation of Financial Statements — Benjamin Graham (1937)', type: 'book' },
  ],
  lynch: [
    { title: 'One Up on Wall Street — Peter Lynch (1989)', type: 'book' },
    { title: 'Beating the Street — Peter Lynch (1993)', type: 'book' },
    { title: 'Learn to Earn — Peter Lynch (1995)', type: 'book' },
  ],
  munger: [
    { title: "Poor Charlie's Almanack — Peter Kaufman, ed. (2005)", type: 'book' },
    { title: 'Berkshire Hathaway Annual Meeting Transcripts (1994–2023)', type: 'speech', url: 'https://www.berkshirehathaway.com' },
    { title: 'The Psychology of Human Misjudgement — Charlie Munger (1995)', type: 'speech' },
  ],
  greenblatt: [
    { title: 'The Little Book That Beats the Market — Joel Greenblatt (2005)', type: 'book' },
    { title: 'You Can Be a Stock Market Genius — Joel Greenblatt (1997)', type: 'book' },
    { title: 'The Big Secret for the Small Investor — Joel Greenblatt (2011)', type: 'book' },
  ],
  dalio: [
    { title: 'Principles — Ray Dalio (2017)', type: 'book' },
    { title: 'Principles for Navigating Big Debt Crises — Ray Dalio (2018)', type: 'book', url: 'https://www.principles.com/big-debt-crises/' },
    { title: 'How the Economic Machine Works — Ray Dalio (Bridgewater, 2013)', type: 'research', url: 'https://www.economicprinciples.org' },
  ],
  marks: [
    { title: 'The Most Important Thing — Howard Marks (2011)', type: 'book' },
    { title: 'Mastering the Market Cycle — Howard Marks (2018)', type: 'book' },
    { title: 'Oaktree Capital Memos (1990–present)', type: 'letter', url: 'https://www.oaktreecapital.com/insights/howard-marks-memos' },
  ],
  klarman: [
    { title: 'Margin of Safety — Seth Klarman (1991)', type: 'book' },
    { title: 'Baupost Group Letters to Investors (selected excerpts)', type: 'letter' },
    { title: 'Klarman on Value Investing — Various interviews and speeches', type: 'interview' },
  ],
  pabrai: [
    { title: 'The Dhandho Investor — Mohnish Pabrai (2007)', type: 'book' },
    { title: 'Mosaic: Perspectives on Investing — Mohnish Pabrai (2004)', type: 'book' },
    { title: 'Pabrai Investment Funds Annual Letters', type: 'letter', url: 'https://www.pabraifunds.com' },
  ],
  wood: [
    { title: "ARK Invest Big Ideas Annual Report (2017–present)", type: 'research', url: 'https://ark-invest.com/big-ideas/' },
    { title: 'ARK Invest Research Papers and White Papers', type: 'research', url: 'https://ark-invest.com/research/' },
    { title: 'Cathie Wood — Various investor conference presentations', type: 'speech' },
  ],
  fisher: [
    { title: 'Common Stocks and Uncommon Profits — Philip Fisher (1958)', type: 'book' },
    { title: 'Conservative Investors Sleep Well — Philip Fisher (1975)', type: 'book' },
    { title: 'Developing an Investment Philosophy — Philip Fisher (1980)', type: 'book' },
  ],
  druckenmiller: [
    { title: 'The Alchemy of Finance — George Soros (covers Druckenmiller era, 1987)', type: 'book' },
    { title: 'Duquesne Family Office — Selected investor presentations', type: 'report' },
    { title: 'Invest Like the Best — Patrick O\'Shaughnessy interview with Druckenmiller', type: 'interview', url: 'https://www.joincolossus.com/episodes/druckenmiller' },
  ],
  soros: [
    { title: 'The Alchemy of Finance — George Soros (1987)', type: 'book' },
    { title: 'Soros on Soros — George Soros (1995)', type: 'book' },
    { title: 'The New Paradigm for Financial Markets — George Soros (2008)', type: 'book' },
  ],
  ackman: [
    { title: 'Pershing Square Capital Management — Annual Letters to Investors', type: 'letter', url: 'https://pershingsquareholdings.com/company-overview/corporate-history/' },
    { title: 'Pershing Square — Investor Day Presentations (various years)', type: 'report' },
    { title: 'Bill Ackman — Pershing Square Foundation Lectures', type: 'speech' },
  ],
  burry: [
    { title: 'The Big Short — Michael Lewis (2010, covers Scion era)', type: 'book' },
    { title: 'Scion Asset Management — Selected Investor Letters', type: 'letter' },
    { title: 'Michael Burry — MSN Money columns and interviews (2000–2001)', type: 'interview' },
  ],
  smith: [
    { title: 'Fundsmith Annual Reports and Letters to Shareholders', type: 'letter', url: 'https://www.fundsmith.eu/fund-literature/annual-letters' },
    { title: 'Invest for the Long Term — Terry Smith (2012)', type: 'book' },
    { title: 'Fundsmith Shareholder Meetings — Annual Presentations', type: 'speech', url: 'https://www.fundsmith.eu' },
  ],
  einhorn: [
    { title: 'Fooling Some of the People All of the Time — David Einhorn (2008)', type: 'book' },
    { title: 'Greenlight Capital Letters to Partners (selected public excerpts)', type: 'letter' },
    { title: 'Greenlight Capital — Ira Sohn Conference Presentations', type: 'speech' },
  ],
  miller: [
    { title: 'Miller Value Partners — Annual Letters to Investors', type: 'letter', url: 'https://millervalue.com/letters/' },
    { title: 'Legg Mason Capital Management — Annual Reports (1990–2016)', type: 'report' },
    { title: 'Bill Miller — Various investor conference interviews and transcripts', type: 'interview' },
  ],
  watsa: [
    { title: 'Fairfax Financial Holdings — Annual Reports and Letters to Shareholders', type: 'letter', url: 'https://www.fairfax.ca/news/financial-reports/' },
    { title: 'Prem Watsa — Annual General Meeting Speeches', type: 'speech' },
    { title: 'The Definitive Guide to Business Finance (references Fairfax approach)', type: 'book' },
  ],
  lilu: [
    { title: 'Moving the Mountain — Li Lu (autobiography, 1994)', type: 'book' },
    { title: 'Li Lu — Columbia University Business School Lectures', type: 'speech', url: 'https://www8.gsb.columbia.edu/valueinvesting' },
    { title: 'Himalaya Capital — Selected investor letters and presentations', type: 'letter' },
  ],
  schloss: [
    { title: 'The Superinvestors of Graham-and-Doddsville — Warren Buffett (1984, covers Schloss)', type: 'speech', url: 'https://www8.gsb.columbia.edu/sites/valueinvesting/files/files/Buffett1984.pdf' },
    { title: 'Walter & Edwin Schloss Associates — Annual Reports', type: 'report' },
    { title: 'Factors Needed to Make Money in the Stock Market — Walter Schloss (1994)', type: 'speech' },
  ],
  templeton: [
    { title: 'The Templeton Touch — William Proctor (2012)', type: 'book' },
    { title: 'Investing the Templeton Way — Lauren Templeton & Scott Phillips (2008)', type: 'book' },
    { title: 'Franklin Templeton — John Templeton Legacy Commentaries', type: 'report', url: 'https://www.franklintempleton.com' },
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
