import { describe,it,expect,beforeEach } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { createRepository } from '../../src/server/repositories.js';
import { readFileSync } from 'node:fs';

const actions = ['getstate','createcharacter','endlife','setgoal','updategoalprogress','claimgoal','doaction','suggestactions','resolveevent','startbattle','battleturn','attemptbreakthrough','chatwithnpc','suggestreplies','npcinteract','getchats','getcatalog','craftitem','sellitem','equipitem','upgradeitem','claimcodex'] as const;
const route: Record<string,[string,string]> = {getstate:['GET','/state'],createcharacter:['POST','/character'],endlife:['POST','/life/end'],setgoal:['POST','/goals'],updategoalprogress:['POST','/goals/1/progress'],claimgoal:['POST','/goals/1/claim'],doaction:['POST','/actions'],suggestactions:['GET','/story/suggestions'],resolveevent:['POST','/events/1/resolve'],startbattle:['POST','/battles'],battleturn:['POST','/battles/1/turn'],attemptbreakthrough:['POST','/breakthrough'],chatwithnpc:['POST','/npcs/1/chat'],suggestreplies:['GET','/npcs/1/replies'],npcinteract:['POST','/npcs/1/interact'],getchats:['GET','/npcs/1/chats'],getcatalog:['GET','/catalog'],craftitem:['POST','/craft'],sellitem:['POST','/inventory/sell'],equipitem:['POST','/inventory/equip'],upgradeitem:['POST','/inventory/upgrade'],claimcodex:['POST','/codex/claim']};
let keyCounter=0; const headers = {'idempotency-key':'test-key'}; const freshHeaders=()=>({'idempotency-key':'test-'+(++keyCounter)});
let app: ReturnType<typeof buildApp>;
beforeEach(async()=>{ app=buildApp({repo:createRepository()}); await app.ready(); });
async function seed(){ await app.inject({method:'POST',url:'/api/v1/character',headers:freshHeaders(), payload:{name:'测试者',origin:'merchant',root:'common'}}); }

describe('HTTP action contract',()=>{
 it('claims codex for a fresh character',async()=>{ await seed(); const state=await app.inject('/api/v1/state'); const version=state.json().data.save.version; const res=await app.inject({method:'POST',url:'/api/v1/codex/claim',headers:{...freshHeaders(),'if-match':String(version)},payload:{}}); expect(res.statusCode).toBe(200); expect(res.json().error).toBeNull(); expect(res.json().data.codex.claimed).toContain('codex_complete'); });
 it.each(actions)('%s returns a successful envelope',async(name)=>{ if(name!=='createcharacter' && !['getcatalog','getchapters'].includes(name)) await seed(); if(name==='claimgoal'){ const current=await app.inject('/api/v1/state'); const version=current.json().data.save.version; await app.inject({method:'POST',url:'/api/v1/goals',headers:{...freshHeaders(),'if-match':String(version)},payload:{goal:{type:'custom',target:1}}}); const progressed=await app.inject('/api/v1/state'); await app.inject({method:'POST',url:'/api/v1/goals/1/progress',headers:{...freshHeaders(),'if-match':String(progressed.json().data.save.version)},payload:{progress:1}}); } const [method,path]=route[name]; const current=await app.inject({method:'GET',url:'/api/v1/state'}); const version=current.json().data?.save?.version ?? 1; const res=await app.inject({method,url:'/api/v1'+path,headers:{...freshHeaders(),'if-match':String(version)},payload:name==='createcharacter'?{name:'测试者',origin:'merchant',root:'common'}:name==='doaction'?{kind:'rest'}:name==='battleturn'?{battle:{enemyHp:1,hp:100,attack:10,power:10,enemyAttack:1,turn:0},action:'attack'}:name==='resolveevent'?{choice:'stones'}:name==='npcinteract'?{value:1}:name==='craftitem'?{id:'herb',price:0}:name==='sellitem'?{id:'herb',quantity:1,price:1}:name==='equipitem'?{id:'sword',power:1}:name==='upgradeitem'?{amount:1,cost:0}:name==='chatwithnpc'?{message:'你好'}:name==='setgoal'?{goal:'x'}:name==='updategoalprogress'?{progress:1}:{} }); expect(res.statusCode).toBe(200); const body=res.json(); expect(body).toHaveProperty('data'); expect(body).toHaveProperty('meta'); expect(body.error).toBeNull(); });
 it('missing idempotency key is 400',async()=>{const r=await app.inject({method:'POST',url:'/api/v1/character',payload:{name:'a',origin:'b',root:'common'}}); expect(r.statusCode).toBe(400);});
 it('wrong version is 409',async()=>{await seed(); const r=await app.inject({method:'POST',url:'/api/v1/goals',headers:{...freshHeaders(),'if-match':'99'},payload:{goal:'x'}}); expect(r.statusCode).toBe(409);});
 it('advance gate is 422',async()=>{await seed(); const r=await app.inject({method:'POST',url:'/api/v1/actions',headers:{...freshHeaders(),'if-match':'1'},payload:{kind:'advance'}}); expect(r.statusCode).toBe(422);});
});

