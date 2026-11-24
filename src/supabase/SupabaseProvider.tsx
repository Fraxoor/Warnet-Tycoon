import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { SimulationState } from '../types/game';
import { supabase, usernameToEmail, emailToUsername } from './supabase';
import {
  fetchLeaderboard,
  submitLeaderboardScore,
  deleteLeaderboardScore,
  fetchUserCloudSaves,
  saveGameToCloud,
  deleteCloudSave,
  type LeaderboardEntry,
  type CloudSaveSlot,
} from './leaderboard';

const LS_CAFE_NAME_KEY = 'warnet_tycoon_cafe_name';
const LS_PLAYER_NAME_KEY = 'warnet_tycoon_player_name';

export interface SupabaseUser {
  id: string;
  username: string;
  cafeName: string;
  email: string;
}

export interface SupabaseContextValue {
  user: SupabaseUser | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  entries: LeaderboardEntry[];
  loadingLeaderboard: boolean;
  leaderboardError: string | null;
  submitting: boolean;
  submitFeedback: { text: string; tone: 'good' | 'warn' | 'bad' } | null;
  cafeName: string;
  playerName: string;
  cloudSaves: CloudSaveSlot[];
  loadingCloudSaves: boolean;
  setCafeName: (v: string) => void;
  setPlayerName: (v: string) => void;
  signUpWithUsername: (username: string, pass: string, cafe?: string) => Promise<boolean>;
  signInWithUsername: (username: string, pass: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  publishScore: (sim: SimulationState) => Promise<void>;
  removeMyEntry: () => Promise<void>;
  uploadCloudSave: (slotId: string, label: string, sim: SimulationState) => Promise<boolean>;
  loadCloudSave: (slotId: string) => Promise<SimulationState | null>;
  removeCloudSave: (slotId: string) => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  refreshCloudSaves: () => Promise<void>;
  clearFeedback: () => void;
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawUser, setRawUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const [cloudSaves, setCloudSaves] = useState<CloudSaveSlot[]>([]);
  const [loadingCloudSaves, setLoadingCloudSaves] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    text: string;
    tone: 'good' | 'warn' | 'bad';
  } | null>(null);

