import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery } from '@tanstack/react-query';
import { api, queryKeys, useRepliesQuery, useStateQuery, useSuggestionsQuery, type CatalogEntry, type Goal, type SaveState, type StoryPassage } from './api';
import { ChapterPanel, ChatPage, FreeAction, GoalBar, realNpcs, StatusCard, StoryCard, type ChatMessage } from './components';
import './styles.css';

const goals: Goal[] = [
  { id: 'cultivation', type: 'cultivation', name: '修为精进', target: 100, reward: { cultivation: 20, stones: 25 } },
  { id: 'chapter', type: 'chapter', name: '章节推进', target: 3, reward: { cultivation: 20, stones: 25 } },
  { id: 'bond', type: 'bond', name: '结交故人', target: 25, reward: { cultivation: 20, stones: 25 } },
  { id: 'stones', type: 'stones', name: '积攒灵石', target: 100, reward: { cultivation: 20, stones: 25 } },
  { id: 'contribution', type: 'contribution', name: '宗门贡献', target: 40, reward: { cultivation: 20, stones: 25 } },
];

function valueForGoal(goal: Goal, save: Record<string, unknown>, chapterProgress: number): number {
  const values: Record<string, number> = { cultivation: Number(save.cultivation ?? 0), chapter: chapterProgress, bond: Number(save.bond ?? 0), stones: Number(save.spiritStones ?? save.stones ?? 0), contribution: Number(save.contribution ?? 0) };
  return values[goal.type ?? 'cultivation'] ?? 0;
}

export function CreationPage({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [origin, setOrigin] = useState('青云山村');
  const [root, setRoot] = useState('混沌灵根');
  const [error, setError] = useState('');
  const submit = async () => { if (name.trim().length < 2) { setError('姓名至少需要两个字'); return; } try { await api.createCharacter({ name: name.trim(), origin, root }); onCreated(); } catch (cause) { setError((cause as Error).message); } };
  return <main className="page creation-page"><article className="story-card"><span className="eyebrow">启程</span><h1>踏入云墟</h1><p>你的名字会被写入每一章故事。</p><label>道号<input aria-label="姓名" value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入姓名" /></label><label>出身<select aria-label="出身" value={origin} onChange={(event) => setOrigin(event.target.value)}><option>青云山村</option><option>坊市孤儿</option><option>世家旁支</option><option>游侠后裔</option></select></label><fieldset><legend>灵根</legend>{[['混沌灵根', '×2 修炼速度，突破 +15%'], ['天灵根', '×1.5 修炼速度，突破 +8%'], ['普通', '稳扎稳打']].map(([value, hint]) => <label className="root-option" key={value}><input type="radio" name="root" value={value} checked={root === value} onChange={() => setRoot(value)} /><span><b>{value}</b><small>{hint}</small></span></label>)}</fieldset>{error && <p role="alert">{error}</p>}<button className="primary-button" onClick={submit}>创建角色</button></article></main>;
}

function StoryPage({ onChat, onNavigate }: { onChat: () => void; onNavigate: (tab: Tab) => void }) {
  const queryClient = useQueryClient();
  const state = useStateQuery();
  const suggestions = useSuggestionsQuery();
  const [passage, setPassage] = useState<StoryPassage | null>(null);
  const [busy, setBusy] = useState(false);
  const data = state.data?.data;
  const save = data?.save ?? {};
  const panel = data?.chapterPanel;
  const goal = (save.goal as Goal | null) ?? null;
  const action = async (kind: string) => { setBusy(true); try { const result = await api.doAction({ kind }); setPassage(result.data.passage); await queryClient.invalidateQueries({ queryKey: queryKeys.state }); await queryClient.invalidateQueries({ queryKey: queryKeys.suggestions }); } catch (cause) { window.alert((cause as Error).message); } finally { setBusy(false); } };
  const continueStory = () => { const first = suggestions.data?.data?.[0]; if (first) void action(first); else void action('meditate'); };
  if (!data) return <CreationPage onCreated={() => { void queryClient.invalidateQueries({ queryKey: queryKeys.state }); }} />;
  return <main className="page story-page"><StatusCard save={save} realmLayer={data.realmLayer} nextLayerGap={data.nextLayerGap} /><ChapterPanel panel={panel} onAdvance={() => void action('advance')} loading={busy} /><GoalBar goal={goal} current={Number(save.cultivation ?? 0)} onClaim={() => goal?.id && void api.claimGoal(goal.id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.state }))} /><div className="story-actions"><button className="primary-button" onClick={continueStory}>一键继续</button><button className="link-button" onClick={() => onNavigate('quests')}>查看任务堂</button></div>{passage ? <StoryCard passage={passage} /> : data.stories.at(-1) && <StoryCard passage={{ title: String(data.stories.at(-1)?.title ?? '最近故事'), body: String(data.stories.at(-1)?.body ?? '') }} />}<FreeAction suggestions={suggestions.data?.data ?? []} onAction={() => void action('free')} onRefresh={() => void suggestions.refetch()} loading={busy} /><div className="quick-actions"><button onClick={() => void action('rest')}>回洞府</button><button onClick={() => onNavigate('inventory')}>背包</button><button onClick={() => onNavigate('goals')}>目标</button><button onClick={onChat}>最近故人</button><button onClick={() => onNavigate('shop')}>坊市</button><button onClick={() => onNavigate('codex')}>图鉴</button><button onClick={() => onNavigate('achievements')}>成就</button><button onClick={() => onNavigate('pastLives')}>前世录</button><button onClick={() => onNavigate('recap')}>回顾</button><button onClick={() => onNavigate('settings')}>设置</button></div></main>;
}

