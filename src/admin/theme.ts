import { defaultTheme } from 'react-admin'
import type { RaThemeOptions } from 'react-admin'

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif"

// Hex values mirror src/index.css tokens. Kept in sync manually because
// react-admin's MUI engine resolves colors at theme-build time and won't
// re-read CSS custom properties when the host app toggles light/dark.

const dark = {
  bg0: '#07080c', bg1: '#0d0f16', bg2: '#12151f', bg3: '#181c27',
  border: '#232840',
  accent: '#6366f1', accentHover: '#818cf8',
  gain: '#10b981', loss: '#ef4444', warn: '#f59e0b',
  t1: '#f0f2f8', t2: '#9ba3be', t3: '#5a6280',
}

const light = {
  bg0: '#f4f6fc', bg1: '#ffffff', bg2: '#eef0f9', bg3: '#e4e7f5',
  border: '#c8cde5',
  accent: '#4f46e5', accentHover: '#6366f1',
  gain: '#059669', loss: '#dc2626', warn: '#d97706',
  t1: '#0f172a', t2: '#374151', t3: '#6b7280',
}

function makeTheme(p: typeof dark, mode: 'dark' | 'light'): RaThemeOptions {
  return {
    ...defaultTheme,
    palette: {
      mode,
      primary:    { main: p.accent, dark: p.accent, light: p.accentHover, contrastText: '#ffffff' },
      secondary:  { main: p.accent, contrastText: '#ffffff' },
      background: { default: p.bg0, paper: p.bg1 },
      text:       { primary: p.t1, secondary: p.t2, disabled: p.t3 },
      divider:    p.border,
      success:    { main: p.gain },
      error:      { main: p.loss },
      warning:    { main: p.warn },
    },
    typography: {
      fontFamily: SANS,
      h1: { fontFamily: SANS, fontWeight: 700 },
      h2: { fontFamily: SANS, fontWeight: 700 },
      h3: { fontFamily: SANS, fontWeight: 700 },
      h4: { fontFamily: SANS, fontWeight: 700 },
      h5: { fontFamily: SANS, fontWeight: 600 },
      h6: { fontFamily: SANS, fontWeight: 600 },
      button: { fontFamily: SANS, fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 8 },
    components: {
      ...defaultTheme.components,
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: p.bg1,
            color: p.t1,
            borderBottom: `1px solid ${p.border}`,
            boxShadow: 'none',
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: p.bg1,
            borderRight: `1px solid ${p.border}`,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', borderRadius: 12 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            background: p.bg1,
            border: `1px solid ${p.border}`,
            borderRadius: 12,
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
          containedPrimary: {
            background: p.accent,
            '&:hover': { background: p.accentHover },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${p.border}` },
          head: { background: p.bg2, color: p.t2, fontWeight: 600 },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': { background: `${p.accent}14` },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            background: p.bg2,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: p.border },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: p.accent },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: p.accent },
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            background: p.bg2,
            '&:hover': { background: p.bg3 },
            '&.Mui-focused': { background: p.bg2 },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: p.bg3,
            color: p.t1,
            border: `1px solid ${p.border}`,
            fontSize: 12,
          },
        },
      },
    },
  }
}

export const stratalyxDarkTheme  = makeTheme(dark,  'dark')
export const stratalyxLightTheme = makeTheme(light, 'light')