  const [cafeName, setCafeNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_CAFE_NAME_KEY) || 'Warnet Nusantara';
    } catch {
      return 'Warnet Nusantara';
    }
  });

  const [playerName, setPlayerNameState] = useState<string>(() => {
    try {
      return localStorage.getItem(LS_PLAYER_NAME_KEY) || '';
    } catch {
      return '';
    }
  });

  const user: SupabaseUser | null = useMemo(() => {
    if (!rawUser) return null;
    const meta = rawUser.user_metadata || {};
    const uName = meta.username || emailToUsername(rawUser.email);
    const cName = meta.cafe_name || cafeName || 'Warnet Nusantara';
    return {
      id: rawUser.id,
      username: uName,
      cafeName: cName,
      email: rawUser.email || '',
    };
  }, [rawUser, cafeName]);

  const setCafeName = useCallback((v: string) => {
    setCafeNameState(v);
    try {
      localStorage.setItem(LS_CAFE_NAME_KEY, v);
    } catch {}
  }, []);

  const setPlayerName = useCallback((v: string) => {
    setPlayerNameState(v);
    try {
      localStorage.setItem(LS_PLAYER_NAME_KEY, v);
    } catch {}
  }, []);

  const clearFeedback = useCallback(() => setSubmitFeedback(null), []);

  const refreshLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    setLeaderboardError(null);
    try {
      const data = await fetchLeaderboard();
      setEntries(data);
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  const refreshCloudSaves = useCallback(async () => {
    if (!rawUser) {
      setCloudSaves([]);
      return;
    }
    setLoadingCloudSaves(true);
    try {
      const saves = await fetchUserCloudSaves(rawUser.id);
      setCloudSaves(saves);
    } catch (err) {
      console.warn('Failed to load cloud saves', err);
    } finally {
      setLoadingCloudSaves(false);
    }
  }, [rawUser]);

  // Initial Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setRawUser(session?.user ?? null);
      if (session?.user) {
        const u = session.user.user_metadata?.username || emailToUsername(session.user.email);
        const c = session.user.user_metadata?.cafe_name;
        if (u) setPlayerName(u);
        if (c) setCafeName(c);
      }
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setRawUser(session?.user ?? null);
      if (session?.user) {
        const u = session.user.user_metadata?.username || emailToUsername(session.user.email);
        const c = session.user.user_metadata?.cafe_name;
        if (u) setPlayerName(u);
        if (c) setCafeName(c);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setCafeName, setPlayerName]);

  // Load leaderboard entries on mount
  useEffect(() => {
    void refreshLeaderboard();
  }, [refreshLeaderboard]);

  // Refresh cloud saves when user changes
  useEffect(() => {
    if (rawUser) {
      void refreshCloudSaves();
    } else {
      setCloudSaves([]);
    }
  }, [rawUser, refreshCloudSaves]);

  const signUpWithUsername = useCallback(
    async (uName: string, pass: string, cName?: string): Promise<boolean> => {
      const trimmedUser = uName.trim();
      if (!trimmedUser || trimmedUser.length < 3) {
        setAuthError('Username must be at least 3 characters.');
        return false;
      }
      if (!pass || pass.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return false;
      }
      setAuthBusy(true);
      setAuthError(null);
      try {
        const email = usernameToEmail(trimmedUser);
        const cafe = cName?.trim() || cafeName || 'Warnet Nusantara';
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              username: trimmedUser,
              cafe_name: cafe,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          setRawUser(data.user);
          setPlayerName(trimmedUser);
          setCafeName(cafe);
          setSubmitFeedback({
            text: `Registered successfully as @${trimmedUser}!`,
            tone: 'good',
          });
          return true;
        }
        return false;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setAuthError(msg.includes('already registered') ? 'Username already taken. Please choose another.' : msg);
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    [cafeName, setCafeName, setPlayerName],
  );

  const signInWithUsername = useCallback(
    async (uName: string, pass: string): Promise<boolean> => {
      const trimmedUser = uName.trim();
      if (!trimmedUser) {
        setAuthError('Please enter your username.');
        return false;
      }
      if (!pass) {
        setAuthError('Please enter your password.');
        return false;
      }
      setAuthBusy(true);
      setAuthError(null);
      try {
        const email = usernameToEmail(trimmedUser);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
        if (data.user) {
          setRawUser(data.user);
          const metaUser = data.user.user_metadata?.username || trimmedUser;
          const metaCafe = data.user.user_metadata?.cafe_name || cafeName;
          setPlayerName(metaUser);
          setCafeName(metaCafe);
          setSubmitFeedback({
            text: `Welcome back, @${metaUser}!`,
            tone: 'good',
          });
          return true;
        }
        return false;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setAuthError(msg.includes('Invalid login credentials') ? 'Invalid username or password.' : msg);
        return false;
      } finally {
        setAuthBusy(false);
      }
    },
    [cafeName, setCafeName, setPlayerName],
  );

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    try {
      await supabase.auth.signOut();
      setRawUser(null);
      setCloudSaves([]);
      setSubmitFeedback({ text: 'Signed out successfully.', tone: 'good' });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const publishScore = useCallback(
    async (sim: SimulationState) => {
      if (!user) {
        setAuthError('Log in to publish your score to the leaderboard.');
        return;
      }
      setSubmitting(true);
      clearFeedback();
      try {
        await submitLeaderboardScore(user.id, playerName || user.username, cafeName || user.cafeName, sim);
        setSubmitFeedback({ text: 'Score published to Supabase Leaderboard!', tone: 'good' });
        await refreshLeaderboard();
      } catch (err) {
        setSubmitFeedback({
          text: err instanceof Error ? err.message : 'Failed to publish score.',
          tone: 'bad',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [user, playerName, cafeName, clearFeedback, refreshLeaderboard],
  );

  const removeMyEntry = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    clearFeedback();
    try {
      await deleteLeaderboardScore(user.id);
      setSubmitFeedback({ text: 'Your leaderboard entry was removed.', tone: 'good' });
      await refreshLeaderboard();
    } catch (err) {
      setSubmitFeedback({
        text: err instanceof Error ? err.message : 'Failed to remove entry.',
        tone: 'bad',
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, clearFeedback, refreshLeaderboard]);

  const uploadCloudSave = useCallback(
    async (slotId: string, label: string, sim: SimulationState): Promise<boolean> => {
      if (!user) {
        setAuthError('Log in with your username to save to Supabase Cloud.');
        return false;
      }
      try {
        await saveGameToCloud(user.id, slotId, label, sim);
        setSubmitFeedback({ text: `Cloud save "${label}" uploaded to Supabase!`, tone: 'good' });
        await refreshCloudSaves();
        return true;
      } catch (err) {
        setSubmitFeedback({
          text: err instanceof Error ? err.message : 'Failed to upload cloud save.',
          tone: 'bad',
        });
        return false;
      }
    },
    [user, refreshCloudSaves],
  );

  const loadCloudSave = useCallback(
    async (slotId: string): Promise<SimulationState | null> => {
      const found = cloudSaves.find((s) => s.slotId === slotId);
      return found?.gameData ?? null;
    },
    [cloudSaves],
  );

  const removeCloudSave = useCallback(
    async (slotId: string) => {
      if (!user) return;
      try {
        await deleteCloudSave(user.id, slotId);
        await refreshCloudSaves();
        setSubmitFeedback({ text: `Cloud save removed.`, tone: 'good' });
      } catch (err) {
        setSubmitFeedback({
          text: err instanceof Error ? err.message : 'Failed to delete cloud save.',
          tone: 'bad',
        });
      }
    },
    [user, refreshCloudSaves],
  );

  const value = useMemo<SupabaseContextValue>(
    () => ({
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
      cloudSaves,
      loadingCloudSaves,
      setCafeName,
      setPlayerName,
      signUpWithUsername,
      signInWithUsername,
      signOut,
      publishScore,
      removeMyEntry,
      uploadCloudSave,
      loadCloudSave,
      removeCloudSave,
      refreshLeaderboard,
      refreshCloudSaves,
      clearFeedback,
    }),
    [
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
      cloudSaves,
      loadingCloudSaves,
      setCafeName,
      setPlayerName,
      signUpWithUsername,
      signInWithUsername,
      signOut,
      publishScore,
      removeMyEntry,
      uploadCloudSave,
      loadCloudSave,
      removeCloudSave,
      refreshLeaderboard,
      refreshCloudSaves,
      clearFeedback,
    ],
  );

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
};

export function useSupabaseLeaderboard() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabaseLeaderboard must be used within SupabaseProvider');
  return ctx;
}
