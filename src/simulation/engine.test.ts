import test from 'node:test';
import assert from 'node:assert/strict';
import type { SimulationState } from '../types/game';
import {
  claimDailyQuest,
  createInitialSimulationState,
  hireStaffMember,
  normalizeSimulationState,
  placeCatalogObject,
  repairComputerManual,
  resolveRandomEventChoice,
  settleEndOfDay,
  stepSimulation,
  upgradeComputerTier,
} from './engine';
import { PC_TIERS } from './catalog';
import {
  PEAK_HOUR_MULTIPLIER,
  computeCafeComfortMetrics,
  countComputers,
  formatRupiah,
  getPeakHourMultiplier,
  isPeakHour,
} from './economy';
import {
  findGridPath,
  getChairAccessTile,
  getCounterBehindTile,
  getTileElevation,
} from './grid';
import {
  clampNumber,
  computeEmpireScore,
  isValidFirebaseId,
  sanitizeLeaderboardLabel,
} from '../firebase/leaderboardUtils';

test('initial state matches starter specification (Rp5,000,000, 2 PCs, 1 counter, 0 staff)', () => {
  const state = createInitialSimulationState();
  assert.equal(state.balance, 5_000_000);
  assert.equal(countComputers(state.objects), 2);
  assert.equal(state.staff.length, 0);
  assert.equal(state.stage, 1);
  assert.equal(formatRupiah(state.balance), 'Rp5.000.000');
});

test('building placement validates bounds, deducts cash, and adds functional PC stations', () => {
  const state = createInitialSimulationState();

  // Invalid out-of-bounds placement (unexpanded room)
  const invalid = placeCatalogObject(state, 'station_tier1', 10, 2, 0);
  assert.equal(invalid.ok, false);
  assert.equal(invalid.state.balance, 5_000_000);

  // Valid placement inside starter room
  const placed = placeCatalogObject(state, 'station_tier1', 5, 1, 0);
  assert.equal(placed.ok, true);
  assert.equal(countComputers(placed.state.objects), 3);
  assert.equal(placed.state.balance, 5_000_000 - 1_550_000);
});

test('grid pathfinding navigates around desks inside starter shop', () => {
  const state = createInitialSimulationState();
  const path = findGridPath({ x: 4, z: 7 }, { x: 1, z: 2 }, state.unlockedRooms, state.objects);
  assert.ok(path.length > 0);
  const last = path[path.length - 1];
  assert.equal(last.x, 1);
  assert.equal(last.z, 2);
});

test('customers enter, play on PCs, pay bills, and increase daily revenue', () => {
  let state = createInitialSimulationState();
  const deterministicRng = () => 0.35;

  // Simulate ~45 seconds at 120s/day (~9 in-game hours) so customers spawn, play, and pay
  for (let i = 0; i < 90; i++) {
    const res = stepSimulation(state, 0.5, 120, deterministicRng);
    state = res.state;
  }

  assert.ok(state.totalCustomersServed > 0, 'At least one customer should complete a full session');
  assert.ok(state.todayRevenue.pcRental > 0, 'PC rental revenue should increase after checkout');
});

test('technician staff autonomously repairs degraded PCs', () => {
  let state = createInitialSimulationState();
  // Degrade PC 1
  state = {
    ...state,
    objects: state.objects.map((o) =>
      o.id === 'obj_station_1' && o.computer
        ? { ...o, computer: { ...o.computer, condition: 35, isBroken: true } }
        : o,
    ),
  };

  state = hireStaffMember(state, 'technician', () => 0.2);
  assert.equal(state.staff.length, 1);

  for (let i = 0; i < 40; i++) {
    state = stepSimulation(state, 0.5, 120, () => 0.9).state;
  }

  const pc1 = state.objects.find((o) => o.id === 'obj_station_1')?.computer;
  assert.ok(pc1 && pc1.condition > 35, 'Technician should walk to and repair damaged PC');
  assert.equal(pc1?.isBroken, false);
});

