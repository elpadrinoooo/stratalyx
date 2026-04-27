import { useEffect, useState } from 'react'
import { Title, useNotify } from 'react-admin'
import {
  Box, Button, Card, CardContent, Checkbox, Chip, Divider, FormControlLabel,
  LinearProgress, Stack, Switch, Typography,
} from '@mui/material'
import { PROVIDERS } from '../constants/providers'
import { supabase } from '../lib/supabase'

type ModelMap = Record<string, string[]>

interface UsageStats { count: number; inputTokens: number; outputTokens: number; costMicro: number }
const EMPTY_STATS: UsageStats = { count: 0, inputTokens: 0, outputTokens: 0, costMicro: 0 }

/**
 * Direct read/write against `app_settings` via the Supabase client. We bypass
 * react-admin's data provider here because that table uses `key` as its
 * primary key (not the default `id`), which the generic List/Edit flow
 * doesn't handle cleanly. Going direct gives us the friendly switch + checkbox
 * UI the admin actually wants instead of a raw JSON textarea.
 *
 * RLS on app_settings restricts reads/writes to admins only — the signed-in
 * Supabase session enforces this server-side.
 */
async function loadConfig(): Promise<{ providers: string[]; models: ModelMap }> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['enabled_providers', 'enabled_models'])
  if (error) throw new Error(error.message)
  const byKey = Object.fromEntries((data ?? []).map(r => [r.key, r.value])) as Record<string, unknown>
  return {
    providers: (byKey['enabled_providers'] as string[]) ?? PROVIDERS.map(p => p.id),
    models:    (byKey['enabled_models']    as ModelMap) ?? Object.fromEntries(PROVIDERS.map(p => [p.id, p.models.map(m => m.id)])),
  }
}

/** Aggregate analyses → per-provider + per-model token/cost totals (all-time). */
async function loadUsage(): Promise<{ byProvider: Record<string, UsageStats>; byModel: Record<string, UsageStats> }> {
  const { data, error } = await supabase
    .from('analyses')
    .select('provider, model, input_tokens, output_tokens, cost_usd_micro')
    .not('provider', 'is', null)
    .limit(20_000)
  if (error) throw new Error(error.message)

  const byProvider: Record<string, UsageStats> = {}
  const byModel:    Record<string, UsageStats> = {}
  for (const r of (data ?? []) as Array<{ provider: string | null; model: string | null; input_tokens: number | null; output_tokens: number | null; cost_usd_micro: number | null }>) {
    if (!r.provider || !r.model) continue
    const ip = byProvider[r.provider] ?? { ...EMPTY_STATS }
    const im = byModel[r.model]       ?? { ...EMPTY_STATS }
    const inT  = r.input_tokens   ?? 0
    const outT = r.output_tokens  ?? 0
    const cost = r.cost_usd_micro ?? 0
    ip.count += 1; ip.inputTokens += inT; ip.outputTokens += outT; ip.costMicro += cost
    im.count += 1; im.inputTokens += inT; im.outputTokens += outT; im.costMicro += cost
    byProvider[r.provider] = ip
    byModel[r.model]       = im
  }
  return { byProvider, byModel }
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 })
function fmtUsd(microCents: number): string { return USD.format(microCents / 100_000) }
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

async function saveConfig(providers: string[], models: ModelMap): Promise<void> {
  const a = await supabase.from('app_settings').update({ value: providers, updated_at: new Date().toISOString() }).eq('key', 'enabled_providers')
  if (a.error) throw new Error(a.error.message)
  const b = await supabase.from('app_settings').update({ value: models, updated_at: new Date().toISOString() }).eq('key', 'enabled_models')
  if (b.error) throw new Error(b.error.message)
}

