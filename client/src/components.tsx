import { useEffect, useState } from 'react';
import type { ChapterPanel, Goal, StoryPassage } from './api';

export function Typewriter({ text, duration = 2200 }: { text: string; duration?: number }) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setShown(''); setDone(false);
    if (!text) { setDone(true); return undefined; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(text); setDone(true); return undefined; }
    const start = performance.now(); let frame = 0;
    const tick = (now: number) => { const ratio = Math.min(1, (now - start) / duration); setShown(text.slice(0, Math.ceil(text.length * ratio))); if (ratio < 1) frame = requestAnimationFrame(tick); else setDone(true); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [text, duration]);
  return <div className="typewriter"><p>{shown}</p>{!done && <button className="link-button" onClick={() => { setShown(text); setDone(true); }}>立即显示全文</button>}</div>;
}

export function ChapterPanel({ panel, onAdvance, loading = false }: { panel?: ChapterPanel; onAdvance?: () => void; loading?: boolean }) {
  const gates = panel?.gates ?? []; const progress = panel?.progress ?? 0; const required = panel?.required ?? 3;
  const canAdvance = gates.every((gate) => gate.met !== false) && progress >= required;
  return <section className="chapter-panel" aria-label="本章历练"><div className="section-heading"><div><span className="eyebrow">第 {panel?.chapter ?? 1} 章</span><h2>本章历练</h2></div><strong>{progress}/{required}</strong></div><div className="gate-list">{gates.length ? gates.map((gate, index) => <div className={`gate ${gate.met ? 'met' : ''}`} key={`${gate.label}-${index}`}><span>{gate.met ? '✓' : '✗'}</span><span>{gate.label ?? '章节门槛'}</span>{!gate.met && <small>{Array.isArray(gate.missing) ? gate.missing.join('、') : gate.missing ?? '还需完成'}</small>}</div>) : <div className="gate met"><span>✓</span><span>完成本章三次历练即可推进</span></div>}</div><button className="primary-button" disabled={!canAdvance || loading} onClick={onAdvance}>{loading ? '推进中…' : canAdvance ? '推进章节' : '完成历练后解锁'}</button></section>;
}

export function GoalBar({ goal, current = 0, target = 100, label = '本章目标', onClaim }: { goal?: Goal | null; current?: number; target?: number; label?: string; onClaim?: () => void }) {
  const actualCurrent = goal?.progress ?? current; const actualTarget = goal?.target ?? target; const actualLabel = goal?.name ?? label; const value = Math.min(100, Math.round((actualCurrent / Math.max(1, actualTarget)) * 100));
  return <div className="goal"><div className="goal-label"><span>{actualLabel}</span><b>{actualCurrent}/{actualTarget}</b></div><div className="progress-track"><div className="progress-fill" style={{ width: `${value}%` }} /></div>{goal && actualCurrent >= actualTarget && !goal.claimed && <button className="link-button" onClick={onClaim}>领取 +20 修为 / +25 灵石</button>}</div>;
}

export function StoryCard({ passage }: { passage: StoryPassage }) { return <article className="story-card story-card-feature"><span className="eyebrow">最新故事</span><h2>{passage.title ?? '新的篇章'}</h2><Typewriter text={passage.body ?? ''} /></article>; }

export function StatusCard({ save, nextLayerGap, realmLayer }: { save: Record<string, unknown>; nextLayerGap?: number; realmLayer?: number }) {
  const realm = `${save.realm ?? save.realmIndex ?? 0}境·${realmLayer ?? save.layer ?? save.realmLayer ?? 1}层`; const energy = Number(save.energy ?? 0); const max = Number(save.maxEnergy ?? 4); const cultivation = Number(save.cultivation ?? 0); const next = Math.max(1, cultivation + Number(nextLayerGap ?? 100)); const progress = Math.max(0, Math.min(100, Math.round((cultivation / next) * 100)));
  return <section className="status-card status-hero"><div className="corner corner-tl"/><div className="corner corner-tr"/><div className="corner corner-bl"/><div className="corner corner-br"/><div className="status-main"><span className="eyebrow">当前境界</span><strong>{realm}</strong><div className="cultivation-line"><span>修为进度</span><b>{cultivation}</b></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><small>距下一层还差 {nextLayerGap ?? 0} 修为</small></div><div className="stats"><span><i>✦</i> 精力 <b>{energy}/{max}</b></span><span><i>◇</i> 灵石 <b className="gold-text">{save.spiritStones ?? save.stones ?? 0}</b></span><span><i>⚔</i> 战力 <b>{save.power ?? 0}</b></span><span><i>♥</i> 气血 <b>{save.hp ?? 0}/{save.maxHp ?? 0}</b></span></div></section>;
}

