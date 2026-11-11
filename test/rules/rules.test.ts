import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  affection, battleTurn, breakthrough, canAdvanceChapter, chapterPanel, claimCodex,
  claimGoal, contribute, damage, equip, goalMet, meditate, nextLayerGap, promoteFaction, realmLayer,
  resolveEvent, rest, rootMultiplier, unequip,
} from '../../src/server/rules/index.js';
import type { Gate, State } from '../../src/server/rules/types.js';

const base: State = {
  root: '混沌灵根', cultivation: 0, realm: 1, layer: 1, stones: 10, energy: 4,
  maxEnergy: 4, hp: 100, maxHp: 100, power: 10, basePower: 10, contribution: 0,
  bond: 0, karma: 0, day: 1, chapter: 1, chapterActions: 0, wins: 0, inventory: {},
};
const gate = (id: string, description: string, check: (state: State) => boolean): Gate => ({ id, description, check });

describe('rules', () => {
  it('handles realm layer boundaries and gaps', () => {
    expect(realmLayer(0)).toBe(1); expect(realmLayer(9)).toBe(1); expect(realmLayer(10)).toBe(2);
    expect(realmLayer(25)).toBe(3); expect(realmLayer(33)).toBe(3); expect(realmLayer(270)).toBe(9);
    expect(nextLayerGap(26)).toBe(19); expect(nextLayerGap(270)).toBe(0);
    expect(rootMultiplier('混沌灵根')).toBe(2);
  });
  it('does not meditate at zero energy and restores on rest', () => {
    const exhausted = { ...base, energy: 0 };
    expect(meditate(exhausted)).toEqual(exhausted);
    const rested = rest({ ...base, energy: 1 });
    expect(rested.energy).toBe(4); expect(rested.day).toBe(2);
  });
  it('resolves combat and damage', () => {
    expect(damage(10, 5, 3)).toBe(12);
    expect(battleTurn({ enemyHp: 5, hp: 10, attack: 1, power: 10, enemyDefense: 0, enemyAttack: 1, turn: 0 }, 'attack').won).toBe(true);
    expect(battleTurn({ enemyHp: 5, hp: 10, attack: 1, power: 10, enemyAttack: 1, turn: 0 }, 'flee').won).toBe(false);
  });
  it('reports all missing chapter gate descriptions', () => {
    const gates = [gate('layer', '修为达到二层', (s) => s.layer >= 2), gate('stones', '灵石达到一百', (s) => s.stones >= 100)];
    const panel = chapterPanel(base, gates);
    expect(panel.gates[0].missing).toEqual(['修为达到二层']); expect(panel.gates[1].missing).toEqual(['灵石达到一百']);
    expect(canAdvanceChapter({ ...base, chapterActions: 3 }, gates)).toBe(false);
    expect(canAdvanceChapter({ ...base, chapterActions: 3, layer: 2, stones: 100 }, gates)).toBe(true);
  });
  it('handles breakthrough success and failure with realm/root odds', () => {
    const success = breakthrough({ ...base, realm: 2 }, 0);
    expect(success.realm).toBe(3); expect(success.cultivation).toBe(10);
    const failure = breakthrough({ ...base, root: '普通', realm: 1, cultivation: 20 }, 0.99);
    expect(failure.realm).toBe(1); expect(failure.cultivation).toBe(15); expect(failure.hp).toBe(90);
  });
  it('recomputes power when equipping twice and unequipping', () => {
    const first = equip(base, 'sword', 12); const second = equip(first, 'amulet', 5); const cleared = unequip(second);
    expect(first.power).toBe(22); expect(second.power).toBe(15); expect(cleared.power).toBe(10); expect(cleared.equipped).toBeUndefined();
  });
  it('promotes sect ranks at contribution thresholds', () => {
    expect(promoteFaction({ ...base, contribution: 9 }).faction).toBe('散修');
    expect(contribute(base, 10).faction).toBe('外门'); expect(contribute(base, 40).faction).toBe('内门');
    expect(contribute(base, 120).faction).toBe('亲传');
  });
  it('keeps incomplete goal and codex claims unchanged', () => {
    expect(claimGoal(base, false)).toEqual(base); expect(claimCodex(base, false)).toEqual(base);
    expect(claimGoal(base, true).stones).toBe(35); expect(claimCodex(base, true).stones).toBe(110);
  });
  it('checks goal targets against state or custom progress', () => {
    expect(goalMet({ ...base, cultivation: 10 }, { type: 'cultivation', target: 10 })).toBe(true);
    expect(goalMet({ ...base, stones: 9 }, { type: 'stones', target: 10 })).toBe(false);
    expect(goalMet({ ...base, contribution: 10 }, { type: 'contribution', target: 10 })).toBe(true);
    expect(goalMet({ ...base, bond: 9 }, { type: 'bond', target: 10 })).toBe(false);
    expect(goalMet(base, { type: 'custom', target: 10, progress: 10 })).toBe(true);
  });
  it('applies every event consequence and bond boundaries', () => {
    expect(resolveEvent(base, 'stones').stones).toBe(30); expect(resolveEvent(base, 'injury').hp).toBe(85);
    expect(resolveEvent(base, 'karma').karma).toBe(10); expect(resolveEvent(base, 'grudge').karma).toBe(-5);
    expect(affection.stage(24)).toBe(0); expect(affection.stage(25)).toBe(1); expect(affection.stage(54)).toBe(1); expect(affection.stage(55)).toBe(2);
  });
  it('satisfies pure-action properties', () => {
    fc.assert(fc.property(fc.nat(1000), (n) => realmLayer(n) >= 1 && realmLayer(n) <= 9));
    fc.assert(fc.property(fc.integer({ min: -100, max: 100 }), (n) => resolveEvent(base, 'injury').hp >= 1 && contribute(base, n).contribution >= 0));
    fc.assert(fc.property(fc.nat(50), (n) => { const once = equip(base, 'item', n); return equip(once, 'item', n).power === once.power; }));
  });
});
