export type MoatRating = 'Wide' | 'Narrow' | 'None' | ''

export interface Stock {
  ticker: string
  name: string
  sector: string
  description: string
}