type Tab = 'story' | 'chat' | 'inventory' | 'goals' | 'quests' | 'shop' | 'codex' | 'saves' | 'achievements' | 'pastLives' | 'recap' | 'settings';

function ChatTab() {
  const queryClient = useQueryClient();
  const [npcId, setNpcId] = useState(realNpcs[0].id);
  const [draft, setDraft] = useState('');
  const replies = useRepliesQuery(npcId);
  const chats = useQuery({ queryKey: queryKeys.chats(npcId), queryFn: () => api.getChats(npcId) });
  const state = useStateQuery();
  const messages: ChatMessage[] = (chats.data?.data ?? []).map((item) => ({ body: String(item.body ?? ''), source: String(item.choiceMade ?? '') === 'sent' ? 'player' : 'npc' }));
  const npcs = realNpcs.map((npc) => ({ ...npc, affection: Number(state.data?.data?.save.bond ?? 0) }));
  const send = async (message: string) => { setDraft(''); try { await api.chat(npcId, message); await queryClient.invalidateQueries({ queryKey: queryKeys.chats(npcId) }); await queryClient.invalidateQueries({ queryKey: queryKeys.state }); } catch (cause) { window.alert((cause as Error).message); } };
  return <main className="page"><ChatPage npcs={npcs} npcId={npcId} onNpcChange={setNpcId} messages={messages} onSend={(message) => void send(message)} replyOptions={replies.data?.data ?? []} onSuggest={() => void replies.refetch()} draft={draft} setDraft={setDraft} /></main>;
}

export function GoalsPage() {
  const queryClient = useQueryClient();
  const state = useStateQuery();
  const save = state.data?.data?.save ?? {};
  const chapter = state.data?.data?.chapterPanel.progress ?? 0;
  const [selected, setSelected] = useState<Goal>(goals[0]);
  const active = (save.goal as Goal | null) ?? null;
  const selectGoal = async () => { await api.setGoal(selected); await queryClient.invalidateQueries({ queryKey: queryKeys.state }); };
  return <main className="page"><section className="story-card"><span className="eyebrow">修行目标</span><h2>目标</h2><select value={selected.id} onChange={(event) => setSelected(goals.find((goal) => goal.id === event.target.value) ?? goals[0])}>{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}</select><button className="teal-button" onClick={() => void selectGoal()}>设为当前目标</button></section>{active && <GoalBar goal={{ ...active, progress: valueForGoal(active, save, chapter) }} onClaim={() => active.id && void api.claimGoal(active.id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.state }))} />}</main>;
}

function QuestsPage() { const queryClient = useQueryClient(); const quests = [{ id: 'quest', name: '宗门日课', detail: '完成一次历练', kind: 'quest' }, { id: 'errand', name: '坊市跑腿', detail: '为同门送信', kind: 'errand' }]; return <main className="page"><section className="story-card"><h2>任务堂</h2>{quests.map((quest) => <div className="list-row" key={quest.id}><span><b>{quest.name}</b><small>{quest.detail}</small></span><button className="teal-button" onClick={() => void api.doAction({ kind: quest.kind }).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.state }))}>接取 / 完成</button></div>)}</section></main>; }

