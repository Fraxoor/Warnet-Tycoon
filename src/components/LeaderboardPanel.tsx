import React, { useMemo, useState } from 'react';
import {
  Award,
  Crown,
  LogIn,
  LogOut,
  Send,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { useFirebaseLeaderboard } from '../firebase/FirebaseProvider';
import {
  LEADERBOARD_MAX_NAME_LENGTH,
  computeEmpireScore,
} from '../firebase/leaderboardUtils';
import {
  computeBusinessRating,
  countComputers,
  formatRupiah,
} from '../simulation/economy';
import { useGameStore } from '../store/gameStore';

type SortMetric = 'score' | 'balance' | 'businessRating' | 'totalCustomersServed';

export const LeaderboardPanel: React.FC<{ allowPublish?: boolean }> = ({
  allowPublish = true,
}) => {
  const sim = useGameStore((s) => s.sim);
  const {
    user,
    authReady,
    authBusy,
    authError,
    entries,
    loadingLeaderboard,
    leaderboardError,
    submitting,
    submitFeedback,
    cafeName,
    playerName,
    setCafeName,
    setPlayerName,
    signIn,
    signOut,
    publishScore,
    removeMyEntry,
  } = useFirebaseLeaderboard();

  const [sortBy, setSortBy] = useState<SortMetric>('score');

  const currentScore = computeEmpireScore(sim);
  const currentPcCount = countComputers(sim.objects);
  const currentRating = computeBusinessRating(sim);

  const sortedEntries = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      if (sortBy === 'balance') return b.balance - a.balance;
      if (sortBy === 'businessRating') return b.businessRating - a.businessRating;
      if (sortBy === 'totalCustomersServed') {
        return b.totalCustomersServed - a.totalCustomersServed;
      }
      return b.score - a.score;
    });
    return copy;
  }, [entries, sortBy]);

  const myRank = useMemo(() => {
    if (!user) return null;
    const idx = sortedEntries.findIndex((e) => e.uid === user.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [sortedEntries, user]);

  const myEntry = useMemo(
    () => (user ? entries.find((e) => e.uid === user.uid) ?? null : null),
    [entries, user],
  );

  const sortOptions: Array<{ id: SortMetric; label: string }> = [
    { id: 'score', label: 'Empire Score' },
    { id: 'balance', label: 'Cash Balance' },
    { id: 'businessRating', label: 'Biz Rating' },
    { id: 'totalCustomersServed', label: 'Customers' },
  ];

  return (
    <div className="space-y-4 text-xs" data-testid="leaderboard-panel">
      {/* Top Status & Current Run / Auth Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg bg-slate-900/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Your Current Run
            </span>
            <span className="font-mono-num text-[11px] text-slate-400">
              Day {sim.day} · Stage {sim.stage}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Empire Score</span>
            <span className="font-mono-num font-bold text-white">
              {currentScore.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Balance / PCs</span>
            <span className="font-mono-num">
              {formatRupiah(sim.balance)} · {currentPcCount} PCs
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Rating / Served</span>
            <span className="font-mono-num">
              {currentRating}/100 · {sim.totalCustomersServed} cust
            </span>
          </div>
        </div>

        <div className="lg:col-span-2 p-3.5 rounded-lg bg-slate-900/90 border border-white/10 flex flex-col justify-between gap-3">
          {!authReady ? (
            <div className="text-slate-400 py-2">Connecting to Firebase Auth...</div>
          ) : !user ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-white">
                  Compete on the Global Leaderboard
                </div>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Sign in with Google to view worldwide Warnet Tycoon rankings, publish your
                  cafe&apos;s Empire Score, and climb to #1.
                </p>
                {authError && (
                  <p className="text-rose-400 mt-1.5 font-medium">{authError}</p>
                )}
              </div>
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signIn()}
                className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-4 h-4" />
                {authBusy ? 'Signing In...' : 'Sign in with Google'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold text-white truncate">
                    {user.displayName || 'Verified Owner'}
                  </span>
                  {myRank !== null && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono-num font-bold">
                      Rank #{myRank}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void signOut()}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  Sign Out
                </button>
              </div>

              {allowPublish && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                  <label className="flex-1 min-w-0">
                    <span className="block text-[11px] text-slate-400 mb-1">
                      Warnet Name
                    </span>
                    <input
                      type="text"
                      maxLength={LEADERBOARD_MAX_NAME_LENGTH}
                      value={cafeName}
                      onChange={(e) => setCafeName(e.target.value)}
                      placeholder="Warnet Nusantara"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </label>
                  <label className="flex-1 min-w-0">
                    <span className="block text-[11px] text-slate-400 mb-1">
                      Owner Nickname
                    </span>
                    <input
                      type="text"
                      maxLength={LEADERBOARD_MAX_NAME_LENGTH}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder={user.displayName || 'Owner'}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void publishScore(sim, false)}
                      className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submitting ? 'Publishing...' : 'Publish Score'}
                    </button>
                    {myEntry && (
                      <button
                        type="button"
                        disabled={submitting}
                        aria-label="Remove my leaderboard entry"
                        title="Remove my leaderboard entry"
                        onClick={() => void removeMyEntry()}
                        className="p-1.5 rounded bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {submitFeedback && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium ${
                    submitFeedback.tone === 'good'
                      ? 'text-emerald-400'
                      : submitFeedback.tone === 'bad'
                        ? 'text-rose-400'
                        : 'text-amber-300'
                  }`}
                >
                  <span>{submitFeedback.text}</span>
                  {submitFeedback.tone === 'warn' &&
                    myEntry &&
                    myEntry.score > currentScore && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void publishScore(sim, true)}
                        className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold cursor-pointer"
                      >
                        Overwrite Anyway
                      </button>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global Top 50 Table */}
      {user && (
        <div className="rounded-lg bg-slate-900/90 border border-white/10 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-400" />
              Global Rankings (Top 50)
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    sortBy === opt.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {leaderboardError ? (
            <div className="p-4 text-rose-400">{leaderboardError}</div>
          ) : loadingLeaderboard ? (
            <div className="p-4 text-slate-400">Loading global rankings...</div>
          ) : sortedEntries.length === 0 ? (
            <div className="p-4 text-slate-400">
              No scores published yet. Be the first Warnet Tycoon on the board!
            </div>
          ) : (
            <div className="overflow-x-auto max-h-60 overflow-y-auto warnet-scroll">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="py-2 px-3">Rank</th>
                    <th className="py-2 px-3">Warnet & Owner</th>
                    <th className="py-2 px-3 text-right">Empire Score</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                    <th className="py-2 px-3 text-right">Stage · PCs</th>
                    <th className="py-2 px-3 text-right">Rating</th>
                    <th className="py-2 px-3 text-right">Served</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono-num">
                  {sortedEntries.map((entry, index) => {
                    const rank = index + 1;
                    const isMe = entry.uid === user.uid;
                    return (
                      <tr
                        key={entry.uid}
                        className={
                          isMe
                            ? 'bg-amber-500/15 text-amber-100'
                            : 'hover:bg-slate-800/50 text-slate-200'
                        }
                      >
                        <td className="py-2 px-3 font-bold">
                          <span className="inline-flex items-center gap-1">
                            {rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            {rank === 2 && <Crown className="w-3.5 h-3.5 text-slate-300" />}
                            {rank === 3 && <Crown className="w-3.5 h-3.5 text-amber-700" />}
                            #{rank}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans">
                          <div className="font-bold text-white truncate max-w-[180px]">
                            {entry.cafeName}
                            {isMe && (
                              <span className="ml-1.5 text-[10px] uppercase text-amber-400">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {entry.playerName} · Day {entry.day}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-300">
                          {entry.score.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {formatRupiah(entry.balance)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          S{entry.stage} · {entry.pcCount} PCs
                        </td>
                        <td className="py-2 px-3 text-right">
                          {entry.businessRating}/100 (★{entry.reputation.toFixed(1)})
                        </td>
                        <td className="py-2 px-3 text-right">
                          {entry.totalCustomersServed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
