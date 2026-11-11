import { LocalNarrator, NarrationInputSchema, NarrationResultSchema, QUALITY_PROMPT, type NarrationInput, type Narrator, type NarrationResult } from './adapter.js';

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
type ChatPayload = { choices?: Array<{ message?: { content?: unknown } }> };

const stripFence = (value: string) => value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
const cleanNumbers = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(/[0-9０-９]+/g, '').replace(/\s+/g, ' ').trim();
  if (Array.isArray(value)) return value.map(cleanNumbers);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cleanNumbers(child)]));
  return value;
};

export class DeepseekNarrator implements Narrator {
  private readonly model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

  private async fallback(input: NarrationInput, reason: string): Promise<NarrationResult> {
    console.warn(`[DeepseekNarrator] fallback: ${reason}`);
    return new LocalNarrator().narrate(input);
  }

  async narrate(raw: NarrationInput): Promise<NarrationResult> {
    let input: NarrationInput;
    try { input = NarrationInputSchema.parse(raw); } catch { return this.fallback(raw, 'invalid input'); }
    try {
      const length = input.tier === 'main' ? '主线六百五十至九百字' : '日常三百至四百二十字';
      const prompt = `${QUALITY_PROMPT}\n请用第一人称现代爽文写作，正文长度为${length}。不要在正文或 JSON 字段中出现数字。建议随正文一并下发。\n输入：${JSON.stringify(input)}`;
      const response = await fetch(API_URL, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }, signal: AbortSignal.timeout(30000), body: JSON.stringify({ model: this.model, temperature: 0.8, messages: [{ role: 'system', content: '你是云墟仙途的叙事引擎，只输出符合要求的 JSON。' }, { role: 'user', content: prompt }] }) });
      if (!response.ok) return this.fallback(input, `request failed (${response.status})`);
      const payload = await response.json() as ChatPayload;
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) return this.fallback(input, 'empty response');
      let parsed: unknown;
      try { parsed = JSON.parse(stripFence(content)); } catch { return this.fallback(input, 'json parse failed'); }
      try { return NarrationResultSchema.parse(cleanNumbers(parsed)); } catch { return this.fallback(input, 'schema validation failed'); }
    } catch { return this.fallback(input, 'request failed'); }
  }
}
