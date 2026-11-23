import type { SaveRecord, SaveSlotMeta, SimulationState } from '../types/game';
import { countComputers } from '../simulation/economy';

const DB_NAME = 'warnet_tycoon_db';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const LS_FALLBACK_KEY = 'warnet_tycoon_saves_v1';

export const SAVE_SLOT_IDS = ['autosave', 'slot_1', 'slot_2', 'slot_3'] as const;
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

export function getSlotDefaultLabel(slotId: string): string {
  switch (slotId) {
    case 'autosave':
      return 'Auto Save';
    case 'slot_1':
      return 'Save Slot 1';
    case 'slot_2':
      return 'Save Slot 2';
    case 'slot_3':
      return 'Save Slot 3';
    default:
      return slotId;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'meta.slotId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

function readFallbackMap(): Record<string, SaveRecord> {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SaveRecord>;
  } catch {
    return {};
  }
}

function writeFallbackMap(map: Record<string, SaveRecord>) {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export async function saveGameToSlot(
  slotId: SaveSlotId,
  state: SimulationState,
  dayDurationSeconds: number,
  customLabel?: string,
): Promise<SaveSlotMeta> {
  const meta: SaveSlotMeta = {
    slotId,
    label: customLabel ?? getSlotDefaultLabel(slotId),
    savedAt: Date.now(),
    day: state.day,
    balance: Math.round(state.balance),
    stage: state.stage,
    pcCount: countComputers(state.objects),
    reputation: state.reputation,
  };
  const record: SaveRecord = {
    meta,
    state,
    dayDurationSeconds,
  };

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const map = readFallbackMap();
    map[slotId] = record;
    writeFallbackMap(map);
  }
  return meta;
}

export async function loadGameFromSlot(slotId: string): Promise<SaveRecord | null> {
  try {
    const db = await openDb();
    const rec = await new Promise<SaveRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(slotId);
      req.onsuccess = () => resolve((req.result as SaveRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (rec) return rec;
  } catch {
    // fallback below
  }
  const map = readFallbackMap();
  return map[slotId] ?? null;
}

export async function listSaveSlots(): Promise<SaveSlotMeta[]> {
  try {
    const db = await openDb();
    const records = await new Promise<SaveRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as SaveRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records.map((r) => r.meta).sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    const map = readFallbackMap();
    return Object.values(map)
      .map((r) => r.meta)
      .sort((a, b) => b.savedAt - a.savedAt);
  }
}

export async function deleteSaveSlot(slotId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(slotId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const map = readFallbackMap();
    delete map[slotId];
    writeFallbackMap(map);
  }
}
