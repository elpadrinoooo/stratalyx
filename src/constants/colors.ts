/** Design token object — all colours resolve via CSS custom properties.
 *  Never hardcode hex values in components; always use tokens from here. */
export const C = {
  // Backgrounds — 4 levels of depth
  bg0: 'var(--c-bg0)',
  bg1: 'var(--c-bg1)',
  bg2: 'var(--c-bg2)',
  bg3: 'var(--c-bg3)',

  // Borders
  border:      'var(--c-border)',
  border44:    'var(--c-border-44)',  // border at ~27 % opacity
  border88:    'var(--c-border-88)',  // border at ~53 % opacity

  // Accent — indigo
  accent:  'var(--c-accent)',
  accentM: 'var(--c-accentM)',
  accentB: 'var(--c-accentB)',

  // Semantic — gain (green)
  gain:   'var(--c-gain)',
  gainBg: 'var(--c-gainBg)',
  gainB:  'var(--c-gainB)',

  // Semantic — loss (red)
  loss:   'var(--c-loss)',
  lossBg: 'var(--c-lossBg)',
  lossB:  'var(--c-lossB)',

  // Semantic — warning (amber)
  warn:   'var(--c-warn)',
  warnBg: 'var(--c-warnBg)',
  warnB:  'var(--c-warnB)',

  // Text — 4 levels of hierarchy
  t1: 'var(--c-t1)',
  t2: 'var(--c-t2)',
  t3: 'var(--c-t3)',
  t4: 'var(--c-t4)',

  // Typography (not theme-dependent)
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
