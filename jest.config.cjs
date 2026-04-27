/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json', useESM: false }],
    '^.+\\.js$':   ['ts-jest', { tsconfig: 'tsconfig.jest.json', useESM: false }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(until-async)/)',
  ],
  moduleNameMapper: {
    // Strip .js from relative imports so ts-jest (CJS) resolves the source .ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^msw/browser$': '<rootDir>/node_modules/msw/lib/browser/index.js',
    '^@mswjs/interceptors/ClientRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.cjs',
    '^@mswjs/interceptors/fetch$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/fetch/index.cjs',
    '^@mswjs/interceptors/XMLHttpRequest$': '<rootDir>/node_modules/@mswjs/interceptors/lib/node/interceptors/XMLHttpRequest/index.cjs',
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.ts',
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/src/__mocks__/fileMock.ts',
    // Real lib/supabase.ts uses import.meta.env which ts-jest (CJS) can't parse.
    // Tests get a no-op mock that returns null sessions; production code is unaffected.
    '^.*/lib/supabase$': '<rootDir>/src/__mocks__/supabaseMock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/server/__tests__/**/*.test.ts',
    '<rootDir>/server/**/__tests__/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/engine/valuation/__tests__/**',
    // Pure barrel file — re-exports only, nothing to instrument.
    '!src/engine/valuation/index.ts',
  ],
  // Phase 1.3 ratchet — initial floor is the Phase 0 baseline (re-measured
  // post-fixes with all 14 suites green), lightly rounded down to absorb
  // single-test-file noise. Each later phase ratchets these up.
  // To enforce, run with --coverage; CI is wired in .github/workflows/ci.yml.
  coverageThreshold: {
    global: {
      // Phase 4.3 floor. Coverage measurements run-to-run vary noticeably
      // (flake range observed: 31.5%-36.9% statements) — likely React/RTL
      // effect timing — so the floor is set at the LOWER bound to keep CI
      // green. The load-bearing math guard is the per-file gate on
      // ./src/engine/valuation/**/*.ts (95/80/95/95) below; that file
      // doesn't flake because the math primitives are deterministic.
      statements: 31,
      branches:   31,
      functions:  27,
      lines:      33,
    },
    // Phase 4 hard requirement — the deterministic valuation engine carries
    // the entire trust story for public share pages, so its math is held to
    // 95%+ on statements/lines/functions per file. Branch threshold is 80% —
    // strategies.ts in particular has many `?? null` / optional-chain branches
    // for absent FMP fields, and chasing the last few percentage points means
    // testing impossible-via-wrapper inputs (the math primitives' branches sit
    // at ~95% because they're directly tested by dcf/graham/lynch suites).
    './src/engine/valuation/**/*.ts': {
      statements: 95,
      branches:   80,
      functions:  95,
      lines:      95,
    },
  },
}
