import { useEffect, useState } from 'react'
import { useGetList, Title, useRedirect } from 'react-admin'
import {
  Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, LinearProgress, Stack, Typography,
} from '@mui/material'

const NUM = new Intl.NumberFormat('en-US')

interface UserRow {
  id: string
  email: string | null
  tier: 'free' | 'pro'
  analyses_this_month: number
  is_admin: boolean
  created_at: string
}

interface AnalysisRow {
  id: string
  user_id: string | null
  ticker: string
  investor_id: string
  verdict: string | null
  score: number | null
  created_at: string
}

// ── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: 'gain' | 'loss' | 'warn' }) {
  const subColor = accent === 'gain' ? '#10b981'
    : accent === 'loss' ? '#ef4444'
    : accent === 'warn' ? '#f59e0b'
    : 'text.secondary'
  return (
    <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
      <CardContent>
        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700 }}>{value}</Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: subColor, fontWeight: 600 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// ── Sparkline + trend card ──────────────────────────────────────────────────
function Sparkline({ data, color = '#6366f1', height = 56 }: { data: number[]; color?: string; height?: number }) {
  if (data.length === 0) return null
  const w = 320
  const max = Math.max(...data, 1)
  const range = max || 1
  const step = data.length > 1 ? w / (data.length - 1) : 0
  const pts = data.map((v, i) => `${i * step},${height - (v / range) * (height - 4) - 2}`).join(' ')
  const area = `0,${height} ${pts} ${w},${height}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <polygon points={area} fill={color} opacity={0.15} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function bucketByDay(timestamps: string[], days: number): number[] {
  const buckets = new Array(days).fill(0)
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const startMs = todayMidnight.getTime() - (days - 1) * 86_400_000
  for (const ts of timestamps) {
    const idx = Math.floor((new Date(ts).getTime() - startMs) / 86_400_000)
    if (idx >= 0 && idx < days) buckets[idx]++
  }
  return buckets
}

function TrendCard({ label, total, sub, data, color }: {
  label: string; total: string; sub: string; data: number[]; color: string
}) {
  return (
    <Card sx={{ flex: '1 1 320px', minWidth: 280 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{sub}</Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{total}</Typography>
        <Sparkline data={data} color={color} />
      </CardContent>
    </Card>
  )
}

function topN<T extends string>(items: T[], n: number): Array<{ key: T; count: number }> {
  const counts = new Map<T, number>()
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1)
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

// ── API key status panel ────────────────────────────────────────────────────
interface HealthResponse {
  status?: string
  claude?: boolean
  gemini?: boolean
  openai?: boolean
  mistral?: boolean
  fmp?: boolean
  // finnhub and supabase aren't currently in /health output, but adding them is one PR
  uptime?: number
  time?: string
}

function ApiKeyStatusCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then(r => r.ok ? r.json() as Promise<HealthResponse> : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setHealth(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const services: { label: string; key: keyof HealthResponse; required: boolean }[] = [
    { label: 'Anthropic (Claude)', key: 'claude',  required: true  },
    { label: 'Google (Gemini)',    key: 'gemini',  required: true  },
    { label: 'OpenAI',             key: 'openai',  required: false },
    { label: 'Mistral',            key: 'mistral', required: false },
    { label: 'FMP',                key: 'fmp',     required: true  },
  ]

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            API key status (read-only)
          </Typography>
          {health?.uptime != null && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
              uptime {Math.floor(health.uptime / 3600)}h
            </Typography>
          )}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
          Stored in Railway environment variables, not the database. To rotate or update, open the&nbsp;
          <Box component="a" href="https://railway.com/dashboard" target="_blank" rel="noopener noreferrer" sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            Railway dashboard
          </Box>
          &nbsp;→ stratalyx-backend → Variables.
        </Typography>
        {loading && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Checking…</Typography>}
        {error && <Typography variant="body2" sx={{ color: 'error.main' }}>Health check failed: {error}</Typography>}
        {health && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1 }}>
            {services.map(({ label, key, required }) => {
              const ok = Boolean(health[key])
              return (
                <Box
                  key={key}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    p: 1.25, borderRadius: 1,
                    background: 'action.hover',
                    border: 1,
                    borderColor: ok ? 'success.main' : (required ? 'error.main' : 'divider'),
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                  <Chip
                    size="small"
                    label={ok ? '✓ Configured' : (required ? '✗ Missing' : 'Not set')}
                    color={ok ? 'success' : (required ? 'error' : 'default')}
                    variant={ok ? 'filled' : 'outlined'}
                  />
                </Box>
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// ── Activity feed ───────────────────────────────────────────────────────────
function timeAgoShort(d: Date): string {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (s < 60)    return `${Math.round(s)}s`
  if (s < 3600)  return `${Math.round(s / 60)}m`
  if (s < 86400) return `${Math.round(s / 3600)}h`
  return `${Math.round(s / 86400)}d`
}

interface ActivityEvent {
  kind: 'signup' | 'analysis'
  date: Date
  primary: string
  secondary: string
  refId: string
}

function ActivityFeed({ users, analyses }: { users: UserRow[]; analyses: AnalysisRow[] }) {
  const redirect = useRedirect()
  const events: ActivityEvent[] = []
  for (const u of users) {
    events.push({
      kind: 'signup',
      date: new Date(u.created_at),
      primary: u.email ?? u.id.slice(0, 8),
      secondary: `signed up · ${u.tier}`,
      refId: u.id,
    })
  }
  for (const a of analyses) {
    events.push({
      kind: 'analysis',
      date: new Date(a.created_at),
      primary: `${a.ticker} · ${a.investor_id}`,
      secondary: a.verdict
        ? `analyzed · ${a.verdict}${a.score != null ? ` (${a.score})` : ''}`
        : 'analyzed',
      refId: a.id,
    })
  }
  events.sort((a, b) => b.date.getTime() - a.date.getTime())
  const recent = events.slice(0, 30)

  return (
    <Card>
      <CardContent>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Activity feed (latest 30)
        </Typography>
        {recent.length === 0
          ? <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>No activity yet.</Typography>
          : (
            <Box sx={{ maxHeight: 360, overflowY: 'auto', mt: 1 }}>
              <Stack divider={<Divider />}>
                {recent.map(ev => (
                  <Box
                    key={`${ev.kind}-${ev.refId}`}
                    onClick={() => redirect(
                      ev.kind === 'signup' ? 'edit' : 'show',
                      ev.kind === 'signup' ? 'users' : 'analyses',
                      ev.refId,
                    )}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, py: 1, cursor: 'pointer',
                      '&:hover': { background: 'action.hover', borderRadius: 1 },
                    }}
                  >
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: ev.kind === 'signup' ? 'primary.main' : 'success.main',
                      flexShrink: 0,
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{ev.primary}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{ev.secondary}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', flexShrink: 0 }}>
                      {timeAgoShort(ev.date)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )
        }
      </CardContent>
    </Card>
  )
}

// ── Cohort retention ────────────────────────────────────────────────────────
const MS_PER_WEEK = 7 * 86_400_000

function CohortRetention({ users, analyses }: { users: UserRow[]; analyses: AnalysisRow[] }) {
  // Anchor: this Monday at 00:00 local time. Cohorts are weeks-ago counts.
  const now = new Date()
  const dayMon = (now.getDay() + 6) % 7  // Mon=0..Sun=6
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayMon)
  monday.setHours(0, 0, 0, 0)
  const anchorMs = monday.getTime()

  // Group users by signup-week (cohort weeks ago, capped at 8).
  const cohorts = new Map<number, UserRow[]>()
  for (const u of users) {
    const t = new Date(u.created_at).getTime()
    const wk = Math.max(0, Math.floor((anchorMs - t) / MS_PER_WEEK))
    if (wk > 7) continue
    if (!cohorts.has(wk)) cohorts.set(wk, [])
    cohorts.get(wk)!.push(u)
  }

  // For each user, set of weeks-ago they ran analyses.
  const userActiveWeeks = new Map<string, Set<number>>()
  for (const a of analyses) {
    if (!a.user_id) continue
    const t = new Date(a.created_at).getTime()
    const wk = Math.max(0, Math.floor((anchorMs - t) / MS_PER_WEEK))
    if (!userActiveWeeks.has(a.user_id)) userActiveWeeks.set(a.user_id, new Set())
    userActiveWeeks.get(a.user_id)!.add(wk)
  }

  const cohortWeeks = Array.from(cohorts.keys()).sort((a, b) => a - b) // oldest first row at top

  return (
    <Card>
      <CardContent>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Cohort retention — weekly
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          Each row is a signup-week cohort. Each column is the % of that cohort active in the Nth week after signup.
        </Typography>
        {cohortWeeks.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            No cohorts yet — needs at least one signup in the last 8 weeks.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', fontSize: 12, fontFamily: '"SFMono-Regular",Consolas,monospace' }}>
              <thead>
                <tr>
                  <Cell head>Cohort (week of)</Cell>
                  <Cell head align="right">Size</Cell>
                  {Array.from({ length: 8 }).map((_, i) => <Cell head key={i} align="right">+{i}w</Cell>)}
                </tr>
              </thead>
              <tbody>
                {cohortWeeks.map(cw => {
                  const cohort = cohorts.get(cw)!
                  const start = new Date(anchorMs - cw * MS_PER_WEEK)
                  return (
                    <tr key={cw}>
                      <Cell>{start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</Cell>
                      <Cell align="right">{cohort.length}</Cell>
                      {Array.from({ length: 8 }).map((_, offset) => {
                        // offset=0 is the cohort's signup week. weeksAgo for that = cw - offset.
                        const targetWk = cw - offset
                        if (targetWk < 0) return <Cell key={offset} />
                        const activeUsers = cohort.filter(u => userActiveWeeks.get(u.id)?.has(targetWk)).length
                        const pct = (activeUsers / cohort.length) * 100
                        return (
                          <Cell
                            key={offset}
                            align="right"
                            sx={pct > 0
                              ? { background: `rgba(99, 102, 241, ${0.1 + (pct / 100) * 0.55})`, fontWeight: 600 }
                              : undefined}
                          >
                            {pct > 0 ? `${pct.toFixed(0)}%` : '·'}
                          </Cell>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

function Cell({ children, head, align, sx }: {
  children?: React.ReactNode
  head?: boolean
  align?: 'right' | 'left'
  sx?: object
}) {
  const Tag = head ? 'th' : 'td'
  return (
    <Box
      component={Tag}
      sx={{
        textAlign: align ?? 'left',
        p: 1,
        borderBottom: 1,
        borderColor: 'divider',
        color: head ? 'text.secondary' : 'text.primary',
        fontWeight: head ? 700 : 400,
        textTransform: head ? 'uppercase' : undefined,
        letterSpacing: head ? 0.5 : undefined,
        fontSize: head ? 10 : 12,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

// ── Broadcast dialog ────────────────────────────────────────────────────────
function BroadcastDialog({ open, onClose, candidates }: { open: boolean; onClose: () => void; candidates: UserRow[] }) {
  const emails = candidates.map(c => c.email).filter((e): e is string => !!e)
  const [copied, setCopied] = useState(false)

  const copyEmails = () => {
    void navigator.clipboard.writeText(emails.join(', ')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const downloadCsv = () => {
    const header = 'email,tier,analyses_this_month,signed_up\n'
    const rows = candidates.map(c =>
      `${c.email ?? ''},${c.tier},${c.analyses_this_month},${c.created_at}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `upgrade-candidates-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const subject = encodeURIComponent('Upgrade to Stratalyx Pro for unlimited analyses')
  const body = encodeURIComponent(
    'Hi,\n\nYou’ve been close to your free monthly analysis limit. Pro unlocks unlimited runs across all 22 investor frameworks. Reply to this email and we’ll get you on the list for early access.\n\n— Stratalyx'
  )
  const mailtoHref = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${subject}&body=${body}`

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upgrade candidates ({candidates.length})</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Free users at 20+ analyses this month. Three ways to reach them:
        </Typography>
        <Box sx={{ background: 'action.hover', p: 1.5, borderRadius: 1, fontFamily: 'monospace', fontSize: 12, maxHeight: 180, overflowY: 'auto', mb: 2 }}>
          {emails.length === 0
            ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>No emails available.</Typography>
            : emails.join(', ')
          }
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Tip: paste into Mailchimp, Loops, or your CRM to send a templated upgrade nudge.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={copyEmails} disabled={emails.length === 0}>{copied ? 'Copied!' : 'Copy emails'}</Button>
        <Button onClick={downloadCsv} disabled={candidates.length === 0}>Download CSV</Button>
        <Button component="a" href={mailtoHref} variant="contained" disabled={emails.length === 0}>
          Open mail client
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export function Dashboard() {
  const redirect = useRedirect()
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  // Pin "now" at mount so the date-window filters don't churn on every render.
  const [windows] = useState(() => {
    const now = Date.now()
    return {
      since30: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      since7Ms: now - 7 * 24 * 60 * 60 * 1000,
    }
  })

  const { data: users = [], isLoading: usersLoading } = useGetList<UserRow>('users', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'created_at', order: 'DESC' },
  })

  const { data: analyses30 = [], isLoading: analysesLoading } = useGetList<AnalysisRow>('analyses', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'created_at', order: 'DESC' },
    filter: { 'created_at@gte': windows.since30 },
  })

  if (usersLoading || analysesLoading) return <LinearProgress />

  const totalUsers = users.length
  const proUsers = users.filter(u => u.tier === 'pro').length
  const proPct = totalUsers ? Math.round((proUsers / totalUsers) * 100) : 0
  // 80% of the free-tier monthly cap (25) — these are the high-intent users
  // most likely to convert to Pro if pinged.
  const NEAR_LIMIT_THRESHOLD = 20
  const nearLimit = users.filter(u => u.tier === 'free' && u.analyses_this_month >= NEAR_LIMIT_THRESHOLD)
  const nearLimitCount = nearLimit.length
  const totalAnalyses30 = analyses30.length

  const activatedThisMonth = users.filter(u => u.analyses_this_month > 0).length
  const activationPct = totalUsers ? Math.round((activatedThisMonth / totalUsers) * 100) : 0

  const analyses7 = analyses30.filter(a => new Date(a.created_at).getTime() >= windows.since7Ms).length

  const signupsTrend  = bucketByDay(users.map(u => u.created_at), 30)
  const analysesTrend = bucketByDay(analyses30.map(a => a.created_at), 30)
  const signups30 = signupsTrend.reduce((s, n) => s + n, 0)

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const topTickers   = topN(analyses30.map(a => a.ticker.toUpperCase()), 5)
  const topInvestors = topN(analyses30.map(a => a.investor_id), 5)

  return (
    <Box>
      <Title title="Dashboard" />

      {nearLimitCount > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2, alignItems: 'center' }}
          action={
            <Stack direction="row" spacing={1}>
              <Button color="warning" size="small" variant="outlined" onClick={() => setBroadcastOpen(true)}>
                Email them
              </Button>
              <Button
                color="warning"
                size="small"
                onClick={() => redirect('list', 'users', undefined, undefined, {
                  displayedFilters: { tier: true, 'analyses_this_month@gte': true },
                  filter: { tier: 'free', 'analyses_this_month@gte': NEAR_LIMIT_THRESHOLD },
                })}
              >
                View list
              </Button>
            </Stack>
          }
        >
          {nearLimitCount} free {nearLimitCount === 1 ? 'user is' : 'users are'} at 20+ analyses this month — prime upgrade candidates.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <KpiCard label="Total users"     value={NUM.format(totalUsers)}        sub={`${proUsers} pro · ${totalUsers - proUsers} free`} />
        <KpiCard label="Activation (mo)" value={`${activationPct}%`}            sub={`${activatedThisMonth} of ${totalUsers} ran ≥1 analysis`} accent={activationPct >= 30 ? 'gain' : activationPct > 0 ? 'warn' : undefined} />
        <KpiCard label="Analyses (30d)"  value={NUM.format(totalAnalyses30)}    sub={`${analyses7} in last 7d`} />
        <KpiCard label="Pro conversion"  value={`${proPct}%`}                   sub={`${proUsers} of ${totalUsers}`} accent={proPct > 0 ? 'gain' : undefined} />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TrendCard label="New signups"  total={NUM.format(signups30)}        sub="last 30 days" data={signupsTrend}  color="#6366f1" />
        <TrendCard label="Analyses run" total={NUM.format(totalAnalyses30)}  sub="last 30 days" data={analysesTrend} color="#10b981" />
      </Box>

      <Box sx={{ mb: 3 }}>
        <CohortRetention users={users} analyses={analyses30} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <ApiKeyStatusCard />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Card sx={{ flex: '1 1 320px', minWidth: 280 }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Recent signups
            </Typography>
            {recentSignups.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>No users yet.</Typography>
            )}
            <Stack divider={<Divider />} sx={{ mt: 1 }}>
              {recentSignups.map(u => (
                <Box
                  key={u.id}
                  onClick={() => redirect('edit', 'users', u.id)}
                  sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 1, cursor: 'pointer', '&:hover': { color: 'primary.main' },
                  }}
                >
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{u.email ?? u.id}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    {u.is_admin && <Chip size="small" label="admin" color="primary" variant="outlined" />}
                    <Chip size="small" label={u.tier} color={u.tier === 'pro' ? 'primary' : 'default'} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 240px', minWidth: 220 }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Top tickers (30d)
            </Typography>
            {topTickers.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>No analyses yet.</Typography>
            )}
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {topTickers.map(t => (
                <Box key={t.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontFamily: "'SFMono-Regular',Consolas,monospace", fontWeight: 600 }}>{t.key}</Typography>
                  <Chip size="small" label={t.count} variant="outlined" />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 240px', minWidth: 220 }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Top investors (30d)
            </Typography>
            {topInvestors.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>No analyses yet.</Typography>
            )}
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {topInvestors.map(i => (
                <Box key={i.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>{i.key}</Typography>
                  <Chip size="small" label={i.count} variant="outlined" />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box>
        <ActivityFeed users={users} analyses={analyses30} />
      </Box>

      <BroadcastDialog
        open={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        candidates={nearLimit}
      />
    </Box>
  )
}
