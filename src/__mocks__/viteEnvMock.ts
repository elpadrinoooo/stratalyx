/**
 * Jest mock for src/lib/viteEnv.ts.
 *
 * The real module reads `import.meta.env`, which ts-jest in CommonJS mode
 * can't parse. Tests don't need real env values — every observability
 * module already exposes an `opts` override path or treats undefined as
 * "no-op", which is exactly what we want in unit tests.
 */
export const viteEnv = {
  POSTHOG_KEY:  undefined as string | undefined,
  POSTHOG_HOST: undefined as string | undefined,
  SENTRY_DSN:   undefined as string | undefined,
  MODE:         'test',
  PROD:         false,
}
