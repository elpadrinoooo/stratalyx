import { useState } from 'react'
import { useGetList, Title, useRedirect } from 'react-admin'
import {
  Box, Card, CardContent, Typography, Stack, Chip, Divider, LinearProgress,
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

  const analyses7 = analyses30.filter(a => new Date(a.created_at).getTime() >= windows.since7Ms).length

  const recentSignups = [...users]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const topTickers   = topN(analyses30.map(a => a.ticker.toUpperCase()), 5)
  const topInvestors = topN(analyses30.map(a => a.investor_id), 5)

  return (
    <Box>
      <Title title="Dashboard" />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <KpiCard label="Total users"      value={NUM.format(totalUsers)} sub={`${proUsers} pro · ${totalUsers - proUsers} free`} />
        <KpiCard label="Pro conversion"   value={`${proPct}%`}            sub={`${proUsers} of ${totalUsers}`} accent={proPct > 0 ? 'gain' : undefined} />
        <KpiCard label="Analyses (30d)"   value={NUM.format(totalAnalyses30)} sub={`${analyses7} in last 7d`} />
        <KpiCard
          label="Free users near limit"
          value={NUM.format(nearLimit)}
          sub={nearLimit > 0 ? 'upgrade candidates' : 'none'}
          accent={nearLimit > 0 ? 'warn' : undefined}
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