const catalogLabels: Record<string, string> = { items: '杂物', skills: '功法', artifacts: '法宝', pills: '丹药' };
export function ShopPage() { const queryClient = useQueryClient(); const catalog = useQuery({ queryKey: ['catalog'], queryFn: api.getCatalog }); const buy = async (entry: CatalogEntry) => { await api.craftItem(entry); await queryClient.invalidateQueries({ queryKey: queryKeys.state }); }; return <main className="page"><section className="story-card"><h2>问天铺 / 坊市</h2>{Object.entries(catalog.data?.data ?? {}).flatMap(([category, entries]) => entries.map((entry) => <div className="list-row" key={entry.id}><span><b>{entry.name}</b><small>{catalogLabels[category] ?? category} · {entry.description}</small></span><button className="teal-button" onClick={() => void buy(entry)}>购买 {entry.price}</button></div>))}</section></main>; }

function InventoryPage() { const queryClient = useQueryClient(); const state = useStateQuery(); const catalog = useQuery({ queryKey: ['catalog'], queryFn: api.getCatalog }); const names: Record<string, string> = {}; Object.values(catalog.data?.data ?? {}).flat().forEach((entry) => { names[entry.id] = entry.name; }); const inventory = state.data?.data?.save.inventory as Record<string, number> | undefined; return <main className="page"><section className="story-card"><h2>背包</h2>{Object.entries(inventory ?? {}).map(([id, count]) => <div className="list-row" key={id}><span>{names[id] ?? id} × {count}</span><div><button className="teal-button" onClick={() => void api.equipItem(id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.state }))}>装备</button><button className="link-button" onClick={() => void api.sellItem(id).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.state }))}>出售</button></div></div>)}<button className="link-button" onClick={() => void api.upgradeItem(1, 5).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.state }))}>升级当前装备</button></section></main>; }

export function CodexPage() { const queryClient = useQueryClient(); const save = useStateQuery().data?.data?.save ?? {}; const codex = save.codex as Record<string, unknown[]> | undefined; const complete = ['beasts', 'items', 'npcs'].every((key) => (codex?.[key] ?? []).length > 0); return <main className="page"><section className="story-card"><h2>图鉴</h2>{([['beasts', '灵兽'], ['items', '器物'], ['npcs', '故人']] as const).map(([type, label]) => <div className="list-row" key={type}><span>{label}<small>{(codex?.[type] ?? []).length} 条记录</small></span></div>)}<button className="teal-button" disabled={!complete} onClick={() => void api.claimCodex().then(() => queryClient.invalidateQueries({ queryKey: queryKeys.state }))}>领取图鉴奖励</button></section></main>; }

const triggerLabels: Record<string, string> = { artifact: '法宝', bond: '好感', chapter: '章节', codex: '图鉴', contribution: '宗门贡献', cultivation: '修为', duel: '决斗胜场', layer: '炼气层', past_life: '前世', pill: '丹药', stones: '灵石' };
function SavesPage({ onNew }: { onNew: () => void }) {
  const queryClient = useQueryClient();
  const saves = useQuery({ queryKey: queryKeys.saves, queryFn: api.getSaves });
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.saves }); await queryClient.invalidateQueries({ queryKey: queryKeys.state }); };
  const activate = async (id: number) => { try { await api.activateSave(id); await refresh(); } catch (cause) { window.alert((cause as Error).message); } };
  const remove = async (id: number, name: string) => { if (!window.confirm(`确定删除存档“${name}”吗？关联故事、成就、图鉴和前世记录都会删除。`)) return; try { await api.deleteSave(id); await refresh(); } catch (cause) { window.alert((cause as Error).message); } };
  return <main className="page"><section className="story-card"><div className="section-heading"><div><span className="eyebrow">云端存档</span><h2>存档</h2></div><button className="primary-button" onClick={onNew}>新开存档</button></div>{(saves.data?.data ?? []).length === 0 ? <p>还没有存档，先创建一个角色吧。</p> : (saves.data?.data ?? []).map((save) => <div className="list-row" key={save.id}><span><b>{save.name}{save.current ? ' · 当前' : ''}</b><small>{save.origin} · {save.root} · {save.faction} · 第 {save.chapter} 章 · 炼气 {save.realmLayer} 层 · 修为 {save.cultivation}</small></span><span><button className="teal-button" disabled={save.current} onClick={() => void activate(save.id)}>读档</button><button className="link-button" disabled={save.current} onClick={() => void remove(save.id, save.name)}>删除</button></span></div>)}</section></main>;
}

