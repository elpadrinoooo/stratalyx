import {
  Admin, Resource,
  List, Datagrid, TextField, BooleanField, NumberField, DateField,
  Edit, SimpleForm, TextInput, BooleanInput, SelectInput,
  Show, SimpleShowLayout,
  SearchInput,
} from 'react-admin'
import { HashRouter } from 'react-router-dom'
import { supabaseDataProvider, supabaseAuthProvider } from 'ra-supabase'
import { supabase } from '../lib/supabase'
import { useTheme } from '../hooks/useTheme'
import { stratalyxDarkTheme, stratalyxLightTheme } from './theme'

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

// ── users ────────────────────────────────────────────────────────────────────
const userFilters = [<SearchInput source="email" alwaysOn key="search" />]

const UserList = () => (
  <List filters={userFilters} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="email" />
      <TextField source="tier" />
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
      <SelectInput source="tier" choices={[{ id: 'free', name: 'Free' }, { id: 'pro', name: 'Pro' }]} />
      <BooleanInput source="is_admin" label="Admin" />
    </SimpleForm>
  </Edit>
)

// ── analyses ─────────────────────────────────────────────────────────────────
const analysisFilters = [<SearchInput source="ticker" alwaysOn key="search" />]

const AnalysisList = () => (
  <List filters={analysisFilters} sort={{ field: 'created_at', order: 'DESC' }} perPage={25}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="ticker" />
      <TextField source="investor_id" label="Investor" />
      <TextField source="verdict" />
      <NumberField source="score" />
      <NumberField source="price_at_analysis" label="Price" />
      <DateField source="created_at" showTime />
    </Datagrid>
  </List>
)

const AnalysisShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="ticker" />
      <TextField source="investor_id" />
      <TextField source="verdict" />
      <NumberField source="score" />
      <NumberField source="price_at_analysis" />
      <DateField source="created_at" showTime />
      <TextField source="user_id" label="User ID" />
    </SimpleShowLayout>
  </Show>
)

// ── watchlist ────────────────────────────────────────────────────────────────
const WatchlistList = () => (
  <List sort={{ field: 'created_at', order: 'DESC' }}>
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
      >
        <Resource name="users"     list={UserList}     edit={UserEdit} recordRepresentation="email" />
        <Resource name="analyses"  list={AnalysisList} show={AnalysisShow} recordRepresentation="ticker" />
        <Resource name="watchlist" list={WatchlistList} options={{ label: 'Watchlist' }} />
      </Admin>
    </HashRouter>
  )
}
