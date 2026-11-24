import type {
  ActiveRandomEvent,
  CatalogItemType,
  CctvIncident,
  CompetitorWarnet,
  CustomerActivity,
  CustomerArchetype,
  CustomerEntity,
  CustomerReview,
  DailyQuest,
  DailyReport,
  ExpenseBreakdown,
  GridPoint,
  PcTier,
  PlacedObject,
  RandomEventId,
  RevenueBreakdown,
  SimulationState,
  StaffMember,
  StaffRole,
  WeatherType,
} from '../types/game';
import {
  CATALOG_ITEMS,
  CUSTOMER_ARCHETYPE_INFO,
  INDONESIAN_NAMES,
  INITIAL_BRANCHES,
  INTERNET_PLANS,
  PC_TIERS,
  PROGRESSION_STAGES,
  STAFF_TEMPLATES,
  STARTING_CAPITAL,
  createStarterObjects,
} from './catalog';
import {
  computeBusinessRating,
  computeCafeComfortMetrics,
  computeDailyElectricityCost,
  computeDailyMaintenanceCost,
  computeDailyRent,
  computeManualRepairCost,
  countComputers,
  evaluateProgressionStage,
  formatRupiah,
  formatTimeClock,
  getPeakHourMultiplier,
  sumExpenses,
  sumRevenue,
} from './economy';
import {
  ENTRANCE_DOOR_POS,
  STREET_SPAWN_POS,
  canPlaceItemAt,
  findGridPath,
  getChairAccessTile,
  getCounterBehindTile,
  getRotationForwardVector,
  isTileWalkable,
} from './grid';

export interface SimSoundCue {
  type: 'door_chime' | 'cash_register' | 'pc_repair' | 'event_alert' | 'stage_up' | 'quest_done' | 'cctv_alert';
}

export interface StepResult {
  state: SimulationState;
  cues: SimSoundCue[];
}

export function emptyRevenue(): RevenueBreakdown {
  return {
    pcRental: 0,
    printing: 0,
    snacks: 0,
    drinks: 0,
    memberships: 0,
    tournaments: 0,
    branches: 0,
  };
}

export function emptyExpenses(): ExpenseBreakdown {
  return {
    electricity: 0,
    internet: 0,
    rent: 0,
    salaries: 0,
    maintenance: 0,
    equipment: 0,
    events: 0,
  };
}

export function createInitialCompetitors(): CompetitorWarnet[] {
  return [
    {
      id: 'rival_cyber88',
      name: 'Cyber88 Net',
      district: 'Blok M Alley',
      reputation: 2.7,
      hourlyPrice: 4_500,
      pcCount: 6,
      marketSharePct: 32,
      promoActive: false,
    },
    {
      id: 'rival_kopinet',
      name: 'KopiNet Arena',
      district: 'Kampus Selatan',
      reputation: 3.3,
      hourlyPrice: 6_500,
      pcCount: 10,
      marketSharePct: 26,
      promoActive: false,
    },
    {
      id: 'rival_garuda',
      name: 'Garuda Esports Lounge',
      district: 'Sudirman Hub',
      reputation: 4.0,
      hourlyPrice: 11_000,
      pcCount: 18,
      marketSharePct: 22,
      promoActive: false,
    },
  ];
}

export function generateDailyQuests(day: number, pcCount = 2): DailyQuest[] {
  const serveTarget = Math.min(28, 3 + Math.floor(day * 1.4) + Math.floor(pcCount * 0.5));
  const revTarget = Math.min(2_500_000, (90_000 + day * 45_000) * Math.max(1, Math.floor(pcCount / 2)));
  return [
    {
      id: `q_serve_d${day}`,
      title: `Serve ${serveTarget} Customers`,
      description: 'Complete checkouts at the cashier counter today.',
      kind: 'serve_customers',
      target: serveTarget,
      progress: 0,
      rewardCash: 150_000 + day * 35_000,
      rewardRep: 0.08,
      claimed: false,
    },
    {
      id: `q_rev_d${day}`,
      title: `Earn ${formatRupiah(revTarget)}`,
      description: 'Generate gross daily revenue from PCs, snacks & services.',
      kind: 'earn_revenue',
      target: revTarget,
      progress: 0,
      rewardCash: 220_000 + day * 45_000,
      rewardRep: 0.1,
      claimed: false,
    },
    {
      id: `q_clean_d${day}`,
      title: 'Maintain Cleanliness ≥ 80%',
      description: 'Keep the warnet tidy for neighborhood regulars.',
      kind: 'keep_clean',
      target: 80,
      progress: 92,
      rewardCash: 120_000 + day * 25_000,
      rewardRep: 0.06,
      claimed: false,
    },
  ];
}

export function createInitialSimulationState(): SimulationState {
  return {
    day: 1,
    minuteOfDay: 480, // 08:00 AM opening time
    balance: STARTING_CAPITAL,
    reputation: 2.6,
    cleanliness: 92,
    stage: 1,
    unlockedRooms: ['starter'],
    internetPlan: 'adsl_1m',
    lightingTier: 'fluorescent',
    hourlyRateMultiplier: 1.0,
    membershipPrice: 25_000,
    objects: createStarterObjects(),
    customers: [],
    staff: [],
    branches: INITIAL_BRANCHES.map((b) => ({ ...b })),
    todayRevenue: emptyRevenue(),
    todayExpenses: emptyExpenses(),
    todayCustomersServed: 0,
    totalCustomersServed: 0,
    customerArchetypeCounts: {
      casual: 0,
      student: 0,
      office: 0,
      hardcore: 0,
      competitive: 0,
    },
    dailyHistory: [],
    pendingEvent: null,
    effects: {
      internetOutageHours: 0,
      powerOutageHours: 0,
      demandMultiplier: 1,
      demandBoostHours: 0,
      equipmentDiscountPct: 0,
      discountHours: 0,
      tournamentActiveHours: 0,
    },
    lastEventDay: 0,
    spawnAccumulator: 0.75, // spawn first customer quickly so shop comes alive right away
    nextEntityId: 100,
    gameWon: false,
    gameOverReason: null,
    recentNotifications: [],
    weather: 'sunny',
    weatherHoursLeft: 5.5,
    dailyQuests: generateDailyQuests(1, 2),
    reviews: [],
    loyaltyCustomersCount: 0,
    competitors: createInitialCompetitors(),
    cctvLog: [],
    snackUnitsSold: 0,
    drinkUnitsSold: 0,
    questsCompletedCount: 0,
  };
}

export function normalizeSimulationState(raw: SimulationState): SimulationState {
  const pcCount = countComputers(raw.objects ?? []);
  const branchIds = new Set((raw.branches ?? []).map((b) => b.id));
  const mergedBranches = [
    ...(raw.branches ?? []),
    ...INITIAL_BRANCHES.filter((b) => !branchIds.has(b.id)).map((b) => ({ ...b })),
  ];
  return {
    ...raw,
    branches: mergedBranches,
    weather: raw.weather ?? 'sunny',
    weatherHoursLeft: typeof raw.weatherHoursLeft === 'number' ? raw.weatherHoursLeft : 4.5,
    dailyQuests:
      Array.isArray(raw.dailyQuests) && raw.dailyQuests.length > 0
        ? raw.dailyQuests
        : generateDailyQuests(raw.day ?? 1, pcCount),
    reviews: Array.isArray(raw.reviews) ? raw.reviews : [],
    loyaltyCustomersCount: typeof raw.loyaltyCustomersCount === 'number' ? raw.loyaltyCustomersCount : 0,
    competitors:
      Array.isArray(raw.competitors) && raw.competitors.length > 0
        ? raw.competitors
        : createInitialCompetitors(),
    cctvLog: Array.isArray(raw.cctvLog) ? raw.cctvLog : [],
    snackUnitsSold: typeof raw.snackUnitsSold === 'number' ? raw.snackUnitsSold : 0,
    drinkUnitsSold: typeof raw.drinkUnitsSold === 'number' ? raw.drinkUnitsSold : 0,
    questsCompletedCount: typeof raw.questsCompletedCount === 'number' ? raw.questsCompletedCount : 0,
  };
}

function pushNotification(
  list: SimulationState['recentNotifications'],
  id: string,
  text: string,
  tone: 'good' | 'warn' | 'bad',
) {
  const next = [{ id, text, tone }, ...list];
  return next.slice(0, 6);
}