test('PC repair, tier upgrade, random event resolution, and daily settlement work end-to-end', () => {
  let state = createInitialSimulationState();
  state = upgradeComputerTier(state, 'obj_station_1');
  const upgradedPc = state.objects.find((o) => o.id === 'obj_station_1')?.computer;
  assert.equal(upgradedPc?.tier, 2);

  // Degrade and repair manually
  state = {
    ...state,
    objects: state.objects.map((o) =>
      o.id === 'obj_station_2' && o.computer
        ? { ...o, computer: { ...o.computer, condition: 50, isBroken: false } }
        : o,
    ),
  };
  state = repairComputerManual(state, 'obj_station_2');
  assert.equal(state.objects.find((o) => o.id === 'obj_station_2')?.computer?.condition, 100);

  // Random event resolution
  state = {
    ...state,
    pendingEvent: {
      id: 'local_tournament',
      title: 'Community Esports Cup',
      description: 'Test tournament',
      triggeredDay: 2,
      choices: [
        {
          id: 'sponsor_cup',
          label: 'Host Official Tournament',
          description: 'Test',
          cost: 400_000,
          reputationDelta: 0.25,
          effectType: 'host_tournament',
        },
      ],
    },
  };
  const beforeBal = state.balance;
  state = resolveRandomEventChoice(state, 'sponsor_cup');
  assert.equal(state.pendingEvent, null);
  assert.ok(state.balance > beforeBal);

  // End-of-day settlement
  const settled = settleEndOfDay(state);
  assert.equal(settled.state.day, 2);
  assert.equal(settled.state.dailyHistory.length, 1);
});

test('rotation access tiles and cashier behind-counter tile match 3D FurnitureModel orientation', () => {
  const base = { id: 't', type: 'basic_desk' as const, x: 4, z: 4 };
  assert.deepEqual(getChairAccessTile({ ...base, rotation: 0 }), { x: 4, z: 5 });
  assert.deepEqual(getChairAccessTile({ ...base, rotation: 1 }), { x: 3, z: 4 });
  assert.deepEqual(getChairAccessTile({ ...base, rotation: 2 }), { x: 4, z: 3 });
  assert.deepEqual(getChairAccessTile({ ...base, rotation: 3 }), { x: 5, z: 4 });

  // Starter cashier counter at (1,5) rotation 3 faces +X aisle (2,5); staff stands behind at (0,5)
  const state = createInitialSimulationState();
  const counter = state.objects.find((o) => o.type === 'cashier_counter')!;
  assert.deepEqual(getChairAccessTile(counter), { x: 2, z: 5 });
  assert.deepEqual(getCounterBehindTile(counter), { x: 0, z: 5 });

  // Entrance reaches cashier front and both starter PC access tiles cleanly
  const toCashier = findGridPath({ x: 4, z: 7 }, getChairAccessTile(counter), state.unlockedRooms, state.objects);
  assert.deepEqual(toCashier[toCashier.length - 1], { x: 2, z: 5 });

  const pc1 = state.objects.find((o) => o.id === 'obj_station_1')!;
  const pc2 = state.objects.find((o) => o.id === 'obj_station_2')!;
  const toPc1 = findGridPath({ x: 4, z: 7 }, getChairAccessTile(pc1), state.unlockedRooms, state.objects);
  const toPc2 = findGridPath({ x: 4, z: 7 }, getChairAccessTile(pc2), state.unlockedRooms, state.objects);
  assert.deepEqual(toPc1[toPc1.length - 1], { x: 2, z: 1 });
  assert.deepEqual(toPc2[toPc2.length - 1], { x: 5, z: 1 });

  // Hire cashier and step once: cashier stands behind counter at (0,5) facing +X
  const withCashier = hireStaffMember(state, 'cashier', () => 0.1);
  assert.equal(Math.round(withCashier.staff[0].x), 0);
  assert.equal(Math.round(withCashier.staff[0].z), 5);
});

