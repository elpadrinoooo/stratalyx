import {
  Admin, Resource,
  List, Datagrid, TextField, BooleanField, NumberField, DateField,
  Edit, SimpleForm, TextInput, BooleanInput, SelectInput, NumberInput, DateInput,
  Show, SimpleShowLayout, ReferenceManyField,
  SearchInput, FilterButton, FunctionField,
  TopToolbar, ExportButton,
  BulkUpdateButton, BulkDeleteButton,
  useRecordContext,
} from 'react-admin'
import { HashRouter } from 'react-router-dom'
import { supabaseDataProvider, supabaseAuthProvider } from 'ra-supabase'
import { Box, Chip, Typography } from '@mui/material'
import { supabase } from '../lib/supabase'
import { useTheme } from '../hooks/useTheme'
import { stratalyxDarkTheme, stratalyxLightTheme } from './theme'
import { Dashboard } from './Dashboard'

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
      >
        <Resource name="users"     list={UserList}     edit={UserEdit} show={UserShow} recordRepresentation="email" />
        <Resource name="analyses"  list={AnalysisList} show={AnalysisShow} recordRepresentation="ticker" />
        <Resource name="watchlist" list={WatchlistList} options={{ label: 'Watchlist' }} />
      </Admin>
    </HashRouter>
  )
}
