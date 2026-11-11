import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeepseekNarrator } from '../../src/server/narration/deepseek.js';

const input = { passages: ['旧事'], chapter: '第一章', situation: '山门前', chatContext: [], previousBatch: [], tier: 'routine' as const };
const valid = { title: '标题', body: '你在山门前听见风声', suggestions: ['去看看线索', '问问来人', '先静一静'], replies: ['你想说什么？', '我听着呢', '继续说吧'], style: 'modern-first-person' };

afterEach(() => { vi.restoreAllMocks(); delete process.env.DEEPSEEK_API_KEY; });

describe('DeepseekNarrator', () => {
  it('清洗中英文数字和多余空格后通过 schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...valid, body: '你在  第１２３  山门前' }) } }] }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const result = await new DeepseekNarrator().narrate(input);
    expect(result.body).toBe('你在 第 山门前');
    expect(JSON.stringify(result)).not.toMatch(/[0-9０-９]/);
  });

  it.each([
    ['非法 JSON', { choices: [{ message: { content: '不是 JSON' } }] }, 200],
    ['请求失败', {}, 503],
  ])('%s 时回退本地叙事且不抛错', async (_name, payload, status) => {
    const key = 'fake-deepseek-key';
    process.env.DEEPSEEK_API_KEY = key;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status })));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const result = await new DeepseekNarrator().narrate(input);
    expect(result).toHaveProperty('title');
    expect(warn.mock.calls.flat().join(' ')).not.toContain(key);
  });
});