test('real-life economy balance: starter 2-PC warnet is profitable and PCs last well over a week without breaking', () => {
  let state = createInitialSimulationState();
  const rng = () => 0.4;

  // Run through Day 1 and full 24h Day 2 (~220 sim seconds at 120s/day)
  for (let i = 0; i < 440; i++) {
    state = stepSimulation(state, 0.5, 120, rng).state;
  }

  assert.ok(state.day >= 2, 'Simulation should advance past Day 1');
  const day2OrLatestReport = state.dailyHistory[0];
  assert.ok(day2OrLatestReport.netProfit > 0, `Expected positive daily net profit, got ${day2OrLatestReport.netProfit}`);
  assert.ok(state.balance > 5_000_000, `Expected balance to grow above starting capital, got ${state.balance}`);

  for (const obj of state.objects) {
    if (obj.computer) {
      assert.equal(obj.computer.isBroken, false, 'PCs should not break within 2 days of normal usage');
      assert.ok(obj.computer.condition > 70, `Expected PC condition > 70% after ~2 days, got ${obj.computer.condition}`);
    }
  }
});

test('customers enter and leave strictly through the entrance doorway tiles (x=3 or x=4), never through front walls', () => {
  const state = createInitialSimulationState();

  const assertDoorOnlyCrossing = (start: { x: number; z: number }, path: Array<{ x: number; z: number }>) => {
    let prev = start;
    let crossed = false;
    for (const step of path) {
      if ((prev.z >= 8 && step.z <= 7) || (prev.z <= 7 && step.z >= 8)) {
        crossed = true;
        assert.ok(
          (prev.x === 3 || prev.x === 4) && step.x === prev.x,
          `Path crossed front wall illegally from (${prev.x},${prev.z}) to (${step.x},${step.z})`,
        );
      }
      prev = step;
    }
    assert.ok(crossed, 'Expected path to cross the doorway threshold');
  };

  const enterLeft = findGridPath({ x: 1, z: 9 }, { x: 2, z: 1 }, state.unlockedRooms, state.objects);
  assertDoorOnlyCrossing({ x: 1, z: 9 }, enterLeft);

  const enterRight = findGridPath({ x: 6, z: 9 }, { x: 5, z: 1 }, state.unlockedRooms, state.objects);
  assertDoorOnlyCrossing({ x: 6, z: 9 }, enterRight);

  const leaveCashier = findGridPath({ x: 2, z: 5 }, { x: 4, z: 10 }, state.unlockedRooms, state.objects);
  assertDoorOnlyCrossing({ x: 2, z: 5 }, leaveCashier);
});

