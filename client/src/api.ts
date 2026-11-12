import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export interface ApiError { code: string; message: string; retryable: boolean }
export interface Envelope<T> { data: T; meta: { requestId?: string; version?: number }; error: ApiError | null }
export interface StoryPassage { title?: string; body?: string; suggestions?: string[] }
export interface ChapterPanel { chapter?: number; progress?: number; required?: number; gates?: Array<{ label?: string; met?: boolean; missing?: string | string[] }> }
export interface Goal { id?: string; type?: string; name?: string; target?: number; progress?: number; claimed?: boolean; reward?: { cultivation?: number; stones?: number } }
export interface SaveState { save: Record<string, unknown>; stories: Array<Record<string, unknown>>; storySummary: Array<Record<string, unknown>>; chapterPanel: ChapterPanel; pastLives: Array<Record<string, unknown>>; realmLayer: number; nextLayerGap: number }
export interface SaveSummary { id: number; name: string; origin: string; root: string; faction: string; realmLayer: number; cultivation: number; chapter: number; status: string; updatedAt: string; current: boolean }
export interface CatalogEntry { id: string; name: string; price: number; effect: Record<string, number>; description: string }
export type Catalog = Record<string, CatalogEntry[]>;

const errorMessages: Record<string, string> = { VALIDATION_ERROR: '输入内容不完整，请检查后再试。', IDEMPOTENCY_KEY_REQUIRED: '操作凭证缺失，请重试。', VERSION_CONFLICT: '存档已更新，请刷新后再试。', CHAPTER_GATE: '本章历练或门槛尚未完成。', GOAL_NOT_MET: '目标尚未达成，继续努力吧。', NOT_FOUND: '暂时找不到这份存档。', CONFLICT: '当前正在游玩的存档不能删除。', FST_ERR_CTP_BODY_TOO_LARGE: '请求内容过大，请重试。', FST_ERR_CTP_INVALID_JSON_BODY: '请求内容格式有误，请重试。', INTERNAL_ERROR: '发生了意外错误，请稍后再试。' };
export function readableApiError(error?: Partial<ApiError> | null): string { return error?.message && !errorMessages[error.code ?? ''] ? error.message : errorMessages[error?.code ?? ''] ?? '操作失败，请稍后再试。'; }
const idempotencyKey = (): string => `client-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
async function request<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> { const response = await fetch(`/api/v1${path}`, { ...init, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) } }); const envelope = await response.json() as Envelope<T>; if (!response.ok || envelope.error) throw Object.assign(new Error(readableApiError(envelope.error)), { api: envelope.error, status: response.status }); return envelope; }

export const api = {
  getState: () => request<SaveState | null>('/state'),
  getSaves: () => request<SaveSummary[]>('/saves'),
  getChapters: () => request<unknown[]>('/chapters'),
  getAchievements: () => request<unknown[]>('/achievements'),
  getPastLives: () => request<unknown[]>('/past-lives'),
  recap: () => request<{ items: Array<Array<Record<string, unknown>>> }>('/story/recap'),
  suggestActions: () => request<string[]>('/story/suggestions'),
  getCatalog: () => request<Catalog>('/catalog'),
  getChats: (npcId: string) => request<Array<Record<string, unknown>>>(`/npcs/${encodeURIComponent(npcId)}/chats`),
  suggestReplies: (npcId: string) => request<string[]>(`/npcs/${encodeURIComponent(npcId)}/replies`),
  write: async <T>(path: string, body: unknown = {}): Promise<Envelope<T>> => { const state = await api.getState(); const version = state.meta.version ?? Number(state.data?.save?.version ?? 1); return request<T>(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Idempotency-Key': idempotencyKey(), 'If-Match': String(version) } }); },
  createCharacter: (body: { name: string; origin: string; root: string }) => request<SaveState>('/character', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey(), 'If-Match': '1' } }),
  activateSave: (id: number) => request<SaveState>(`/saves/${id}/activate`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey() } }),
  deleteSave: (id: number) => request<Record<string, unknown>>(`/saves/${id}/delete`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey() } }),
  doAction: (body: { kind: string }) => api.write<{ state: SaveState | null; passage: StoryPassage }>('/actions', body),
  chat: (npcId: string, message: string) => api.write<StoryPassage>(`/npcs/${encodeURIComponent(npcId)}/chat`, { message }),
  setGoal: (goal: Goal) => api.write('/goals', { goal }),
  claimGoal: (id: string) => api.write(`/goals/${encodeURIComponent(id)}/claim`),
  craftItem: (entry: CatalogEntry) => api.write('/craft', { id: entry.id, price: entry.price }),
  sellItem: (id: string, quantity = 1, price = 1) => api.write('/inventory/sell', { id, quantity, price }),
  equipItem: (id: string, power = 0) => api.write('/inventory/equip', { id, power }),
  upgradeItem: (amount = 1, cost = 0) => api.write('/inventory/upgrade', { amount, cost }),
  claimCodex: () => api.write('/codex/claim'),
};

export const queryKeys = { state: ['state'], saves: ['saves'], suggestions: ['story', 'suggestions'], chats: (id: string) => ['chats', id], replies: (id: string) => ['replies', id] } as const;
export function useStateQuery(options?: Omit<UseQueryOptions<Envelope<SaveState | null>>, 'queryKey' | 'queryFn'>) { return useQuery({ queryKey: queryKeys.state, queryFn: api.getState, ...options }); }
export function useSuggestionsQuery(options?: Omit<UseQueryOptions<Envelope<string[]>>, 'queryKey' | 'queryFn'>) { return useQuery({ queryKey: queryKeys.suggestions, queryFn: api.suggestActions, ...options }); }
export function useRepliesQuery(id: string, options?: Omit<UseQueryOptions<Envelope<string[]>>, 'queryKey' | 'queryFn'>) { return useQuery({ queryKey: queryKeys.replies(id), queryFn: () => api.suggestReplies(id), enabled: Boolean(id), ...options }); }
