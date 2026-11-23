import { create } from 'zustand';
import type {
  CatalogItemType,
  InternetPlanId,
  LightingTierId,
  RoomId,
  SaveSlotMeta,
  ScreenState,
  SimulationState,
  StaffRole,
} from '../types/game';
import {
  INTERNET_PLANS,
  LIGHTING_TIERS,
  ROOM_EXPANSIONS,
} from '../simulation/catalog';
import {
  claimDailyQuest,
  createInitialSimulationState,
  hireStaffMember,
  normalizeSimulationState,
  placeCatalogObject,
  repairComputerManual,
  resolveRandomEventChoice,
  sellPlacedObject,
  stepSimulation,
  trainStaffMember,
  fireStaffMember,
  upgradeComputerTier,
} from '../simulation/engine';
import { formatRupiah } from '../simulation/economy';
import {
  SaveSlotId,
  deleteSaveSlot,
  listSaveSlots,
  loadGameFromSlot,
  saveGameToSlot,
} from '../storage/saveSystem';
import { soundEngine } from '../audio/soundEngine';

export type DockTab =
  | null
  | 'build'
  | 'computers'
  | 'staff'
  | 'finance'
  | 'upgrades'
  | 'stats'
  | 'leaderboard'
  | 'save';

export type SimSpeed = 0 | 1 | 2 | 3;

interface GameStore {
  screenState: ScreenState;
  sim: SimulationState;
  speed: SimSpeed;
  dayDurationSeconds: number;
  activeTab: DockTab;
  dockCollapsed: boolean;
  buildItem: CatalogItemType | null;
  buildRotation: 0 | 1 | 2 | 3;
  selectedObjectId: string | null;
  cameraResetTrigger: number;
  muted: boolean;
  musicEnabled: boolean;
  ambientEnabled: boolean;
  masterVolume: number;
  saveSlots: SaveSlotMeta[];
  lastSaveMessage: string | null;
  endlessContinued: boolean;

  // Actions
  startNewGame: () => void;
  setScreenState: (s: ScreenState) => void;
  continueEndless: () => void;
  setSpeed: (speed: SimSpeed) => void;
  setDayDurationSeconds: (secs: number) => void;
  setActiveTab: (tab: DockTab) => void;
  toggleDockCollapsed: () => void;
  selectBuildItem: (item: CatalogItemType | null) => void;
  rotateBuildItem: () => void;
  setSelectedObjectId: (id: string | null) => void;
  triggerCameraReset: () => void;

  // Gameplay actions
  tick: (realDt: number) => void;
  placeAtTile: (x: number, z: number) => boolean;
  repairPc: (objectId: string) => void;
  upgradePc: (objectId: string) => void;
  sellObject: (objectId: string) => void;
  hireStaff: (role: StaffRole) => void;
  trainStaff: (staffId: string) => void;
  fireStaff: (staffId: string) => void;
  unlockRoom: (roomId: RoomId) => void;
  upgradeInternet: (planId: InternetPlanId) => void;
  upgradeLighting: (tierId: LightingTierId) => void;
  openBranch: (branchId: string) => void;
  upgradeBranch: (branchId: string) => void;
  setHourlyRateMultiplier: (mult: number) => void;
  setMembershipPrice: (price: number) => void;
  resolveEvent: (choiceId: string) => void;
  claimQuest: (questId: string) => void;

  // Audio
  toggleMute: () => void;
  setMusicEnabled: (v: boolean) => void;
  setAmbientEnabled: (v: boolean) => void;
  setMasterVolume: (v: number) => void;

  // Saves
  refreshSaveSlots: () => Promise<void>;
  saveToSlot: (slotId: SaveSlotId) => Promise<void>;
  loadFromSlot: (slotId: string) => Promise<void>;
  deleteSlot: (slotId: string) => Promise<void>;
}

let lastAutoSaveDay = 1;