test('realistic Indonesian base rates and 17:00-21:00 peak hour multiplier boost session revenue by 1.5x', () => {
  // Base market rates
  assert.equal(PC_TIERS[1].hourlyRate, 4_000);
  assert.equal(PC_TIERS[2].hourlyRate, 7_000);
  assert.equal(PC_TIERS[3].hourlyRate, 12_000);
  assert.equal(PC_TIERS[4].hourlyRate, 18_000);

  // Peak hour boundaries: 17:00 <= t < 21:00
  assert.equal(isPeakHour(16 * 60 + 59), false);
  assert.equal(getPeakHourMultiplier(16 * 60 + 59), 1.0);
  assert.equal(isPeakHour(17 * 60), true);
  assert.equal(getPeakHourMultiplier(17 * 60), PEAK_HOUR_MULTIPLIER);
  assert.equal(isPeakHour(20 * 60 + 59), true);
  assert.equal(getPeakHourMultiplier(20 * 60 + 59), PEAK_HOUR_MULTIPLIER);
  assert.equal(isPeakHour(21 * 60), false);
  assert.equal(getPeakHourMultiplier(21 * 60), 1.0);

  // Compare identical 2-hour seated session at 10:00 vs 17:00
  const runSessionAtMinute = (startMinute: number) => {
    const base = createInitialSimulationState();
    const pcObj = base.objects.find((o) => o.id === 'obj_station_1')!;
    let state: SimulationState = {
      ...base,
      minuteOfDay: startMinute,
      objects: base.objects.map((o) =>
        o.id === 'obj_station_1' && o.computer
          ? { ...o, computer: { ...o.computer, occupiedByCustomerId: 'cust_test' } }
          : o,
      ),
      customers: [
        {
          id: 'cust_test',
          name: 'Budi',
          archetype: 'student' as const,
          state: 'sitting_playing' as const,
          x: pcObj.x,
          z: pcObj.z + 0.38,
          facing: Math.PI,
          path: [],
          targetObjectId: 'obj_station_1',
          budget: 50_000,
          minPcTier: 1 as const,
          patience: 100,
          satisfaction: 90,
          sessionDurationHours: 2.0,
          sessionElapsedHours: 0,
          wantsPrinting: false,
          wantsSnack: false,
          wantsDrink: false,
          wantsMembership: false,
          billDue: 0,
          payTimer: 0,
          shirtColor: 0x3b82f6,
          pantsColor: 0x1e293b,
          hairColor: 0x111827,
          skinColor: 0xe0ac69,
          walkDistance: 0,
        },
      ],
    };

    // 20 real seconds at 120s/day = 4 in-game hours (plenty to finish 2h session + pay)
    for (let i = 0; i < 40; i++) {
      state = stepSimulation(state, 0.5, 120, () => 0.99).state;
    }
    return state.todayRevenue.pcRental;
  };

  const offPeakRev = runSessionAtMinute(10 * 60); // 10:00 - 12:00 -> 2h * 4,000 = 8,000
  const peakRev = runSessionAtMinute(17 * 60); // 17:00 - 19:00 -> 2h * 4,000 * 1.5 = 12,000

  assert.equal(offPeakRev, 8_000);
  assert.equal(peakRev, 12_000);
});

test('leaderboard empire score and payload sanitization respect blueprint constraints', () => {
  const starter = createInitialSimulationState();
  // 5,000,000 balance + 2 PCs * 500,000 + 2.6 rep * 200,000 = 6,520,000
  assert.equal(computeEmpireScore(starter), 6_520_000);

  const grown = {
    ...starter,
    balance: 12_000_000,
    totalCustomersServed: 50,
    branches: starter.branches.map((b, i) => (i === 0 ? { ...b, opened: true } : b)),
  };
  assert.ok(computeEmpireScore(grown) > computeEmpireScore(starter));

  // Sanitization enforces 1..40 length and trims whitespace
  assert.equal(sanitizeLeaderboardLabel('   ', 'Warnet Nusantara'), 'Warnet Nusantara');
  const longName = 'A'.repeat(65);
  assert.equal(sanitizeLeaderboardLabel(longName, 'Fallback').length, 40);

  // Firebase ID validation rejects injection/punctuation
  assert.equal(isValidFirebaseId('user_123-ABC'), true);
  assert.equal(isValidFirebaseId('bad$id/slash'), false);
  assert.equal(isValidFirebaseId(''), false);

  assert.equal(clampNumber(150, 0, 100), 100);
  assert.equal(clampNumber(Number.NaN, 0, 100), 0);
});

