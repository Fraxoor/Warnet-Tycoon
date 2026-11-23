import React from 'react';
import { AlertTriangle, Trophy, PauseCircle } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { countComputers, formatRupiah } from '../simulation/economy';

export const EventModal: React.FC = () => {
  const screenState = useGameStore((s) => s.screenState);
  const pendingEvent = useGameStore((s) => s.sim.pendingEvent);
  const balance = useGameStore((s) => s.sim.balance);
  const resolveEvent = useGameStore((s) => s.resolveEvent);

  if (screenState !== 'playing' || !pendingEvent) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-modal-title"
        className="w-full max-w-md rounded-xl border border-amber-500/40 p-6 shadow-2xl"
        style={{ backgroundColor: 'rgba(17, 21, 32, 0.98)' }}
      >
        <div className="flex items-center gap-2.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <AlertTriangle className="w-4 h-4" />
          Day {pendingEvent.triggeredDay} Event
        </div>
        <h2 id="event-modal-title" className="text-xl font-extrabold text-white mb-2">
          {pendingEvent.title}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-5">{pendingEvent.description}</p>

        <div className="space-y-2.5">
          {pendingEvent.choices.map((ch) => {
            const cantAfford = ch.cost > 0 && balance < ch.cost;
            return (
              <button
                key={ch.id}
                type="button"
                disabled={cantAfford}
                onClick={() => resolveEvent(ch.id)}
                className="w-full text-left p-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-white/10 hover:border-amber-400/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-sm text-white">{ch.label}</span>
                  {ch.cost > 0 && (
                    <span className="font-mono-num text-xs font-bold text-amber-400">
                      -{formatRupiah(ch.cost)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{ch.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const StatusModal: React.FC = () => {
  const screenState = useGameStore((s) => s.screenState);
  const sim = useGameStore((s) => s.sim);
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const ambientEnabled = useGameStore((s) => s.ambientEnabled);
  const masterVolume = useGameStore((s) => s.masterVolume);
  const setScreenState = useGameStore((s) => s.setScreenState);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const continueEndless = useGameStore((s) => s.continueEndless);
  const setMusicEnabled = useGameStore((s) => s.setMusicEnabled);
  const setAmbientEnabled = useGameStore((s) => s.setAmbientEnabled);
  const setMasterVolume = useGameStore((s) => s.setMasterVolume);

  if (screenState !== 'paused' && screenState !== 'gameover') return null;

  const pcCount = countComputers(sim.objects);

  if (screenState === 'paused') {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          className="w-full max-w-md rounded-xl border border-white/15 p-6 shadow-2xl space-y-5"
          style={{ backgroundColor: 'rgba(17, 21, 32, 0.98)' }}
        >
          <div className="flex items-center gap-3">
            <PauseCircle className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-extrabold text-white">Warnet Paused</h2>
              <p className="text-xs text-slate-400">
                Day {sim.day} · {pcCount} PCs · {formatRupiah(sim.balance)}
              </p>
            </div>
          </div>

          <div className="space-y-3 p-3.5 rounded-lg bg-slate-900/90 border border-white/10 text-xs">
            <div className="font-bold text-slate-200">Audio Settings</div>
            <label className="flex items-center justify-between text-slate-300 cursor-pointer">
              <span>Background Music</span>
              <input
                type="checkbox"
                checked={musicEnabled}
                onChange={(e) => setMusicEnabled(e.target.checked)}
                className="accent-amber-500"
              />
            </label>
            <label className="flex items-center justify-between text-slate-300 cursor-pointer">
              <span>Ambient Cafe & Typing Sounds</span>
              <input
                type="checkbox"
                checked={ambientEnabled}
                onChange={(e) => setAmbientEnabled(e.target.checked)}
                className="accent-amber-500"
              />
            </label>
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Master Volume</span>
                <span className="font-mono-num">{Math.round(masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setScreenState('playing')}
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Resume Game
            </button>
            <button
              type="button"
              onClick={() => startNewGame()}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm cursor-pointer"
            >
              Restart New Business
            </button>
            <button
              type="button"
              onClick={() => setScreenState('title')}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm cursor-pointer"
            >
              Return to Title Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVictory = sim.gameWon && !sim.gameOverReason;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/70">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isVictory ? 'Warnet Empire Achieved' : 'Game Over'}
        className="w-full max-w-md rounded-xl border border-amber-500/40 p-6 shadow-2xl space-y-5"
        style={{ backgroundColor: 'rgba(17, 21, 32, 0.98)' }}
      >
        <div className="flex items-center gap-3">
          <Trophy className={`w-7 h-7 ${isVictory ? 'text-amber-400' : 'text-rose-400'}`} />
          <div>
            <h2 className="text-2xl font-extrabold text-white">
              {isVictory ? 'Warnet Empire Built!' : 'Shop Closed'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {isVictory
                ? 'You grew from two humble CRT PCs into Indonesia’s premier gaming empire.'
                : sim.gameOverReason}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
            <div className="text-[11px] text-slate-400">Days</div>
            <div className="text-base font-bold font-mono-num text-white">{sim.day}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
            <div className="text-[11px] text-slate-400">Customers</div>
            <div className="text-base font-bold font-mono-num text-white">
              {sim.totalCustomersServed}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-white/10">
            <div className="text-[11px] text-slate-400">PCs</div>
            <div className="text-base font-bold font-mono-num text-amber-400">{pcCount}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {isVictory && (
            <button
              type="button"
              onClick={() => continueEndless()}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer"
            >
              Continue Endless Mode
            </button>
          )}
          <button
            type="button"
            data-start="true"
            onClick={() => startNewGame()}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