export function FreeAction({ suggestions, onAction, onRefresh, loading }: { suggestions: string[]; onAction: (value: string) => void; onRefresh: () => void; loading?: boolean }) {
  const [input, setInput] = useState(''); const submit = (value: string) => { if (value.trim()) { onAction(value.trim()); setInput(''); } };
  return <section className="free-action"><div className="section-heading"><div><span className="eyebrow">自由行动</span><h2>此刻想做什么？</h2></div><button className="link-button" onClick={onRefresh}>换一批</button></div><div className="suggestions">{suggestions.slice(0, 3).map((suggestion) => <button key={suggestion} disabled={loading} onClick={() => onAction(suggestion)}>{suggestion}<span>→</span></button>)}</div><form onSubmit={(event) => { event.preventDefault(); submit(input); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入你的行动…" aria-label="你要做什么？"/><button className="teal-button" type="submit" disabled={loading || !input.trim()}>行动</button></form></section>;
}

export interface ChatMessage { body: string; source?: string }
export interface ChatNpc { id: string; name: string; affection: number }
export const realNpcs: ChatNpc[] = ['苏凝霜', '沈月华', '白芷', '楚红绫', '姜雪衣', '柳如烟', '宁砚秋', '陆长汀', '祁照夜'].map((name) => ({ id: name, name, affection: 0 }));
export function ChatPage({ npcs = realNpcs, npcId, onNpcChange, messages = [], onSend, replyOptions, onSuggest, draft, setDraft }: { npcs?: ChatNpc[]; npcId?: string; onNpcChange?: (id: string) => void; messages?: ChatMessage[]; onSend: (message: string) => void; replyOptions: string[]; onSuggest: () => void; draft: string; setDraft: (value: string) => void }) {
  const selected = npcs.find((npc) => npc.id === npcId) ?? npcs[0];
  return <div className="chat-layout"><aside className="npc-list"><div className="section-heading"><div><span className="eyebrow">灵台传音</span><h2>故人</h2></div><span className="npc-count">{npcs.length} 位</span></div>{npcs.map((npc) => <button className={npc.id === selected?.id ? 'selected' : ''} key={npc.id} onClick={() => onNpcChange?.(npc.id)}><span className="npc-avatar">{npc.name[0]}</span><span><b>{npc.name}</b><small>好感 {npc.affection}</small></span></button>)}</aside><section className="chat-thread"><div className="chat-head"><span className="avatar">{selected?.name[0]}</span><div><h2>{selected?.name}</h2><small>灵台传音 · 在线</small></div></div><div className="messages">{messages.length === 0 && <p className="empty-state">暂无传音，试着问候一下吧。</p>}{messages.map((message, index) => <div className={`bubble ${message.source === 'player' ? 'player' : 'npc'}`} key={`${message.body}-${index}`}>{message.body}</div>)}</div><div className="reply-box">{replyOptions.length > 0 && <div className="reply-options">{replyOptions.map((reply) => <button key={reply} onClick={() => onSend(reply)}>{reply}</button>)}</div>}<div className="chat-input"><button className="idea-button" aria-label="候选回复" onClick={onSuggest}>💡</button><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="输入传音…" onKeyDown={(event) => { if (event.key === 'Enter' && draft.trim()) onSend(draft.trim()); }}/><button className="teal-button" onClick={() => draft.trim() && onSend(draft.trim())}>发送</button></div></div></section></div>;
}
export const quickActions = ['回洞府', '背包', '目标', '最近故人'];
