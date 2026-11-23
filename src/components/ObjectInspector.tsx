import React from 'react';
import { X, Wrench, ArrowUpCircle, Trash2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { CATALOG_ITEMS, PC_TIERS } from '../simulation/catalog';
import {
  PEAK_HOUR_MULTIPLIER,
  computeManualRepairCost,
  formatRupiah,
  getPeakHourMultiplier,
  isPeakHour,
} from '../simulation/economy';
import { getDiscountedCost } from '../simulation/engine';
import type { PcTier } from '../types/game';

export const ObjectInspector: React.FC = () => {
  const screenState = useGameStore((s) => s.screenState);
  const selectedObjectId = useGameStore((s) => s.selectedObjectId);
  const objects = useGameStore((s) => s.sim.objects);
  const effects = useGameStore((s) => s.sim.effects);
  const minuteOfDay = useGameStore((s) => s.sim.minuteOfDay);
  const hourlyRateMultiplier = useGameStore((s) => s.sim.hourlyRateMultiplier);
  const setSelectedObjectId = useGameStore((s) => s.setSelectedObjectId);
  const repairPc = useGameStore((s) => s.repairPc);
  const upgradePc = useGameStore((s) => s.upgradePc);
  const sellObject = useGameStore((s) => s.sellObject);

  if (screenState !== 'playing' || !selectedObjectId) return null;
  const obj = objects.find((o) => o.id === selectedObjectId);
  if (!obj) return null;

  const def = CATALOG_ITEMS[obj.type];
  const pc = obj.computer;
  const specs = pc ? PC_TIERS[pc.tier] : null;
  const nextTier = pc && pc.tier < 4 ? ((pc.tier + 1) as PcTier) : null;
  const upgradeCost =
    pc && nextTier
      ? getDiscountedCost(
          Math.round(PC_TIERS[nextTier].cost - PC_TIERS[pc.tier].cost * 0.45),
          effects,
        )
      : 0;
  const repairCost = pc ? computeManualRepairCost(pc.condition) : 0;
  const refundValue = Math.round(def.cost * 0.5);

  return (
    <div
      className="fixed right-4 bottom-24 z-20 w-80 rounded-xl border border-white/15 p-4 shadow-2xl pointer-events-auto"
      style={{ backgroundColor: 'rgba(17, 21, 32, 0.95)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs text-amber-400 font-semibold">
            {pc ? `Tier ${pc.tier} · ${specs?.name}` : def.category}
          </div>
          <h3 className="text-base font-bold text-white">{def.name}</h3>
        </div>
        <button
          type="button"
          aria-label="Close Inspector"
          onClick={() => setSelectedObjectId(null)}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {pc && specs ? (
        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-slate-300 mb-1">
              <span>Condition {pc.isBroken ? '(Broken)' : ''}</span>
              <span className="font-mono-num font-bold">{Math.round(pc.condition)}%</span>
            </div>
            <div className="w-full h-2 rounded bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
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

          <div className="grid grid-cols-2 gap-2 text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
            <div>CPU: {specs.cpuPerf}/100</div>
            <div>GPU: {specs.gpuPerf}/100</div>
            <div>RAM: {specs.ramGb} GB</div>
            <div>Monitor: {specs.monitorQuality}/100</div>
            <div>
              Rate:{' '}
              {formatRupiah(
                Math.round(
                  specs.hourlyRate *
                    hourlyRateMultiplier *
                    getPeakHourMultiplier(minuteOfDay),
                ),
              )}
              /h
              {isPeakHour(minuteOfDay) ? ` (${PEAK_HOUR_MULTIPLIER}x)` : ''}
            </div>
            <div>Power: {specs.powerWatts}W</div>
            <div>Used: {pc.totalHoursUsed.toFixed(1)}h</div>
            <div>Earned: {formatRupiah(pc.totalRevenue)}</div>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {pc.condition < 99 && (
              <button
                type="button"
                onClick={() => repairPc(obj.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                Repair to 100% ({formatRupiah(repairCost)})
              </button>
            )}

            {nextTier && (
              <button
                type="button"
                onClick={() => upgradePc(obj.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                Upgrade to {PC_TIERS[nextTier].name} ({formatRupiah(upgradeCost)})
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-300 mb-3">{def.roleClue}</p>
      )}

      {obj.type !== 'cashier_counter' && (
        <button
          type="button"
          onClick={() => sellObject(obj.id)}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Sell Item (+{formatRupiah(refundValue)})
        </button>
      )}
    </div>
  );
};
