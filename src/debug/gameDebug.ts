import { useGameStore } from '../store/gameStore';
import type { RoomId } from '../types/game';

const ROOM_IDS: RoomId[] = [
  'starter',
  'backroom',
  'esports_wing',
  'vip_lounge',
  'empire_hall',
  'second_floor',
];

function setSim(patch: Record<string, unknown>) {
  useGameStore.setState((state) => ({
    sim: { ...state.sim, ...patch },
  }));
}

export const gameDebug = {
  help() {
    console.table({
      getState: 'Inspect complete Zustand store',
      status: 'Compact game status',
      setMoney: 'setMoney(amount)',
      addMoney: 'addMoney(amount)',
      setReputation: 'setReputation(0..5)',
      setCleanliness: 'setCleanliness(0..100)',
      setDay: 'setDay(day)',
      setTime: 'setTime(minutesSinceMidnight)',
      setSpeed: 'setSpeed(0..3)',
      unlockAllRooms: 'Unlock every room',
      getObjects: 'List placed objects',
      getCustomers: 'List current customers',
      save: "Save current state to slot_1",
      reset: 'Start a fresh game (destructive)',
    });
    return 'Warnet-Tycoon debug API ready.';
  },

  getState: () => useGameStore.getState(),

  status() {
    const { sim, screenState, speed } = useGameStore.getState();
    return {
      screenState,
      speed,
      day: sim.day,
      time: sim.minuteOfDay,
      balance: sim.balance,
      reputation: sim.reputation,
      cleanliness: sim.cleanliness,
      stage: sim.stage,
      rooms: sim.unlockedRooms,
      objects: sim.objects.length,
      customers: sim.customers.length,
      staff: sim.staff.length,
    };
  },

  setMoney(amount: number) {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('amount must be a non-negative number');
    setSim({ balance: Math.floor(amount) });
    return useGameStore.getState().sim.balance;
  },

  addMoney(amount: number) {
    if (!Number.isFinite(amount)) throw new Error('amount must be a finite number');
    const next = Math.max(0, useGameStore.getState().sim.balance + Math.floor(amount));
    setSim({ balance: next });
    return next;
  },

  setReputation(value: number) {
    if (!Number.isFinite(value)) throw new Error('value must be a finite number');
    const next = Math.max(0, Math.min(5, value));
    setSim({ reputation: next });
    return next;
  },

  setCleanliness(value: number) {
    if (!Number.isFinite(value)) throw new Error('value must be a finite number');
    const next = Math.max(0, Math.min(100, value));
    setSim({ cleanliness: next });
    return next;
  },

  setDay(day: number) {
    if (!Number.isFinite(day)) throw new Error('day must be a finite number');
    const next = Math.max(1, Math.floor(day));
    setSim({ day: next });
    return next;
  },

  setTime(minutes: number) {
    if (!Number.isFinite(minutes)) throw new Error('minutes must be a finite number');
    const next = Math.max(0, Math.min(1439, Math.floor(minutes)));
    setSim({ minuteOfDay: next });
    return next;
  },

  setSpeed(speed: 0 | 1 | 2 | 3) {
    if (![0, 1, 2, 3].includes(speed)) throw new Error('speed must be 0, 1, 2, or 3');
    useGameStore.getState().setSpeed(speed);
    return speed;
  },

  unlockAllRooms() {
    setSim({ unlockedRooms: [...ROOM_IDS] });
    return [...ROOM_IDS];
  },

  getObjects: () => useGameStore.getState().sim.objects,
  getCustomers: () => useGameStore.getState().sim.customers,

  async save() {
    await useGameStore.getState().saveToSlot('slot_1');
    return 'Saved to Save Slot 1';
  },

  reset() {
    useGameStore.getState().startNewGame();
    return 'New game started';
  },
};

declare global {
  interface Window {
    gameDebug?: typeof gameDebug;
  }
}

// Enabled in Vite development, or explicitly on a deployed build with ?debug=1.
const debugEnabled =
  import.meta.env.DEV ||
  new URLSearchParams(window.location.search).get('debug') === '1';

if (debugEnabled) {
  window.gameDebug = gameDebug;
  console.info('[Warnet-Tycoon] Debug API enabled. Run gameDebug.help() for commands.');
}