export const useGameStore = create<GameStore>((set, get) => ({
  screenState: 'title',
  sim: createInitialSimulationState(),
  speed: 1,
  dayDurationSeconds: 120,
  activeTab: null,
  dockCollapsed: false,
  buildItem: null,
  buildRotation: 0,
  selectedObjectId: null,
  cameraResetTrigger: 0,
  muted: false,
  musicEnabled: true,
  ambientEnabled: true,
  masterVolume: 0.55,
  saveSlots: [],
  lastSaveMessage: null,
  endlessContinued: false,

  startNewGame: () => {
    soundEngine.unlockAndStart();
    const fresh = createInitialSimulationState();
    lastAutoSaveDay = 1;
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
    }
    set({
      screenState: 'playing',
      sim: fresh,
      speed: 1,
      activeTab: null,
      buildItem: null,
      selectedObjectId: null,
      endlessContinued: false,
    });
  },

  setScreenState: (s) => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = s;
    }
    set({ screenState: s });
  },

  continueEndless: () => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
    }
    set({ screenState: 'playing', endlessContinued: true });
  },

  setSpeed: (speed) => set({ speed }),

  setDayDurationSeconds: (secs) =>
    set({ dayDurationSeconds: Math.max(45, Math.min(300, Math.round(secs))) }),

  setActiveTab: (tab) =>
    set((st) => ({
      activeTab: st.activeTab === tab ? null : tab,
      dockCollapsed: false,
      buildItem: tab === 'build' ? st.buildItem : null,
    })),

  toggleDockCollapsed: () =>
    set((st) => ({
      dockCollapsed: !st.dockCollapsed,
      activeTab: !st.dockCollapsed ? null : st.activeTab,
    })),

  selectBuildItem: (item) =>
    set({
      buildItem: item,
      selectedObjectId: null,
      activeTab: item ? null : 'build',
    }),

  rotateBuildItem: () =>
    set((st) => ({
      buildRotation: ((st.buildRotation + 1) % 4) as 0 | 1 | 2 | 3,
    })),

  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

  triggerCameraReset: () =>
    set((st) => ({ cameraResetTrigger: st.cameraResetTrigger + 1 })),

  tick: (realDt) => {
    const st = get();
    if (st.screenState !== 'playing') return;
    if (st.speed === 0 || st.sim.pendingEvent || st.sim.gameOverReason) return;

    const simDt = Math.min(realDt, 0.25) * st.speed;
    const result = stepSimulation(st.sim, simDt, st.dayDurationSeconds);

    // Update soundscape
    const occupiedPcs = result.state.objects.filter(
      (o) => o.computer && o.computer.occupiedByCustomerId !== null,
    ).length;
    soundEngine.setActivePcCount(occupiedPcs);
    soundEngine.setWeather(result.state.weather);
    for (const cue of result.cues) {
      if (cue.type === 'door_chime') soundEngine.playDoorChime();
      if (cue.type === 'cash_register') soundEngine.playCashRegister();
      if (cue.type === 'stage_up') soundEngine.playStageUp();
      if (cue.type === 'event_alert') soundEngine.playStageUp();
      if (cue.type === 'cctv_alert') soundEngine.playCctvAlert();
      if (cue.type === 'quest_done') soundEngine.playStageUp();
    }

    // Check game over / first-time victory modal
    let nextScreen: ScreenState = st.screenState;
    if (result.state.gameOverReason) {
      nextScreen = 'gameover';
    } else if (result.state.gameWon && !st.endlessContinued && !st.sim.gameWon) {
      nextScreen = 'gameover';
    }
    if (nextScreen !== st.screenState && typeof document !== 'undefined') {
      document.body.dataset.state = nextScreen;
    }

    // Auto-save at start of each new day
    if (result.state.day > lastAutoSaveDay) {
      lastAutoSaveDay = result.state.day;
      void saveGameToSlot('autosave', result.state, st.dayDurationSeconds).then(() => {
        void get().refreshSaveSlots();
      });
    }

    set({ sim: result.state, screenState: nextScreen });
  },

  placeAtTile: (x, z) => {
    const st = get();
    if (!st.buildItem) return false;
    const res = placeCatalogObject(st.sim, st.buildItem, x, z, st.buildRotation);
    if (!res.ok) {
      soundEngine.playError();
      set({
        sim: {
          ...st.sim,
          recentNotifications: [
            { id: `err_${Date.now()}`, text: res.error ?? 'Cannot place here', tone: 'bad' as const },
            ...st.sim.recentNotifications,
          ].slice(0, 6),
        },
      });
      return false;
    }
    soundEngine.playBuildPlace();
    set({ sim: res.state });
    return true;
  },

  repairPc: (objectId) => {
    const st = get();
    const next = repairComputerManual(st.sim, objectId);
    if (next !== st.sim) {
      soundEngine.playBuildPlace();
      set({ sim: next });
    } else {
      soundEngine.playError();
    }
  },

  upgradePc: (objectId) => {
    const st = get();
    const next = upgradeComputerTier(st.sim, objectId);
    if (next !== st.sim) {
      soundEngine.playStageUp();
      set({ sim: next });
    } else {
      soundEngine.playError();
    }
  },

  sellObject: (objectId) => {
    const st = get();
    const next = sellPlacedObject(st.sim, objectId);
    soundEngine.playCashRegister();
    set({ sim: next, selectedObjectId: null });
  },

  hireStaff: (role) => {
    const st = get();
    const next = hireStaffMember(st.sim, role, Math.random);
    if (next !== st.sim) {
      soundEngine.playBuildPlace();
      set({ sim: next });
    } else {
      soundEngine.playError();
    }
  },

  trainStaff: (staffId) => {
    const st = get();
    const next = trainStaffMember(st.sim, staffId);
    if (next !== st.sim) {
      soundEngine.playStageUp();
      set({ sim: next });
    } else {
      soundEngine.playError();
    }
  },

  fireStaff: (staffId) => {
    set((st) => ({ sim: fireStaffMember(st.sim, staffId) }));
  },

  unlockRoom: (roomId) => {
    const st = get();
    if (st.sim.unlockedRooms.includes(roomId)) return;
    const def = ROOM_EXPANSIONS[roomId];
    if (def.prerequisite && !st.sim.unlockedRooms.includes(def.prerequisite)) return;
    if (st.sim.balance < def.cost) {
      soundEngine.playError();
      return;
    }
    soundEngine.playStageUp();
    set({
      sim: {
        ...st.sim,
        balance: st.sim.balance - def.cost,
        unlockedRooms: [...st.sim.unlockedRooms, roomId],
        todayExpenses: {
          ...st.sim.todayExpenses,
          equipment: st.sim.todayExpenses.equipment + def.cost,
        },
        recentNotifications: [
          {
            id: `room_${roomId}`,
            text: `Expanded: ${def.name} (-${formatRupiah(def.cost)})`,
            tone: 'good' as const,
          },
          ...st.sim.recentNotifications,
        ].slice(0, 6),
      },
    });
  },

  upgradeInternet: (planId) => {
    const st = get();
    const plan = INTERNET_PLANS[planId];
    if (st.sim.internetPlan === planId || st.sim.balance < plan.upgradeCost) {
      soundEngine.playError();
      return;
    }
    soundEngine.playStageUp();
    set({
      sim: {
        ...st.sim,
        balance: st.sim.balance - plan.upgradeCost,
        internetPlan: planId,
        todayExpenses: {
          ...st.sim.todayExpenses,
          equipment: st.sim.todayExpenses.equipment + plan.upgradeCost,
        },
        recentNotifications: [
          {
            id: `net_${planId}`,
            text: `Upgraded Internet to ${plan.name}`,
            tone: 'good' as const,
          },
          ...st.sim.recentNotifications,
        ].slice(0, 6),
      },
    });
  },

  upgradeLighting: (tierId) => {
    const st = get();
    const tier = LIGHTING_TIERS[tierId];
    if (st.sim.lightingTier === tierId || st.sim.balance < tier.upgradeCost) {
      soundEngine.playError();
      return;
    }
    soundEngine.playStageUp();
    set({
      sim: {
        ...st.sim,
        balance: st.sim.balance - tier.upgradeCost,
        lightingTier: tierId,
        todayExpenses: {
          ...st.sim.todayExpenses,
          equipment: st.sim.todayExpenses.equipment + tier.upgradeCost,
        },
      },
    });
  },

  openBranch: (branchId) => {
    const st = get();
    const b = st.sim.branches.find((x) => x.id === branchId);
    if (!b || b.opened || st.sim.balance < b.openCost) {
      soundEngine.playError();
      return;
    }
    soundEngine.playStageUp();
    set({
      sim: {
        ...st.sim,
        balance: st.sim.balance - b.openCost,
        branches: st.sim.branches.map((x) =>
          x.id === branchId ? { ...x, opened: true } : x,
        ),
        todayExpenses: {
          ...st.sim.todayExpenses,
          equipment: st.sim.todayExpenses.equipment + b.openCost,
        },
      },
    });
  },

  upgradeBranch: (branchId) => {
    const st = get();
    const b = st.sim.branches.find((x) => x.id === branchId);
    if (!b || !b.opened || b.level >= 5) return;
    const cost = Math.round(b.openCost * 0.45 * b.level);
    if (st.sim.balance < cost) {
      soundEngine.playError();
      return;
    }
    soundEngine.playStageUp();
    set({
      sim: {
        ...st.sim,
        balance: st.sim.balance - cost,
        branches: st.sim.branches.map((x) =>
          x.id === branchId ? { ...x, level: x.level + 1 } : x,
        ),
      },
    });
  },

  setHourlyRateMultiplier: (mult) =>
    set((st) => ({
      sim: {
        ...st.sim,
        hourlyRateMultiplier: Math.max(0.7, Math.min(1.5, Number(mult.toFixed(2)))),
      },
    })),

  setMembershipPrice: (price) =>
    set((st) => ({
      sim: { ...st.sim, membershipPrice: Math.max(10_000, Math.min(100_000, price)) },
    })),

  resolveEvent: (choiceId) => {
    const st = get();
    const next = resolveRandomEventChoice(st.sim, choiceId);
    soundEngine.playBuildPlace();
    set({ sim: next });
  },

  claimQuest: (questId) => {
    const st = get();
    const next = claimDailyQuest(st.sim, questId);
    if (next !== st.sim) {
      soundEngine.playStageUp();
      set({ sim: next });
    }
  },

  toggleMute: () =>
    set((st) => {
      const muted = !st.muted;
      soundEngine.setSettings({ muted });
      return { muted };
    }),

  setMusicEnabled: (v) => {
    soundEngine.setSettings({ musicEnabled: v });
    set({ musicEnabled: v });
  },

  setAmbientEnabled: (v) => {
    soundEngine.setSettings({ ambientEnabled: v });
    set({ ambientEnabled: v });
  },

  setMasterVolume: (v) => {
    soundEngine.setSettings({ masterVolume: v });
    set({ masterVolume: v });
  },

  refreshSaveSlots: async () => {
    const slots = await listSaveSlots();
    set({ saveSlots: slots });
  },

  saveToSlot: async (slotId) => {
    const st = get();
    await saveGameToSlot(slotId, st.sim, st.dayDurationSeconds);
    const slots = await listSaveSlots();
    soundEngine.playBuildPlace();
    set({
      saveSlots: slots,
      lastSaveMessage: `Saved Day ${st.sim.day} to ${slotId.replace('_', ' ')}`,
    });
  },

  loadFromSlot: async (slotId) => {
    const rec = await loadGameFromSlot(slotId);
    if (!rec) return;
    const normalized = normalizeSimulationState(rec.state);
    soundEngine.unlockAndStart();
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
    }
    set({
      sim: normalized,
      dayDurationSeconds: rec.dayDurationSeconds,
      screenState: 'playing',
      speed: 1,
      activeTab: null,
      buildItem: null,
      selectedObjectId: null,
      endlessContinued: normalized.gameWon,
      lastSaveMessage: `Loaded Day ${rec.meta.day}`,
    });
  },

  deleteSlot: async (slotId) => {
    await deleteSaveSlot(slotId);
    const slots = await listSaveSlots();
    set({ saveSlots: slots });
  },
}));
