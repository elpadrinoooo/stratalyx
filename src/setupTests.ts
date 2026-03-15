import '@testing-library/jest-dom'
// Extend @jest/globals expect with jest-dom matchers
import '@testing-library/jest-dom/jest-globals'

// Stub global fetch so hooks that call fetch() in tests fail gracefully
// (hooks must fall back to static data when fetch is unavailable)
global.fetch = jest.fn().mockRejectedValue(new Error('fetch not available in tests'))
