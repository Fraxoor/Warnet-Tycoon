import React, { useMemo, useState } from 'react';
import {
  Award,
  Crown,
  KeyRound,
  LogIn,
  LogOut,
  Send,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { useSupabaseLeaderboard } from '../supabase/SupabaseProvider';
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
    signInWithUsername,
    signUpWithUsername,
    signOut,
    publishScore,
    removeMyEntry,
    refreshLeaderboard,
  } = useSupabaseLeaderboard();

  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formCafeName, setFormCafeName] = useState('Warnet Nusantara');

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
    const idx = sortedEntries.findIndex((e) => e.uid === user.id);
    return idx >= 0 ? idx + 1 : null;
  }, [sortedEntries, user]);

  const myEntry = useMemo(
    () => (user ? entries.find((e) => e.uid === user.id) ?? null : null),
    [entries, user],
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signin') {
      await signInWithUsername(formUsername, formPassword);
    } else {
      await signUpWithUsername(formUsername, formPassword, formCafeName);
    }
  };

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
        {/* Current Run Card */}
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

        {/* Auth / Account Card */}
        <div className="lg:col-span-2 p-3.5 rounded-lg bg-slate-900/90 border border-white/10 flex flex-col justify-between gap-3">
          {!authReady ? (
            <div className="text-slate-400 py-2">Connecting to Supabase...</div>
          ) : !user ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Supabase Player Account
                </div>
                <div className="flex rounded bg-slate-950 p-0.5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      authMode === 'signin'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-2 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="e.g. warnet_master"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Cafe Name
                    </label>
                    <input
                      type="text"
                      value={formCafeName}
                      onChange={(e) => setFormCafeName(e.target.value)}
                      placeholder="Warnet Nusantara"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                {authError && (
                  <p className="text-rose-400 text-[11px] font-medium">{authError}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {authMode === 'signin'
                      ? 'No account? Switch to Register above.'
                      : 'Free registration, no email verification needed.'}
                  </span>
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {authMode === 'signin' ? (
                      <>
                        <LogIn className="w-3.5 h-3.5" />
                        {authBusy ? 'Signing in...' : 'Sign In'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        {authBusy ? 'Creating Account...' : 'Register'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Award className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-bold text-white truncate">
                    @{user.username}
                  </span>
                  <span className="text-slate-400 text-[11px]">({user.cafeName})</span>
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
                      placeholder={user.username || 'Owner'}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void publishScore(sim)}
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global Top 50 Table */}
      <div className="rounded-lg bg-slate-900/90 border border-white/10 overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm text-white">Global Empire Rankings</span>
            <span className="text-slate-400 text-[11px]">(Supabase Cloud DB)</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Sort By:</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSortBy(opt.id)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  sortBy === opt.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void refreshLeaderboard()}
              className="ml-2 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {loadingLeaderboard && entries.length === 0 ? (
          <div className="p-8 text-center text-slate-400">Loading rankings from Supabase...</div>
        ) : leaderboardError ? (
          <div className="p-6 text-center text-rose-400 space-y-1">
            <p className="font-semibold">{leaderboardError}</p>
            <button
              type="button"
              onClick={() => void refreshLeaderboard()}
              className="mt-2 px-3 py-1 rounded bg-slate-800 text-white text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No scores published yet.</p>
            <p className="text-[11px]">
              {user
                ? 'Click "Publish Score" above to claim the #1 spot on the leaderboard!'
                : 'Sign in with your username above to publish your empire!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 font-semibold bg-slate-950/40">
                  <th className="py-2 px-3 w-12 text-center">Rank</th>
                  <th className="py-2 px-3">Cafe & Owner</th>
                  <th className="py-2 px-3 text-right">Empire Score</th>
                  <th className="py-2 px-3 text-right">Cash Balance</th>
                  <th className="py-2 px-3 text-center">PCs</th>
                  <th className="py-2 px-3 text-center">Rating</th>
                  <th className="py-2 px-3 text-center">Day</th>
                  <th className="py-2 px-3 text-right">Customers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedEntries.map((e, index) => {
                  const isMe = user?.id === e.uid;
                  const rank = index + 1;
                  return (
                    <tr
                      key={e.uid}
                      className={`transition-colors ${
                        isMe
                          ? 'bg-amber-500/10 font-medium'
                          : index % 2 === 0
                            ? 'bg-transparent'
                            : 'bg-white/[0.02]'
                      } hover:bg-white/[0.04]`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono-num">
                        {rank === 1 ? (
                          <span className="text-amber-400 font-bold flex items-center justify-center gap-1">
                            🥇 #1
                          </span>
                        ) : rank === 2 ? (
                          <span className="text-slate-300 font-bold flex items-center justify-center gap-1">
                            🥈 #2
                          </span>
                        ) : rank === 3 ? (
                          <span className="text-amber-600 font-bold flex items-center justify-center gap-1">
                            🥉 #3
                          </span>
                        ) : (
                          <span className="text-slate-400">#{rank}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {e.cafeName}
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[10px]">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">Owner: @{e.playerName}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num font-bold text-amber-400">
                        {e.score.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-slate-200">
                        {formatRupiah(e.balance)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num text-slate-300">
                        {e.pcCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num text-slate-300">
                        {e.businessRating}/100
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono-num text-slate-300">
                        {e.day}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-num text-slate-300">
                        {e.totalCustomersServed.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
