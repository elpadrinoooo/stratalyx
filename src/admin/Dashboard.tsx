import { useState } from 'react'
import { useGetList, Title, useRedirect } from 'react-admin'
import {
  Alert, Box, Card, CardContent, Typography, Stack, Chip, Divider, LinearProgress,
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
        <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 700 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: subColor, fontWeight: 600 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

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

export function Dashboard() {
  const redirect = useRedirect()

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

  if (usersLoading || analysesLoading) {
    return <LinearProgress />
  }

  const totalUsers = users.length
  const proUsers = users.filter(u => u.tier === 'pro').length
  const proPct = totalUsers ? Math.round((proUsers / totalUsers) * 100) : 0
  const nearLimit = users.filter(u => u.tier === 'free' && u.analyses_this_month >= 2).length
  const totalAnalyses30 = analyses30.length

  // Activation = % of users who ran ≥1 analysis in the current monthly window.
  // Uses the existing analyses_this_month counter (resets monthly), so no extra query.
  const activatedThisMonth = users.filter(u => u.analyses_this_month > 0).length
  const activationPct = totalUsers ? Math.round((activatedThisMonth / totalUsers) * 100) : 0

  const analyses7 = analyses30.filter(a => new Date(a.created_at).getTime() >= windows.since7Ms).length

  // 30-day daily buckets for sparklines (oldest day at index 0, today at days-1)
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

      {nearLimit > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2, cursor: 'pointer' }}
          onClick={() => redirect('list', 'users', undefined, undefined, {
            displayedFilters: { tier: true, 'analyses_this_month@gte': true },
            filter: { tier: 'free', 'analyses_this_month@gte': 2 },
          })}
        >
          {nearLimit} free {nearLimit === 1 ? 'user is' : 'users are'} at 2+ analyses this month — prime upgrade candidates.
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <KpiCard label="Total users"     value={NUM.format(totalUsers)}        sub={`${proUsers} pro · ${totalUsers - proUsers} free`} />
        <KpiCard label="Activation (mo)" value={`${activationPct}%`}            sub={`${activatedThisMonth} of ${totalUsers} ran ≥1 analysis`} accent={activationPct >= 30 ? 'gain' : activationPct > 0 ? 'warn' : undefined} />
        <KpiCard label="Analyses (30d)"  value={NUM.format(totalAnalyses30)}    sub={`${analyses7} in last 7d`} />
        <KpiCard label="Pro conversion"  value={`${proPct}%`}                   sub={`${proUsers} of ${totalUsers}`} accent={proPct > 0 ? 'gain' : undefined} />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TrendCard
          label="New signups"
          total={NUM.format(signups30)}
          sub="last 30 days"
          data={signupsTrend}
          color="#6366f1"
        />
        <TrendCard
          label="Analyses run"
          total={NUM.format(totalAnalyses30)}
          sub="last 30 days"
          data={analysesTrend}
          color="#10b981"
        />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
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
    </Box>
  )
}
