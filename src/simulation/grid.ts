import type {
  CatalogItemType,
  GridPoint,
  PlacedObject,
  RoomId,
} from '../types/game';
import { CATALOG_ITEMS, ROOM_EXPANSIONS } from './catalog';

export const GRID_MIN_X = 0;
export const GRID_MAX_X = 19;
export const GRID_MIN_Z = -8;
export const GRID_MAX_Z = 7;

export const ENTRANCE_DOOR_POS: GridPoint = { x: 4, z: 7 };
export const STREET_SPAWN_POS: GridPoint = { x: 4, z: 10 };

export function getTileElevation(x: number, z: number): number {
  if (x >= 16 && x <= 19 && z >= -4 && z <= 7) {
    return 0.72;
  }
  if (x > 15 && x < 16 && z >= 0.5 && z <= 2.5) {
    return (x - 15) * 0.72;
  }
  return 0;
}

export function isTileUnlocked(x: number, z: number, unlockedRooms: RoomId[]): boolean {
  for (const roomId of unlockedRooms) {
    const b = ROOM_EXPANSIONS[roomId].bounds;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return true;
    }
  }
  return false;
}

export function getUnlockedBounds(unlockedRooms: RoomId[]) {
  let minX = 0;
  let maxX = 7;
  let minZ = 0;
  let maxZ = 7;
  for (const roomId of unlockedRooms) {
    const b = ROOM_EXPANSIONS[roomId].bounds;
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minZ = Math.min(minZ, b.minZ);
    maxZ = Math.max(maxZ, b.maxZ);
  }
  return { minX, maxX, minZ, maxZ };
}

export function isEntranceClearZone(x: number, z: number): boolean {
  // Keep entrance doorway & inner step-in tile unblocked so NPCs can always enter
  return (x === 3 || x === 4) && (z === 7 || z === 6);
}

export function canPlaceItemAt(
  type: CatalogItemType,
  x: number,
  z: number,
  unlockedRooms: RoomId[],
  objects: PlacedObject[],
): { valid: boolean; reason?: string; targetDeskId?: string } {
  if (!isTileUnlocked(x, z, unlockedRooms)) {
    return { valid: false, reason: 'Area not unlocked yet' };
  }

  const def = CATALOG_ITEMS[type];
  const existing = objects.find((o) => o.x === x && o.z === z);

  // Placing a standalone PC rig onto an existing empty desk
  if (def.category === 'computers' && def.pcTier) {
    if (!existing) {
      return { valid: false, reason: 'Place PC rig onto an empty desk' };
    }
    const existingDef = CATALOG_ITEMS[existing.type];
    if (!existingDef.isDesk) {
      return { valid: false, reason: 'Target tile is not a desk' };
    }
    if (existing.computer) {
      return { valid: false, reason: 'Desk already has a PC' };
    }
    return { valid: true, targetDeskId: existing.id };
  }

  // Placing a chair onto an existing desk or empty tile
  if (def.isChair) {
    if (existing) {
      const existingDef = CATALOG_ITEMS[existing.type];
      if (existingDef.isDesk) {
        return { valid: true, targetDeskId: existing.id };
      }
      return { valid: false, reason: 'Tile occupied' };
    }
    if (isEntranceClearZone(x, z)) {
      return { valid: false, reason: 'Keep entrance clear' };
    }
    return { valid: true };
  }

  if (isEntranceClearZone(x, z)) {
    return { valid: false, reason: 'Keep entrance doorway clear' };
  }

  if (existing) {
    return { valid: false, reason: 'Tile already occupied' };
  }

  return { valid: true };
}

export function getRotationForwardVector(rotation: 0 | 1 | 2 | 3): { dx: number; dz: number } {
  // Matches FurnitureModel rotY = -rotation * (Math.PI / 2) where local +Z is front
  switch (rotation) {
    case 0:
      return { dx: 0, dz: 1 };
    case 1:
      return { dx: -1, dz: 0 };
    case 2:
      return { dx: 0, dz: -1 };
    case 3:
      return { dx: 1, dz: 0 };
  }
}

export function getChairAccessTile(obj: PlacedObject): GridPoint {
  // Chair / interaction side sits in front of object based on rotation (0: +Z, 1: -X, 2: -Z, 3: +X)
  const { dx, dz } = getRotationForwardVector(obj.rotation);
  return { x: obj.x + dx, z: obj.z + dz };
}

export function getCounterBehindTile(obj: PlacedObject): GridPoint {
  // Staff stands behind counter opposite to customer-facing front
  const { dx, dz } = getRotationForwardVector(obj.rotation);
  return { x: obj.x - dx, z: obj.z - dz };
}

export function isTileWalkable(
  x: number,
  z: number,
  unlockedRooms: RoomId[],
  objects: PlacedObject[],
): boolean {
  // Street sidewalk outside entrance is walkable
  if (z >= 8 && z <= 11 && x >= -1 && x <= 16) {
    return true;
  }
  if (!isTileUnlocked(x, z, unlockedRooms)) {
    return false;
  }
  const blocker = objects.find((o) => {
    if (o.x !== x || o.z !== z) return false;
    return CATALOG_ITEMS[o.type].blocksWalk;
  });
  return !blocker;
}

