import { useState } from 'react'
import {
  Admin, Resource, CustomRoutes,
  List, Datagrid, TextField, BooleanField, NumberField, DateField,
  Edit, SimpleForm, TextInput, BooleanInput, SelectInput, NumberInput, DateInput,
  Show, SimpleShowLayout, ReferenceManyField,
  SearchInput, FilterButton, FunctionField,
  TopToolbar, ExportButton,
  BulkUpdateButton, BulkDeleteButton,
  useRecordContext, useGetManyReference,
  Layout, Menu,
  type LayoutProps,
} from 'react-admin'
import { HashRouter, Route } from 'react-router-dom'
import { supabaseDataProvider, supabaseAuthProvider } from 'ra-supabase'
import { Box, Card, CardContent, Chip, Typography } from '@mui/material'
import { Sparkles, Settings as SettingsIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../hooks/useTheme'
import { stratalyxDarkTheme, stratalyxLightTheme } from './theme'
import { Dashboard } from './Dashboard'
import { LlmConfigScreen } from './LlmConfigScreen'

const SUPABASE_URL  = import.meta.env['VITE_SUPABASE_URL']      as string
const SUPABASE_ANON = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string

const dataProvider = supabaseDataProvider({
  instanceUrl: SUPABASE_URL,
  apiKey: SUPABASE_ANON,
  supabaseClient: supabase,
})

const authProvider = supabaseAuthProvider(supabase, {
  getIdentity: async () => {
    const { data } = await supabase.auth.getUser()
    return data.user ? { id: data.user.id, fullName: data.user.email ?? '' } : { id: '' }
  },
})

const TIER_CHOICES = [{ id: 'free', name: 'Free' }, { id: 'pro', name: 'Pro' }]

// ── widgets ──────────────────────────────────────────────────────────────────
interface AnalysisRow { id: string; user_id: string | null; ticker: string; investor_id: string; verdict: string | null; score: number | null; created_at: string }

function bucketByDay(timestamps: string[], days: number, anchor: number): number[] {
  const buckets = new Array(days).fill(0)
  const startMs = anchor - (days - 1) * 86_400_000
  for (const ts of timestamps) {
    const idx = Math.floor((new Date(ts).getTime() - startMs) / 86_400_000)
    if (idx >= 0 && idx < days) buckets[idx]++
  }
  return buckets
}

/** SVG bar chart, no recharts dependency. Days run left→right; today is rightmost. */
function BarChart({ data, color = '#6366f1', height = 64 }: { data: number[]; color?: string; height?: number }) {
  if (data.length === 0) return null
  const w = 560
  const max = Math.max(...data, 1)
  const barW = w / data.length
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      {data.map((v, i) => {
        const h = (v / max) * (height - 4)
        return (
          <rect
            key={i}
            x={i * barW + 1}
            y={height - h - 2}
            width={Math.max(0, barW - 2)}
            height={h}
            fill={color}
            opacity={v === 0 ? 0.2 : 0.85}
            rx={1}
          />
        )
      })}
    </svg>
  )
}

/** Daily-volume chart shown above the Analyses list. */
function DailyVolumeChart() {
  // Pin "now" once — date math should not re-run on render.
  const [anchor] = useState(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t.getTime() + 86_400_000  // tomorrow midnight = today's bucket includes everything up to now
  })
  const since = new Date(anchor - 30 * 86_400_000).toISOString()

  // useGetList fetches via the admin's data provider, same as the lists below.
  const { data: rows = [], isLoading } = useGetList<AnalysisRow>('analyses', {
    pagination: { page: 1, perPage: 1000 },
    sort: { field: 'created_at', order: 'DESC' },
    filter: { 'created_at@gte': since },
  })

  const buckets = bucketByDay(rows.map(r => r.created_at), 30, anchor)
  const total = buckets.reduce((s, n) => s + n, 0)
  const todayBucket = buckets[buckets.length - 1]

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Daily volume — last 30 days
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1, fontFamily: 'monospace' }}>{total}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {isLoading ? 'loading…' : `${todayBucket} today`}
            </Typography>
          </Box>
        </Box>
        <BarChart data={buckets} />
      </CardContent>
    </Card>
  )
}

