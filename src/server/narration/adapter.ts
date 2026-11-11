import { z } from 'zod';

export const NarrationInputSchema = z.object({
  passages: z.array(z.string().max(1200)).max(3),
  chapter: z.string().max(200),
  situation: z.string().max(500),
  npcPersona: z.string().max(500).optional(),
  chatContext: z.array(z.string().max(500)).max(20).default([]),
  previousBatch: z.array(z.string().max(300)).max(8).default([]),
  tier: z.enum(['routine','main']).default('routine'),
});
export type NarrationInput = z.infer<typeof NarrationInputSchema>;
export const NarrationResultSchema = z.object({
  title: z.string().min(1).max(120), body: z.string().min(1),
  suggestions: z.array(z.string().min(1)).length(3),
  replies: z.array(z.string().min(1)).min(3).max(4), style: z.string().min(1).max(80),
}).superRefine((value, ctx) => { if (/\d/.test(JSON.stringify(value))) ctx.addIssue({ code:'custom', message:'narration must not contain numbers' }); });
export type NarrationResult = z.infer<typeof NarrationResultSchema>;
export interface Narrator { narrate(input: NarrationInput): Promise<NarrationResult>; }
export const QUALITY_PROMPT = `建议要像朋友在耳边出主意：混着行动、想说的话和心情念头；长短错开；至少点出结尾里的两个具体人或物；把上一批建议也带上，避免重复。聊天回复要用真实聊天的语气，可以是简短的反问，咬住对方原话但不重复它，别说客套空话。叙事按要求的字数档写，文中不要出现数字。`;
const sanitize = (input: NarrationInput): NarrationInput => NarrationInputSchema.parse({ ...input, passages: input.passages.slice(-3), chatContext: input.chatContext.slice(-20), previousBatch: input.previousBatch.slice(-8) });
const noDigits = (s:string) => s.replace(/[0-9０-９]+/g, '').replace(/  +/g,' ').trim();
export class LocalNarrator implements Narrator {
  async narrate(raw: NarrationInput): Promise<NarrationResult> {
    const input = sanitize(raw); const ending = input.passages.at(-1) ?? input.situation;
    const names = [...new Set((ending.match(/[\u4e00-\u9fff]{2,6}/g) ?? []).slice(-4))];
    const a = names[0] ?? '山门'; const b = names[1] ?? '旧剑';
    const long = input.tier === 'main';
    const body = noDigits(long ? `风从${a}与${b}之间穿过，旧事没有散去，反而在眼前聚成一条清晰的路。${input.situation} 你握住仍有余温的线索，先听见自己的心，再决定把脚步交给谁。${input.chapter} 的门正在雾里打开。` : `${input.situation} ${input.chapter} 的风掠过${a}，你把目光落在${b}上，心里有了答案。`);
    const result = { title: noDigits(`${input.chapter}·余波`), body, suggestions: [noDigits(`去看看${a}留下的线索`), noDigits(`把话说给${b}听`), noDigits('先安静片刻，感受心里的方向')], replies: [noDigits('你刚才那句话，究竟想让我听见什么？'), noDigits(`我记住了${a}，但还想知道你的打算。`), noDigits('你愿意把这一步交给我吗？'), noDigits('别绕开，直接告诉我。')], style:'modern-first-person' };
    return NarrationResultSchema.parse(result);
  }
}
export async function narrateWithRetry(narrator: Narrator, input: NarrationInput, retries = 1): Promise<NarrationResult> { let last: unknown; for (let i=0;i<=retries;i++) try { return NarrationResultSchema.parse(await narrator.narrate(NarrationInputSchema.parse(input))); } catch (e) { last=e; } throw last; }
