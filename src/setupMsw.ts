import { server } from '../msw/server'
import { beforeAll, afterEach, afterAll } from '@jest/globals'

// Allow engine files to construct absolute URLs in Node test environment
process.env['API_BASE'] = 'http://localhost'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
