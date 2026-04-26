import { useEffect, useState } from 'react'
import { Title, useNotify } from 'react-admin'
import {
  Box, Button, Card, CardContent, Checkbox, Chip, Divider, FormControlLabel,
  LinearProgress, Stack, Switch, Typography,
} from '@mui/material'
import { PROVIDERS } from '../constants/providers'
import { supabase } from '../lib/supabase'

type ModelMap = Record<string, string[]>

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
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [dirty,   setDirty]   = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadConfig()
      .then(cfg => { if (!cancelled) { setProviders(cfg.providers); setModels(cfg.models); setLoading(false) } })
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

                {provEnabled && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0.5 }}>
                      {prov.models.map(m => {
                        const checked = allowedModels.includes(m.id)
                        const cost = `$${m.inputCost.toFixed(2)} in / $${m.outputCost.toFixed(2)} out per 1M tokens`
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
                              sx={{ width: '100%', m: 0 }}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={checked}
                                  onChange={e => toggleModel(prov.id, m.id, e.target.checked)}
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.label}</Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                    {m.id}
                                  </Typography>
                                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                    {cost} · tier: {m.tier}
                                  </Typography>
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
