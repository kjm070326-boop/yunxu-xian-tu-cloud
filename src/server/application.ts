import { createRepository, type SaveRecord } from './repositories.js';
import { achievements, catalog, chapters } from './content/index.js';
import * as rules from './rules/index.js';
import { narrateWithRetry, type Narrator } from './narration/adapter.js';
import { migrateSave } from './migrate.js';
import type { BattleState, EventChoice, Root, State } from './rules/types.js';
import type { NarrationResult } from './narration/adapter.js';

export interface ApplicationInput {
  [key: string]: unknown;
}

export interface CharacterInput extends ApplicationInput {
  name?: string;
  origin?: string;
  root?: string;
}

export interface ActionInput extends ApplicationInput {
  kind?: string;
  action?: string;
}

export interface BattleInput extends ApplicationInput {
  enemyHp?: number;
  attack?: number;
  enemyAttack?: number;
}

export interface BattleTurnInput extends ApplicationInput {
  battle: BattleState;
  action: 'attack' | 'defend' | 'flee';
}

export interface ApplicationState extends State {
  [key: string]: unknown;
  id: number;
  name: string;
  origin: string;
  gameDate: string;
  chapterProgressRequired: number;
  chapterConditions: string;
  goal: Record<string, unknown> | null;
  status: string;
  ending: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

type Repository = ReturnType<typeof createRepository>;
type StoredSave = SaveRecord & { id: number; version: number };
type StoryRecord = SaveRecord & { id?: number; chapter?: number; kind?: string; body?: string; nextActions?: string };
type ServiceState = { save: ApplicationState; stories: StoryRecord[]; storySummary: StoryRecord[]; chapterPanel: unknown; pastLives: SaveRecord[]; realmLayer: number; nextLayerGap: number };
type PersistedState = State & Partial<Pick<ApplicationState, 'gameDate' | 'goal' | 'chapterConditions'>>;

const roots: Record<string, Root> = { 普通: '普通', 天灵根: '天灵根', 混沌灵根: '混沌灵根', common: '普通', heaven: '天灵根', chaos: '混沌灵根' };
const error = (code: string): Error & { code: string } => Object.assign(new Error(code), { code });
const parseObject = (value: unknown): Record<string, unknown> => typeof value === 'string' ? JSON.parse(value || '{}') as Record<string, unknown> : (value as Record<string, unknown> | null) ?? {};
const toState = (stored: StoredSave): ApplicationState => {
  const codex = { beasts: [], items: [], npcs: [], claimed: [], ...parseObject(stored.codex) };
  const gameDate = String(stored.gameDate ?? '0001-01-01');
  const [gameYear, gameMonth, gameDay] = gameDate.split('-').map(Number);
  return { ...stored, gameDate, gameYear, gameMonth, gameDay, stones: Number(stored.spiritStones), realm: Number(stored.realmIndex), layer: Number(stored.realmLayer), day: gameDay, chapterActions: Number(stored.chapterProgress), inventory: parseObject(stored.inventory) as Record<string, number>, codex, goal: stored.goal ? parseObject(stored.goal) : null } as unknown as ApplicationState;
};
const fromState = (state: PersistedState): SaveRecord => ({ realmIndex: state.realm, realmLayer: state.layer, cultivation: state.cultivation, spiritStones: state.stones, hp: state.hp, maxHp: state.maxHp, energy: state.energy, maxEnergy: state.maxEnergy, power: state.power, karma: state.karma, chapterProgress: state.chapterActions, chapter: state.chapter, faction: state.faction ?? '散修', gameDate: state.gameDate ?? '0001-01-01', goal: state.goal ? JSON.stringify(state.goal) : null, chapterConditions: JSON.stringify(state.chapterConditions ?? []), contribution: state.contribution ?? 0, bond: state.bond ?? 0, wins: state.wins ?? 0, inventory: JSON.stringify(state.inventory ?? {}), codex: JSON.stringify(state.codex ?? {}) });

/** Build the stateful application service backed by a repository and narrator. */
export function createApplication(repo: Repository = createRepository(), narrator: Narrator) {
  const active = (): StoredSave | undefined => repo.listSaves()[0] as StoredSave | undefined;
  const state = (): ApplicationState => { const save = active(); if (!save) throw error('NOT_FOUND'); return toState(save); };
  const save = (next: State, expected: number): ApplicationState => { const current = active(); if (!current) throw error('NOT_FOUND'); repo.updateSave(current.id, expected, fromState(next)); return toState({ ...current, ...fromState(next), version: expected + 1 } as StoredSave); };
  const getState = (): ServiceState | null => { const current = active(); if (!current) return null; const saved = toState(current); const stories = repo.listStories(current.id) as StoryRecord[]; return { save: saved, stories, storySummary: stories.slice(-3), chapterPanel: rules.chapterPanel(saved, chapters.find((chapter) => chapter.id === saved.chapter)?.gates ?? []), pastLives: repo.listPastLives(current.id).map((item) => parseObject(item.snapshot)), realmLayer: rules.realmLayer(saved.cultivation), nextLayerGap: rules.nextLayerGap(saved.cultivation) }; };
  const narrate = (saved: StoredSave, situation: string): Promise<NarrationResult> => narrateWithRetry(narrator, { passages: (repo.listStories(saved.id) as StoryRecord[]).slice(-3).map((item) => String(item.body ?? '')), chapter: String(saved.chapter), situation: `[UNTRUSTED_PLAYER_TEXT]\n${situation}\n[/UNTRUSTED_PLAYER_TEXT]`, chatContext: [], previousBatch: [], tier: 'routine' }, 1);
  return {
    repo, getState,
    createCharacter(input: CharacterInput): ServiceState | null { const root = roots[String(input.root ?? '')]; if (!input.name || !input.origin || !root) throw error('VALIDATION_ERROR'); if (active()) throw error('CONFLICT'); const now = new Date().toISOString(); const initial: SaveRecord = { id: 1, name: input.name, origin: input.origin, root, faction: '散修', realmIndex: 0, realmLayer: 1, cultivation: 0, spiritStones: 50, hp: 100, maxHp: 100, energy: 4, maxEnergy: 4, power: 10, karma: 0, gameDate: '0001-01-01', chapter: 1, chapterProgress: 0, chapterProgressRequired: 3, chapterConditions: '[]', goal: null, status: 'active', ending: '', version: 1, createdAt: now, updatedAt: now }; repo.insertSave(initial); repo.insertStory({ saveId: 1, kind: 'chapter', title: '开篇', body: `${input.name}踏上修行路。`, choiceMade: '开篇', nextActions: JSON.stringify(['冥想', '休息', '探索']), chapter: 1, createdAt: now, source: 'application' }); return getState(); },
    async doAction(input: ActionInput, expected: number) { const current = active(); if (!current) throw error('NOT_FOUND'); let next = toState(current); const kind = input.kind ?? input.action; if (kind === 'meditate') next = rules.meditate(next) as ApplicationState; else if (kind === 'rest') next = rules.rest(next) as ApplicationState; else if (kind === 'free') next = next.energy > 0 ? { ...next, energy: next.energy - 1, cultivation: next.cultivation + 2, layer: rules.realmLayer(next.cultivation + 2) } : next; else if (kind === 'craft') next = { ...next, cultivation: next.cultivation + 2, chapterActions: next.chapterActions + 1 }; else if (kind === 'social') next = rules.affection.gift(next, 2) as ApplicationState; else if (kind === 'explore') next = rules.resolveEvent(next, 'stones') as ApplicationState; else if (kind === 'quest' || kind === 'errand') next = rules.contribute(next, 5) as ApplicationState; else if (kind === 'advance' && !rules.canAdvanceChapter(next, chapters.find((chapter) => chapter.id === next.chapter)?.gates ?? [])) throw error('CHAPTER_GATE'); else if (kind === 'advance') next = { ...next, chapter: next.chapter + 1, chapterActions: 0 }; else throw error('VALIDATION_ERROR'); const passage = await narrate(current, `你选择了${kind}`); return repo.transaction(() => { repo.updateSave(current.id, expected, fromState(next)); repo.insertStory({ saveId: current.id, kind: 'action', title: passage.title, body: passage.body, choiceMade: kind, nextActions: JSON.stringify(passage.suggestions), chapter: next.chapter, createdAt: new Date().toISOString(), source: 'narrator' }); repo.pruneStories(current.id); return { state: getState(), passage }; }); },
    suggestActions() { const current = active(); if (!current) throw error('NOT_FOUND'); const story = (repo.listStories(current.id) as StoryRecord[]).at(-1); return story ? JSON.parse(story.nextActions ?? '[]') as string[] : []; },
    resolveEvent(input: { choice: EventChoice }, expected: number) { return save(rules.resolveEvent(state(), input.choice), expected); },
    startBattle(input: BattleInput) { return { id: Date.now().toString(), battle: { enemyHp: input.enemyHp ?? 30, hp: state().hp, attack: input.attack ?? 5, power: state().power, enemyAttack: input.enemyAttack ?? 5, turn: 0 } }; },
    battleTurn(input: BattleTurnInput) { return rules.battleTurn(input.battle, input.action); },
    attemptBreakthrough(input: { roll?: number }, expected: number) { return save(rules.breakthrough(state(), input.roll ?? Math.random()), expected); },
    getCatalog: () => catalog, getChapters: () => chapters, getAchievements: () => achievements,
    async chatWithNpc(input: { message?: string; npcId?: string }, expected: number) { const current = active(); if (!current) throw error('NOT_FOUND'); const npcId = input.npcId ?? '苏凝霜'; const message = input.message ?? '交谈'; const passage = await narrate(current, `${npcId}：${message}`); return repo.transaction(() => { const now = new Date().toISOString(); repo.updateSave(current.id, expected, { bond: Number(current.bond ?? 0) + 1 }); repo.insertStory({ saveId: current.id, kind: 'chat', title: npcId, body: message, choiceMade: 'sent', nextActions: '[]', chapter: current.chapter, createdAt: now, source: 'player' }); repo.insertStory({ saveId: current.id, kind: 'chat', title: npcId, body: passage.body, choiceMade: 'reply', nextActions: '[]', chapter: current.chapter, createdAt: new Date().toISOString(), source: 'npc' }); repo.pruneStories(current.id); return passage; }); },
    suggestReplies: () => { const current = active(); if (!current) throw error('NOT_FOUND'); return narrate(current, '请生成回复'); },
    npcInteract: (input: { value?: number }, expected: number) => save(rules.affection.gift(state(), input.value ?? 1), expected),
    getChats: (input: { npcId?: string }) => (repo.listStories(active()?.id ?? 0) as StoryRecord[]).filter((item) => item.kind === 'chat' && (!input.npcId || item.title === input.npcId)),
    craftItem: (input: { id: string; price?: number }, expected: number) => { const current = state(); return save({ ...current, inventory: { ...current.inventory, [input.id]: (current.inventory[input.id] ?? 0) + 1 }, stones: current.stones - (input.price ?? 0) }, expected); },
    sellItem: (input: { id: string; quantity?: number; price?: number }, expected: number) => save(rules.economy.sell(state(), input.id, input.quantity ?? 1, input.price ?? 1), expected),
    equipItem: (input: { id: string; power?: number }, expected: number) => save(rules.equip(state(), input.id, input.power ?? 0), expected),
    upgradeItem: (input: { amount?: number; cost?: number }, expected: number) => { const current = state(); return save({ ...current, power: current.power + (input.amount ?? 1), stones: current.stones - (input.cost ?? 0) }, expected); },
    claimCodex: (_input: ApplicationInput, expected: number) => save(rules.claimCodex(state(), true), expected),
    setGoal: (input: { goal?: Record<string, unknown> }, expected: number) => save({ ...state(), goal: input.goal ?? null } as PersistedState, expected),
    updateGoalProgress: (input: { progress?: unknown }, expected: number) => save({ ...state(), goal: { ...(state().goal ?? {}), progress: input.progress } } as PersistedState, expected),
    claimGoal: (_input: ApplicationInput, expected: number) => { const current = state(); if (!rules.goalMet(current, current.goal)) throw error('GOAL_NOT_MET'); return save(rules.claimGoal(current, true), expected); },
    endLife: (_input: ApplicationInput, expected: number) => { const current = active(); if (!current) throw error('NOT_FOUND'); const snapshot = state(); return repo.transaction(() => { repo.updateSave(current.id, expected, { status: 'ended', ending: 'life ended' }); repo.insertPastLife(current.id, snapshot); return { snapshot, pastLives: repo.listPastLives(current.id).map((item) => parseObject(item.snapshot)) }; }); },
    importSave: (input: unknown) => migrateSave(repo, input, 'spec/save-export.json'),
    recap: () => { const current = active(); return { items: (current ? repo.listStories(current.id) : []).reduce<StoryRecord[][]>((groups, item) => { const story = item as StoryRecord; const chapter = Number(story.chapter ?? 1); (groups[chapter - 1] ??= []).push(story); return groups; }, []) }; },
  };
}
