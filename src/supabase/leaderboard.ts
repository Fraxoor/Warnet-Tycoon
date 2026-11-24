import { supabase } from './supabase';
import type { SimulationState } from '../types/game';
import { computeBusinessRating, countComputers } from '../simulation/economy';
import { clampNumber, computeEmpireScore, sanitizeLeaderboardLabel } from '../firebase/leaderboardUtils';

export interface LeaderboardEntry {
  uid: string;
  playerName: string;
  cafeName: string;
  score: number;
  balance: number;
  reputation: number;
  businessRating: number;
  stage: number;
  pcCount: number;
  day: number;
  totalCustomersServed: number;
  updatedAtMs: number;
}

export interface CloudSaveSlot {
  slotId: string;
  label: string;
  day: number;
  balance: number;
  stage: number;
  pcCount: number;
  reputation: number;
  gameData: SimulationState;
  updatedAt: string;
}

/**
 * Fetch top 50 leaderboard entries from Supabase.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    uid: String(row.user_id),
    playerName: String(row.player_name || 'Owner'),
    cafeName: String(row.cafe_name || 'Warnet Nusantara'),
    score: Number(row.score || 0),
    balance: Number(row.balance || 0),
    reputation: Number(row.reputation || 0),
    businessRating: Number(row.business_rating || 0),
    stage: Number(row.stage || 1),
    pcCount: Number(row.pc_count || 0),
    day: Number(row.day || 1),
    totalCustomersServed: Number(row.total_customers_served || 0),
    updatedAtMs: row.updated_at ? new Date(String(row.updated_at)).getTime() : Date.now(),
  }));
}

/**
 * Upsert current player's score to Supabase leaderboard.
 */
export async function submitLeaderboardScore(
  userId: string,
  playerName: string,
  cafeName: string,
  sim: SimulationState,
): Promise<LeaderboardEntry> {
  const score = computeEmpireScore(sim);
  const pcCount = countComputers(sim.objects);
  const businessRating = computeBusinessRating(sim);

  const payload = {
    user_id: userId,
    player_name: sanitizeLeaderboardLabel(playerName, 'Owner'),
    cafe_name: sanitizeLeaderboardLabel(cafeName, 'Warnet Nusantara'),
    score: clampNumber(score, 0, 1_000_000_000_000),
    balance: clampNumber(sim.balance, -2_000_000, 1_000_000_000_000),
    reputation: clampNumber(sim.reputation, 0, 5),
    business_rating: clampNumber(businessRating, 0, 100),
    stage: clampNumber(sim.stage, 1, 5),
    pc_count: clampNumber(pcCount, 0, 500),
    day: clampNumber(sim.day, 1, 100_000),
    total_customers_served: clampNumber(sim.totalCustomersServed, 0, 100_000_000),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('leaderboard').upsert(payload);
  if (error) {
    throw new Error(error.message);
  }

  return {
    uid: userId,
    playerName: payload.player_name,
    cafeName: payload.cafe_name,
    score: payload.score,
    balance: payload.balance,
    reputation: payload.reputation,
    businessRating: payload.business_rating,
    stage: payload.stage,
    pcCount: payload.pc_count,
    day: payload.day,
    totalCustomersServed: payload.total_customers_served,
    updatedAtMs: Date.now(),
  };
}

/**
 * Delete current user's entry from the leaderboard.
 */
export async function deleteLeaderboardScore(userId: string): Promise<void> {
  const { error } = await supabase.from('leaderboard').delete().eq('user_id', userId);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Fetch all cloud saves for the authenticated user.
 */
export async function fetchUserCloudSaves(userId: string): Promise<CloudSaveSlot[]> {
  const { data, error } = await supabase
    .from('game_saves')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row: Record<string, unknown>) => ({
    slotId: String(row.slot_id),
    label: String(row.label || row.slot_id),
    day: Number(row.day || 1),
    balance: Number(row.balance || 0),
    stage: Number(row.stage || 1),
    pcCount: Number(row.pc_count || 0),
    reputation: Number(row.reputation || 0),
    gameData: row.game_data as SimulationState,
    updatedAt: String(row.updated_at),
  }));
}

/**
 * Save simulation state to a Supabase cloud slot.
 */
export async function saveGameToCloud(
  userId: string,
  slotId: string,
  label: string,
  sim: SimulationState,
): Promise<void> {
  const payload = {
    user_id: userId,
    slot_id: slotId,
    label,
    day: sim.day,
    balance: sim.balance,
    stage: sim.stage,
    pc_count: countComputers(sim.objects),
    reputation: sim.reputation,
    game_data: sim,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('game_saves')
    .upsert(payload, { onConflict: 'user_id,slot_id' });

  if (error) throw new Error(error.message);
}

/**
 * Delete a specific cloud save slot.
 */
export async function deleteCloudSave(userId: string, slotId: string): Promise<void> {
  const { error } = await supabase
    .from('game_saves')
    .delete()
    .eq('user_id', userId)
    .eq('slot_id', slotId);

  if (error) throw new Error(error.message);
}
