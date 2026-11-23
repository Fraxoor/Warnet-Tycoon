import React, { useState } from 'react';
import {
  Wrench,
  ArrowUpCircle,
  UserPlus,
  TrendingUp,
  Check,
  Lock,
  Save,
  Download,
  Trash2,
  Target,
  Star,
  Swords,
  ShieldCheck,
  Tv,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import {
  CATALOG_ITEMS,
  CUSTOMER_ARCHETYPE_INFO,
  INTERNET_PLANS,
  LIGHTING_TIERS,
  PC_TIERS,
  PROGRESSION_STAGES,
  ROOM_EXPANSIONS,
  STAFF_TEMPLATES,
} from '../simulation/catalog';
import {
  PEAK_HOUR_MULTIPLIER,
  computeBusinessRating,
  computeCafeComfortMetrics,
  computeDailyElectricityCost,
  computeDailyMaintenanceCost,
  computeDailyRent,
  computeManualRepairCost,
  countComputers,
  formatRupiah,
  getPeakHourMultiplier,
  isPeakHour,
  sumExpenses,
  sumRevenue,
} from '../simulation/economy';
import { getDiscountedCost } from '../simulation/engine';
import { SAVE_SLOT_IDS } from '../storage/saveSystem';
import type {
  CatalogItemType,
  CustomerArchetype,
  InternetPlanId,
  ItemCategory,
  LightingTierId,
  PcTier,
  RoomId,
  StaffRole,
} from '../types/game';

export const BuildPanel: React.FC = () => {
  const [filter, setFilter] = useState<'all' | ItemCategory>('all');
  const balance = useGameStore((s) => s.sim.balance);
  const effects = useGameStore((s) => s.sim.effects);
  const selectBuildItem = useGameStore((s) => s.selectBuildItem);

  const items = Object.values(CATALOG_ITEMS).filter(
    (item) => filter === 'all' || item.category === filter,
  );

  const filters: Array<{ id: 'all' | ItemCategory; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'stations', label: 'PC Stations' },
    { id: 'computers', label: 'PC Rigs' },
    { id: 'furniture', label: 'Desks & Chairs' },
    { id: 'utilities', label: 'Utilities' },
    { id: 'decor', label: 'Decor' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filter === f.id
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {items.map((item) => {
          const cost = getDiscountedCost(item.cost, effects);
          const canAfford = balance >= cost;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectBuildItem(item.id as CatalogItemType)}
              className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                canAfford
                  ? 'bg-slate-900/90 border-white/10 hover:border-amber-400/70'
                  : 'bg-slate-900/50 border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-sm text-white truncate">{item.name}</span>
                <span
                  className={`font-mono-num text-xs font-bold shrink-0 ${
                    canAfford ? 'text-amber-400' : 'text-rose-400'
                  }`}
                >
                  {formatRupiah(cost)}
                </span>
              </div>
              <div className="text-xs text-slate-400 leading-snug">{item.roleClue}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const ComputersPanel: React.FC = () => {
  const objects = useGameStore((s) => s.sim.objects);
  const effects = useGameStore((s) => s.sim.effects);
  const minuteOfDay = useGameStore((s) => s.sim.minuteOfDay);
  const hourlyRateMultiplier = useGameStore((s) => s.sim.hourlyRateMultiplier);
  const repairPc = useGameStore((s) => s.repairPc);
  const upgradePc = useGameStore((s) => s.upgradePc);
  const setSelectedObjectId = useGameStore((s) => s.setSelectedObjectId);
  const setActiveTab = useGameStore((s) => s.setActiveTab);

  const pcObjects = objects.filter((o) => Boolean(o.computer));
  const peakActive = isPeakHour(minuteOfDay);
  const peakMult = getPeakHourMultiplier(minuteOfDay);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {pcObjects.map((obj, idx) => {
        const pc = obj.computer!;
        const specs = PC_TIERS[pc.tier];
        const nextTier = pc.tier < 4 ? ((pc.tier + 1) as PcTier) : null;
        const upgradeCost = nextTier
          ? getDiscountedCost(
              Math.round(PC_TIERS[nextTier].cost - specs.cost * 0.45),
              effects,
            )
          : 0;
        const repairCost = computeManualRepairCost(pc.condition);

        return (
          <div
            key={obj.id}
            className="p-3 rounded-lg bg-slate-900/90 border border-white/10 flex flex-col justify-between gap-2.5"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedObjectId(obj.id);
                    setActiveTab(null);
                  }}
                  className="font-bold text-sm text-white hover:text-amber-400 cursor-pointer text-left"
                >
                  PC #{idx + 1} · {specs.name}
                </button>
                <span className="text-xs font-mono-num text-slate-300">
                  {pc.isBroken ? 'Broken' : pc.occupiedByCustomerId ? 'In Use' : 'Idle'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {specs.cpuName} · {specs.gpuName} · {specs.ramGb}GB RAM
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Condition</span>
                  <span className="font-mono-num">{Math.round(pc.condition)}%</span>
                </div>
                <div className="w-full h-1.5 rounded bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${
                      pc.condition > 60
                        ? 'bg-emerald-500'
                        : pc.condition > 30
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.round(pc.condition)}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono-num">
                <span>
                  Rate:{' '}
                  {formatRupiah(
                    Math.round(specs.hourlyRate * hourlyRateMultiplier * peakMult),
                  )}
                  /h
                  {peakActive && (
                    <span className="ml-1 text-amber-400 font-bold">
                      ({PEAK_HOUR_MULTIPLIER}x Peak)
                    </span>
                  )}
                </span>
                <span>Rev: {formatRupiah(pc.totalRevenue)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {pc.condition < 99 && (
                <button
                  type="button"
                  onClick={() => repairPc(obj.id)}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                >
                  <Wrench className="w-3 h-3 shrink-0" />
                  <span className="truncate">Repair ({formatRupiah(repairCost)})</span>
                </button>
              )}
              {nextTier && (
                <button
                  type="button"
                  onClick={() => upgradePc(obj.id)}
                  className="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                >
                  <ArrowUpCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">Tier {nextTier} ({formatRupiah(upgradeCost)})</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const StaffPanel: React.FC = () => {
  const staff = useGameStore((s) => s.sim.staff);
  const balance = useGameStore((s) => s.sim.balance);
  const hireStaff = useGameStore((s) => s.hireStaff);
  const trainStaff = useGameStore((s) => s.trainStaff);
  const fireStaff = useGameStore((s) => s.fireStaff);

  const roles: StaffRole[] = ['cashier', 'technician', 'cleaner', 'security'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {roles.map((role) => {
          const tpl = STAFF_TEMPLATES[role];
          const canAfford = balance >= tpl.hireCost;
          return (
            <div
              key={role}
              className="p-3 rounded-lg bg-slate-900/90 border border-white/10 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="font-bold text-sm text-white">{tpl.title}</div>
                <div className="text-xs text-slate-400 mt-1 leading-snug">
                  {tpl.description}
                </div>
                <div className="text-xs text-slate-300 mt-2 font-mono-num">
                  Salary: {formatRupiah(tpl.dailySalary)}/day
                </div>
              </div>
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => hireStaff(role)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Hire ({formatRupiah(tpl.hireCost)})
              </button>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Active Employees ({staff.length})
        </h4>
        {staff.length === 0 ? (
          <p className="text-xs text-slate-400">
            No employees hired yet. You are handling checkout and repairs manually.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {staff.map((s) => {
              const trainCost = s.skillLevel * 350_000;
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-lg bg-slate-900/80 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">{s.name}</div>
                    <div className="text-xs text-slate-400 font-mono-num">
                      Lv.{s.skillLevel} · {Math.round(s.productivity * 100)}% Prod ·{' '}
                      {formatRupiah(s.salary)}/d
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.skillLevel < 5 && (
                      <button
                        type="button"
                        onClick={() => trainStaff(s.id)}
                        className="px-2.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
                        title={`Train to Level ${s.skillLevel + 1}`}
                      >
                        Train {formatRupiah(trainCost)}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Fire ${s.name}`}
                      onClick={() => fireStaff(s.id)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-rose-200 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const FinancePanel: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const setHourlyRateMultiplier = useGameStore((s) => s.setHourlyRateMultiplier);
  const setMembershipPrice = useGameStore((s) => s.setMembershipPrice);

  const todayRevTotal = sumRevenue(sim.todayRevenue);
  const estElec = computeDailyElectricityCost(sim.objects, sim.lightingTier);
  const estNet = INTERNET_PLANS[sim.internetPlan].dailyCost;
  const estRent = computeDailyRent(sim.unlockedRooms);
  const estSalaries = sim.staff.reduce((a, s) => a + s.salary, 0);
  const estMaint = computeDailyMaintenanceCost(sim.objects);
  const todayExpTotal = sumExpenses(sim.todayExpenses) + estElec + estNet + estRent + estSalaries + estMaint;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
      <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
        <div className="font-bold text-sm text-emerald-400">Today&apos;s Revenue</div>
        <div className="flex justify-between text-slate-300">
          <span>PC Hourly Rentals</span>
          <span className="font-mono-num">{formatRupiah(sim.todayRevenue.pcRental)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Printing & Scanning</span>
          <span className="font-mono-num">{formatRupiah(sim.todayRevenue.printing)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Snacks &amp; Indomie ({sim.snackUnitsSold}x)</span>
          <span className="font-mono-num">{formatRupiah(sim.todayRevenue.snacks)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Cold Drinks &amp; Coffee ({sim.drinkUnitsSold}x)</span>
          <span className="font-mono-num">{formatRupiah(sim.todayRevenue.drinks)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Memberships & Tournaments</span>
          <span className="font-mono-num">
            {formatRupiah(sim.todayRevenue.memberships + sim.todayRevenue.tournaments)}
          </span>
        </div>
        <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
          <span>Total Revenue</span>
          <span className="font-mono-num text-emerald-400">{formatRupiah(todayRevTotal)}</span>
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
        <div className="font-bold text-sm text-rose-400">Daily Operating Costs</div>
        <div className="flex justify-between text-slate-300">
          <span>Electricity (Est. Settlement)</span>
          <span className="font-mono-num">{formatRupiah(estElec)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Internet Plan</span>
          <span className="font-mono-num">{formatRupiah(estNet)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Shop Rent & Maintenance</span>
          <span className="font-mono-num">{formatRupiah(estRent + estMaint)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Staff Salaries</span>
          <span className="font-mono-num">{formatRupiah(estSalaries)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Equipment & Events Today</span>
          <span className="font-mono-num">
            {formatRupiah(sim.todayExpenses.equipment + sim.todayExpenses.events)}
          </span>
        </div>
        <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
          <span>Projected Daily Outflow</span>
          <span className="font-mono-num text-rose-400">{formatRupiah(todayExpTotal)}</span>
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-3">
        <div className="font-bold text-sm text-amber-400">Pricing & History</div>
        <div>
          <div className="flex justify-between text-slate-300 mb-1">
            <span>Hourly PC Rate Multiplier</span>
            <span className="font-mono-num font-bold">
              {Math.round(sim.hourlyRateMultiplier * 100)}%
            </span>
          </div>
          <input
            type="range"
            aria-label="Hourly PC Rate Multiplier"
            min={0.7}
            max={1.5}
            step={0.05}
            value={sim.hourlyRateMultiplier}
            onChange={(e) => setHourlyRateMultiplier(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Peak hours (17:00–21:00): automatic {PEAK_HOUR_MULTIPLIER}x rate</span>
            {isPeakHour(sim.minuteOfDay) && (
              <span className="text-amber-400 font-bold">ACTIVE</span>
            )}
          </div>
        </div>
        <div>
          <div className="flex justify-between text-slate-300 mb-1">
            <span>VIP Membership Fee</span>
            <span className="font-mono-num font-bold">
              {formatRupiah(sim.membershipPrice)}
            </span>
          </div>
          <input
            type="range"
            aria-label="VIP Membership Fee"
            min={10_000}
            max={75_000}
            step={5_000}
            value={sim.membershipPrice}
            onChange={(e) => setMembershipPrice(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        <div className="pt-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
            Recent Settlements
          </div>
          {sim.dailyHistory.length === 0 ? (
            <div className="text-slate-500">First daily report settles at 24:00.</div>
          ) : (
            <div className="space-y-1 max-h-24 overflow-y-auto warnet-scroll">
              {sim.dailyHistory.slice(0, 5).map((r) => (
                <div key={r.day} className="flex justify-between font-mono-num">
                  <span className="text-slate-300">
                    Day {r.day} ({r.customersServed} cust)
                  </span>
                  <span className={r.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {r.netProfit >= 0 ? '+' : ''}
                    {formatRupiah(r.netProfit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const UpgradesPanel: React.FC = () => {
  const sim = useGameStore((s) => s.sim);
  const dayDurationSeconds = useGameStore((s) => s.dayDurationSeconds);
  const unlockRoom = useGameStore((s) => s.unlockRoom);
  const upgradeInternet = useGameStore((s) => s.upgradeInternet);
  const upgradeLighting = useGameStore((s) => s.upgradeLighting);
  const openBranch = useGameStore((s) => s.openBranch);
  const upgradeBranch = useGameStore((s) => s.upgradeBranch);
  const setDayDurationSeconds = useGameStore((s) => s.setDayDurationSeconds);

  const roomKeys: RoomId[] = ['backroom', 'esports_wing', 'vip_lounge', 'empire_hall', 'second_floor'];
  const netKeys: InternetPlanId[] = [
    'adsl_1m',
    'broadband_10m',
    'fiber_50m',
    'fiber_200m',
    'dedicated_1g',
  ];
  const lightKeys: LightingTierId[] = [
    'fluorescent',
    'warm_cafe',
    'rgb_gaming',
    'esports_arena',
  ];

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Room Expansions */}
        <div className="space-y-2">
          <div className="font-bold text-sm text-white">Building & Room Expansions</div>
          {roomKeys.map((rid) => {
            const def = ROOM_EXPANSIONS[rid];
            const unlocked = sim.unlockedRooms.includes(rid);
            const prereqMet = !def.prerequisite || sim.unlockedRooms.includes(def.prerequisite);
            const canBuy = !unlocked && prereqMet && sim.balance >= def.cost;
            return (
              <div
                key={rid}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-white">{def.name}</div>
                  <div className="text-slate-400">{def.description}</div>
                </div>
                {unlocked ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                    <Check className="w-3.5 h-3.5" /> Owned
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => unlockRoom(rid)}
                    className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold cursor-pointer shrink-0"
                  >
                    {prereqMet ? formatRupiah(def.cost) : 'Locked'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Internet Plans */}
        <div className="space-y-2">
          <div className="font-bold text-sm text-white">Internet Fiber Plans</div>
          {netKeys.map((pid) => {
            const plan = INTERNET_PLANS[pid];
            const current = sim.internetPlan === pid;
            const canBuy = !current && sim.balance >= plan.upgradeCost && plan.upgradeCost > 0;
            return (
              <div
                key={pid}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-white">{plan.name}</div>
                  <div className="text-slate-400 font-mono-num">
                    Quality {plan.qualityScore}/100 · {formatRupiah(plan.dailyCost)}/day
                  </div>
                </div>
                {current ? (
                  <span className="text-emerald-400 font-bold shrink-0">Active</span>
                ) : plan.upgradeCost === 0 ? (
                  <span className="text-slate-500 shrink-0">Starter</span>
                ) : (
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => upgradeInternet(pid)}
                    className="px-2.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold cursor-pointer shrink-0"
                  >
                    {formatRupiah(plan.upgradeCost)}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Interior Lighting & Day Duration */}
        <div className="space-y-2">
          <div className="font-bold text-sm text-white">Interior Lighting & Ambience</div>
          {lightKeys.map((lid) => {
            const tier = LIGHTING_TIERS[lid];
            const current = sim.lightingTier === lid;
            const canBuy = !current && sim.balance >= tier.upgradeCost && tier.upgradeCost > 0;
            return (
              <div
                key={lid}
                className="p-2.5 rounded-lg bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-white">{tier.name}</div>
                  <div className="text-slate-400">{tier.description}</div>
                </div>
                {current ? (
                  <span className="text-emerald-400 font-bold shrink-0">Active</span>
                ) : tier.upgradeCost === 0 ? (
                  <span className="text-slate-500 shrink-0">Starter</span>
                ) : (
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => upgradeLighting(lid)}
                    className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold cursor-pointer shrink-0"
                  >
                    {formatRupiah(tier.upgradeCost)}
                  </button>
                )}
              </div>
            );
          })}

          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-white/10">
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Day Duration Setting</span>
              <span className="font-mono-num font-bold">{dayDurationSeconds}s / day</span>
            </div>
            <input
              type="range"
              aria-label="In-game Day Duration Seconds"
              min={45}
              max={240}
              step={15}
              value={dayDurationSeconds}
              onChange={(e) => setDayDurationSeconds(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Stage 5 Multi-Branch Franchise Empire */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-sm text-amber-400">
            Warnet Empire Branches (Unlocks at Stage 4+)
          </div>
          <span className="text-slate-400">Passive daily net profit across Indonesian cities</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {sim.branches.map((b) => {
            const locked = sim.stage < 4;
            const upgradeCost = Math.round(b.openCost * 0.45 * b.level);
            return (
              <div
                key={b.id}
                className="p-3 rounded-lg bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-white">{b.name}</div>
                  <div className="text-slate-400 font-mono-num">
                    {b.city} · +{formatRupiah(b.dailyProfit * b.level)}/day
                    {b.opened ? ` (Lv.${b.level})` : ''}
                  </div>
                </div>
                {locked ? (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Stage 4
                  </span>
                ) : !b.opened ? (
                  <button
                    type="button"
                    disabled={sim.balance < b.openCost}
                    onClick={() => openBranch(b.id)}
                    className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold cursor-pointer"
                  >
                    Open {formatRupiah(b.openCost)}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={b.level >= 5 || sim.balance < upgradeCost}
                    onClick={() => upgradeBranch(b.id)}
                    className="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold cursor-pointer"
                  >
                    {b.level >= 5 ? 'Maxed' : `Lv.${b.level + 1} (${formatRupiah(upgradeCost)})`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

type StatsSubTab = 'overview' | 'quests' | 'reviews' | 'rivals' | 'cctv';

export const StatsPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<StatsSubTab>('overview');
  const sim = useGameStore((s) => s.sim);
  const claimQuest = useGameStore((s) => s.claimQuest);
  const comfort = computeCafeComfortMetrics(sim);
  const rating = computeBusinessRating(sim);
  const pcCount = countComputers(sim.objects);
  const readyQuests = sim.dailyQuests.filter((q) => !q.claimed && q.progress >= q.target).length;
  const pcObjects = sim.objects.filter((o) => Boolean(o.computer));
  const avgHourlyRate =
    pcObjects.length > 0
      ? Math.round(
          (pcObjects.reduce((acc, o) => acc + PC_TIERS[o.computer!.tier].hourlyRate, 0) /
            pcObjects.length) *
            sim.hourlyRateMultiplier,
        )
      : Math.round(PC_TIERS[1].hourlyRate * sim.hourlyRateMultiplier);
  const rivalShareSum = sim.competitors.reduce((acc, r) => acc + r.marketSharePct, 0);
  const playerSharePct = Math.max(5, 100 - rivalShareSum);

  const subTabs: Array<{ id: StatsSubTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    {
      id: 'quests',
      label: 'Daily Quests',
      icon: <Target className="w-3.5 h-3.5" />,
      badge: readyQuests > 0 ? readyQuests : undefined,
    },
    { id: 'reviews', label: 'Reviews & Loyalty', icon: <Star className="w-3.5 h-3.5" /> },
    { id: 'rivals', label: 'Rivals', icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'cctv', label: 'CCTV Monitor', icon: <Tv className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === t.id
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-bold leading-none">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Business Overview
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Business Rating</span>
              <span className="font-mono-num font-bold text-amber-400">{rating}/100</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cleanliness</span>
              <span className="font-mono-num">{Math.round(sim.cleanliness)}%</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Cooling Comfort</span>
              <span className="font-mono-num">{comfort.cooling}/100</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Network Quality</span>
              <span className="font-mono-num">{comfort.wifi}/100</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>CCTV Security Coverage</span>
              <span className="font-mono-num">{comfort.cctvCoverage}%</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Repeat Regulars</span>
              <span className="font-mono-num text-emerald-400">{sim.loyaltyCustomersCount}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Customers Served</span>
              <span className="font-mono-num font-bold">{sim.totalCustomersServed}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
            <div className="font-bold text-sm text-white">Customer Breakdown</div>
            {(Object.keys(CUSTOMER_ARCHETYPE_INFO) as CustomerArchetype[]).map((arch) => (
              <div key={arch} className="flex justify-between text-slate-300">
                <span>{CUSTOMER_ARCHETYPE_INFO[arch].label}</span>
                <span className="font-mono-num">{sim.customerArchetypeCounts[arch]}</span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
            <div className="font-bold text-sm text-white">Warnet Empire Milestones</div>
            {PROGRESSION_STAGES.map((st) => {
              const reached = sim.stage >= st.id;
              return (
                <div
                  key={st.id}
                  className={`p-2 rounded border ${
                    reached
                      ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                      : 'border-white/5 bg-slate-950/40 text-slate-400'
                  }`}
                >
                  <div className="flex justify-between font-bold">
                    <span>
                      Stage {st.id}: {st.title}
                    </span>
                    <span className="font-mono-num">
                      {reached ? 'Unlocked' : `${pcCount}/${st.requiredPcs} PCs`}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-80">
                    Req: {st.requiredPcs} PCs · ★{st.requiredReputation} Rep · {st.requiredEmployees} Staff
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'quests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-slate-300">
            <span>
              Complete daily targets before midnight for cash bonuses &amp; neighborhood reputation.
            </span>
            <span className="font-mono-num text-amber-400 font-bold">
              Lifetime Completed: {sim.questsCompletedCount}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sim.dailyQuests.map((q) => {
              const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
              const ready = !q.claimed && q.progress >= q.target;
              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2.5 ${
                    q.claimed
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : ready
                        ? 'bg-slate-900/95 border-amber-400/60'
                        : 'bg-slate-900/90 border-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold text-sm text-white">{q.title}</div>
                    <div className="text-slate-400 mt-0.5 leading-snug">{q.description}</div>
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[11px] text-slate-300 mb-1 font-mono-num">
                        <span>
                          {q.kind === 'earn_revenue'
                            ? formatRupiah(q.progress)
                            : Math.round(q.progress)}{' '}
                          / {q.kind === 'earn_revenue' ? formatRupiah(q.target) : q.target}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${
                            q.claimed || ready ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                    <span className="font-mono-num text-[11px] text-emerald-400 font-semibold">
                      +{formatRupiah(q.rewardCash)} · +{q.rewardRep.toFixed(2)}★
                    </span>
                    {q.claimed ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => claimQuest(q.id)}
                        className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold cursor-pointer"
                      >
                        {ready ? 'Claim' : 'In Progress'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2.5">
            <div className="font-bold text-sm text-white">Loyalty &amp; Reputation</div>
            <div className="flex justify-between text-slate-300">
              <span>Current Star Rating</span>
              <span className="font-mono-num font-bold text-amber-400">
                ★ {sim.reputation.toFixed(2)} / 5.0
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Repeat Regular Visits</span>
              <span className="font-mono-num font-bold text-emerald-400">
                {sim.loyaltyCustomersCount}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Customer Reviews Logged</span>
              <span className="font-mono-num">{sim.reviews.length}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-white/10">
              High cleanliness, cold AC, fast fiber, and coffee/snack stock attract loyal regulars
              who tip extra and leave 5-star reviews.
            </p>
          </div>

          <div className="lg:col-span-2 p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
            <div className="font-bold text-sm text-white">Recent Customer Reviews</div>
            {sim.reviews.length === 0 ? (
              <div className="text-slate-500 py-6 text-center">
                No reviews posted yet — finish a few customer sessions to collect feedback.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto warnet-scroll pr-1">
                {sim.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-white/10 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white truncate">{rev.author}</span>
                      <span className="font-mono-num text-amber-400 font-bold shrink-0">
                        {'★'.repeat(Math.max(1, Math.min(5, rev.rating)))}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 leading-snug">
                      &ldquo;{rev.comment}&rdquo;
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Day {rev.day} · {CUSTOMER_ARCHETYPE_INFO[rev.archetype].label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'rivals' && (
        <div className="space-y-3">
          <div className="text-slate-300">
            Local neighborhood market share updates nightly based on business rating, pricing, and
            active promos.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-amber-950/25 border border-amber-500/40 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm text-amber-300">Your Warnet</span>
                <span className="font-mono-num text-xs font-bold text-emerald-400">
                  {playerSharePct}% Share
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono-num">
                ★ {sim.reputation.toFixed(1)} · {pcCount} PCs · Avg {formatRupiah(avgHourlyRate)}/h
              </div>
              <div className="w-full h-1.5 rounded bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${playerSharePct}%` }} />
              </div>
            </div>

            {sim.competitors.map((comp) => (
              <div
                key={comp.id}
                className="p-3 rounded-lg bg-slate-900/90 border border-white/10 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white truncate">{comp.name}</span>
                  <span className="font-mono-num text-xs font-bold text-slate-200 shrink-0">
                    {comp.marketSharePct}% Share
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {comp.district}
                  {comp.promoActive && (
                    <span className="ml-1.5 text-rose-400 font-bold">· PROMO ACTIVE</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 font-mono-num">
                  ★ {comp.reputation.toFixed(1)} · {comp.pcCount} PCs ·{' '}
                  {formatRupiah(comp.hourlyPrice)}/h
                </div>
                <div className="w-full h-1.5 rounded bg-slate-800 overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${comp.marketSharePct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'cctv' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2.5">
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Security Telemetry
            </div>
            <div className="flex justify-between text-slate-300">
              <span>CCTV Cameras Installed</span>
              <span className="font-mono-num font-bold text-white">{comfort.cctvCount}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Deterrence Coverage</span>
              <span className="font-mono-num font-bold text-emerald-400">
                {comfort.cctvCoverage}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-white/10">
              Install Dome CCTV Cameras (Build → Utilities) and hire Security staff to prevent
              unpaid walkouts and equipment tampering.
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
            <div className="font-bold text-sm text-white">Live Station Matrix</div>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto warnet-scroll pr-1">
              {pcObjects.map((obj, idx) => {
                const pc = obj.computer!;
                const statusLabel = pc.isBroken
                  ? 'FAULT'
                  : pc.occupiedByCustomerId
                    ? 'LIVE'
                    : 'IDLE';
                return (
                  <div
                    key={obj.id}
                    className={`px-2 py-1.5 rounded border font-mono-num flex items-center justify-between text-[11px] ${
                      pc.isBroken
                        ? 'border-rose-500/40 bg-rose-950/30 text-rose-300'
                        : pc.occupiedByCustomerId
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                          : 'border-white/10 bg-slate-950/50 text-slate-300'
                    }`}
                  >
                    <span>CAM-PC{idx + 1}</span>
                    <span>
                      {statusLabel} · {Math.round(pc.condition)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
            <div className="font-bold text-sm text-white">CCTV Incident Log</div>
            {sim.cctvLog.length === 0 ? (
              <div className="text-slate-500 py-4 text-center">
                All clear — no walkout or tampering alerts logged yet.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto warnet-scroll pr-1">
                {sim.cctvLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2 rounded border text-[11px] ${
                      entry.prevented
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                        : 'border-rose-500/30 bg-rose-950/20 text-rose-200'
                    }`}
                  >
                    <div className="font-mono-num text-[10px] opacity-75">
                      Day {entry.day} · {entry.time} ·{' '}
                      {entry.prevented ? 'PREVENTED' : 'UNCAUGHT'}
                    </div>
                    <div>{entry.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SavePanel: React.FC = () => {
  const saveSlots = useGameStore((s) => s.saveSlots);
  const lastSaveMessage = useGameStore((s) => s.lastSaveMessage);
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const deleteSlot = useGameStore((s) => s.deleteSlot);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <div className="text-slate-300">
          Automatic saves run every new morning. Use manual slots anytime.
        </div>
        {lastSaveMessage && <div className="text-emerald-400 font-semibold">{lastSaveMessage}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SAVE_SLOT_IDS.map((slotId) => {
          const meta = saveSlots.find((s) => s.slotId === slotId);
          return (
            <div
              key={slotId}
              className="p-3 rounded-lg bg-slate-900/90 border border-white/10 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="font-bold text-sm text-white uppercase tracking-wide">
                  {slotId === 'autosave' ? 'Auto Save' : slotId.replace('_', ' ')}
                </div>
                {meta ? (
                  <div className="mt-1 space-y-0.5 text-slate-300 font-mono-num">
                    <div>
                      Day {meta.day} · Stage {meta.stage}
                    </div>
                    <div className="text-amber-400 font-bold">{formatRupiah(meta.balance)}</div>
                    <div className="text-[11px] text-slate-400">
                      {meta.pcCount} PCs · {new Date(meta.savedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-slate-500">Empty Slot</div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {slotId !== 'autosave' && (
                  <button
                    type="button"
                    onClick={() => void saveToSlot(slotId)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </button>
                )}
                {meta && (
                  <>
                    <button
                      type="button"
                      onClick={() => void loadFromSlot(slotId)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Load
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${slotId}`}
                      onClick={() => void deleteSlot(slotId)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/70 text-slate-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
