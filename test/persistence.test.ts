import { describe, expect, it } from 'vitest';
import { createRepository } from '../src/server/repositories.js';

describe('save persistence fields', () => {
  it('enables WAL for file databases but not memory databases', () => {
    const file = `/tmp/yunxu-wal-${Date.now()}.sqlite`;
    const repo = createRepository(file);
    expect(repo.db.prepare('PRAGMA journal_mode').get()).toMatchObject({ journal_mode: 'wal' });
    expect(createRepository(':memory:').db.prepare('PRAGMA journal_mode').get()).toMatchObject({ journal_mode: 'memory' });
  });

  it('round trips contribution, bond, wins, inventory, goal', () => {
    const repo = createRepository();
    repo.insertSave({ id: 1, name: 'x', origin: 'o', root: '普通', faction: '散修', realmIndex: 0, realmLayer: 1, cultivation: 0, spiritStones: 1, hp: 1, maxHp: 1, energy: 1, maxEnergy: 1, power: 1, karma: 0, gameDate: '0001-01-01', chapter: 1, chapterProgress: 0, chapterProgressRequired: 1, chapterConditions: '[]', goal: JSON.stringify({ id: 'g' }), status: 'active', ending: '', version: 1, createdAt: '', updatedAt: '', contribution: 4, bond: 5, wins: 6, inventory: JSON.stringify({ herb: 2 }), codex: JSON.stringify({ a: true }) });
    const row = repo.getSave(1)!;
    expect(row.contribution).toBe(4); expect(row.bond).toBe(5); expect(row.wins).toBe(6);
    expect(JSON.parse(String(row.inventory))).toEqual({ herb: 2}); expect(JSON.parse(String(row.goal))).toEqual({ id: 'g' });
  });
});
