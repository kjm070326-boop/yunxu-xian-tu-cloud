export type Root = '普通' | '天灵根' | '混沌灵根';
export type FactionRank = '散修' | '外门' | '内门' | '亲传';
export interface State {
  root: Root;
  cultivation: number;
  realm: number;
  layer: number;
  stones: number;
  energy: number;
  maxEnergy: number;
  hp: number;
  maxHp: number;
  power: number;
  basePower?: number;
  contribution: number;
  bond: number;
  karma: number;
  day: number;
  gameDate?: string;
  gameMonth?: number;
  gameYear?: number;
  chapter: number;
  chapterActions: number;
  wins: number;
  inventory: Record<string, number>;
  equipped?: string;
  equippedPower?: number;
  faction?: FactionRank;
  codex?: CodexState;
  goal?: Record<string, unknown> | null;
  goalClaimed?: string[];
}
export interface CodexState { beasts: string[]; items: string[]; npcs: string[]; claimed: string[]; }
export interface Gate { id: string; description: string; check: (state: State) => boolean; }
export interface BattleState { enemyHp: number; hp: number; attack: number; power: number; enemyDefense?: number; enemyAttack: number; turn: number; done?: boolean; won?: boolean; }
export type EventChoice = 'stones' | 'injury' | 'karma' | 'grudge';
