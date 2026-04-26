import '@testing-library/jest-dom'
// Extend @jest/globals expect with jest-dom matchers
import '@testing-library/jest-dom/jest-globals'

// Stub global fetch so hooks that call fetch() in tests fail gracefully
// (hooks must fall back to static data when fetch is unavailable)
global.fetch = jest.fn().mockRejectedValue(new Error('fetch not available in tests'))

// jsdom is missing browser APIs that recharts/react-admin rely on. Stub them.
class ResizeObserverStub {
  observe()    {}
  unobserve()  {}
  disconnect() {}
}
;(global as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