test('daily quests track customer checkouts and grant cash/rep once claimed', () => {
  let state = createInitialSimulationState();
  const rng = () => 0.35;

  for (let i = 0; i < 120; i++) {
    state = stepSimulation(state, 0.5, 120, rng).state;
  }

  const serveQuest = state.dailyQuests.find((q) => q.kind === 'serve_customers')!;
  assert.ok(serveQuest.progress > 0, 'Serve customers quest should track checkouts');

  // Top up progress to complete and claim cleanly
  state = {
    ...state,
    dailyQuests: state.dailyQuests.map((q) =>
      q.id === serveQuest.id ? { ...q, progress: q.target } : q,
    ),
  };
  const beforeBal = state.balance;
  const beforeRep = state.reputation;
  const claimed = claimDailyQuest(state, serveQuest.id);

  assert.equal(claimed.balance, beforeBal + serveQuest.rewardCash);
  assert.ok(claimed.reputation > beforeRep);
  assert.equal(claimed.questsCompletedCount, 1);
  assert.equal(claimed.dailyQuests.find((q) => q.id === serveQuest.id)?.claimed, true);

  // Double-claim is a no-op
  const doubleClaim = claimDailyQuest(claimed, serveQuest.id);
  assert.equal(doubleClaim.balance, claimed.balance);
});

test('second floor deck unlocks elevation and enforces staircase pathfinding via z=1..2', () => {
  const base = createInitialSimulationState();
  const expanded: SimulationState = {
    ...base,
    unlockedRooms: ['starter', 'backroom', 'esports_wing', 'vip_lounge', 'second_floor'],
  };

  assert.equal(getTileElevation(4, 5), 0);
  assert.equal(getTileElevation(17, 2), 0.72);

  const path = findGridPath({ x: 4, z: 7 }, { x: 17, z: 4 }, expanded.unlockedRooms, expanded.objects);
  assert.ok(path.length > 0, 'Path to 2nd floor should be reachable');

  let prev = { x: 4, z: 7 };
  let crossedStair = false;
  for (const step of path) {
    if ((prev.x <= 15 && step.x >= 16) || (prev.x >= 16 && step.x <= 15)) {
      crossedStair = true;
      assert.ok(
        step.z === 1 || step.z === 2,
        `2nd floor crossing must use staircase z=1..2, got (${prev.x},${prev.z}) -> (${step.x},${step.z})`,
      );
    }
    prev = step;
  }
  assert.ok(crossedStair, 'Expected path to cross staircase at x=15 <-> 16');
});

test('CCTV coverage, weather cycle, competitor shares, reviews, and legacy save normalization work', () => {
  let state = createInitialSimulationState();
  state = { ...state, balance: 20_000_000 };

  const placedCam = placeCatalogObject(state, 'cctv_camera', 0, 6, 0);
  assert.equal(placedCam.ok, true);
  state = placedCam.state;

  const comfort = computeCafeComfortMetrics(state);
  assert.ok(comfort.cctvCoverage >= 45, 'Placed CCTV camera should increase deterrence coverage');

  // Step enough hours to trigger weather cycle & customer reviews/activities
  for (let i = 0; i < 160; i++) {
    state = stepSimulation(state, 0.5, 60, () => 0.25).state;
  }
  assert.ok(
    state.weather === 'sunny' || state.weather === 'overcast' || state.weather === 'rain',
    'Weather stays valid',
  );
  assert.ok(state.reviews.length > 0, 'Completed sessions should populate customer reviews');

  // End-of-day updates competitors dynamically
  const settled = settleEndOfDay(state).state;
  assert.equal(settled.competitors.length, 3);
  assert.ok(settled.competitors.every((c) => c.marketSharePct >= 8));

  // Legacy save missing expansion fields normalizes cleanly
  const legacyRaw = { ...createInitialSimulationState() } as Partial<SimulationState>;
  delete legacyRaw.weather;
  delete legacyRaw.dailyQuests;
  delete legacyRaw.competitors;
  delete legacyRaw.reviews;
  delete legacyRaw.cctvLog;
  const normalized = normalizeSimulationState(legacyRaw as SimulationState);
  assert.equal(normalized.weather, 'sunny');
  assert.equal(normalized.dailyQuests.length, 3);
  assert.equal(normalized.competitors.length, 3);
  assert.equal(normalized.branches.length, 4);
});