export function canStepBetweenTiles(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
): boolean {
  // Front storefront wall runs along z = 7.55; only doorway tiles x = 3 and x = 4 connect interior (z <= 7) and sidewalk (z >= 8)
  if ((fromZ === 7 && toZ === 8) || (fromZ === 8 && toZ === 7)) {
    return (fromX === 3 || fromX === 4) && fromX === toX;
  }
  // 2nd Floor split-level staircase connects x=15 and x=16 strictly via stair tiles z=1 or z=2
  if ((fromX === 15 && toX === 16) || (fromX === 16 && toX === 15)) {
    return (fromZ === 1 || fromZ === 2) && fromZ === toZ;
  }
  return true;
}

/**
 * Bounded, allocation-light BFS for NPC navigation.
 * The playable map plus sidewalk fits inside this fixed search window.
 */
export function findGridPath(
  start: GridPoint,
  goal: GridPoint,
  unlockedRooms: RoomId[],
  objects: PlacedObject[],
): GridPoint[] {
  const sx = Math.round(start.x);
  const sz = Math.round(start.z);
  const gx = Math.round(goal.x);
  const gz = Math.round(goal.z);

  if (sx === gx && sz === gz) return [{ x: gx, z: gz }];

  // Include the full building footprint, stairs, and public sidewalk.
  const minX = -1;
  const maxX = 19;
  const minZ = -8;
  const maxZ = 11;
  const width = maxX - minX + 1;
  const height = maxZ - minZ + 1;
  const cellCount = width * height;
  const toIndex = (x: number, z: number) => (z - minZ) * width + (x - minX);

  if (
    sx < minX || sx > maxX || sz < minZ || sz > maxZ ||
    gx < minX || gx > maxX || gz < minZ || gz > maxZ
  ) {
    return [{ x: gx, z: gz }];
  }

  // Build the walkability map once instead of scanning every placed object
  // for every neighbor visited by BFS.
  const blocked = new Set<number>();
  for (const object of objects) {
    if (CATALOG_ITEMS[object.type].blocksWalk &&
        object.x >= minX && object.x <= maxX &&
        object.z >= minZ && object.z <= maxZ) {
      blocked.add(toIndex(object.x, object.z));
    }
  }

  const walkable = new Uint8Array(cellCount);
  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const index = toIndex(x, z);
      const sidewalk = z >= 8 && z <= 11 && x >= -1 && x <= 16;
      if (sidewalk || (isTileUnlocked(x, z, unlockedRooms) && !blocked.has(index))) {
        walkable[index] = 1;
      }
    }
  }

  const startIndex = toIndex(sx, sz);
  const goalIndex = toIndex(gx, gz);
  const parents = new Int32Array(cellCount);
  parents.fill(-2);
  parents[startIndex] = -1;

  // Fixed-size integer queue avoids Array.shift() and string-keyed Maps.
  const queue = new Int16Array(cellCount);
  let head = 0;
  let tail = 0;
  queue[tail++] = startIndex;

  const dx = [1, -1, 0, 0];
  const dz = [0, 0, 1, -1];

  while (head < tail && parents[goalIndex] === -2) {
    const current = queue[head++];
    const cx = (current % width) + minX;
    const cz = Math.floor(current / width) + minZ;

    for (let direction = 0; direction < 4; direction++) {
      const nx = cx + dx[direction];
      const nz = cz + dz[direction];
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
      if (!canStepBetweenTiles(cx, cz, nx, nz)) continue;

      const next = toIndex(nx, nz);
      if (parents[next] !== -2) continue;
      if (next !== goalIndex && walkable[next] === 0) continue;

      parents[next] = current;
      queue[tail++] = next;
      if (next === goalIndex) break;
    }
  }

  // If the exact goal is unreachable, route to the closest reachable tile.
  // This prevents the old fallback from walking NPCs straight through furniture.
  let destinationIndex = goalIndex;
  if (parents[goalIndex] === -2) {
    let bestDistance = Number.POSITIVE_INFINITY;
    destinationIndex = startIndex;
    for (let index = 0; index < cellCount; index++) {
      if (parents[index] === -2) continue;
      const x = (index % width) + minX;
      const z = Math.floor(index / width) + minZ;
      const distance = Math.abs(x - gx) + Math.abs(z - gz);
      if (distance < bestDistance) {
        bestDistance = distance;
        destinationIndex = index;
      }
    }
  }

  const path: GridPoint[] = [];
  for (let index = destinationIndex; index !== startIndex; index = parents[index]) {
    path.push({
      x: (index % width) + minX,
      z: Math.floor(index / width) + minZ,
    });
  }
  path.reverse();
  return path;
}
