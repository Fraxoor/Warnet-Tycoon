import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { computeBusinessRating, countComputers } from '../simulation/economy';
import type { SimulationState } from '../types/game';
import { OperationType, db, handleFirestoreError } from './firebase';
import {
  clampNumber,
  computeEmpireScore,
  isValidFirebaseId,
  sanitizeLeaderboardLabel,
} from './leaderboardUtils';

export interface LeaderboardEntry {
  uid: string;
  playerName: string;
  cafeName: string;
  score: number;
  balance: number;
  reputation: number;
  businessRating: number;
  stage: number;
  pcCount: number;
  day: number;
  totalCustomersServed: number;
  updatedAtMs: number;
}

export interface UserProfilePrefs {
  uid: string;
  displayName: string;
  cafeName: string;
}

export function subscribeLeaderboard(
  onEntries: (entries: LeaderboardEntry[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const path = 'leaderboard';
  const q = query(
    collection(db, path),
    where('score', '>=', 0),
    orderBy('score', 'desc'),
    limit(50),
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: LeaderboardEntry[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const updatedAt = d.updatedAt as { toMillis?: () => number } | undefined;
        list.push({
          uid: String(d.uid ?? docSnap.id),
          playerName: String(d.playerName ?? 'Owner'),
          cafeName: String(d.cafeName ?? 'Warnet Nusantara'),
          score: Number(d.score ?? 0),
          balance: Number(d.balance ?? 0),
          reputation: Number(d.reputation ?? 0),
          businessRating: Number(d.businessRating ?? 0),
          stage: Number(d.stage ?? 1),
          pcCount: Number(d.pcCount ?? 0),
          day: Number(d.day ?? 1),
          totalCustomersServed: Number(d.totalCustomersServed ?? 0),
          updatedAtMs: updatedAt?.toMillis ? updatedAt.toMillis() : Date.now(),
        });
      });
      onEntries(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    },
  );
}

export async function loadUserProfilePrefs(uid: string): Promise<UserProfilePrefs | null> {
  if (!isValidFirebaseId(uid)) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid,
      displayName: sanitizeLeaderboardLabel(String(d.displayName ?? ''), 'Owner'),
      cafeName: sanitizeLeaderboardLabel(String(d.cafeName ?? ''), 'Warnet Nusantara'),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfilePrefs(
  user: User,
  displayNameInput: string,
  cafeNameInput: string,
): Promise<UserProfilePrefs> {
  if (!isValidFirebaseId(user.uid)) {
    throw new Error('Invalid user ID.');
  }
  const displayName = sanitizeLeaderboardLabel(
    displayNameInput,
    user.displayName ?? 'Warnet Owner',
  );
  const cafeName = sanitizeLeaderboardLabel(cafeNameInput, 'Warnet Nusantara');
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  let exists = false;
  try {
    const snap = await getDoc(ref);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!exists) {
    try {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        cafeName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        displayName,
        cafeName,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  return { uid: user.uid, displayName, cafeName };
}

export interface SubmitScoreResult {
  status: 'created' | 'updated' | 'kept_best';
  submittedScore: number;
  bestScore: number;
}

export async function submitLeaderboardEntry(
  user: User,
  sim: SimulationState,
  playerNameInput: string,
  cafeNameInput: string,
  forceOverwrite = false,
): Promise<SubmitScoreResult> {
  if (!isValidFirebaseId(user.uid)) {
    throw new Error('Invalid user UID for leaderboard submission.');
  }
  if (!user.emailVerified) {
    throw new Error('A verified Google account is required to publish scores.');
  }

  const playerName = sanitizeLeaderboardLabel(
    playerNameInput,
    user.displayName ?? 'Warnet Owner',
  );
  const cafeName = sanitizeLeaderboardLabel(cafeNameInput, 'Warnet Nusantara');

  const score = computeEmpireScore(sim);
  const balance = clampNumber(Math.round(sim.balance), -2_000_000, 1_000_000_000_000);
  const reputation = clampNumber(Number(sim.reputation.toFixed(2)), 0, 5);
  const businessRating = clampNumber(computeBusinessRating(sim), 0, 100);
  const stage = clampNumber(Math.round(sim.stage), 1, 5);
  const pcCount = clampNumber(countComputers(sim.objects), 0, 500);
  const day = clampNumber(Math.round(sim.day), 1, 100_000);
  const totalCustomersServed = clampNumber(
    Math.round(sim.totalCustomersServed),
    0,
    100_000_000,
  );

  // Sync user preferences cleanly
  await saveUserProfilePrefs(user, playerName, cafeName);

  const path = `leaderboard/${user.uid}`;
  const ref = doc(db, 'leaderboard', user.uid);

  let existingScore: number | null = null;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      existingScore = Number(snap.data().score ?? 0);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (existingScore === null) {
    try {
      await setDoc(ref, {
        uid: user.uid,
        playerName,
        cafeName,
        score,
        balance,
        reputation,
        businessRating,
        stage,
        pcCount,
        day,
        totalCustomersServed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
    return { status: 'created', submittedScore: score, bestScore: score };
  }

  if (!forceOverwrite && score < existingScore) {
    return { status: 'kept_best', submittedScore: score, bestScore: existingScore };
  }

  try {
    await updateDoc(ref, {
      playerName,
      cafeName,
      score,
      balance,
      reputation,
      businessRating,
      stage,
      pcCount,
      day,
      totalCustomersServed,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return { status: 'updated', submittedScore: score, bestScore: score };
}

export async function deleteLeaderboardEntry(user: User): Promise<void> {
  if (!isValidFirebaseId(user.uid)) {
    throw new Error('Invalid user UID.');
  }
  const path = `leaderboard/${user.uid}`;
  try {
    await deleteDoc(doc(db, 'leaderboard', user.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