const SHIRT_COLORS = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xe2e8f0, 0x14b8a6, 0xf97316];
const PANTS_COLORS = [0x1e293b, 0x334155, 0x1e3a8a, 0x475569, 0x27272a];
const HAIR_COLORS = [0x18181b, 0x27272a, 0x451a03, 0x3f2e21];
const SKIN_COLORS = [0xd9a077, 0xc68b59, 0xe5b895, 0xb67b50];

function pickCustomerArchetype(state: SimulationState, rng: () => number): CustomerArchetype {
  const maxTier = state.objects.reduce<PcTier>(
    (acc, o) => (o.computer && o.computer.tier > acc ? o.computer.tier : acc),
    1,
  );
  const roll = rng();
  if (maxTier >= 3 && state.reputation >= 3.5 && roll < 0.18) return 'competitive';
  if (maxTier >= 2 && roll < 0.42) return 'hardcore';
  if (roll < 0.62) return 'student';
  if (roll < 0.82) return 'office';
  return 'casual';
}

function findAvailablePcForCustomer(
  objects: PlacedObject[],
  minTier: PcTier,
): PlacedObject | null {
  const candidates = objects.filter(
    (o) =>
      o.computer &&
      !o.computer.isBroken &&
      o.computer.occupiedByCustomerId === null &&
      o.computer.tier >= minTier,
  );
  if (candidates.length === 0) {
    // Fallback to any free working PC if player doesn't have higher tier yet
    const anyFree = objects.filter(
      (o) => o.computer && !o.computer.isBroken && o.computer.occupiedByCustomerId === null,
    );
    return anyFree[0] ?? null;
  }
  // Prefer highest condition & matching tier
  candidates.sort((a, b) => (b.computer!.condition - a.computer!.condition));
  return candidates[0];
}

function getCashierStaffPost(
  objects: PlacedObject[],
  unlockedRooms: SimulationState['unlockedRooms'],
): { pos: GridPoint; facing: number } {
  const counter = objects.find((o) => o.type === 'cashier_counter');
  if (!counter) return { pos: ENTRANCE_DOOR_POS, facing: 0 };
  const behind = getCounterBehindTile(counter);
  const pos = isTileWalkable(behind.x, behind.z, unlockedRooms, objects)
    ? behind
    : getChairAccessTile(counter);
  const facing = Math.atan2(counter.x - pos.x, counter.z - pos.z);
  return { pos, facing };
}

function moveAlongPath(
  entity: { x: number; z: number; facing: number; path: GridPoint[]; walkDistance: number },
  speedTilesPerSec: number,
  realDt: number,
): boolean {
  if (entity.path.length === 0) return true;
  let remaining = speedTilesPerSec * realDt;

  while (remaining > 0 && entity.path.length > 0) {
    const target = entity.path[0];
    const dx = target.x - entity.x;
    const dz = target.z - entity.z;
    const dist = Math.hypot(dx, dz);

    if (dist <= 0.001) {
      entity.x = target.x;
      entity.z = target.z;
      entity.path.shift();
      continue;
    }

    entity.facing = Math.atan2(dx, dz);
    if (dist <= remaining) {
      entity.x = target.x;
      entity.z = target.z;
      entity.walkDistance += dist;
      remaining -= dist;
      entity.path.shift();
    } else {
      const step = remaining / dist;
      entity.x += dx * step;
      entity.z += dz * step;
      entity.walkDistance += remaining;
      remaining = 0;
    }
  }

  return entity.path.length === 0;
}

function buildRandomEvent(day: number, _state: SimulationState, rng: () => number): ActiveRandomEvent {
  const pool: RandomEventId[] = [
    'internet_outage',
    'power_outage',
    'broken_pc',
    'busy_weekend',
    'school_holiday',
    'local_tournament',
    'equipment_discount',
    'unexpected_maintenance',
    'rival_price_war',
    'viral_streamer',
    'monsoon_rush',
    'snack_boom',
  ];
  const idx = Math.floor(rng() * pool.length);
  const id = pool[idx];

  switch (id) {
    case 'internet_outage':
      return {
        id,
        title: 'Fiber Backbone Cut',
        description: 'The neighborhood ISP junction box tripped. Customers cannot connect online!',
        triggeredDay: day,
        choices: [
          {
            id: 'priority_tech',
            label: 'Hire Emergency ISP Tech',
            description: 'Restores internet immediately for Rp250,000.',
            cost: 250_000,
            reputationDelta: 0.1,
            effectType: 'fix_outage_now',
          },
          {
            id: 'wait_isp',
            label: 'Wait for Standard Repair',
            description: 'Internet stays down for ~3 in-game hours.',
            cost: 0,
            reputationDelta: -0.15,
            effectType: 'wait_outage',
          },
        ],
      };
    case 'power_outage':
      return {
        id,
        title: 'PLN Neighborhood Blackout',
        description: 'A transformer overload cut grid power on this street!',
        triggeredDay: day,
        choices: [
          {
            id: 'rent_genset',
            label: 'Rent Portable Genset',
            description: 'Keep every rig running uninterrupted for Rp350,000.',
            cost: 350_000,
            reputationDelta: 0.15,
            effectType: 'rent_genset',
          },
          {
            id: 'wait_pln',
            label: 'Wait Out the Blackout',
            description: 'PCs shut down for ~2.5 hours. Customers leave early.',
            cost: 0,
            reputationDelta: -0.2,
            effectType: 'close_briefly',
          },
        ],
      };
    case 'broken_pc':
      return {
        id,
        title: 'PSU Surge Damage',
        description: 'A voltage spike damaged PC power supplies. Quick servicing is needed.',
        triggeredDay: day,
        choices: [
          {
            id: 'express_parts',
            label: 'Replace Damaged PSUs',
            description: 'Restore all PCs to 95% condition for Rp300,000.',
            cost: 300_000,
            reputationDelta: 0.05,
            effectType: 'repair_all',
          },
          {
            id: 'defer_parts',
            label: 'Let Staff Handle Later',
            description: 'Save cash now, though 1 PC takes heavy wear.',
            cost: 0,
            reputationDelta: -0.1,
            effectType: 'ignore_repair',
          },
        ],
      };
    case 'busy_weekend':
      return {
        id: 'busy_weekend',
        title: 'Payday Weekend Surge',
        description: 'Neighborhood gamers are heading out in droves tonight!',
        triggeredDay: day,
        choices: [
          {
            id: 'welcome_crowd',
            label: 'Open Full Throttle',
            description: '+65% customer traffic for the next 8 hours.',
            cost: 0,
            reputationDelta: 0.08,
            effectType: 'standard_ops',
          },
        ],
      };
    case 'school_holiday':
      return {
        id,
        title: 'School Holiday Rush',
        description: 'Local students finished exams and want marathon LAN sessions!',
        triggeredDay: day,
        choices: [
          {
            id: 'holiday_promo',
            label: 'Launch Holiday Marathon',
            description: '+55% student & gamer traffic for 10 hours.',
            cost: 0,
            reputationDelta: 0.1,
            effectType: 'standard_ops',
          },
        ],
      };
    case 'local_tournament':
      return {
        id,
        title: 'Community Esports Cup',
        description: 'Local clans want to host a weekend mini-tournament at your warnet.',
        triggeredDay: day,
        choices: [
          {
            id: 'sponsor_cup',
            label: 'Host Official Tournament',
            description: `Invest Rp400,000 in prizes; collect entry fees & boost reputation (+0.25★).`,
            cost: 400_000,
            reputationDelta: 0.25,
            effectType: 'host_tournament',
          },
          {
            id: 'skip_cup',
            label: 'Keep Normal Walk-In Hours',
            description: 'No upfront cost; modest crowd bump.',
            cost: 0,
            reputationDelta: 0,
            effectType: 'standard_ops',
          },
        ],
      };
    case 'equipment_discount':
      return {
        id,
        title: 'Mangga Dua Hardware Clearance',
        description: 'Your wholesale supplier offers 20% off all new PCs and desks for 8 hours!',
        triggeredDay: day,
        choices: [
          {
            id: 'claim_voucher',
            label: 'Activate 20% Supplier Discount',
            description: 'Build & PC purchases cost 20% less for 8 in-game hours.',
            cost: 0,
            reputationDelta: 0,
            effectType: 'buy_bulk_discount',
          },
        ],
      };
    case 'rival_price_war':
      return {
        id,
        title: 'Rival Warnet Happy Hour Promo',
        description: 'Cyber88 Net down the street slashed hourly rates for the evening!',
        triggeredDay: day,
        choices: [
          {
            id: 'match_promo',
            label: 'Launch Free Ice Tea Promo',
            description: 'Spend Rp180,000 on promo vouchers to draw +55% crowd & +0.12★ rep.',
            cost: 180_000,
            reputationDelta: 0.12,
            effectType: 'promo_counter',
          },
          {
            id: 'hold_firm',
            label: 'Focus on PC Quality',
            description: 'Keep standard pricing and let regulars decide.',
            cost: 0,
            reputationDelta: 0,
            effectType: 'standard_ops',
          },
        ],
      };
    case 'viral_streamer':
      return {
        id,
        title: 'Local Gaming Creator Visit',
        description: 'An Indonesian gaming YouTuber wants to livestream from your warnet!',
        triggeredDay: day,
        choices: [
          {
            id: 'sponsor_stream',
            label: 'Sponsor Creator Stream Setup',
            description: 'Invest Rp280,000 for +85% foot traffic & +0.2★ reputation.',
            cost: 280_000,
            reputationDelta: 0.2,
            effectType: 'streamer_collab',
          },
          {
            id: 'normal_seat',
            label: 'Offer Regular Walk-In Seat',
            description: 'Free shoutout, +35% traffic bump.',
            cost: 0,
            reputationDelta: 0.08,
            effectType: 'standard_ops',
          },
        ],
      };
    case 'monsoon_rush':
      return {
        id,
        title: 'Tropical Downpour Outside',
        description: 'Heavy rain keeps pedestrians seeking warm Indomie & dry gaming seats!',
        triggeredDay: day,
        choices: [
          {
            id: 'cozy_rain',
            label: 'Turn Up AC & Hot Indomie Deal',
            description: '+60% cozy shelter demand for 6 hours.',
            cost: 0,
            reputationDelta: 0.08,
            effectType: 'rain_cozy',
          },
        ],
      };
    case 'snack_boom':
      return {
        id,
        title: 'Midnight Snack Craving Wave',
        description: 'Gamers around the block are craving Indomie Telur & Es Kopi Susu!',
        triggeredDay: day,
        choices: [
          {
            id: 'stock_promo',
            label: 'Stock Fresh Indomie & Kopi Bundle',
            description: 'Spend Rp140,000 to boost instant snack revenue & +40% traffic.',
            cost: 140_000,
            reputationDelta: 0.1,
            effectType: 'snack_bundle',
          },
        ],
      };
    case 'unexpected_maintenance':
    default:
      return {
        id: 'unexpected_maintenance',
        title: 'AC & Roof Leak Inspection',
        description: 'Tropical rain exposed a leaking gutter above the electrical panel.',
        triggeredDay: day,
        choices: [
          {
            id: 'fix_leak',
            label: 'Hire Handyman Immediately',
            description: 'Prevent equipment damage for Rp220,000.',
            cost: 220_000,
            reputationDelta: 0.05,
            effectType: 'pay_maintenance',
          },
          {
            id: 'patch_bucket',
            label: 'Use Temporary Tarp',
            description: 'Free now, but cleanliness drops by 20%.',
            cost: 0,
            reputationDelta: -0.1,
            effectType: 'ignore_repair',
          },
        ],
      };
  }
}

