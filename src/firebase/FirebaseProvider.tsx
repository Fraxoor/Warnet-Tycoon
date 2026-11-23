import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { SimulationState } from '../types/game';
import { auth, signInWithGoogle, signOutUser } from './firebase';
import {
  deleteLeaderboardEntry,
  loadUserProfilePrefs,
  submitLeaderboardEntry,
  subscribeLeaderboard,
  type LeaderboardEntry,
} from './leaderboard';
import { sanitizeLeaderboardLabel } from './leaderboardUtils';

const LS_CAFE_NAME_KEY = 'warnet_tycoon_cafe_name';
const LS_PLAYER_NAME_KEY = 'warnet_tycoon_player_name';

function formatFriendlyFirebaseError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  let extracted = raw;
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed.error) extracted = parsed.error;
  } catch {
    // not JSON
  }

  if (extracted.includes('Quota exceeded')) {
    return 'Daily Firestore quota exceeded. Quota resets tomorrow; check the Spark plan limits in Firebase Console.';
  }
  if (extracted.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in was cancelled.';
  }
  if (extracted.includes('auth/popup-blocked')) {
    return 'Popup blocked by browser. Please allow popups to sign in with Google.';
  }
  if (extracted.includes('auth/unauthorized-domain')) {
    return 'This domain is not yet authorized in Firebase Auth settings.';
  }
  return extracted;
}

interface FirebaseContextValue {
  user: User | null;
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
  setCafeName: (v: string) => void;
  setPlayerName: (v: string) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  publishScore: (sim: SimulationState, forceOverwrite?: boolean) => Promise<void>;
  removeMyEntry: () => Promise<void>;
  clearFeedback: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

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

  const setCafeName = useCallback((v: string) => {
    setCafeNameState(v);
    try {
      localStorage.setItem(LS_CAFE_NAME_KEY, v);
    } catch {
      // ignore storage errors
    }
  }, []);

  const setPlayerName = useCallback((v: string) => {
    setPlayerNameState(v);
    try {
      localStorage.setItem(LS_PLAYER_NAME_KEY, v);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setAuthError(null);
        if (!playerName && nextUser.displayName) {
          setPlayerName(sanitizeLeaderboardLabel(nextUser.displayName, 'Owner'));
        }
        void loadUserProfilePrefs(nextUser.uid)
          .then((prefs) => {
            if (prefs) {
              setCafeName(prefs.cafeName);
              setPlayerName(prefs.displayName);
            }
          })
          .catch(() => {
            // Non-blocking if profile doesn't exist yet
          });
      } else {
        setEntries([]);
        setLoadingLeaderboard(false);
      }
    });
    return () => unsub();
  }, [playerName, setCafeName, setPlayerName]);

  // Only attach onSnapshot once authReady && user is authenticated
  useEffect(() => {
    if (!authReady || !user) {
      setEntries([]);
      setLoadingLeaderboard(false);
      return;
    }

    setLoadingLeaderboard(true);
    setLeaderboardError(null);
    const unsub = subscribeLeaderboard(
      (list) => {
        setEntries(list);
        setLoadingLeaderboard(false);
        setLeaderboardError(null);
      },
      (err) => {
        setLoadingLeaderboard(false);
        setLeaderboardError(formatFriendlyFirebaseError(err));
      },
    );

    return () => unsub();
  }, [authReady, user]);

  const signIn = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const signedInUser = await signInWithGoogle();
      if (!playerName && signedInUser.displayName) {
        setPlayerName(sanitizeLeaderboardLabel(signedInUser.displayName, 'Owner'));
      }
    } catch (err) {
      setAuthError(formatFriendlyFirebaseError(err));
    } finally {
      setAuthBusy(false);
    }
  }, [playerName, setPlayerName]);

  const signOut = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    setSubmitFeedback(null);
    try {
      await signOutUser();
    } catch (err) {
      setAuthError(formatFriendlyFirebaseError(err));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const publishScore = useCallback(
    async (sim: SimulationState, forceOverwrite = false) => {
      if (!user) return;
      setSubmitting(true);
      setSubmitFeedback(null);
      try {
        const effectivePlayer = sanitizeLeaderboardLabel(
          playerName || user.displayName || 'Warnet Owner',
          'Warnet Owner',
        );
        const effectiveCafe = sanitizeLeaderboardLabel(cafeName, 'Warnet Nusantara');
        const res = await submitLeaderboardEntry(
          user,
          sim,
          effectivePlayer,
          effectiveCafe,
          forceOverwrite,
        );
        if (res.status === 'kept_best') {
          setSubmitFeedback({
            text: `Your saved best score (${res.bestScore.toLocaleString('id-ID')}) is higher than this run (${res.submittedScore.toLocaleString('id-ID')}).`,
            tone: 'warn',
          });
        } else {
          setSubmitFeedback({
            text:
              res.status === 'created'
                ? 'Joined the Global Leaderboard!'
                : 'Global Leaderboard score updated!',
            tone: 'good',
          });
        }
      } catch (err) {
        setSubmitFeedback({
          text: formatFriendlyFirebaseError(err),
          tone: 'bad',
        });
      } finally {
        setSubmitting(false);
      }
    },
    [user, playerName, cafeName],
  );

  const removeMyEntry = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);
    setSubmitFeedback(null);
    try {
      await deleteLeaderboardEntry(user);
      setSubmitFeedback({
        text: 'Removed your entry from the Global Leaderboard.',
        tone: 'warn',
      });
    } catch (err) {
      setSubmitFeedback({
        text: formatFriendlyFirebaseError(err),
        tone: 'bad',
      });
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  const clearFeedback = useCallback(() => setSubmitFeedback(null), []);

  const value = useMemo<FirebaseContextValue>(
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
      setCafeName,
      setPlayerName,
      signIn,
      signOut,
      publishScore,
      removeMyEntry,
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
      setCafeName,
      setPlayerName,
      signIn,
      signOut,
      publishScore,
      removeMyEntry,
      clearFeedback,
    ],
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

export function useFirebaseLeaderboard(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebaseLeaderboard must be used inside FirebaseProvider');
  }
  return ctx;
}
