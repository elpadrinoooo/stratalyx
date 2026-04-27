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
    '<rootDir>/server/__tests__/**/*.test.ts',
    '<rootDir>/server/**/__tests__/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    'server/valuation/**/*.ts',
    '!server/valuation/__tests__/**',
    // Pure barrel file — re-exports only, nothing to instrument.
    '!server/valuation/index.ts',
  ],
  // Phase 1.3 ratchet — initial floor is the Phase 0 baseline (re-measured
  // post-fixes with all 14 suites green), lightly rounded down to absorb
  // single-test-file noise. Each later phase ratchets these up.
  // To enforce, run with --coverage; CI is wired in .github/workflows/ci.yml.
  coverageThreshold: {
    global: {
      // Phase 4 ratchet: was 30/30/26/32 (Phase 1/2 baseline). The valuation
      // module added ~6 pts to statements/lines and ~5 to branches/functions.
      statements: 35,
      branches:   34,
      functions:  28,
      lines:      37,
    },
    // Phase 4 hard requirement — the deterministic valuation engine carries
    // the entire trust story for public share pages, so its math is held to
    // 95%+ on statements/lines/functions per file. Branch threshold is 80% —
    // strategies.ts in particular has many `?? null` / optional-chain branches
    // for absent FMP fields, and chasing the last few percentage points means
    // testing impossible-via-wrapper inputs (the math primitives' branches sit
    // at ~95% because they're directly tested by dcf/graham/lynch suites).
    './server/valuation/**/*.ts': {
      statements: 95,
      branches:   80,
      functions:  95,
      lines:      95,
    },
  },
}