export function resolveRandomEventChoice(
  state: SimulationState,
  choiceId: string,
): SimulationState {
  if (!state.pendingEvent) return state;
  const choice = state.pendingEvent.choices.find((c) => c.id === choiceId);
  if (!choice) return state;

  let nextBalance = state.balance - choice.cost;
  const nextExpenses = { ...state.todayExpenses, events: state.todayExpenses.events + choice.cost };
  const nextRevenue = { ...state.todayRevenue };
  const nextEffects = { ...state.effects };
  let nextCleanliness = state.cleanliness;
  let nextWeather: WeatherType = state.weather ?? 'sunny';
  let nextObjects = state.objects.map((o) => (o.computer ? { ...o, computer: { ...o.computer } } : o));

  switch (choice.effectType) {
    case 'fix_outage_now':
      nextEffects.internetOutageHours = 0;
      break;
    case 'wait_outage':
      nextEffects.internetOutageHours = 3;
      break;
    case 'rent_genset':
      nextEffects.powerOutageHours = 0;
      break;
    case 'close_briefly':
      nextEffects.powerOutageHours = 2.5;
      break;
    case 'repair_all':
      nextObjects = nextObjects.map((o) =>
        o.computer ? { ...o, computer: { ...o.computer, condition: 95, isBroken: false } } : o,
      );
      break;
    case 'ignore_repair':
      if (state.pendingEvent.id === 'broken_pc') {
        const firstPc = nextObjects.find((o) => o.computer && !o.computer.isBroken);
        if (firstPc?.computer) {
          firstPc.computer.condition = Math.max(15, firstPc.computer.condition - 45);
          if (firstPc.computer.condition <= 20) firstPc.computer.isBroken = true;
        }
      } else {
        nextCleanliness = Math.max(20, nextCleanliness - 20);
      }
      break;
    case 'host_tournament': {
      const pcCount = countComputers(nextObjects);
      const entryFees = Math.max(600_000, pcCount * 110_000);
      nextBalance += entryFees;
      nextRevenue.tournaments += entryFees;
      nextEffects.demandMultiplier = 1.7;
      nextEffects.demandBoostHours = 8;
      nextEffects.tournamentActiveHours = 8;
      break;
    }
    case 'standard_ops':
      nextEffects.demandMultiplier =
        state.pendingEvent.id === 'busy_weekend'
          ? 1.65
          : state.pendingEvent.id === 'viral_streamer'
            ? 1.35
            : 1.55;
      nextEffects.demandBoostHours = 8;
      break;
    case 'buy_bulk_discount':
      nextEffects.equipmentDiscountPct = 20;
      nextEffects.discountHours = 8;
      break;
    case 'pay_maintenance':
      nextCleanliness = Math.min(100, nextCleanliness + 10);
      break;
    case 'promo_counter':
      nextEffects.demandMultiplier = 1.55;
      nextEffects.demandBoostHours = 7;
      break;
    case 'streamer_collab':
      nextEffects.demandMultiplier = 1.85;
      nextEffects.demandBoostHours = 8;
      break;
    case 'rain_cozy':
      nextWeather = 'rain';
      nextEffects.demandMultiplier = 1.6;
      nextEffects.demandBoostHours = 6;
      break;
    case 'snack_bundle':
      nextBalance += 260_000;
      nextRevenue.snacks += 260_000;
      nextEffects.demandMultiplier = 1.4;
      nextEffects.demandBoostHours = 6;
      break;
  }

  const nextRep = Math.max(0.5, Math.min(5.0, Number((state.reputation + choice.reputationDelta).toFixed(2))));
  const notifText = `${state.pendingEvent.title}: ${choice.label}`;

  return {
    ...state,
    balance: nextBalance,
    reputation: nextRep,
    cleanliness: nextCleanliness,
    weather: nextWeather,
    objects: nextObjects,
    todayRevenue: nextRevenue,
    todayExpenses: nextExpenses,
    effects: nextEffects,
    pendingEvent: null,
    recentNotifications: pushNotification(
      state.recentNotifications,
      `evt_${state.day}_${choice.id}`,
      notifText,
      choice.reputationDelta >= 0 ? 'good' : 'warn',
    ),
  };
}

export function getDiscountedCost(baseCost: number, effects: SimulationState['effects']): number {
  if (effects.discountHours > 0 && effects.equipmentDiscountPct > 0) {
    return Math.round(baseCost * (1 - effects.equipmentDiscountPct / 100));
  }
  return baseCost;
}

