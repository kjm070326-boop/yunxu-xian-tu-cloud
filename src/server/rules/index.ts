import type { BattleState, EventChoice, Gate, Root, State } from './types.js';
export * from './types.js';

const LAYER_THRESHOLDS = [0, 10, 25, 45, 70, 100, 135, 175, 220, 270] as const;

/** Return the cultivation multiplier for a spiritual root. */
export function rootMultiplier(root: Root): number { return root === '混沌灵根' ? 2 : root === '天灵根' ? 1.5 : 1; }
/** Return the bonus chance granted by a spiritual root. */
export function breakthroughBonus(root: Root): number { return root === '混沌灵根' ? 0.15 : root === '天灵根' ? 0.08 : 0; }
/** Convert cultivation to a 1-9 layer, clamping at the realm cap. */
export function realmLayer(cultivation: number): number { let layer = 1; for (let i = 1; i < LAYER_THRESHOLDS.length; i += 1) if (cultivation >= LAYER_THRESHOLDS[i]) layer = i + 1; return Math.min(9, layer); }
/** Return cultivation required to reach the next layer. */
export function nextLayerGap(cultivation: number): number { const layer = realmLayer(cultivation); return layer >= 9 ? 0 : Math.max(0, LAYER_THRESHOLDS[layer] - cultivation); }
/** Spend one energy to meditate, unless the character is exhausted. */
export function meditate(state: State): State { if (state.energy <= 0) return state; const gain = Math.round(5 * rootMultiplier(state.root)); const cultivation = state.cultivation + gain; return { ...state, energy: state.energy - 1, cultivation, layer: realmLayer(cultivation), chapterActions: state.chapterActions + 1 }; }
/** Restore energy and advance the in-game day. */
export function rest(state: State): State {
  const date = new Date(`${state.gameDate ?? '0001-01-01'}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  const gameDate = date.toISOString().slice(0, 10);
  const [gameYear, gameMonth, day] = gameDate.split('-').map(Number);
  return { ...state, energy: state.maxEnergy, gameDate, day, gameMonth, gameYear };
}
/** Calculate damage after defense, with a minimum of one. */
export function damage(attack: number, power: number, defense: number): number { return Math.max(1, attack + power - defense); }
/** Resolve one deterministic battle turn. */
export function battleTurn(battle: BattleState, action: 'attack' | 'defend' | 'flee'): BattleState { if (battle.done) return battle; if (action === 'flee') return { ...battle, done: true, won: false }; const dealt = action === 'defend' ? 0 : damage(battle.attack, battle.power, battle.enemyDefense ?? 0); const enemyHp = Math.max(0, battle.enemyHp - dealt); const taken = action === 'defend' ? Math.ceil(battle.enemyAttack / 2) : battle.enemyAttack; const hp = Math.max(0, battle.hp - taken); return { ...battle, enemyHp, hp, turn: battle.turn + 1, done: enemyHp === 0 || hp === 0, won: enemyHp === 0 }; }
/** Attempt a breakthrough with realm- and root-dependent odds. */
export function breakthrough(state: State, roll = 0.5): State { const realmBonus = Math.min(0.2, state.realm * 0.03); const odds = Math.min(0.95, 0.45 + realmBonus + breakthroughBonus(state.root)); if (roll < odds) return { ...state, realm: state.realm + 1, cultivation: state.cultivation + 10, layer: realmLayer(state.cultivation + 10) }; return { ...state, cultivation: Math.max(0, state.cultivation - 5), hp: Math.max(1, state.hp - 10) }; }
/** Build a chapter panel with human-readable unmet requirements. */
export function chapterPanel(state: State, gates: Gate[]): { chapter: number; progress: number; required: number; gates: Array<{ id: string; met: boolean; missing: string[] }> } { return { chapter: state.chapter, progress: state.chapterActions, required: 3, gates: gates.map((gate) => { const met = gate.check(state); return { id: gate.id, met, missing: met ? [] : [gate.description] }; }) }; }
/** Check whether all gates and the action quota are satisfied. */
export function canAdvanceChapter(state: State, gates: Gate[]): boolean { return state.chapterActions >= 3 && gates.every((gate) => gate.check(state)); }
/** Promote a sect member when contribution thresholds are reached. */
export function promoteFaction(state: State): State { const contribution = state.contribution; const faction = contribution >= 120 ? '亲传' : contribution >= 40 ? '内门' : contribution >= 10 ? '外门' : (state.faction ?? '散修'); return { ...state, faction }; }
/** Equip an item and recompute power from the base value rather than stacking. */
export function equip(state: State, id: string, itemPower: number): State { const basePower = state.basePower ?? state.power - (state.equippedPower ?? 0); return { ...state, equipped: id, equippedPower: itemPower, basePower, power: basePower + itemPower }; }
/** Unequip the current item and restore base power. */
export function unequip(state: State): State { const basePower = state.basePower ?? state.power - (state.equippedPower ?? 0); return { ...state, equipped: undefined, equippedPower: 0, basePower, power: basePower }; }
/** Add a non-negative contribution amount and apply promotion. */
export function contribute(state: State, amount: number): State { return promoteFaction({ ...state, contribution: state.contribution + Math.max(0, amount) }); }
/** Apply an exploration event consequence. */
export function resolveEvent(state: State, choice: EventChoice): State { if (choice === 'stones') return { ...state, stones: state.stones + 20 }; if (choice === 'injury') return { ...state, hp: Math.max(1, state.hp - 15) }; if (choice === 'karma') return { ...state, karma: state.karma + 10 }; return { ...state, karma: state.karma - 5 }; }
/** Claim a completed goal once, applying its rewards. */
export function claimGoal(state: State, done: boolean): State { const goal = state.goal as (Record<string, unknown> | undefined); if (!done || goal?.claimed === true) return state; return { ...state, cultivation: state.cultivation + 20, stones: state.stones + 25, goal: { ...goal, claimed: true } }; }
/** Check whether a goal's target is met by the current persisted state. */
export function goalMet(state: State, goal: unknown): boolean {
  if (!goal || typeof goal !== 'object') return false;
  const candidate = goal as { type?: unknown; target?: unknown; progress?: unknown };
  const target = Number(candidate.target);
  if (!Number.isFinite(target)) return false;
  const current = candidate.type === 'cultivation' ? state.cultivation
    : candidate.type === 'stones' ? state.stones
      : candidate.type === 'contribution' ? state.contribution
        : candidate.type === 'bond' ? state.bond
          : Number(candidate.progress);
  return Number.isFinite(current) && current >= target;
}
/** Return whether an achievement trigger is satisfied. */
export function achievementTriggered(achievement: { trigger: { type: string; value: number } }, state: State): boolean { const { type, value } = achievement.trigger; if (type === 'cultivation') return state.cultivation >= value; if (type === 'duel') return state.wins >= value; if (type === 'contribution') return state.contribution >= value; if (type === 'bond') return state.bond >= value; return state.layer >= value; }
/** Return a codex completion result and reward when all categories are filled. */
export function claimCodex(state: State, complete: boolean): State { if (!complete) return state; const codex = state.codex ?? { beasts: [], items: [], npcs: [], claimed: [] }; if (codex.claimed?.includes('codex_complete')) return state; return { ...state, stones: state.stones + 100, codex: { ...codex, claimed: [...new Set([...(codex.claimed ?? []), 'codex_complete'])] } }; }
/** End a life and preserve an immutable snapshot. */
export function endLife(state: State): { snapshot: State; ended: true } { return { snapshot: { ...state }, ended: true }; }
/** Start a new life from a previous snapshot. */
export function reincarnate(previous: State): State { return { ...previous, day: 1, chapter: 1, chapterActions: 0, energy: previous.maxEnergy, stones: 0, hp: previous.maxHp }; }

export const economy = { sell(state: State, id: string, quantity: number, price: number): State { const count = Math.max(0, quantity); return { ...state, stones: state.stones + count * Math.max(0, price), inventory: { ...state.inventory, [id]: Math.max(0, (state.inventory[id] ?? 0) - count) } }; }, equip };
export const affection = { gift(state: State, value: number): State { return { ...state, bond: state.bond + Math.max(0, value) }; }, spar(state: State): State { return { ...state, bond: state.bond + 2 }; }, stage(bond: number): number { return bond >= 55 ? 2 : bond >= 25 ? 1 : 0; } };
