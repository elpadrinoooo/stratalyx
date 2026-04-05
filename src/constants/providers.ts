import type { Provider } from '../types'

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    shortName: 'Claude',
    color: '#d97706',
    models: [
      {
        id: 'claude-haiku-4-5-20251001',
        label: 'Claude Haiku 4.5',
        tier: 'fast',
        inputCost: 0.80,
        outputCost: 4.00,
      },
      {
        id: 'claude-sonnet-4-5',
        label: 'Claude Sonnet 4.5',
        tier: 'balanced',
        inputCost: 3.00,
        outputCost: 15.00,
      },
      {
        id: 'claude-opus-4-5',
        label: 'Claude Opus 4.5',
        tier: 'powerful',
        inputCost: 15.00,
        outputCost: 75.00,
      },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    shortName: 'GPT',
    color: '#10a37f',
    models: [
      {
        id: 'gpt-4o-mini',
        label: 'GPT-4o Mini',
        tier: 'fast',
        inputCost: 0.15,
        outputCost: 0.60,
      },
      {
        id: 'gpt-4o',
        label: 'GPT-4o',
        tier: 'balanced',
        inputCost: 2.50,
        outputCost: 10.00,
      },
      {
        id: 'o3-mini',
        label: 'o3-mini',
        tier: 'powerful',
        inputCost: 1.10,
        outputCost: 4.40,
      },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    shortName: 'Gemini',
    color: '#4285f4',
    models: [
      {
        id: 'gemini-2.5-flash',
        label: 'Gemini 2.5 Flash',
        tier: 'fast',
        inputCost: 0.15,
        outputCost: 0.60,
      },
      {
        id: 'gemini-2.5-pro',
        label: 'Gemini 2.5 Pro',
        tier: 'powerful',
        inputCost: 1.25,
        outputCost: 10.00,
      },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    shortName: 'Mistral',
    color: '#f77f00',
    models: [
      {
        id: 'mistral-small-3.1',
        label: 'Mistral Small 3.1',
        tier: 'fast',
        inputCost: 0.10,
        outputCost: 0.30,
      },
      {
        id: 'mistral-large-2',
        label: 'Mistral Large 2',
        tier: 'powerful',
        inputCost: 2.00,
        outputCost: 6.00,
      },
    ],
  },
]

export const PROV: Record<string, Provider> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p])
)
