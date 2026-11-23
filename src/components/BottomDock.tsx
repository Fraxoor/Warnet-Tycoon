import React, { useEffect } from 'react';
import {
  Hammer,
  Monitor,
  Users,
  Wallet,
  Sparkles,
  BarChart3,
  Save,
  ChevronDown,
  ChevronUp,
  RotateCw,
  X,
  PlusSquare,
  Trophy,
} from 'lucide-react';
import { useGameStore, type DockTab } from '../store/gameStore';
import { CATALOG_ITEMS } from '../simulation/catalog';
import { canPlaceItemAt, getUnlockedBounds } from '../simulation/grid';
import { formatRupiah } from '../simulation/economy';
import { getDiscountedCost } from '../simulation/engine';
import {
  BuildPanel,
  ComputersPanel,
  FinancePanel,
  SavePanel,
  StaffPanel,
  StatsPanel,
  UpgradesPanel,
} from './DrawerPanels';
import { LeaderboardPanel } from './LeaderboardPanel';

export const BottomDock: React.FC = () => {
  const screenState = useGameStore((s) => s.screenState);
  const activeTab = useGameStore((s) => s.activeTab);
  const dockCollapsed = useGameStore((s) => s.dockCollapsed);
  const buildItem = useGameStore((s) => s.buildItem);
  const buildRotation = useGameStore((s) => s.buildRotation);
  const sim = useGameStore((s) => s.sim);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const toggleDockCollapsed = useGameStore((s) => s.toggleDockCollapsed);
  const rotateBuildItem = useGameStore((s) => s.rotateBuildItem);
  const selectBuildItem = useGameStore((s) => s.selectBuildItem);
  const placeAtTile = useGameStore((s) => s.placeAtTile);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH' && useGameStore.getState().screenState === 'playing') {
        toggleDockCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleDockCollapsed]);

  if (screenState !== 'playing') return null;

  const tabs: Array<{ id: Exclude<DockTab, null>; label: string; icon: React.ReactNode }> = [
    { id: 'build', label: 'Build', icon: <Hammer className="w-4 h-4" /> },
    { id: 'computers', label: 'Computers', icon: <Monitor className="w-4 h-4" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="w-4 h-4" /> },
    { id: 'finance', label: 'Finance', icon: <Wallet className="w-4 h-4" /> },
    { id: 'upgrades', label: 'Upgrades', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { id: 'save', label: 'Save', icon: <Save className="w-4 h-4" /> },
  ];

  const handleQuickPlace = () => {
    if (!buildItem) return;
    const def = CATALOG_ITEMS[buildItem];
    const bounds = getUnlockedBounds(sim.unlockedRooms);

    // Prioritize organized PC row bays for stations & desks before scanning general floor tiles
    if (def.isDesk || def.category === 'stations') {
      const preferredSlots: Array<[number, number]> = [
        [1, 0],
        [6, 0],
        [1, 3],
        [2, 3],
        [5, 3],
        [6, 3],
        [0, 0],
        [7, 0],
        [0, 3],
        [7, 3],
      ];
      for (const [px, pz] of preferredSlots) {
        const res = canPlaceItemAt(buildItem, px, pz, sim.unlockedRooms, sim.objects);
        if (res.valid) {
          placeAtTile(px, pz);
          return;
        }
      }
    }

    for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        // Keep the central walkway (x=3..4) clear for general quick-place if other tiles exist
        if ((x === 3 || x === 4) && z >= 0 && z <= 7) continue;
        const res = canPlaceItemAt(buildItem, x, z, sim.unlockedRooms, sim.objects);
        if (res.valid) {
          placeAtTile(x, z);
          return;
        }
      }
    }

    for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const res = canPlaceItemAt(buildItem, x, z, sim.unlockedRooms, sim.objects);
        if (res.valid) {
          placeAtTile(x, z);
          return;
        }
      }
    }
  };

  const placingDef = buildItem ? CATALOG_ITEMS[buildItem] : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none flex flex-col items-center pb-3 px-3">
      {/* Placement Mode Active Bar */}
      {placingDef && (
        <div
          className="pointer-events-auto mb-2.5 flex flex-wrap items-center gap-3 px-4 py-2 rounded-lg border border-amber-500/50 shadow-2xl text-xs"
          style={{ backgroundColor: 'rgba(17, 21, 32, 0.96)' }}
        >
          <div>
            <span className="text-slate-400">Placing: </span>
            <span className="font-bold text-amber-400">{placingDef.name}</span>
            <span className="text-slate-400 ml-2 font-mono-num">
              ({formatRupiah(getDiscountedCost(placingDef.cost, sim.effects))})
            </span>
          </div>
          <button
            type="button"
            onClick={rotateBuildItem}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Rotate {buildRotation * 90}° [R]
          </button>
          <button
            type="button"
            onClick={handleQuickPlace}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            Place on Next Open Tile
          </button>
          <button
            type="button"
            onClick={() => selectBuildItem(null)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-rose-900/70 hover:bg-rose-800 text-rose-100 font-semibold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancel [Esc]
          </button>
        </div>
      )}

      {/* Active Management Drawer */}
      {activeTab && !dockCollapsed && (
        <div
          className="pointer-events-auto mb-2.5 w-full max-w-[960px] max-h-[54vh] overflow-y-auto warnet-scroll rounded-xl border border-white/12 p-4 shadow-2xl"
          style={{ backgroundColor: 'rgba(14, 18, 28, 0.96)' }}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <button
              type="button"
              aria-label="Close Drawer"
              onClick={() => setActiveTab(null)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeTab === 'build' && <BuildPanel />}
          {activeTab === 'computers' && <ComputersPanel />}
          {activeTab === 'staff' && <StaffPanel />}
          {activeTab === 'finance' && <FinancePanel />}
          {activeTab === 'upgrades' && <UpgradesPanel />}
          {activeTab === 'stats' && <StatsPanel />}
          {activeTab === 'leaderboard' && <LeaderboardPanel />}
          {activeTab === 'save' && <SavePanel />}
        </div>
      )}

      {/* Collapse / Expand Handle */}
      <button
        type="button"
        aria-label={dockCollapsed ? 'Show Controls' : 'Hide Controls'}
        onClick={toggleDockCollapsed}
        className="pointer-events-auto mb-1 px-3 py-1 rounded-t-lg border border-b-0 border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
        style={{ backgroundColor: 'rgba(17, 21, 32, 0.92)' }}
      >
        {dockCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" /> Show Controls [H]
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" /> Hide [H]
          </>
        )}
      </button>

      {/* Main Bottom Action Dock */}
      {!dockCollapsed && (
        <nav
          aria-label="Warnet Management Menu"
          className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-xl border border-white/12 shadow-2xl overflow-x-auto max-w-[96vw]"
          style={{ backgroundColor: 'rgba(17, 21, 32, 0.94)' }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const hasReadyQuest =
              tab.id === 'stats' &&
              sim.dailyQuests.some((q) => !q.claimed && q.progress >= q.target);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-200 hover:bg-slate-800/90'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {hasReadyQuest && (
                  <span
                    aria-label="Quest ready to claim"
                    className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
