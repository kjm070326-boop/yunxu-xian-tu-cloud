import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LocalNarrator, narrateWithRetry, type Narrator, type NarrationInput } from './narration/adapter.js';
import { createRepository } from './repositories.js';
import { createApplication } from './application/index.js';
import type { ApplicationInput } from './application.js';

type HttpMethod = 'get' | 'post';
type RouteName = keyof ReturnType<typeof createApplication>;
interface RouteDefinition { method: HttpMethod; path: string; handler: RouteName; }
interface BuildOptions { narrator?: Narrator; repo?: ReturnType<typeof createRepository>; }
interface EnvelopeMeta { requestId?: string; version?: number; }
interface EnvelopeError { code: string; message: string; retryable: boolean; }
interface RouteParams { id?: string; }
interface RequestBody extends ApplicationInput {}
const routes: Record<string, RouteDefinition> = {
  listsaves: { method: 'get', path: '/saves', handler: 'listSaves' }, activatesave: { method: 'post', path: '/saves/:id/activate', handler: 'activateSave' }, deletesave: { method: 'post', path: '/saves/:id/delete', handler: 'deleteSave' },
  getstate: { method: 'get', path: '/state', handler: 'getState' }, createcharacter: { method: 'post', path: '/character', handler: 'createCharacter' }, endlife: { method: 'post', path: '/life/end', handler: 'endLife' }, setgoal: { method: 'post', path: '/goals', handler: 'setGoal' }, updategoalprogress: { method: 'post', path: '/goals/:id/progress', handler: 'updateGoalProgress' }, claimgoal: { method: 'post', path: '/goals/:id/claim', handler: 'claimGoal' }, doaction: { method: 'post', path: '/actions', handler: 'doAction' }, suggestactions: { method: 'get', path: '/story/suggestions', handler: 'suggestActions' }, resolveevent: { method: 'post', path: '/events/:id/resolve', handler: 'resolveEvent' }, startbattle: { method: 'post', path: '/battles', handler: 'startBattle' }, battleturn: { method: 'post', path: '/battles/:id/turn', handler: 'battleTurn' }, attemptbreakthrough: { method: 'post', path: '/breakthrough', handler: 'attemptBreakthrough' }, chatwithnpc: { method: 'post', path: '/npcs/:id/chat', handler: 'chatWithNpc' }, suggestreplies: { method: 'get', path: '/npcs/:id/replies', handler: 'suggestReplies' }, npcinteract: { method: 'post', path: '/npcs/:id/interact', handler: 'npcInteract' }, getchats: { method: 'get', path: '/npcs/:id/chats', handler: 'getChats' }, getcatalog: { method: 'get', path: '/catalog', handler: 'getCatalog' }, craftitem: { method: 'post', path: '/craft', handler: 'craftItem' }, sellitem: { method: 'post', path: '/inventory/sell', handler: 'sellItem' }, equipitem: { method: 'post', path: '/inventory/equip', handler: 'equipItem' }, upgradeitem: { method: 'post', path: '/inventory/upgrade', handler: 'upgradeItem' }, claimcodex: { method: 'post', path: '/codex/claim', handler: 'claimCodex' },
};
const envelope = <T>(data: T, meta: EnvelopeMeta = {}, error: EnvelopeError | null = null) => ({ data, meta, error });