export function placeCatalogObject(
  state: SimulationState,
  type: CatalogItemType,
  x: number,
  z: number,
  rotation: 0 | 1 | 2 | 3,
): { state: SimulationState; ok: boolean; error?: string } {
  const check = canPlaceItemAt(type, x, z, state.unlockedRooms, state.objects);
  if (!check.valid) {
    return { state, ok: false, error: check.reason };
  }

  const def = CATALOG_ITEMS[type];
  const finalCost = getDiscountedCost(def.cost, state.effects);
  if (state.balance < finalCost) {
    return { state, ok: false, error: 'Insufficient Rupiah balance' };
  }

  let nextId = state.nextEntityId;
  let nextObjects = state.objects.map((o) => ({ ...o }));

  if (check.targetDeskId) {
    nextObjects = nextObjects.map((obj) => {
      if (obj.id !== check.targetDeskId) return obj;
      if (def.category === 'computers' && def.pcTier) {
        return {
          ...obj,
          computer: {
            id: `pc_${nextId++}`,
            tier: def.pcTier,
            condition: 100,
            occupiedByCustomerId: null,
            beingRepairedByStaffId: null,
            totalHoursUsed: 0,
            totalRevenue: 0,
            isBroken: false,
          },
        };
      }
      if (def.isChair && def.chairStyle) {
        return {
          ...obj,
          hasChair: true,
          chairStyle: def.chairStyle,
        };
      }
      return obj;
    });
  } else {
    const newObj: PlacedObject = {
      id: `obj_${nextId++}`,
      type,
      x,
      z,
      rotation,
      hasChair: def.id.startsWith('station_') ? true : undefined,
      chairStyle: def.chairStyle,
    };
    if (def.pcTier) {
      newObj.computer = {
        id: `pc_${nextId++}`,
        tier: def.pcTier,
        condition: 100,
        occupiedByCustomerId: null,
        beingRepairedByStaffId: null,
        totalHoursUsed: 0,
        totalRevenue: 0,
        isBroken: false,
      };
    }
    nextObjects.push(newObj);
  }

  const nextState: SimulationState = {
    ...state,
    balance: state.balance - finalCost,
    objects: nextObjects,
    nextEntityId: nextId,
    todayExpenses: {
      ...state.todayExpenses,
      equipment: state.todayExpenses.equipment + finalCost,
    },
    recentNotifications: pushNotification(
      state.recentNotifications,
      `buy_${nextId}`,
      `Installed ${def.name} (-${formatRupiah(finalCost)})`,
      'good',
    ),
  };

  nextState.stage = evaluateProgressionStage(nextState);
  return { state: nextState, ok: true };
}

export function repairComputerManual(state: SimulationState, objectId: string): SimulationState {
  const target = state.objects.find((o) => o.id === objectId && o.computer);
  if (!target || !target.computer) return state;
  const missing = 100 - target.computer.condition;
  if (missing <= 1 && !target.computer.isBroken) return state;

  const cost = computeManualRepairCost(target.computer.condition);
  if (state.balance < cost) return state;

  const nextObjects = state.objects.map((o) =>
    o.id === objectId && o.computer
      ? { ...o, computer: { ...o.computer, condition: 100, isBroken: false, beingRepairedByStaffId: null } }
      : o,
  );

  return {
    ...state,
    balance: state.balance - cost,
    objects: nextObjects,
    todayExpenses: {
      ...state.todayExpenses,
      maintenance: state.todayExpenses.maintenance + cost,
    },
    recentNotifications: pushNotification(
      state.recentNotifications,
      `rep_${objectId}_${state.minuteOfDay}`,
      `Repaired PC to 100% (-${formatRupiah(cost)})`,
      'good',
    ),
  };
}

export function upgradeComputerTier(state: SimulationState, objectId: string): SimulationState {
  const target = state.objects.find((o) => o.id === objectId && o.computer);
  if (!target || !target.computer) return state;
  if (target.computer.tier >= 4) return state;
  const nextTier = (target.computer.tier + 1) as PcTier;
  const upgradeCost = getDiscountedCost(
    Math.round(PC_TIERS[nextTier].cost - PC_TIERS[target.computer.tier].cost * 0.45),
    state.effects,
  );
  if (state.balance < upgradeCost) return state;

  const nextObjects = state.objects.map((o) =>
    o.id === objectId && o.computer
      ? {
          ...o,
          computer: {
            ...o.computer,
            tier: nextTier,
            condition: 100,
            isBroken: false,
          },
        }
      : o,
  );

  const nextState: SimulationState = {
    ...state,
    balance: state.balance - upgradeCost,
    objects: nextObjects,
    todayExpenses: {
      ...state.todayExpenses,
      equipment: state.todayExpenses.equipment + upgradeCost,
    },
    recentNotifications: pushNotification(
      state.recentNotifications,
      `upg_${objectId}_${nextTier}`,
      `Upgraded rig to ${PC_TIERS[nextTier].name} (-${formatRupiah(upgradeCost)})`,
      'good',
    ),
  };
  nextState.stage = evaluateProgressionStage(nextState);
  return nextState;
}

export function sellPlacedObject(state: SimulationState, objectId: string): SimulationState {
  const target = state.objects.find((o) => o.id === objectId);
  if (!target) return state;
  // Don't allow selling last cashier counter
  if (target.type === 'cashier_counter') {
    const counters = state.objects.filter((o) => o.type === 'cashier_counter').length;
    if (counters <= 1) return state;
  }
  const refund = Math.round(CATALOG_ITEMS[target.type].cost * 0.5);
  const remainingObjects = state.objects.filter((o) => o.id !== objectId);
  const nextCustomers = state.customers.map((c) => {
    if (c.targetObjectId === objectId) {
      return {
        ...c,
        targetObjectId: null,
        state: 'leaving' as const,
        path: findGridPath({ x: c.x, z: c.z }, STREET_SPAWN_POS, state.unlockedRooms, remainingObjects),
      };
    }
    return c;
  });

  return {
    ...state,
    balance: state.balance + refund,
    objects: remainingObjects,
    customers: nextCustomers,
    recentNotifications: pushNotification(
      state.recentNotifications,
      `sell_${objectId}`,
      `Sold ${CATALOG_ITEMS[target.type].name} (+${formatRupiah(refund)})`,
      'warn',
    ),
  };
}

export function hireStaffMember(state: SimulationState, role: StaffRole, rng: () => number): SimulationState {
  const tpl = STAFF_TEMPLATES[role];
  if (state.balance < tpl.hireCost) return state;

  const id = `staff_${state.nextEntityId}`;
  const name = INDONESIAN_NAMES[Math.floor(rng() * INDONESIAN_NAMES.length)];
  const startPos =
    role === 'cashier'
      ? getCashierStaffPost(state.objects, state.unlockedRooms).pos
      : ENTRANCE_DOOR_POS;

  const member: StaffMember = {
    id,
    name: `${name} (${tpl.title.split(' ')[0]})`,
    role,
    salary: tpl.dailySalary,
    skillLevel: 1,
    productivity: 1.0,
    experience: 0,
    x: startPos.x,
    z: startPos.z,
    facing: 0,
    path: [],
    state: 'idle',
    targetObjectId: null,
    walkDistance: 0,
  };

  const nextState: SimulationState = {
    ...state,
    balance: state.balance - tpl.hireCost,
    staff: [...state.staff, member],
    nextEntityId: state.nextEntityId + 1,
    todayExpenses: {
      ...state.todayExpenses,
      equipment: state.todayExpenses.equipment + tpl.hireCost,
    },
    recentNotifications: pushNotification(
      state.recentNotifications,
      `hire_${id}`,
      `Hired ${member.name} (-${formatRupiah(tpl.hireCost)})`,
      'good',
    ),
  };
  nextState.stage = evaluateProgressionStage(nextState);
  return nextState;
}

export function trainStaffMember(state: SimulationState, staffId: string): SimulationState {
  const member = state.staff.find((s) => s.id === staffId);
  if (!member || member.skillLevel >= 5) return state;
  const cost = member.skillLevel * 350_000;
  if (state.balance < cost) return state;

  return {
    ...state,
    balance: state.balance - cost,
    staff: state.staff.map((s) =>
      s.id === staffId
        ? {
            ...s,
            skillLevel: s.skillLevel + 1,
            productivity: Number((s.productivity + 0.2).toFixed(2)),
            salary: Math.round(s.salary * 1.15),
          }
        : s,
    ),
    todayExpenses: {
      ...state.todayExpenses,
      events: state.todayExpenses.events + cost,
    },
  };
}

export function fireStaffMember(state: SimulationState, staffId: string): SimulationState {
  return {
    ...state,
    staff: state.staff.filter((s) => s.id !== staffId),
  };
}

export function claimDailyQuest(state: SimulationState, questId: string): SimulationState {
  const quest = state.dailyQuests.find((q) => q.id === questId);
  if (!quest || quest.claimed || quest.progress < quest.target) return state;

  const nextRep = Math.max(0.5, Math.min(5.0, Number((state.reputation + quest.rewardRep).toFixed(2))));
  return {
    ...state,
    balance: state.balance + quest.rewardCash,
    reputation: nextRep,
    questsCompletedCount: state.questsCompletedCount + 1,
    dailyQuests: state.dailyQuests.map((q) => (q.id === questId ? { ...q, claimed: true } : q)),
    recentNotifications: pushNotification(
      state.recentNotifications,
      `quest_${questId}`,
      `Quest Claimed: ${quest.title} (+${formatRupiah(quest.rewardCash)})`,
      'good',
    ),
  };
}

