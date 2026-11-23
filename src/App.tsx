import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { WarnetScene } from './scene/WarnetScene';
import { TitleScreen } from './components/TitleScreen';
import { TopHud } from './components/TopHud';
import { ObjectInspector } from './components/ObjectInspector';
import { BottomDock } from './components/BottomDock';
import { EventModal, StatusModal } from './components/Modals';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FirebaseProvider } from './firebase/FirebaseProvider';

export default function App() {
  const screenState = useGameStore((s) => s.screenState);
  const notifications = useGameStore((s) => s.sim.recentNotifications);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const setScreenState = useGameStore((s) => s.setScreenState);

  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startNewGame();
    }
  }, [startNewGame]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const st = useGameStore.getState();
      if (e.key === 'Escape' || e.code === 'KeyP') {
        if (st.screenState === 'playing') {
          if (e.key === 'Escape' && st.buildItem) {
            // SceneController cancels build item on Escape
            return;
          }
          if (e.key === 'Escape' && st.activeTab) {
            st.setActiveTab(null);
            return;
          }
          setScreenState('paused');
        } else if (st.screenState === 'paused') {
          setScreenState('playing');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setScreenState]);

  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <main className="relative w-full h-full overflow-hidden select-none">
          {/* Isolated 3D Isometric Warnet World */}
          <WarnetScene />

          {/* Title Screen */}
          <TitleScreen />

          {/* Active Gameplay HUD */}
          <TopHud />

          {/* Quiet Recent Activity Feed (max 3 lines, top-left under HUD) */}
          {screenState === 'playing' && notifications.length > 0 && (
            <div className="fixed left-4 top-20 z-10 pointer-events-none space-y-1 max-w-xs hidden sm:block">
              {notifications.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border border-white/10 ${
                    n.tone === 'good'
                      ? 'text-emerald-200'
                      : n.tone === 'bad'
                        ? 'text-rose-200'
                        : 'text-amber-200'
                  }`}
                  style={{ backgroundColor: 'rgba(15, 20, 30, 0.85)' }}
                >
                  {n.text}
                </div>
              ))}
            </div>
          )}

          {/* Selected 3D Object Inspector */}
          <ObjectInspector />

          {/* Collapsible Management Dock */}
          <BottomDock />

          {/* Dynamic Event & Status Modals */}
          <EventModal />
          <StatusModal />
        </main>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
