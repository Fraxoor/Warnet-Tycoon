import type {
  ExpenseBreakdown,
  PlacedObject,
  ProgressionStageId,
  RevenueBreakdown,
  SimulationState,
} from '../types/game';
import {
  INTERNET_PLANS,
  LIGHTING_TIERS,
  PC_TIERS,
  PROGRESSION_STAGES,
  ROOM_EXPANSIONS,
} from './catalog';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rounded < 0 ? `-Rp${formatted}` : `Rp${formatted}`;
}

export const PEAK_HOUR_START = 17;
export const PEAK_HOUR_END = 21;
export const PEAK_HOUR_MULTIPLIER = 1.5;

export function formatTimeClock(minuteOfDay: number): string {
  const clamped = ((Math.floor(minuteOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isPeakHour(minuteOfDay: number): boolean {
  const clamped = ((Math.floor(minuteOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  return h >= PEAK_HOUR_START && h < PEAK_HOUR_END;
}

export function getPeakHourMultiplier(minuteOfDay: number): number {
  return isPeakHour(minuteOfDay) ? PEAK_HOUR_MULTIPLIER : 1.0;
}

export function sumRevenue(rev: RevenueBreakdown): number {
  return (
    rev.pcRental +
    rev.printing +
    rev.snacks +
    rev.drinks +
    rev.memberships +
    rev.tournaments +
    rev.branches
  );
}

export function sumExpenses(exp: ExpenseBreakdown): number {
  return (
    exp.electricity +
    exp.internet +
    exp.rent +
    exp.salaries +
    exp.maintenance +
    exp.equipment +
    exp.events
  );
}

export function countComputers(objects: PlacedObject[]): number {
  return objects.filter((o) => Boolean(o.computer)).length;
}

export function computeDailyElectricityCost(objects: PlacedObject[], lightingTier: SimulationState['lightingTier']): number {
  let watts = lightingTier === 'fluorescent' ? 250 : lightingTier === 'warm_cafe' ? 200 : lightingTier === 'rgb_gaming' ? 320 : 480;
  for (const obj of objects) {
    if (obj.computer) {
      watts += PC_TIERS[obj.computer.tier].powerWatts;
    }
    if (obj.type === 'ac_unit') watts += 900;
    if (obj.type === 'drink_fridge') watts += 220;
    if (obj.type === 'printer') watts += 90;
  }
  // Indonesian commercial kWh blended daily estimate (~Rp 1,450/kWh * ~10 active hrs)
  const kwhPerDay = (watts / 1000) * 10;
  return Math.round(kwhPerDay * 1450);
}

export function computeDailyRent(unlockedRooms: SimulationState['unlockedRooms']): number {
  let rent = 0;
  for (const r of unlockedRooms) {
    rent += ROOM_EXPANSIONS[r].dailyRentDelta;
  }
  return rent;
}

export function computeDailyMaintenanceCost(objects: PlacedObject[]): number {
  let total = 0;
  for (const obj of objects) {
    if (obj.computer) {
      total += PC_TIERS[obj.computer.tier].dailyMaintenance;
    }
  }
  return total;
}

export function computeManualRepairCost(condition: number): number {
  const missing = Math.max(0, 100 - condition);
  return Math.max(10_000, Math.round(missing * 750));
}

export function computeCafeComfortMetrics(state: SimulationState) {
  let cooling = 35; // baseline ambient tropical fan
  let wifi = INTERNET_PLANS[state.internetPlan].qualityScore;
  let decor = LIGHTING_TIERS[state.lightingTier].atmosphereBonus;
  let hasPrinter = false;
  let hasSnacks = false;
  let hasDrinks = false;
  let hasCoffeeBar = false;
  let cashierCount = 0;
  let cctvCount = 0;
  let trashBinCount = 0;
  let vipDeskCount = 0;

  for (const obj of state.objects) {
    if (obj.type === 'ac_unit') cooling += 25;
    if (obj.type === 'router') wifi += 14;
    if (obj.type === 'plant') decor += 4;
    if (obj.type === 'neon_poster') decor += 7;
    if (obj.type === 'wall_neon_sign') decor += 9;
    if (obj.type === 'rgb_lamp') decor += 6;
    if (obj.type === 'waiting_bench') decor += 3;
    if (obj.type === 'vip_desk') {
      decor += 5;
      vipDeskCount++;
    }
    if (obj.type === 'coffee_station') {
      decor += 3;
      hasCoffeeBar = true;
    }
    if (obj.type === 'printer') hasPrinter = true;
    if (obj.type === 'snack_rack') hasSnacks = true;
    if (obj.type === 'drink_fridge') hasDrinks = true;
    if (obj.type === 'cashier_counter') cashierCount++;
    if (obj.type === 'cctv_camera') cctvCount++;
    if (obj.type === 'trash_bin') trashBinCount++;
  }

  const hasSecurityStaff = state.staff.some((s) => s.role === 'security');
  const cctvCoverage = Math.min(100, cctvCount * 45 + (hasSecurityStaff ? 35 : 0));

  return {
    cooling: Math.min(100, cooling),
    wifi: state.effects.internetOutageHours > 0 ? 0 : Math.min(100, wifi),
    decor: Math.min(100, decor),
    hasPrinter,
    hasSnacks,
    hasDrinks,
    hasCoffeeBar,
    cashierCount,
    cctvCount,
    cctvCoverage,
    trashBinCount,
    vipDeskCount,
  };
}

export function evaluateProgressionStage(state: SimulationState): ProgressionStageId {
  const pcCount = countComputers(state.objects);
  const empCount = state.staff.length;
  let highest: ProgressionStageId = 1;

  for (const def of PROGRESSION_STAGES) {
    const roomOk = !def.requiredRoom || state.unlockedRooms.includes(def.requiredRoom);
    if (
      pcCount >= def.requiredPcs &&
      state.reputation >= def.requiredReputation &&
      empCount >= def.requiredEmployees &&
      roomOk
    ) {
      highest = def.id;
    }
  }
  return highest;
}

export function computeBusinessRating(state: SimulationState): number {
  const comfort = computeCafeComfortMetrics(state);
  const pcCount = countComputers(state.objects);
  const avgCondition =
    pcCount > 0
      ? state.objects.reduce((acc, o) => acc + (o.computer ? o.computer.condition : 0), 0) / pcCount
      : 50;

  const score =
    state.reputation * 12 +
    (comfort.cooling / 100) * 10 +
    (comfort.wifi / 100) * 12 +
    (state.cleanliness / 100) * 10 +
    (avgCondition / 100) * 8 +
    (comfort.cctvCoverage / 100) * 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}