function updateCompetitorsDaily(state: SimulationState): CompetitorWarnet[] {
  const playerScore = computeBusinessRating(state);
  const rivals = state.competitors.map((c, idx) => {
    const drift = idx === 0 ? 0.04 : idx === 1 ? 0.03 : 0.02;
    const nextRep = Math.min(4.7, Number((c.reputation + (c.reputation < 3.8 ? drift : 0)).toFixed(2)));
    return {
      ...c,
      reputation: nextRep,
      promoActive: (state.day + idx) % 4 === 0,
    };
  });

  // Compute dynamic market shares summing ~100% including player
  const playerWeight = Math.max(15, playerScore * (1.25 - (state.hourlyRateMultiplier - 1.0) * 0.4));
  const rivalWeights = rivals.map((r) => r.reputation * 14 + r.pcCount * 0.9 + (r.promoActive ? 6 : 0));
  const totalWeight = playerWeight + rivalWeights.reduce((a, b) => a + b, 0);
  return rivals.map((r, i) => ({
    ...r,
    marketSharePct: Math.max(8, Math.round((rivalWeights[i] / totalWeight) * 100)),
  }));
}

export function settleEndOfDay(state: SimulationState): {
  state: SimulationState;
  stageUp: boolean;
} {
  const elec = computeDailyElectricityCost(state.objects, state.lightingTier);
  const net = INTERNET_PLANS[state.internetPlan].dailyCost;
  const rent = computeDailyRent(state.unlockedRooms);
  const salaries = state.staff.reduce((acc, s) => acc + s.salary, 0);
  const maint = computeDailyMaintenanceCost(state.objects);
  const branchIncome = state.branches.reduce((acc, b) => acc + (b.opened ? b.dailyProfit * b.level : 0), 0);

  const finalRev: RevenueBreakdown = {
    ...state.todayRevenue,
    branches: state.todayRevenue.branches + branchIncome,
  };
  const finalExp: ExpenseBreakdown = {
    ...state.todayExpenses,
    electricity: state.todayExpenses.electricity + elec,
    internet: state.todayExpenses.internet + net,
    rent: state.todayExpenses.rent + rent,
    salaries: state.todayExpenses.salaries + salaries,
    maintenance: state.todayExpenses.maintenance + maint,
  };

  const dailyOperatingCashDelta = branchIncome - (elec + net + rent + salaries + maint);
  let nextBalance = state.balance + dailyOperatingCashDelta;

  const totalRev = sumRevenue(finalRev);
  const totalExp = sumExpenses(finalExp);
  const netProfit = totalRev - totalExp;

  const report: DailyReport = {
    day: state.day,
    revenue: finalRev,
    expenses: finalExp,
    totalRevenue: totalRev,
    totalExpenses: totalExp,
    netProfit,
    customersServed: state.todayCustomersServed,
    endingBalance: nextBalance,
    reputation: state.reputation,
  };

  const prevStage = state.stage;
  const evalState = { ...state, balance: nextBalance };
  const nextStage = evaluateProgressionStage(evalState);
  let stageUp = false;
  let stageBonus = 0;

  if (nextStage > prevStage) {
    stageUp = true;
    const def = PROGRESSION_STAGES.find((p) => p.id === nextStage);
    if (def) {
      stageBonus = def.rewardCash;
      nextBalance += stageBonus;
    }
  }

  let gameWon = state.gameWon;
  let gameOverReason = state.gameOverReason;
  if (nextStage === 5 && !state.gameWon) {
    gameWon = true;
  }
  if (nextBalance < -2_000_000) {
    gameOverReason = 'Bankruptcy: Operating debt exceeded Rp2,000,000 credit limit.';
  }

  const nextNotifications = pushNotification(
    state.recentNotifications,
    `day_${state.day}`,
    `Day ${state.day} Settled · Net ${netProfit >= 0 ? '+' : ''}${formatRupiah(netProfit)}`,
    netProfit >= 0 ? 'good' : 'bad',
  );

  const nextDay = state.day + 1;
  const nextQuests = generateDailyQuests(nextDay, countComputers(state.objects)).map((q) =>
    q.kind === 'keep_clean' ? { ...q, progress: Math.round(state.cleanliness) } : q,
  );

  return {
    stageUp,
    state: {
      ...state,
      day: nextDay,
      minuteOfDay: 0,
      balance: nextBalance,
      stage: nextStage,
      todayRevenue: emptyRevenue(),
      todayExpenses: emptyExpenses(),
      todayCustomersServed: 0,
      dailyHistory: [report, ...state.dailyHistory].slice(0, 30),
      dailyQuests: nextQuests,
      competitors: updateCompetitorsDaily(state),
      gameWon,
      gameOverReason,
      recentNotifications: stageUp
        ? pushNotification(
            nextNotifications,
            `stage_${nextStage}`,
            `Milestone Unlocked: Stage ${nextStage}! (+${formatRupiah(stageBonus)})`,
            'good',
          )
        : nextNotifications,
    },
  };
}

function buildCustomerReview(
  cust: CustomerEntity,
  comfort: ReturnType<typeof computeCafeComfortMetrics>,
  cleanliness: number,
  day: number,
  rng: () => number,
): CustomerReview {
  const stars = Math.max(1, Math.min(5, Math.round(1 + (cust.satisfaction / 100) * 4)));
  let comment: string;
  if (stars >= 5) {
    const positives = [
      comfort.cooling >= 60 ? 'AC dingin banget, PC kenceng no lag!' : 'Warnet nyaman, internet ngebut!',
      comfort.hasSnacks || comfort.hasDrinks ? 'Indomie + Es Teh sambil push rank mantap!' : 'Tempat bersih & pelayanannya ramah.',
      comfort.wifi >= 75 ? 'Ping stabil 12ms main kompetitif lancar jaya.' : 'Kursinya empuk, betah main lama di sini.',
    ];
    comment = positives[Math.floor(rng() * positives.length)];
  } else if (stars >= 3) {
    const mids = [
      comfort.cooling < 50 ? 'Seru mainnya, tapi agak gerah pas ramai.' : 'Lumayan oke buat main bareng teman.',
      comfort.wifi < 60 ? 'Kadang agak ngelag pas jam sibuk, tapi masih aman.' : 'Harga pas di kantong anak sekolah.',
      cleanliness < 70 ? 'PC bagus, cuma meja agak perlu dibersihkan.' : 'Cukup nyaman buat ngerjain tugas & gaming.',
    ];
    comment = mids[Math.floor(rng() * mids.length)];
  } else {
    const lows = [
      cleanliness < 55 ? 'Ruangan kurang bersih, tolong dirapikan.' : 'Koneksi sering putus bikin kalah rank!',
      'Harga agak mahal buat spek PC yang dipakai.',
      'Sering error atau PC kurang terawat.',
    ];
    comment = lows[Math.floor(rng() * lows.length)];
  }
  return {
    id: `rev_${day}_${cust.id}`,
    author: cust.name,
    rating: stars,
    comment,
    day,
    archetype: cust.archetype,
  };
}

/**
 * Advances the entire warnet simulation by simDt (scaled game seconds).
 * Default dayDurationSeconds = 120s => 1440 in-game minutes / 120s = 12 game minutes per real second.
 */
