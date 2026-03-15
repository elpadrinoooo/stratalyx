export interface FMPProfile {
  symbol: string
  companyName: string
  sector: string
  industry: string
  description: string
  mktCap: number
  price: number
  beta: number
  volAvg: number
  lastDiv: number
  country: string
  fullTimeEmployees: string
  website: string
  image: string
  ipoDate: string
  isEtf: boolean
  isActivelyTrading: boolean
}

export interface FMPRatiosTTM {
  peRatioTTM: number
  pegRatioTTM: number
  priceToBookRatioTTM: number
  priceToSalesRatioTTM: number
  returnOnEquityTTM: number
  returnOnAssetsTTM: number
  currentRatioTTM: number
  debtToEquityTTM: number
  netProfitMarginTTM: number
  grossProfitMarginTTM: number
  operatingProfitMarginTTM: number
  dividendYieldTTM: number
  freeCashFlowPerShareTTM: number
  priceToFreeCashFlowsRatioTTM: number
  enterpriseValueMultipleTTM: number
  returnOnCapitalEmployedTTM: number
}

export interface FMPIncomeStatement {
  date: string
  revenue: number
  grossProfit: number
  operatingIncome: number
  netIncome: number
  eps: number
  ebitda: number
}

export interface FMPCashFlow {
  date: string
  freeCashFlow: number
  operatingCashFlow: number
  capitalExpenditure: number
  dividendsPaid: number
}

export interface FMPQuote {
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  marketCap: number
  priceAvg50: number
  priceAvg200: number
  volume: number
  avgVolume: number
  pe: number
  eps: number
  earningsAnnouncement: string
  sharesOutstanding: number
  timestamp: number
}
