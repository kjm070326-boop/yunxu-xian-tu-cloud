import { describe,it,expect } from 'vitest';
import { createRepository } from '../src/server/repositories.js';
import { migrateSave } from '../src/server/migrate.js';
import type { SaveRecord } from '../src/server/repositories.js';
import { readFileSync } from 'node:fs';
interface StoryExport { body: string }

describe('phase 2a migration',()=>{it('imports export field by field and stories verbatim',()=>{const r=createRepository(':memory:'); const exp=JSON.parse(readFileSync('spec/save-export.json','utf8')); const out=migrateSave(r,exp,'spec/save-export.json'); expect(out.save.name).toBe(exp.save.name); expect(out.save.energy).toBe(exp.save.ap); expect(out.save.gameDate).toBe('0001-01-01'); expect(out.stories.map((x: StoryExport) => x.body)).toEqual((exp.story as StoryExport[]).map((x) => x.body));});it('normalizes legacy chaos root',()=>{const r=createRepository(':memory:');const exp=JSON.parse(readFileSync('spec/save-export.json','utf8'));exp.save.name='杨柳青';exp.save.root='chaos';expect(migrateSave(r,exp,'legacy.json').save.root).toBe('混沌灵根');});it('is idempotent',()=>{const r=createRepository(':memory:');const e=JSON.parse(readFileSync('spec/save-export.json','utf8'));migrateSave(r,e,'spec/save-export.json');migrateSave(r,e,'spec/save-export.json');expect(r.listSaves()).toHaveLength(1);expect(r.listStories(1)).toHaveLength(5);});it('rolls back transaction',()=>{const r=createRepository(':memory:');expect(()=>r.transaction(()=>{r.insertSave({ id: 99, name: 'x' } as SaveRecord);throw Error('boom')})).toThrow();expect(r.listSaves()).toHaveLength(0);});});