describe('auxiliary endpoints',()=>{it('chapters and achievements',async()=>{expect((await app.inject('/api/v1/chapters')).json().data).toHaveLength(8); expect((await app.inject('/api/v1/achievements')).json().data).toHaveLength(21);}); it('imports save and exposes recap/past lives',async()=>{const r=await app.inject({method:'POST',url:'/api/v1/save/import',payload:JSON.parse(readFileSync('spec/save-export.json','utf8'))}); expect(r.statusCode).toBe(200); expect(r.json().data).toMatchObject({imported:true}); expect(JSON.stringify(r.json())).toContain('杨柳青'); expect((await app.inject('/api/v1/story/recap')).json().data.items.length).toBeGreaterThan(0); expect((await app.inject('/api/v1/past-lives')).json().data).toEqual([]);}); it('past lives appear after endLife',async()=>{await seed(); await app.inject({method:'POST',url:'/api/v1/life/end',headers:freshHeaders()}); expect((await app.inject('/api/v1/past-lives')).json().data.length).toBe(1);});});
 it('rest persists the next ISO date and refills energy after importing', async () => { await app.inject({ method:'POST', url:'/api/v1/save/import', payload:JSON.parse(readFileSync('spec/save-export.json','utf8')) }); const before = await app.inject('/api/v1/state'); const rest = await app.inject({ method:'POST', url:'/api/v1/actions', headers:{...freshHeaders(),'if-match':String(before.json().data.save.version)}, payload:{kind:'rest'} }); expect(rest.statusCode).toBe(200); expect(rest.json().data.state.save).toMatchObject({gameDate:'0001-01-02', gameDay:2, gameMonth:1, gameYear:1, energy:4}); });
 it('rejects an unmet goal and rewards a custom goal at its target', async () => { await seed(); let current = await app.inject('/api/v1/state'); let version = current.json().data.save.version; const set = await app.inject({method:'POST',url:'/api/v1/goals',headers:{...freshHeaders(),'if-match':String(version)},payload:{goal:{type:'custom',target:2}}}); version = set.json().meta.version; const unmet = await app.inject({method:'POST',url:'/api/v1/goals/1/claim',headers:{...freshHeaders(),'if-match':String(version)},payload:{}}); expect(unmet.statusCode).toBe(422); expect(unmet.json().error.code).toBe('GOAL_NOT_MET'); const progress = await app.inject({method:'POST',url:'/api/v1/goals/1/progress',headers:{...freshHeaders(),'if-match':String(version)},payload:{progress:2}}); const claimed = await app.inject({method:'POST',url:'/api/v1/goals/1/claim',headers:{...freshHeaders(),'if-match':String(progress.json().meta.version)},payload:{}}); expect(claimed.statusCode).toBe(200); expect(claimed.json().data).toMatchObject({cultivation:20,stones:75}); });

describe('多存档管理', () => {
  it('支持创建第二个存档、列表和切换，且保留旧档数据', async () => {
    await seed();
    const first = (await app.inject('/api/v1/state')).json().data.save;
    const created = await app.inject({ method: 'POST', url: '/api/v1/character', headers: freshHeaders(), payload: { name: '第二人', origin: '坊市孤儿', root: 'heaven' } });
    expect(created.statusCode).toBe(200);
    const listed = await app.inject('/api/v1/saves');
    expect(listed.json().data).toHaveLength(2);
    expect(listed.json().data.find((item: any) => item.current).name).toBe('第二人');
    const switched = await app.inject({ method: 'POST', url: `/api/v1/saves/${first.id}/activate`, headers: freshHeaders(), payload: {} });
    expect(switched.statusCode).toBe(200);
    expect((await app.inject('/api/v1/state')).json().data.save.name).toBe('测试者');
    expect((await app.inject('/api/v1/state')).json().data.stories).toHaveLength(1);
  });
  it('拒绝删除当前存档，删除非当前存档并返回 404 边界', async () => {
    await seed();
    const created = await app.inject({ method: 'POST', url: '/api/v1/character', headers: freshHeaders(), payload: { name: '第二人', origin: '坊市孤儿', root: 'heaven' } });
    const secondId = (await app.inject('/api/v1/state')).json().data.save.id;
    const currentDelete = await app.inject({ method: 'POST', url: `/api/v1/saves/${secondId}/delete`, headers: freshHeaders(), payload: {} });
    expect(currentDelete.statusCode).toBe(409);
    await app.inject({ method: 'POST', url: '/api/v1/saves/1/activate', headers: freshHeaders(), payload: {} });
    const deleted = await app.inject({ method: 'POST', url: `/api/v1/saves/${secondId}/delete`, headers: freshHeaders(), payload: {} });
    expect(deleted.statusCode).toBe(200);
    expect((await app.inject('/api/v1/saves')).json().data).toHaveLength(1);
    expect((await app.inject({ method: 'POST', url: '/api/v1/saves/999/delete', headers: freshHeaders(), payload: {} })).statusCode).toBe(404);
    expect(created.statusCode).toBe(200);
  });
  it('endLife 后可以创建新存档且前世记录汇总全部存档', async () => {
    await seed();
    await app.inject({ method: 'POST', url: '/api/v1/life/end', headers: freshHeaders(), payload: {} });
    const created = await app.inject({ method: 'POST', url: '/api/v1/character', headers: freshHeaders(), payload: { name: '轮回者', origin: '游侠后裔', root: 'common' } });
    expect(created.statusCode).toBe(200);
    expect((await app.inject('/api/v1/past-lives')).json().data).toHaveLength(1);
  });
  it('读取不存在的存档返回 404', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/v1/saves/999/activate', headers: freshHeaders(), payload: {} });
    expect(response.statusCode).toBe(404);
  });
});