export function stepSimulation(
  state: SimulationState,
  simDt: number,
  dayDurationSeconds = 120,
  rng: () => number = Math.random,
): StepResult {
  if (simDt <= 0 || state.gameOverReason) {
    return { state, cues: [] };
  }

  const cues: SimSoundCue[] = [];
  const minutesPerSec = 1440 / Math.max(30, dayDurationSeconds);
  const deltaMinutes = simDt * minutesPerSec;
  const deltaHours = deltaMinutes / 60;

  let nextMinute = state.minuteOfDay + deltaMinutes;
  let nextBalance = state.balance;
  let nextRep = state.reputation;
  const comfort = computeCafeComfortMetrics(state);
  const trashSlowdown = Math.max(0.5, 1 - comfort.trashBinCount * 0.18);
  let nextCleanliness = Math.max(15, state.cleanliness - deltaHours * 0.65 * trashSlowdown);
  const nextRevenue = { ...state.todayRevenue };
  let nextTodayServed = state.todayCustomersServed;
  let nextTotalServed = state.totalCustomersServed;
  const nextArchetypeCounts = { ...state.customerArchetypeCounts };
  let nextEntityId = state.nextEntityId;
  let nextNotifs = state.recentNotifications;
  let nextLoyaltyCount = state.loyaltyCustomersCount ?? 0;
  let nextReviews = state.reviews ?? [];
  let nextCctvLog = state.cctvLog ?? [];
  let nextSnackUnits = state.snackUnitsSold ?? 0;
  let nextDrinkUnits = state.drinkUnitsSold ?? 0;

  // Weather progression
  let nextWeather: WeatherType = state.weather ?? 'sunny';
  let nextWeatherHoursLeft = (state.weatherHoursLeft ?? 4) - deltaHours;
  if (nextWeatherHoursLeft <= 0) {
    const roll = rng();
    nextWeather = roll < 0.46 ? 'sunny' : roll < 0.74 ? 'overcast' : 'rain';
    nextWeatherHoursLeft = 3.5 + rng() * 3.5;
  }

  const nextEffects = {
    ...state.effects,
    internetOutageHours: Math.max(0, state.effects.internetOutageHours - deltaHours),
    powerOutageHours: Math.max(0, state.effects.powerOutageHours - deltaHours),
    demandBoostHours: Math.max(0, state.effects.demandBoostHours - deltaHours),
    discountHours: Math.max(0, state.effects.discountHours - deltaHours),
    tournamentActiveHours: Math.max(0, state.effects.tournamentActiveHours - deltaHours),
  };
  if (nextEffects.demandBoostHours === 0) nextEffects.demandMultiplier = 1;
  if (nextEffects.discountHours === 0) nextEffects.equipmentDiscountPct = 0;

  const nextObjects = state.objects.map((o) =>
    o.computer ? { ...o, computer: { ...o.computer } } : { ...o },
  );

  const cashierCount = state.staff.filter((s) => s.role === 'cashier').length;
  const hasCashierStaff = cashierCount > 0;
  const hasSecurityStaff = state.staff.some((s) => s.role === 'security');
  // Every cashier contributes to throughput; cap the bonus to avoid trivializing the queue.
  const cashierSpeedBonus = 1 + Math.min(cashierCount, 6) * 0.85;

  // 1. Spawn new customers based on demand curve + loyalty + weather
  const hour = (nextMinute % 1440) / 60;
  const timeFactor =
    hour >= 17 && hour < 21
      ? 1.6
      : hour >= 14 && hour <= 23
        ? 1.3
        : hour >= 9 && hour < 14
          ? 0.95
          : hour >= 0 && hour < 6
            ? 0.45
            : 0.7;

  const pcCount = countComputers(nextObjects);
  const freePcCount = nextObjects.filter(
    (o) => o.computer && !o.computer.isBroken && o.computer.occupiedByCustomerId === null,
  ).length;

  const loyaltyBonus = 1 + Math.min(0.28, nextLoyaltyCount * 0.008);
  const weatherTrafficBonus = nextWeather === 'rain' ? 1.12 : nextWeather === 'overcast' ? 1.04 : 1.0;

  const demandRatePerGameHour =
    (1.15 + pcCount * 0.55) *
    (0.6 + nextRep * 0.28) *
    timeFactor *
    loyaltyBonus *
    weatherTrafficBonus *
    nextEffects.demandMultiplier *
    (nextEffects.powerOutageHours > 0 ? 0.15 : 1.0);

  let nextSpawnAcc = state.spawnAccumulator + demandRatePerGameHour * deltaHours;
  const nextCustomers: CustomerEntity[] = state.customers.map((c) => ({
    ...c,
    path: c.path.map((p) => ({ ...p })),
  }));

  if (nextSpawnAcc >= 1 && freePcCount > 0 && nextCustomers.length < pcCount + 3) {
    nextSpawnAcc -= 1;
    const archetype = pickCustomerArchetype(state, rng);
    const info = CUSTOMER_ARCHETYPE_INFO[archetype];
    const targetObj = findAvailablePcForCustomer(nextObjects, info.minTier);

    if (targetObj && targetObj.computer) {
      const custId = `cust_${nextEntityId++}`;
      targetObj.computer.occupiedByCustomerId = custId;
      const accessTile = getChairAccessTile(targetObj);
      const spawnX = rng() < 0.5 ? 2 + rng() * 1.5 : 4 + rng() * 2;
      const spawnZ = 9;
      const startTile = { x: Math.round(spawnX), z: spawnZ };
      const path = findGridPath(startTile, accessTile, state.unlockedRooms, nextObjects);
      const isRegular = nextLoyaltyCount > 2 && rng() < Math.min(0.45, 0.12 + nextLoyaltyCount * 0.015);
      const budgetMult = isRegular ? 1.2 : 1.0;
      const budget =
        (info.budgetRange[0] + rng() * (info.budgetRange[1] - info.budgetRange[0])) * budgetMult;
      const plannedHours =
        info.hoursRange[0] + rng() * (info.hoursRange[1] - info.hoursRange[0]);

      const customer: CustomerEntity = {
        id: custId,
        name: INDONESIAN_NAMES[Math.floor(rng() * INDONESIAN_NAMES.length)],
        archetype,
        state: 'walking_to_pc',
        x: spawnX,
        z: spawnZ,
        facing: Math.PI,
        path,
        targetObjectId: targetObj.id,
        budget,
        minPcTier: info.minTier,
        patience: 85 + rng() * 15,
        satisfaction: isRegular ? 84 : 78,
        sessionDurationHours: plannedHours,
        sessionElapsedHours: 0,
        wantsPrinting: comfort.hasPrinter && (archetype === 'student' || archetype === 'office') && rng() < 0.48,
        wantsSnack: comfort.hasSnacks && rng() < (isRegular ? 0.56 : 0.42),
        wantsDrink: (comfort.hasDrinks || comfort.hasCoffeeBar) && rng() < (comfort.hasCoffeeBar ? 0.65 : 0.5),
        wantsMembership: archetype !== 'casual' && rng() < 0.14,
        billDue: 0,
        payTimer: 0,
        shirtColor: SHIRT_COLORS[Math.floor(rng() * SHIRT_COLORS.length)],
        pantsColor: PANTS_COLORS[Math.floor(rng() * PANTS_COLORS.length)],
        hairColor: HAIR_COLORS[Math.floor(rng() * HAIR_COLORS.length)],
        skinColor: SKIN_COLORS[Math.floor(rng() * SKIN_COLORS.length)],
        walkDistance: 0,
        activity: 'idle',
        activityTimer: 2,
        queueIndex: 0,
        isRegular,
      };
      nextCustomers.push(customer);
      cues.push({ type: 'door_chime' });
    }
  } else {
    nextSpawnAcc = Math.min(nextSpawnAcc, 1.5);
  }

  // Compute current cashier queue slots so queued customers line up cleanly instead of overlapping
  const counterObj = nextObjects.find((o) => o.type === 'cashier_counter');
  const cashierFront = counterObj ? getChairAccessTile(counterObj) : ENTRANCE_DOOR_POS;
  const counterFwd = counterObj ? getRotationForwardVector(counterObj.rotation) : { dx: 0, dz: 1 };
  const anyonePayingNow = nextCustomers.some((c) => c.state === 'paying');
  const queuingCustomers = nextCustomers
    .filter((c) => c.state === 'walking_to_cashier')
    .sort((a, b) => Math.hypot(a.x - cashierFront.x, a.z - cashierFront.z) - Math.hypot(b.x - cashierFront.x, b.z - cashierFront.z));

  const queueOrderMap = new Map<string, number>();
  queuingCustomers.forEach((c, idx) => {
    queueOrderMap.set(c.id, idx + (anyonePayingNow ? 1 : 0));
  });

  // 2. Update Customers
  const walkSpeed = 2.6; // tiles per scaled sim second
  const survivingCustomers: CustomerEntity[] = [];

  for (const cust of nextCustomers) {
    if (cust.state === 'walking_to_pc') {
      cust.activity = 'idle';
      const arrived = moveAlongPath(cust, walkSpeed, simDt);
      const targetObj = nextObjects.find((o) => o.id === cust.targetObjectId);

      if (!targetObj || !targetObj.computer || targetObj.computer.isBroken) {
        cust.state = 'leaving';
        cust.targetObjectId = null;
        cust.path = findGridPath({ x: cust.x, z: cust.z }, STREET_SPAWN_POS, state.unlockedRooms, nextObjects);
      } else if (arrived) {
        cust.state = 'sitting_playing';
        cust.activity = 'typing';
        cust.activityTimer = 2.4 + rng() * 2.2;
        const fwd = getRotationForwardVector(targetObj.rotation);
        const seatDist =
          targetObj.chairStyle === 'pro' || targetObj.chairStyle === 'gaming'
            ? 0.42
            : targetObj.chairStyle === 'office'
              ? 0.4
              : 0.38;
        cust.x = targetObj.x + fwd.dx * seatDist;
        cust.z = targetObj.z + fwd.dz * seatDist;
        cust.facing = Math.atan2(-fwd.dx, -fwd.dz);
      }
      survivingCustomers.push(cust);
      continue;
    }

    if (cust.state === 'sitting_playing') {
      const targetObj = nextObjects.find((o) => o.id === cust.targetObjectId);
      if (!targetObj || !targetObj.computer || targetObj.computer.isBroken || nextEffects.powerOutageHours > 0) {
        if (targetObj?.computer) {
          const partialRental = Math.round(cust.billDue);
          cust.billDue = partialRental;
          targetObj.computer.totalRevenue += partialRental;
          if (targetObj.computer.occupiedByCustomerId === cust.id) {
            targetObj.computer.occupiedByCustomerId = null;
          }
        }
        cust.satisfaction = Math.max(20, cust.satisfaction - 22);
        cust.state = 'walking_to_cashier';
        cust.activity = 'idle';
        const exitTile = targetObj ? getChairAccessTile(targetObj) : { x: Math.round(cust.x), z: Math.round(cust.z) };
        cust.x = exitTile.x;
        cust.z = exitTile.z;
        cust.path = findGridPath(exitTile, cashierFront, state.unlockedRooms, nextObjects);
        survivingCustomers.push(cust);
        continue;
      }

      // Cycle realistic desk activity animations (typing / mouse / drinking / stretch idle)
      let actTimer = (cust.activityTimer ?? 2.5) - simDt;
      if (actTimer <= 0) {
        const pool: CustomerActivity[] = cust.wantsDrink
          ? ['typing', 'mouse', 'typing', 'drinking', 'idle']
          : ['typing', 'mouse', 'typing', 'idle'];
        cust.activity = pool[Math.floor(rng() * pool.length)];
        actTimer = cust.activity === 'drinking' ? 1.8 : 2.2 + rng() * 2.4;
      }
      cust.activityTimer = actTimer;

      const pc = targetObj.computer;
      const specs = PC_TIERS[pc.tier];
      if (cust.billDue === 0 && cust.sessionElapsedHours > 0) {
        cust.billDue = specs.hourlyRate * cust.sessionElapsedHours * state.hourlyRateMultiplier;
      }
      cust.sessionElapsedHours += deltaHours;

      const peakMult = getPeakHourMultiplier(nextMinute);
      cust.billDue += specs.hourlyRate * deltaHours * state.hourlyRateMultiplier * peakMult;

      const wearMultiplier = hasSecurityStaff || comfort.cctvCount > 0 ? 0.7 : 1.0;
      pc.condition = Math.max(0, pc.condition - deltaHours * 0.42 * wearMultiplier);
      pc.totalHoursUsed += deltaHours;
      if (pc.condition <= 5) {
        pc.isBroken = true;
      }

      nextCleanliness = Math.max(15, nextCleanliness - deltaHours * 0.25 * trashSlowdown);

      const tierDiff = pc.tier - cust.minPcTier;
      const tierScore = tierDiff >= 0 ? 4 : -10;
      const wifiPenalty = nextEffects.internetOutageHours > 0 ? -24 : (comfort.wifi - 60) * 0.12;
      const coolBonus = (comfort.cooling - 50) * 0.12;
      const cleanMod = (nextCleanliness - 60) * 0.08;
      const priceMod = (1.0 - state.hourlyRateMultiplier) * 14;
      const chairMod =
        targetObj.chairStyle === 'pro'
          ? 8
          : targetObj.chairStyle === 'gaming'
            ? 6
            : targetObj.chairStyle === 'office'
              ? 3
              : 0;
      const deskMod = targetObj.type === 'vip_desk' ? 4 : 0;

      const deltaSat = (tierScore + wifiPenalty + coolBonus + cleanMod + priceMod + chairMod + deskMod) * deltaHours * 0.5;
      cust.satisfaction = Math.max(10, Math.min(100, cust.satisfaction + deltaSat));

      if (cust.sessionElapsedHours >= cust.sessionDurationHours) {
        const minFloor = specs.hourlyRate * 0.5 * state.hourlyRateMultiplier;
        const rental = Math.round(Math.max(cust.billDue, minFloor));
        cust.billDue = rental;
        pc.totalRevenue += rental;
        pc.occupiedByCustomerId = null;
        cust.targetObjectId = null;
        cust.state = 'walking_to_cashier';
        cust.activity = 'idle';
        const exitTile = getChairAccessTile(targetObj);
        cust.x = exitTile.x;
        cust.z = exitTile.z;
        cust.path = findGridPath(exitTile, cashierFront, state.unlockedRooms, nextObjects);
      }

      survivingCustomers.push(cust);
      continue;
    }

    if (cust.state === 'walking_to_cashier') {
      const qIdx = queueOrderMap.get(cust.id) ?? 0;
      cust.queueIndex = qIdx;

      if (qIdx === 0) {
        const arrived = moveAlongPath(cust, walkSpeed, simDt);
        if (arrived) {
          cust.state = 'paying';
          cust.activity = 'idle';
          cust.payTimer = 0.7 / cashierSpeedBonus;
          if (counterObj) {
            cust.facing = Math.atan2(counterObj.x - cust.x, counterObj.z - cust.z);
          }
        }
      } else {
        // Stagger behind cashier front along aisle so customers visibly line up
        const slotX = cashierFront.x + counterFwd.dx * Math.min(2.2, qIdx * 0.72);
        const slotZ = cashierFront.z + counterFwd.dz * Math.min(2.2, qIdx * 0.72);
        const distToSlot = Math.hypot(slotX - cust.x, slotZ - cust.z);
        if (distToSlot > 0.35 && cust.path.length > 1) {
          moveAlongPath(cust, walkSpeed, simDt);
        } else if (distToSlot > 0.14) {
          const dx = slotX - cust.x;
          const dz = slotZ - cust.z;
          const step = Math.min(distToSlot, walkSpeed * simDt);
          cust.x += (dx / distToSlot) * step;
          cust.z += (dz / distToSlot) * step;
          cust.walkDistance += step;
          cust.facing = Math.atan2(dx, dz);
          cust.activity = 'idle';
        } else {
          // Waiting in queue — chat with adjacent customer if close
          if (counterObj) {
            cust.facing = Math.atan2(counterObj.x - cust.x, counterObj.z - cust.z);
          }
          const neighbor = nextCustomers.find(
            (other) =>
              other.id !== cust.id &&
              (other.state === 'walking_to_cashier' || other.state === 'paying') &&
              Math.hypot(other.x - cust.x, other.z - cust.z) < 1.35,
          );
          cust.activity = neighbor ? 'chatting' : 'idle';
        }
      }
      survivingCustomers.push(cust);
      continue;
    }

    if (cust.state === 'paying') {
      cust.payTimer -= simDt;
      if (cust.payTimer <= 0) {
        const walkoutAttempt = cust.satisfaction < 22 && rng() < 0.25;
        const cctvDeterred =
          walkoutAttempt &&
          (hasSecurityStaff || (comfort.cctvCount > 0 && rng() < Math.min(0.95, 0.65 + comfort.cctvCount * 0.2)));
        const walkout = walkoutAttempt && !cctvDeterred;

        if (walkoutAttempt && cctvDeterred) {
          const incident: CctvIncident = {
            id: `cctv_${state.day}_${cust.id}`,
            day: state.day,
            time: formatTimeClock(nextMinute),
            message: `CCTV/Security prevented ${cust.name} walkout (${formatRupiah(cust.billDue)})`,
            prevented: true,
          };
          nextCctvLog = [incident, ...nextCctvLog].slice(0, 15);
          cues.push({ type: 'cctv_alert' });
        }

        if (!walkout) {
          const upsellMult = hasCashierStaff ? 1.2 : 1.0;
          const rentalPaid = cust.billDue;
          const printPaid = cust.wantsPrinting ? Math.round(6_000 * upsellMult) : 0;
          const snackPaid = cust.wantsSnack ? Math.round(12_000 * upsellMult) : 0;
          const drinkBase = comfort.hasCoffeeBar ? 11_000 : 8_000;
          const drinkPaid = cust.wantsDrink ? Math.round(drinkBase * upsellMult) : 0;
          const memberPaid = cust.wantsMembership && cust.satisfaction >= 72 ? state.membershipPrice : 0;
          const totalPaid = rentalPaid + printPaid + snackPaid + drinkPaid + memberPaid;

          if (snackPaid > 0) nextSnackUnits += 1;
          if (drinkPaid > 0) nextDrinkUnits += 1;

          nextBalance += totalPaid;
          nextRevenue.pcRental += rentalPaid;
          nextRevenue.printing += printPaid;
          nextRevenue.snacks += snackPaid;
          nextRevenue.drinks += drinkPaid;
          nextRevenue.memberships += memberPaid;
          cues.push({ type: 'cash_register' });

          if (cust.satisfaction >= 78) {
            nextLoyaltyCount += 1;
          }
        } else {
          const incident: CctvIncident = {
            id: `walk_${state.day}_${cust.id}`,
            day: state.day,
            time: formatTimeClock(nextMinute),
            message: `${cust.name} left without paying (${formatRupiah(cust.billDue)} lost)`,
            prevented: false,
          };
          nextCctvLog = [incident, ...nextCctvLog].slice(0, 15);
          nextNotifs = pushNotification(
            nextNotifs,
            `walkout_${cust.id}`,
            `${cust.name} left without paying due to poor service!`,
            'bad',
          );
        }

        // Generate customer review periodically (always for first 3 customers)
        if (nextReviews.length < 3 || rng() < 0.45) {
          const rev = buildCustomerReview(cust, comfort, nextCleanliness, state.day, rng);
          nextReviews = [rev, ...nextReviews].slice(0, 20);
        }

        const repSample = 1.0 + (cust.satisfaction / 100) * 4.0;
        nextRep = Math.max(0.5, Math.min(5.0, Number((nextRep * 0.94 + repSample * 0.06).toFixed(2))));
        nextTodayServed += 1;
        nextTotalServed += 1;
        nextArchetypeCounts[cust.archetype] += 1;

        cust.state = 'leaving';
        cust.activity = 'idle';
        cust.path = findGridPath({ x: cust.x, z: cust.z }, STREET_SPAWN_POS, state.unlockedRooms, nextObjects);
      }
      survivingCustomers.push(cust);
      continue;
    }

    if (cust.state === 'leaving') {
      const arrived = moveAlongPath(cust, walkSpeed, simDt);
      if (!arrived) {
        survivingCustomers.push(cust);
      }
    }
  }

  // 3. Update Autonomous Staff
  const nextStaff: StaffMember[] = state.staff.map((s) => ({
    ...s,
    path: s.path.map((p) => ({ ...p })),
  }));

  for (const staff of nextStaff) {
    if (staff.role === 'cashier') {
      const { pos: post, facing } = getCashierStaffPost(nextObjects, state.unlockedRooms);
      const dist = Math.hypot(staff.x - post.x, staff.z - post.z);
      if (dist > 0.2) {
        if (staff.path.length === 0) {
          staff.path = findGridPath({ x: staff.x, z: staff.z }, post, state.unlockedRooms, nextObjects);
        }
        staff.state = 'walking';
        moveAlongPath(staff, 2.5, simDt);
      } else {
        staff.state = 'working';
        staff.facing = facing;
        staff.experience += deltaHours * 2;
      }
      continue;
    }

    if (staff.role === 'technician') {
      const wornPcObj = nextObjects
        .filter((o) => o.computer && (o.computer.isBroken || o.computer.condition < 82))
        .sort((a, b) => a.computer!.condition - b.computer!.condition)[0];

      if (wornPcObj && wornPcObj.computer) {
        const access = getChairAccessTile(wornPcObj);
        const dist = Math.hypot(staff.x - access.x, staff.z - access.z);
        if (dist > 0.8) {
          if (staff.targetObjectId !== wornPcObj.id || staff.path.length === 0) {
            staff.targetObjectId = wornPcObj.id;
            staff.path = findGridPath({ x: staff.x, z: staff.z }, access, state.unlockedRooms, nextObjects);
          }
          staff.state = 'walking';
          moveAlongPath(staff, 2.7, simDt);
        } else {
          staff.state = 'working';
          staff.facing = Math.atan2(wornPcObj.x - staff.x, wornPcObj.z - staff.z);
          const wasBroken = wornPcObj.computer.isBroken;
          wornPcObj.computer.condition = Math.min(
            100,
            wornPcObj.computer.condition + deltaHours * 45 * staff.productivity,
          );
          if (wornPcObj.computer.condition >= 40) {
            wornPcObj.computer.isBroken = false;
          }
          if (wasBroken && !wornPcObj.computer.isBroken) {
            cues.push({ type: 'pc_repair' });
          }
          staff.experience += deltaHours * 4;
        }
      } else {
        staff.state = 'idle';
        staff.targetObjectId = null;
      }
      continue;
    }

    if (staff.role === 'cleaner') {
      nextCleanliness = Math.min(100, nextCleanliness + deltaHours * 9 * staff.productivity);
      if (staff.path.length === 0) {
        const rx = Math.floor(rng() * 8);
        const rz = Math.floor(rng() * 8);
        if (isTileWalkable(rx, rz, state.unlockedRooms, nextObjects)) {
          staff.path = findGridPath({ x: staff.x, z: staff.z }, { x: rx, z: rz }, state.unlockedRooms, nextObjects);
        }
      }
      if (staff.path.length > 0) {
        staff.state = 'walking';
        moveAlongPath(staff, 2.1, simDt);
        staff.experience += deltaHours * 2;
      } else {
        staff.state = 'idle';
      }
      continue;
    }

    if (staff.role === 'security') {
      const guardPost = { x: ENTRANCE_DOOR_POS.x + 1, z: ENTRANCE_DOOR_POS.z - 1 };
      const dist = Math.hypot(staff.x - guardPost.x, staff.z - guardPost.z);
      if (dist > 0.3) {
        if (staff.path.length === 0) {
          staff.path = findGridPath({ x: staff.x, z: staff.z }, guardPost, state.unlockedRooms, nextObjects);
        }
        staff.state = 'walking';
        moveAlongPath(staff, 2.3, simDt);
      } else {
        staff.state = 'working';
        staff.facing = -0.35;
        staff.experience += deltaHours * 2;
      }
    }
  }

  // 4. Random Events (trigger once per day afternoon/evening if none pending)
  let nextPendingEvent = state.pendingEvent;
  let nextLastEventDay = state.lastEventDay;
  if (
    !nextPendingEvent &&
    state.day >= 2 &&
    state.lastEventDay < state.day &&
    nextMinute >= 720 &&
    rng() < deltaHours * 0.25
  ) {
    nextPendingEvent = buildRandomEvent(state.day, state, rng);
    nextLastEventDay = state.day;
    cues.push({ type: 'event_alert' });
  }

  // 5. Update Daily Quest Progress
  const grossTodayRev = sumRevenue(nextRevenue);
  const nextDailyQuests = (state.dailyQuests ?? []).map((q) => {
    if (q.kind === 'serve_customers') return { ...q, progress: nextTodayServed };
    if (q.kind === 'earn_revenue') return { ...q, progress: Math.round(grossTodayRev) };
    if (q.kind === 'keep_clean') return { ...q, progress: Math.round(nextCleanliness) };
    return q;
  });

  let updatedState: SimulationState = {
    ...state,
    minuteOfDay: nextMinute,
    balance: nextBalance,
    reputation: nextRep,
    cleanliness: nextCleanliness,
    objects: nextObjects,
    customers: survivingCustomers,
    staff: nextStaff,
    todayRevenue: nextRevenue,
    todayCustomersServed: nextTodayServed,
    totalCustomersServed: nextTotalServed,
    customerArchetypeCounts: nextArchetypeCounts,
    pendingEvent: nextPendingEvent,
    effects: nextEffects,
    lastEventDay: nextLastEventDay,
    spawnAccumulator: nextSpawnAcc,
    nextEntityId,
    recentNotifications: nextNotifs,
    weather: nextWeather,
    weatherHoursLeft: nextWeatherHoursLeft,
    dailyQuests: nextDailyQuests,
    reviews: nextReviews,
    loyaltyCustomersCount: nextLoyaltyCount,
    cctvLog: nextCctvLog,
    snackUnitsSold: nextSnackUnits,
    drinkUnitsSold: nextDrinkUnits,
  };

  updatedState.stage = evaluateProgressionStage(updatedState);

  // 6. Daily Settlement at Midnight
  if (updatedState.minuteOfDay >= 1440) {
    const settled = settleEndOfDay(updatedState);
    updatedState = settled.state;
    if (settled.stageUp) {
      cues.push({ type: 'stage_up' });
    }
  }

  return { state: updatedState, cues };
}
