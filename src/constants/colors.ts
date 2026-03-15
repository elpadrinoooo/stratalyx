/** Design token object — all colours in the app come from here. Never hardcode hex in components. */
export const C = {
  // Backgrounds — 4 levels of depth
  bg0: '#07080c',   // page background
  bg1: '#0d0f16',   // card / panel background
  bg2: '#12151f',   // inset / secondary panel
  bg3: '#181c27',   // tertiary inset / pill background

  // Borders
  border: '#232840',

  // Accent — indigo
  accent:  '#6366f1',
  accentM: 'rgba(99,102,241,.12)',   // accent background tint
  accentB: 'rgba(99,102,241,.28)',   // accent border

  // Semantic — gain (green)
  gain:   '#10b981',
  gainBg: 'rgba(16,185,129,.08)',
  gainB:  'rgba(16,185,129,.25)',

  // Semantic — loss (red)
  loss:   '#ef4444',
  lossBg: 'rgba(239,68,68,.08)',
  lossB:  'rgba(239,68,68,.25)',

  // Semantic — warning (amber)
  warn:   '#f59e0b',
  warnBg: 'rgba(245,158,11,.08)',
  warnB:  'rgba(245,158,11,.25)',

  // Text — 4 levels of hierarchy
  t1: '#f0f2f8',   // primary text
  t2: '#9ba3be',   // secondary text
  t3: '#5a6280',   // tertiary / label text
  t4: '#2e3554',   // muted / disabled text

  // Typography
  sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
  mono: "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace",
} as const

/** Border radius scale — use these exact values, never arbitrary ones. */
export const R = {
  r4:  4,
  r6:  6,
  r8:  8,
  r10: 10,
  r12: 12,
  r16: 16,
  r99: 999,  // pill / fully rounded
} as const

export type ColorToken = keyof typeof C