/** Per-user weekly analysis cadence — shown on the User detail screen. */
function UserRetentionChart() {
  const r = useRecordContext<{ id: string; created_at?: string }>()
  const { data = [], isLoading } = useGetManyReference<AnalysisRow>('analyses', {
    target: 'user_id',
    id: r?.id ?? '',
    pagination: { page: 1, perPage: 500 },
    sort: { field: 'created_at', order: 'ASC' },
  })

  if (!r) return null
  if (isLoading) return <Typography variant="caption" sx={{ color: 'text.secondary' }}>Loading retention…</Typography>
  if (data.length === 0) return <Typography variant="body2" sx={{ color: 'text.secondary' }}>No analyses yet — nothing to plot.</Typography>

  const signupMs = r.created_at ? new Date(r.created_at).getTime() : new Date(data[0].created_at).getTime()
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
  const totalWeeks = Math.max(1, Math.ceil((todayMidnight.getTime() - signupMs) / (7 * 86_400_000)))
  const cap = Math.min(totalWeeks, 26)  // cap at 6 months for a sane chart width

  const weekly = new Array(cap).fill(0)
  for (const a of data) {
    const wk = Math.floor((new Date(a.created_at).getTime() - signupMs) / (7 * 86_400_000))
    if (wk >= 0 && wk < cap) weekly[wk]++
  }
  const max = Math.max(...weekly, 1)
  const w = 560
  const h = 56
  const step = cap > 1 ? w / (cap - 1) : 0
  const pts = weekly.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(' ')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {data.length} analyses across {totalWeeks} {totalWeeks === 1 ? 'week' : 'weeks'} since signup
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          peak {max}/wk
        </Typography>
      </Box>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }}>
        <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {weekly.map((v, i) => v > 0 && (
          <circle key={i} cx={i * step} cy={h - (v / max) * (h - 4) - 2} r={2.2} fill="#6366f1" />
        ))}
      </svg>
    </Box>
  )
}

// ── users ────────────────────────────────────────────────────────────────────
const userFilters = [
  <SearchInput source="email@ilike" alwaysOn key="search" placeholder="Search email" />,
  <SelectInput source="tier" choices={TIER_CHOICES} key="tier" />,
  <BooleanInput source="is_admin" label="Admin only" key="admin" />,
  <NumberInput source="analyses_this_month@gte" label="Analyses ≥" key="usage" />,
]

const TierChip = () => {
  const r = useRecordContext<{ tier: 'free' | 'pro' }>()
  if (!r) return null
  return <Chip size="small" label={r.tier} color={r.tier === 'pro' ? 'primary' : 'default'} />
}

const UserBulkActions = () => (
  <>
    <BulkUpdateButton label="Upgrade to Pro" data={{ tier: 'pro' }} mutationMode="optimistic" />
    <BulkUpdateButton label="Downgrade to Free" data={{ tier: 'free' }} mutationMode="optimistic" />
    <BulkUpdateButton label="Reset count" data={{ analyses_this_month: 0 }} mutationMode="optimistic" />
    <BulkDeleteButton mutationMode="pessimistic" />
  </>
)

const UserListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
)

const UserList = () => (
  <List
    filters={userFilters}
    actions={<UserListActions />}
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid rowClick="show" bulkActionButtons={<UserBulkActions />}>
      <TextField source="email" />
      <FunctionField label="Tier" render={() => <TierChip />} />
      <NumberField source="analyses_this_month" label="Analyses (mo)" />
      <BooleanField source="is_admin" label="Admin" />
      <DateField source="created_at" showTime />
    </Datagrid>
  </List>
)

const UserEdit = () => (
  <Edit mutationMode="pessimistic">
    <SimpleForm>
      <TextInput source="email" disabled />
      <SelectInput source="tier" choices={TIER_CHOICES} />
      <BooleanInput source="is_admin" label="Admin" />
      <NumberInput source="analyses_this_month" label="Analyses this month (manual reset)" />
    </SimpleForm>
  </Edit>
)

const UserShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="email" />
      <FunctionField label="Tier" render={() => <TierChip />} />
      <NumberField source="analyses_this_month" label="Analyses this month" />
      <DateField source="analyses_reset_at" label="Resets at" showTime />
      <BooleanField source="is_admin" label="Admin" />
      <DateField source="created_at" showTime />
      <TextField source="id" label="User ID" />

      <Box sx={{ mt: 3 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Weekly cadence since signup
        </Typography>
        <Box sx={{ mt: 1 }}>
          <UserRetentionChart />
        </Box>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Recent analyses
        </Typography>
        <ReferenceManyField
          reference="analyses"
          target="user_id"
          sort={{ field: 'created_at', order: 'DESC' }}
          perPage={10}
        >
          <Datagrid rowClick="show" bulkActionButtons={false}>
            <TextField source="ticker" />
            <TextField source="investor_id" label="Investor" />
            <TextField source="verdict" />
            <NumberField source="score" />
            <DateField source="created_at" showTime />
          </Datagrid>
        </ReferenceManyField>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Watchlist
        </Typography>
        <ReferenceManyField
          reference="watchlist"
          target="user_id"
          sort={{ field: 'created_at', order: 'DESC' }}
          perPage={25}
        >
          <Datagrid bulkActionButtons={false}>
            <TextField source="ticker" />
            <DateField source="created_at" showTime />
          </Datagrid>
        </ReferenceManyField>
      </Box>
    </SimpleShowLayout>
  </Show>
)

// ── analyses ─────────────────────────────────────────────────────────────────
const VERDICT_CHOICES = [
  { id: 'BUY',  name: 'Buy' },
  { id: 'HOLD', name: 'Hold' },
  { id: 'SELL', name: 'Sell' },
  { id: 'PASS', name: 'Pass' },
]

const analysisFilters = [
  <SearchInput source="ticker@ilike" alwaysOn key="search" placeholder="Search ticker" />,
  <TextInput source="investor_id" label="Investor" key="investor" />,
  <SelectInput source="verdict" choices={VERDICT_CHOICES} key="verdict" />,
  <NumberInput source="score@gte" label="Score ≥" key="scoreMin" />,
  <NumberInput source="score@lte" label="Score ≤" key="scoreMax" />,
  <DateInput source="created_at@gte" label="From" key="from" />,
  <DateInput source="created_at@lte" label="To" key="to" />,
]

const VerdictChip = () => {
  const r = useRecordContext<{ verdict?: string | null }>()
  if (!r?.verdict) return null
  const v = r.verdict.toUpperCase()
  const color: 'success' | 'warning' | 'error' | 'default' =
    v === 'BUY' ? 'success' : v === 'SELL' ? 'error' : v === 'HOLD' ? 'warning' : 'default'
  return <Chip size="small" label={v} color={color} variant="outlined" />
}

const ScoreCell = () => {
  const r = useRecordContext<{ score?: number | null }>()
  if (r?.score == null) return <span style={{ opacity: 0.5 }}>—</span>
  const color = r.score >= 70 ? '#10b981' : r.score >= 40 ? '#f59e0b' : '#ef4444'
  return <span style={{ color, fontWeight: 600 }}>{r.score}</span>
}

const AnalysisListActions = () => (
  <TopToolbar>
    <FilterButton />
    <ExportButton />
  </TopToolbar>
)

const AnalysisList = () => (
  <>
    <DailyVolumeChart />
    <List
      filters={analysisFilters}
      actions={<AnalysisListActions />}
      sort={{ field: 'created_at', order: 'DESC' }}
      perPage={25}
    >
      <Datagrid rowClick="show" bulkActionButtons={false}>
        <TextField source="ticker" />
        <TextField source="investor_id" label="Investor" />
        <FunctionField label="Verdict" render={() => <VerdictChip />} />
        <FunctionField label="Score" render={() => <ScoreCell />} />
        <NumberField source="price_at_analysis" label="Price" />
        <DateField source="created_at" showTime />
      </Datagrid>
    </List>
  </>
)

const ResultViewer = () => {
  const r = useRecordContext<{ result?: unknown }>()
  if (!r?.result) return <Typography variant="body2" color="text.secondary">No result payload.</Typography>
  const json = JSON.stringify(r.result, null, 2)
  return (
    <Box
      component="pre"
      sx={{
        m: 0, p: 2, mt: 0.5,
        background: 'var(--c-bg2, #12151f)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        fontFamily: "'SFMono-Regular',Consolas,monospace",
        fontSize: 12,
        lineHeight: 1.5,
        overflow: 'auto',
        maxHeight: 480,
      }}
    >
      {json}
    </Box>
  )
}

const AnalysisShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="ticker" />
      <TextField source="investor_id" label="Investor" />
      <FunctionField label="Verdict" render={() => <VerdictChip />} />
      <FunctionField label="Score" render={() => <ScoreCell />} />
      <NumberField source="price_at_analysis" label="Price at analysis" />
      <DateField source="created_at" showTime />
      <TextField source="user_id" label="User ID" />
      <Box sx={{ mt: 2 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          Result payload
        </Typography>
        <FunctionField render={() => <ResultViewer />} />
      </Box>
    </SimpleShowLayout>
  </Show>
)

// ── watchlist ────────────────────────────────────────────────────────────────
const watchlistFilters = [
  <SearchInput source="ticker@ilike" alwaysOn key="search" placeholder="Search ticker" />,
]

const WatchlistList = () => (
  <List
    filters={watchlistFilters}
    sort={{ field: 'created_at', order: 'DESC' }}
    perPage={25}
  >
    <Datagrid bulkActionButtons={false}>
      <TextField source="ticker" />
      <TextField source="user_id" label="User ID" />
      <DateField source="created_at" showTime />
    </Datagrid>
  </List>
)

// ── settings ────────────────────────────────────────────────────────────────
// Runtime config. Edits land immediately in Postgres; the server picks them up
// within 60s thanks to the in-process settings cache.

const SETTING_TYPE_CHOICES = [
  { id: 'number',  name: 'Number'  },
  { id: 'string',  name: 'String'  },
  { id: 'boolean', name: 'Boolean' },
  { id: 'json',    name: 'JSON'    },
]

const SettingValueCell = () => {
  const r = useRecordContext<{ value: unknown; type: string }>()
  if (!r) return null
  const v = typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value)
  return <Box component="code" sx={{ fontFamily: 'monospace', fontSize: 12, color: 'primary.main' }}>{v}</Box>
}

const SettingsList = () => (
  <List sort={{ field: 'key', order: 'ASC' }} perPage={50} actions={<TopToolbar><ExportButton /></TopToolbar>}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="key" />
      <FunctionField label="Value" render={() => <SettingValueCell />} />
      <TextField source="type" />
      <TextField source="description" />
      <DateField source="updated_at" showTime />
    </Datagrid>
  </List>
)

const SettingsEdit = () => (
  <Edit mutationMode="pessimistic">
    <SimpleForm>
      <TextInput source="key" disabled fullWidth helperText="Setting key — read by the server. Don't rename." />
      <TextInput source="value" fullWidth helperText="Stored as JSON. For numbers/booleans, just type the literal (25, true). For strings, wrap in quotes." />
      <SelectInput source="type" choices={SETTING_TYPE_CHOICES} />
      <TextInput source="description" fullWidth multiline />
    </SimpleForm>
  </Edit>
)

// ── custom sidebar menu — auto-generated entries plus a link to /llm-config ─
const AdminMenu = () => (
  <Menu>
    <Menu.DashboardItem />
    <Menu.ResourceItem name="users" />
    <Menu.ResourceItem name="analyses" />
    <Menu.ResourceItem name="watchlist" />
    <Menu.Item
      to="/llm-config"
      primaryText="LLM models"
      leftIcon={<Sparkles size={18} />}
    />
    <Menu.ResourceItem name="app_settings" />
  </Menu>
)
const AdminLayout = (props: LayoutProps) => <Layout {...props} menu={AdminMenu} />

// ── shell ────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  // HashRouter keeps react-admin's URLs (#/users, #/analyses) isolated from the
  // host app's location, so navigating in the admin panel doesn't disturb the
  // Stratalyx screen state or interfere with the share-link parser.
  const { resolved } = useTheme()
  const theme = resolved === 'light' ? stratalyxLightTheme : stratalyxDarkTheme
  return (
    <HashRouter>
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        requireAuth
        title="Stratalyx Admin"
        theme={theme}
        dashboard={Dashboard}
        layout={AdminLayout}
      >
        <Resource name="users"     list={UserList}     edit={UserEdit} show={UserShow} recordRepresentation="email" />
        <Resource name="analyses"  list={AnalysisList} show={AnalysisShow} recordRepresentation="ticker" />
        <Resource name="watchlist" list={WatchlistList} options={{ label: 'Watchlist' }} />
        <Resource name="app_settings" list={SettingsList} edit={SettingsEdit} options={{ label: 'Settings' }} recordRepresentation="key" icon={SettingsIcon} />
        <CustomRoutes>
          <Route path="/llm-config" element={<LlmConfigScreen />} />
        </CustomRoutes>
      </Admin>
    </HashRouter>
  )
}
