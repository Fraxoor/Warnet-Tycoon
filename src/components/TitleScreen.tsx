import React, { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { formatRupiah } from '../simulation/economy';
import { LeaderboardPanel } from './LeaderboardPanel';

export const TitleScreen: React.FC = () => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const screenState = useGameStore((s) => s.screenState);
  const saveSlots = useGameStore((s) => s.saveSlots);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const refreshSaveSlots = useGameStore((s) => s.refreshSaveSlots);

  useEffect(() => {
    void refreshSaveSlots();
  }, [refreshSaveSlots]);

  useEffect(() => {
    if (screenState !== 'title') {
      setShowLeaderboard(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (showLeaderboard) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowLeaderboard(false);
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startNewGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenState, showLeaderboard, startNewGame]);

  if (screenState !== 'title') return null;

  const latestSave = saveSlots[0] ?? null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-8 md:p-14">
      {/* Subtle left scrim for crisp text legibility without obscuring the rotating 3D warnet */}
      <div
        className="absolute inset-y-0 left-0 w-full md:w-[600px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(11,14,22,0.94) 0%, rgba(11,14,22,0.82) 68%, rgba(11,14,22,0) 100%)',
        }}
      />

      {/* Top/Middle Title Lockup */}
      <div className="relative z-10 max-w-md my-auto pointer-events-auto">
        {/* Custom Inline SVG Warnet Neon Signboard Emblem */}
        <svg
          viewBox="0 0 360 96"
          className="w-80 h-auto mb-5 drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
          aria-label="Warnet Tycoon"
        >
          <rect
            x="3"
            y="3"
            width="354"
            height="90"
            rx="10"
            fill="#131824"
            stroke="#F59E0B"
            strokeWidth="3"
          />
          <rect
            x="10"
            y="10"
            width="340"
            height="76"
            rx="6"
            fill="none"
            stroke="#38BDF8"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
          <text
            x="24"
            y="46"
            fill="#FBBF24"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="30"
            letterSpacing="1.5"
          >
            WARNET TYCOON
          </text>
          <text
            x="25"
            y="72"
            fill="#CBD5E1"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
            fontSize="12.5"
            letterSpacing="0.8"
          >
            NUSANTARA INTERNET CAFE SIM
          </text>
        </svg>

        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3 text-balance">
          From Two Old PCs to a Gaming Empire
        </h1>
        <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-8">
          Rent a humble neighborhood shophouse with Rp5.000.000, keep classic CRT rigs humming,
          serve snacks and printing, hire staff, and expand into an esports arena.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={() => startNewGame()}
            className="px-6 py-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
          >
            Start New Warnet
          </button>

          {latestSave && (
            <button
              type="button"
              onClick={() => void loadFromSlot(latestSave.slotId)}
              className="px-5 py-3.5 rounded-lg bg-[#1b2232] hover:bg-[#252f44] border border-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Continue Day {latestSave.day} · {formatRupiah(latestSave.balance)}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="px-4 py-3.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trophy className="w-4 h-4" />
            Global Leaderboard
          </button>
        </div>
      </div>

      {/* Bottom Safe-Margin Control Hint */}
      <div className="relative z-10 text-xs text-slate-400 font-medium tracking-wide">
        Drag to Orbit · WASD / Arrows Pan · Scroll Zoom · R Rotate · Space Start · Esc Pause
      </div>

      {/* Title Screen Global Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-30 pointer-events-auto flex items-center justify-center p-4 bg-black/70">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Global Leaderboard"
            className="w-full max-w-4xl max-h-[85vh] overflow-y-auto warnet-scroll rounded-xl border border-white/15 p-5 shadow-2xl space-y-4"
            style={{ backgroundColor: 'rgba(14, 18, 28, 0.98)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-base font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Warnet Tycoon Global Leaderboard
              </h2>
              <button
                type="button"
                aria-label="Close Leaderboard"
                onClick={() => setShowLeaderboard(false)}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <LeaderboardPanel allowPublish={false} />
          </div>
        </div>
      )}
    </div>
  );
};