/** Construct the Fastify HTTP application and register all API routes. */
export function buildApp(opts: BuildOptions = {}): FastifyInstance {
  const app = Fastify({ bodyLimit: 512 * 1024 });
  const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/client');
  app.register(fastifyStatic, { root: clientRoot, prefix: '/', wildcard: false });
  const repo = opts.repo ?? createRepository();
  const service = createApplication(repo, opts.narrator ?? new LocalNarrator());
  app.get('/health', async () => ({ ok: true }));
  const idempotency = new Map<string, { fingerprint: string; result: unknown }>();
  const inFlight = new Map<string, Promise<unknown>>();
  const validateBody = (value: unknown): Record<string, unknown> => {
    const encoded = JSON.stringify(value ?? {});
    if (encoded.length > 512 * 1024) throw Object.assign(new Error('Request body too large'), { code: 'VALIDATION_ERROR' });
    const walk = (node: unknown, depth = 0): void => {
      if (depth > 12) throw Object.assign(new Error('Request nesting too deep'), { code: 'VALIDATION_ERROR' });
      if (Array.isArray(node)) { if (node.length > 1000) throw Object.assign(new Error('Request array too large'), { code: 'VALIDATION_ERROR' }); node.forEach((item) => walk(item, depth + 1)); return; }
      if (node && typeof node === 'object') { for (const [key, child] of Object.entries(node)) { if (key === '__proto__' || key === 'prototype' || key === 'constructor') throw Object.assign(new Error('Dangerous object key'), { code: 'VALIDATION_ERROR' }); walk(child, depth + 1); } }
      if (typeof node === 'string' && node.length > 20_000) throw Object.assign(new Error('Request field too large'), { code: 'VALIDATION_ERROR' });
    };
    walk(value);
    return (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  };
  app.setErrorHandler((cause: Error & { code?: string; name?: string }, request, reply) => { const code = cause.code ?? (cause.name === 'ZodError' ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'); const status = code === 'VALIDATION_ERROR' || code === 'IDEMPOTENCY_KEY_REQUIRED' || code === 'FST_ERR_CTP_BODY_TOO_LARGE' || code === 'FST_ERR_CTP_INVALID_JSON_BODY' ? 400 : code === 'VERSION_CONFLICT' || code === 'CONFLICT' ? 409 : code === 'NOT_FOUND' ? 404 : code === 'CHAPTER_GATE' || code === 'GOAL_NOT_MET' ? 422 : 500; reply.code(status).send(envelope(null, { requestId: request.id }, { code, message: status === 400 && code === 'FST_ERR_CTP_BODY_TOO_LARGE' ? 'Request body too large' : cause.message, retryable: status === 409 || status >= 500 })); });
  app.get('/api/v1/chapters', async () => envelope(service.getChapters()));
  app.get('/api/v1/achievements', async () => envelope(service.getAchievements()));
  app.get('/api/v1/past-lives', async () => envelope(service.getState()?.pastLives ?? []));
  app.get('/api/v1/story/recap', async () => envelope(service.recap()));
  app.post('/api/v1/save/import', async (request: FastifyRequest<{ Body: unknown }>) => envelope(service.importSave(request.body)));
  app.post('/api/v1/narration/retry', async (request: FastifyRequest<{ Body: NarrationInput }>, reply: FastifyReply) => { try { return envelope(await narrateWithRetry(opts.narrator ?? new LocalNarrator(), request.body, 1)); } catch { reply.code(502); return envelope(null, {}, { code: 'NARRATION_FAILED', message: 'Narration unavailable', retryable: true }); } });
  app.get('/*', async (_request, reply) => reply.sendFile('index.html'));
  const noVersion = new Set<RouteName>(['getState', 'listSaves', 'suggestActions', 'suggestReplies', 'getCatalog', 'getChats']);
  for (const route of Object.values(routes)) { const register = app[route.method].bind(app) as (path: string, handler: (request: FastifyRequest<{ Body: RequestBody; Params: RouteParams }>) => Promise<unknown>) => void; register(`/api/v1${route.path}`, async (request) => { const params = request.params ?? {}; const body = { ...validateBody(request.body), ...params, ...(params.id ? { npcId: params.id } : {}) }; if (route.method === 'post' && !request.headers['idempotency-key']) throw Object.assign(new Error('Idempotency key required'), { code: 'IDEMPOTENCY_KEY_REQUIRED' }); const rawKey = String(request.headers['idempotency-key'] ?? ''); const saveId = service.getState()?.save.id ?? 'none'; const key = rawKey ? `${route.path}:${saveId}:${rawKey}` : ''; const fingerprint = JSON.stringify(body); if (key) { const previous = idempotency.get(key); if (previous) { if (previous.fingerprint !== fingerprint) throw Object.assign(new Error('Idempotency key reused with different request'), { code: 'VALIDATION_ERROR' }); return previous.result; } const pending = inFlight.get(key); if (pending) return pending; }
    const expected = Number(request.headers['if-match'] ?? 1); const handler = service[route.handler] as (input: RequestBody, expected?: number) => unknown; const operation = Promise.resolve(handler(body, noVersion.has(route.handler) ? undefined : expected)).then((data) => { const result = envelope(data, { version: (service.getState()?.save.version ?? expected) }); if (key) idempotency.set(key, { fingerprint, result }); return result; }).finally(() => { if (key) inFlight.delete(key); }); if (key) inFlight.set(key, operation); return operation; }); }
  return app;
}
export default buildApp;
