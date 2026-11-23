import { countComputers } from '../simulation/economy';
import type { SimulationState } from '../types/game';

export const LEADERBOARD_MAX_NAME_LENGTH = 40;
export const LEADERBOARD_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function computeEmpireScore(sim: SimulationState): number {
  const pcCount = countComputers(sim.objects);
  const openedBranches = sim.branches.filter((b) => b.opened).length;
  const raw =
    Math.max(0, Math.round(sim.balance)) +
    pcCount * 500_000 +
    sim.totalCustomersServed * 10_000 +
    Math.round(sim.reputation * 200_000) +
    openedBranches * 5_000_000;
  return Math.max(0, Math.min(1_000_000_000_000, Math.round(raw)));
}

export function sanitizeLeaderboardLabel(value: string, fallback: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return fallback.slice(0, LEADERBOARD_MAX_NAME_LENGTH);
  return trimmed.slice(0, LEADERBOARD_MAX_NAME_LENGTH);
}

export function isValidFirebaseId(id: string): boolean {
  return id.length >= 1 && id.length <= 128 && LEADERBOARD_ID_REGEX.test(id);
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