function DataPage({ kind }: { kind: 'achievements' | 'pastLives' | 'recap' | 'settings' }) {
  const state = useStateQuery();
  const achievementsQuery = useQuery({ queryKey: ['achievements'], queryFn: api.getAchievements, enabled: kind === 'achievements' });
  const pastLivesQuery = useQuery({ queryKey: ['past-lives'], queryFn: api.getPastLives, enabled: kind === 'pastLives' });
  const recapQuery = useQuery({ queryKey: ['recap'], queryFn: api.recap, enabled: kind === 'recap' });
  const titles: Record<typeof kind, string> = { achievements: '成就', pastLives: '前世录', recap: '故事回顾', settings: '设置' };
  const achievements = (achievementsQuery.data?.data ?? []) as Array<Record<string, unknown>>;
  const pastLives = (pastLivesQuery.data?.data ?? []) as Array<Record<string, unknown>>;
  const recapGroups = (recapQuery.data?.data.items ?? []) as Array<Array<Record<string, unknown>>>;
  return <main className="page"><section className="story-card"><h2>{titles[kind]}</h2>{kind === 'settings' ? <p>存档：{String(state.data?.data?.save.name ?? '未创建')} · 导入状态：本地存档已连接</p> : kind === 'achievements' ? (achievements.length === 0 ? <p>暂无成就，先去历练吧。</p> : achievements.map((item) => { const trigger = (item.trigger ?? {}) as Record<string, unknown>; const reward = (item.reward ?? {}) as Record<string, unknown>; return <div className="list-row" key={String(item.id ?? item.name)}><span><b>{String(item.name ?? '')}</b><small>达成：{triggerLabels[String(trigger.type ?? '')] ?? '历练'} {Number(trigger.value ?? 0)}</small></span><span>奖励 {Number(reward.stones ?? 0)} 灵石</span></div>; })) : kind === 'pastLives' ? (pastLives.length === 0 ? <p>尚无前世，兵解或通关后会在此留下记录。</p> : pastLives.map((life, index) => <div className="list-row" key={index}><span><b>第 {index + 1} 世 · {String(life.name ?? '无名')}</b><small>第 {Number(life.chapter ?? 1)} 章 · 炼气 {Number(life.realmLayer ?? 1)} 层 · 修为 {Number(life.cultivation ?? 0)}</small></span></div>)) : (recapGroups.flat().length === 0 ? <p>还没有故事，先创建角色开始第一章吧。</p> : recapGroups.map((group, index) => <div key={index}><h3>第 {index + 1} 章</h3>{group.map((story) => <div className="list-row" key={String(story.id ?? story.title)}><span>{String(story.title ?? '无题')}</span></div>)}</div>))}</section></main>;
}

function AppShell() {
  const [tab, setTab] = useState<Tab>('story');
  const [creating, setCreating] = useState(false);
  const state = useStateQuery();
  const hasSave = Boolean(state.data?.data);
  if (creating) return <CreationPage onCreated={() => { void state.refetch(); setCreating(false); setTab('story'); }} />;
  const page = tab === 'story' ? <StoryPage onChat={() => setTab('chat')} onNavigate={setTab} /> : tab === 'chat' ? <ChatTab /> : tab === 'goals' ? <GoalsPage /> : tab === 'quests' ? <QuestsPage /> : tab === 'shop' ? <ShopPage /> : tab === 'inventory' ? <InventoryPage /> : tab === 'codex' ? <CodexPage /> : tab === 'saves' ? <SavesPage onNew={() => setCreating(true)} /> : <DataPage kind={tab} />;
  if (!hasSave && tab !== 'story' && tab !== 'saves') return <CreationPage onCreated={() => { void state.refetch(); setTab('story'); }} />;
  const save = state.data?.data?.save ?? {};
  const chapter = Number(save.chapter ?? 1);
  const faction = String(save.faction ?? '散修');
  return <div className="app"><header className="topbar"><span>云墟仙途</span><span className="topbar-status">第 {chapter} 章 · {faction}</span></header>{page}<nav className="bottom-nav"><button className={tab === 'story' ? 'active' : ''} onClick={() => setTab('story')}>✦<span>故事</span></button><button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>☾<span>聊天</span></button><button className={tab === 'inventory' ? 'active' : ''} onClick={() => setTab('inventory')}>◈<span>背包</span></button><button className={tab === 'goals' ? 'active' : ''} onClick={() => setTab('goals')}>◎<span>目标</span></button><button onClick={() => setTab('shop')}>铺<span>坊市</span></button><button onClick={() => setTab('codex')}>册<span>图鉴</span></button><button className={tab === 'saves' ? 'active' : ''} onClick={() => setTab('saves')}>档<span>存档</span></button></nav></div>;
}

const client = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } });
export default function App() { return <QueryClientProvider client={client}><AppShell /></QueryClientProvider>; }
