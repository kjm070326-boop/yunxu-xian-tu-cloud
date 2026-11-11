import { api } from '../src/api';

describe('api envelope handling', () => {
  afterEach(() => vi.restoreAllMocks());
  it('returns typed data from the envelope', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { save: { version: 4 } }, meta: { version: 4 }, error: null }), { status: 200, headers: { 'Content-Type': 'application/json' } }))); const result = await api.getState(); expect(result.data.save.version).toBe(4); });
  it('maps server errors to readable Chinese messages', async () => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: null, meta: {}, error: { code: 'VERSION_CONFLICT', message: 'raw', retryable: true } }), { status: 409, headers: { 'Content-Type': 'application/json' } }))); await expect(api.getState()).rejects.toThrow('存档已更新'); });
});
