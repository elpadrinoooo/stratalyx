export interface InvestorRule {
  id: string
  label: string
  description: string
}

export interface InvestorEquation {
  label: string
  formula: string
}

export interface Investor {
  id: string
  name: string
  shortName: string
  era: string
  style: string
  tagline: string
  avatar: string
  color: string
  ctx: string
  rules: InvestorRule[]
  equations: InvestorEquation[]
}
