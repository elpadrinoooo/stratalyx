/**
 * Thin accessor for `import.meta.env`. Exists ONLY because ts-jest runs
 * CommonJS and rejects `import.meta` at parse time (TS1343) — see the
 * `lib/supabase` moduleNameMapper entry in jest.config.cjs for the same
 * pattern. Tests mock this whole module; production reads Vite's inlined
 * env vars normally.
 */

export const viteEnv = {
  POSTHOG_KEY:  import.meta.env['VITE_POSTHOG_KEY']  as string | undefined,
  POSTHOG_HOST: import.meta.env['VITE_POSTHOG_HOST'] as string | undefined,
  SENTRY_DSN:   import.meta.env['VITE_SENTRY_DSN']   as string | undefined,
  MODE:         import.meta.env.MODE,
  PROD:         import.meta.env.PROD,
}