export function LlmConfigScreen() {
  const notify = useNotify()
  const [providers, setProviders] = useState<string[] | null>(null)
  const [models, setModels]       = useState<ModelMap | null>(null)
  const [usage,  setUsage]        = useState<{ byProvider: Record<string, UsageStats>; byModel: Record<string, UsageStats> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadConfig(), loadUsage()])
      .then(([cfg, u]) => {
        if (cancelled) return
        setProviders(cfg.providers)
        setModels(cfg.models)
        setUsage(u)
        setLoading(false)
      })
      .catch(err => { if (!cancelled) { notify(`Load failed: ${String(err)}`, { type: 'error' }); setLoading(false) } })
    return () => { cancelled = true }
  }, [notify])

  const toggleProvider = (id: string, on: boolean) => {
    if (!providers) return
    setProviders(on ? Array.from(new Set([...providers, id])) : providers.filter(p => p !== id))
    setDirty(true)
  }

  const toggleModel = (provId: string, modelId: string, on: boolean) => {
    if (!models) return
    const list = models[provId] ?? []
    const next = on
      ? Array.from(new Set([...list, modelId]))
      : list.filter(m => m !== modelId)
    setModels({ ...models, [provId]: next })
    setDirty(true)
  }

  const onSave = async () => {
    if (!providers || !models) return
    setSaving(true)
    try {
      await saveConfig(providers, models)
      setDirty(false)
      notify('Saved. Server picks up changes within 60 seconds.', { type: 'success' })
    } catch (err) {
      notify(`Save failed: ${String(err)}`, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !providers || !models) {
    return <Box sx={{ p: 3 }}><Title title="LLM models" /><LinearProgress /></Box>
  }

  return (
    <Box sx={{ p: 3, maxWidth: 920 }}>
      <Title title="LLM models" />

      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>LLM models available to users</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Toggle whole providers, or pick specific models within each. Disabled options are hidden in the user-facing
            ProviderModelBar and rejected at the LLM proxy with 403 PROVIDER_DISABLED. Changes are picked up by the server within 60 seconds.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {dirty && <Chip size="small" color="warning" label="Unsaved changes" />}
          <Button
            variant="contained"
            onClick={() => { void onSave() }}
            disabled={!dirty || saving}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Box>
      </Box>

      <Stack spacing={2}>
        {PROVIDERS.map(prov => {
          const provEnabled    = providers.includes(prov.id)
          const allowedModels  = models[prov.id] ?? []
          const enabledCount   = prov.models.filter(m => allowedModels.includes(m.id)).length
          const provStats      = usage?.byProvider[prov.id] ?? EMPTY_STATS
          return (
            <Card key={prov.id} sx={{ opacity: provEnabled ? 1 : 0.55, transition: 'opacity .15s' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: prov.color, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{prov.name}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {provEnabled
                          ? `${enabledCount} of ${prov.models.length} models enabled`
                          : 'Provider disabled'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {provStats.count > 0 && (
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, display: 'block', lineHeight: 1.2 }}>
                          All-time usage
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.primary', fontWeight: 600 }}>
                          {provStats.count} runs · {fmtTokens(provStats.inputTokens + provStats.outputTokens)} tokens · {fmtUsd(provStats.costMicro)}
                        </Typography>
                      </Box>
                    )}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={provEnabled}
                          onChange={e => toggleProvider(prov.id, e.target.checked)}
                        />
                      }
                      label={provEnabled ? 'Enabled' : 'Disabled'}
                      labelPlacement="start"
                    />
                  </Box>
                </Box>

                {provEnabled && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0.5 }}>
                      {prov.models.map(m => {
                        const checked = allowedModels.includes(m.id)
                        const cost = `$${m.inputCost.toFixed(2)} in / $${m.outputCost.toFixed(2)} out per 1M tokens`
                        const mStats = usage?.byModel[m.id] ?? EMPTY_STATS
                        return (
                          <Box
                            key={m.id}
                            sx={{
                              p: 1, borderRadius: 1,
                              border: 1,
                              borderColor: checked ? 'primary.main' : 'divider',
                              background: checked ? 'action.selected' : 'transparent',
                              transition: 'background .15s, border-color .15s',
                            }}
                          >
                            <FormControlLabel
                              sx={{ width: '100%', m: 0, alignItems: 'flex-start' }}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={checked}
                                  onChange={e => toggleModel(prov.id, m.id, e.target.checked)}
                                />
                              }
                              label={
                                <Box sx={{ width: '100%' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.label}</Typography>
                                    {mStats.count > 0 && (
                                      <Chip
                                        size="small"
                                        label={`${mStats.count} · ${fmtUsd(mStats.costMicro)}`}
                                        title={`${mStats.count} runs · ${fmtTokens(mStats.inputTokens)} in / ${fmtTokens(mStats.outputTokens)} out · ${fmtUsd(mStats.costMicro)}`}
                                        sx={{ fontFamily: 'monospace', fontSize: 10, height: 20 }}
                                        variant="outlined"
                                        color={mStats.costMicro > 0 ? 'primary' : 'default'}
                                      />
                                    )}
                                  </Box>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                    {m.id}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                    {cost} · tier: {m.tier}
                                  </Typography>
                                  {mStats.count > 0 && (
                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace', mt: 0.25 }}>
                                      Used: {fmtTokens(mStats.inputTokens)} in / {fmtTokens(mStats.outputTokens)} out
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </Box>
                        )
                      })}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => { void onSave() }}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Box>
    </Box>
  )
}
