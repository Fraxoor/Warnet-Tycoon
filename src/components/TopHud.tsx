import React from 'react';
import {
  Pause,
  Play,
  FastForward,
  Volume2,
  VolumeX,
  RotateCcw,
  Menu,
  Sun,
  Cloud,
  CloudRain,
} from 'lucide-react';
import { useGameStore, type SimSpeed } from '../store/gameStore';
import { PROGRESSION_STAGES } from '../simulation/catalog';
import {
  PEAK_HOUR_MULTIPLIER,
  countComputers,
  formatRupiah,
  formatTimeClock,
  isPeakHour,
  sumExpenses,
  sumRevenue,
} from '../simulation/economy';

export const TopHud: React.FC = () => {
  const screenState = useGameStore((s) => s.screenState);
  const sim = useGameStore((s) => s.sim);
  const speed = useGameStore((s) => s.speed);
  const muted = useGameStore((s) => s.muted);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const setScreenState = useGameStore((s) => s.setScreenState);
  const triggerCameraReset = useGameStore((s) => s.triggerCameraReset);

  if (screenState !== 'playing') return null;

  const pcCount = countComputers(sim.objects);
  const occupiedCount = sim.objects.filter(
    (o) => o.computer && o.computer.occupiedByCustomerId !== null,
  ).length;
  const dailyNet = sumRevenue(sim.todayRevenue) - sumExpenses(sim.todayExpenses);
  const stageDef = PROGRESSION_STAGES.find((p) => p.id === sim.stage);
  const peakActive = isPeakHour(sim.minuteOfDay);

  const weatherMeta =
    sim.weather === 'rain'
      ? { label: 'Rainy', icon: <CloudRain className="w-3.5 h-3.5 text-sky-400" /> }
      : sim.weather === 'overcast'
        ? { label: 'Cloudy', icon: <Cloud className="w-3.5 h-3.5 text-slate-300" /> }
        : { label: 'Sunny', icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> };

  const speedButtons: Array<{ val: SimSpeed; label: string }> = [
    { val: 0, label: 'Pause Simulation' },
    { val: 1, label: '1x Speed' },
    { val: 2, label: '2x Speed' },
    { val: 3, label: '3x Speed' },
  ];

  return (
    <div className="fixed inset-x-0 top-0 z-20 pointer-events-none p-3 md:p-4 flex flex-wrap xl:flex-nowrap items-start justify-between gap-2.5">
      {/* Top-Left Financial & Cafe Snapshot */}
      <div
        className="pointer-events-auto flex flex-wrap items-center gap-3 md:gap-4 px-3.5 py-2 rounded-lg border border-white/10 shadow-xl"
        style={{ backgroundColor: 'rgba(17, 21, 32, 0.92)' }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Balance
          </div>
          <div
            data-testid="hud-balance"
            className="text-lg md:text-xl font-bold text-amber-400 font-mono-num"
          >
            {formatRupiah(sim.balance)}
          </div>
        </div>

        <div className="h-7 w-px bg-white/10 hidden sm:block" />

        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Today Net
          </div>
          <div
            className={`text-sm md:text-base font-bold font-mono-num ${
              dailyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {dailyNet >= 0 ? '+' : ''}
            {formatRupiah(dailyNet)}
          </div>
        </div>

        <div className="h-7 w-px bg-white/10 hidden sm:block" />

        <div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Customers
          </div>
          <div className="text-sm md:text-base font-bold text-slate-100 font-mono-num">
            {occupiedCount}/{pcCount} PCs · {sim.customers.length} Inside
          </div>
        </div>

        <div className="h-7 w-px bg-white/10 hidden md:block" />

        <div className="hidden md:block">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Reputation · Stage {sim.stage}
          </div>
          <div className="text-sm font-semibold text-slate-100 font-mono-num">
            ★ {sim.reputation.toFixed(1)} · {stageDef?.title}
          </div>
        </div>
      </div>

      {/* Top-Center Active Alert / Peak Hours / Outage Warning (only when active) */}
      {(peakActive ||
        sim.effects.internetOutageHours > 0 ||
        sim.effects.powerOutageHours > 0 ||
        sim.effects.discountHours > 0 ||
        sim.effects.demandBoostHours > 0) && (
        <div
          className="pointer-events-auto px-3 py-2 rounded-lg border border-amber-500/40 text-xs font-semibold text-amber-200 flex flex-wrap items-center gap-2.5 shrink-0"
          style={{ backgroundColor: 'rgba(28, 22, 14, 0.94)' }}
        >
          {peakActive && (
            <span data-testid="peak-hour-badge" className="text-amber-300 font-bold">
              Peak Hours {PEAK_HOUR_MULTIPLIER}x (17:00–21:00)
            </span>
          )}
          {sim.effects.powerOutageHours > 0 && (
            <span>Blackout ({sim.effects.powerOutageHours.toFixed(1)}h left)</span>
          )}
          {sim.effects.internetOutageHours > 0 && (
            <span>Internet Down ({sim.effects.internetOutageHours.toFixed(1)}h)</span>
          )}
          {sim.effects.discountHours > 0 && (
            <span>20% Hardware Discount ({sim.effects.discountHours.toFixed(1)}h)</span>
          )}
          {sim.effects.demandBoostHours > 0 && (
            <span>Traffic Surge {Math.round(sim.effects.demandMultiplier * 100)}%</span>
          )}
        </div>
      )}

      {/* Top-Right Time, Weather, Speed & Utility Controls */}
      <div
        className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 shadow-xl"
        style={{ backgroundColor: 'rgba(17, 21, 32, 0.92)' }}
      >
        <div
          data-testid="hud-weather"
          className="hidden sm:flex flex-col items-end pr-2 border-r border-white/10"
        >
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Weather
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-100">
            {weatherMeta.icon}
            <span>{weatherMeta.label}</span>
          </div>
        </div>

        <div className="pr-2 border-r border-white/10 text-right">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Day {sim.day}
          </div>
          <div
            data-testid="hud-clock"
            className="text-base font-bold text-slate-100 font-mono-num"
          >
            {formatTimeClock(sim.minuteOfDay)}
          </div>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Simulation Speed">
          {speedButtons.map((btn) => {
            const active = speed === btn.val;
            return (
              <button
                key={btn.val}
                type="button"
                aria-label={btn.label}
                onClick={() => setSpeed(btn.val)}
                className={`px-2.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {btn.val === 0 ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : btn.val === 1 ? (
                  <span className="flex items-center gap-1">
                    <Play className="w-3 h-3" /> 1x
                  </span>
                ) : btn.val === 3 ? (
                  <span className="flex items-center gap-0.5">
                    <FastForward className="w-3 h-3" /> 3x
                  </span>
                ) : (
                  '2x'
                )}
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-white/10 mx-0.5" />

        <button
          type="button"
          aria-label="Reset Camera"
          onClick={triggerCameraReset}
          className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          title="Reset Camera"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          onClick={toggleMute}
          className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          aria-label="Open Pause Menu"
          onClick={() => setScreenState('paused')}
          className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          title="Menu (Esc)"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
