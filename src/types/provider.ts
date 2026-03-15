export interface LLMModel {
  id: string
  label: string
  tier: 'fast' | 'balanced' | 'powerful'
  inputCost: number
  outputCost: number
}

export interface Provider {
  id: string
  name: string
  shortName: string
  color: string
  models: LLMModel[]
}
