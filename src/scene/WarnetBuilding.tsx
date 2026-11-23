import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { LightingTierId, RoomId, WeatherType } from '../types/game';
import { ROOM_EXPANSIONS } from '../simulation/catalog';
import { getTileElevation, getUnlockedBounds } from '../simulation/grid';
import {
  createKeramikFloorTexture,
  createPosterTexture,
  createRugTexture,
  createSignboardTexture,
  createStreetTexture,
} from './textures';

interface WarnetBuildingProps {
  unlockedRooms: RoomId[];
  lightingTier: LightingTierId;
  nightFactor: number; // 0 = day, 1 = night
  minuteOfDay: number;
  weather: WeatherType;
  powerOutage: boolean;
  onPointerMoveTile?: (x: number, z: number) => void;
  onClickTile?: (x: number, z: number) => void;
}

export const WarnetBuilding: React.FC<WarnetBuildingProps> = ({
  unlockedRooms,
  lightingTier,
  nightFactor,
  minuteOfDay,
  weather,
  powerOutage,
  onPointerMoveTile,
  onClickTile,
}) => {
  const fan1Ref = useRef<THREE.Group>(null);
  const fan2Ref = useRef<THREE.Group>(null);
  const hourHandRef = useRef<THREE.Group>(null);
  const minuteHandRef = useRef<THREE.Group>(null);

  const isGamingFloor = lightingTier === 'rgb_gaming' || lightingTier === 'esports_arena';

  const floorTex = useMemo(() => {
    const tex = createKeramikFloorTexture(isGamingFloor);
    tex.repeat.set(8, 8);
    return tex;
  }, [isGamingFloor]);

  const streetTex = useMemo(() => {
    const tex = createStreetTexture();
    tex.repeat.set(10, 2);
    return tex;
  }, []);

  const signTex = useMemo(() => createSignboardTexture(), []);
  const noticeTex = useMemo(() => createPosterTexture('notice_board'), []);
  const paketMalamTex = useMemo(() => createPosterTexture('paket_malam'), []);
  const tournamentTex = useMemo(() => createPosterTexture('tournament'), []);
  const aisleRugTex = useMemo(() => createRugTexture('aisle'), []);
  const waitingRugTex = useMemo(() => createRugTexture('waiting'), []);
  const receptionRugTex = useMemo(() => createRugTexture('reception'), []);

  const bounds = useMemo(() => getUnlockedBounds(unlockedRooms), [unlockedRooms]);
  const groundMaxX = useMemo(() => {
    let mx = 7;
    for (const r of unlockedRooms) {
      if (r !== 'second_floor') {
        mx = Math.max(mx, ROOM_EXPANSIONS[r].bounds.maxX);
      }
    }
    return mx;
  }, [unlockedRooms]);
  const width = bounds.maxX - bounds.minX + 1;
  const depth = bounds.maxZ - bounds.minZ + 1;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isGamingFloor ? 0x1e2536 : 0xe7dfd3,
        roughness: 0.85,
      }),
    [isGamingFloor],
  );

  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isGamingFloor ? 0x38bdf8 : 0x78553a,
        roughness: 0.48,
        emissive: isGamingFloor && !powerOutage ? new THREE.Color(0x0284c7) : new THREE.Color(0x000000),
        emissiveIntensity: isGamingFloor ? 0.55 : 0,
      }),
    [isGamingFloor, powerOutage],
  );

  const boothWoodMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isGamingFloor ? 0x263147 : 0x8b5e3c,
        roughness: 0.62,
      }),
    [isGamingFloor],
  );

  const metalFrameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.32,
        metalness: 0.68,
      }),
    [],
  );

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    if (!powerOutage) {
      if (fan1Ref.current) fan1Ref.current.rotation.y += dt * 5.2;
      if (fan2Ref.current) fan2Ref.current.rotation.y += dt * 5.5;
    }
    if (minuteHandRef.current && hourHandRef.current) {
      const m = minuteOfDay % 60;
      const h = (minuteOfDay / 60) % 12;
      minuteHandRef.current.rotation.x = -(m / 60) * Math.PI * 2;
      hourHandRef.current.rotation.x = -(h / 12) * Math.PI * 2;
    }
  });

  const handleFloorMove = (e: { point: THREE.Vector3 }) => {
    if (!onPointerMoveTile) return;
    const gx = Math.round(e.point.x);
    const gz = Math.round(e.point.z);
    onPointerMoveTile(gx, gz);
  };

  const handleFloorClick = (e: { point: THREE.Vector3; stopPropagation: () => void }) => {
    if (!onClickTile) return;
    e.stopPropagation();
    const gx = Math.round(e.point.x);
    const gz = Math.round(e.point.z);
    onClickTile(gx, gz);
  };

  const lightTubeColor = powerOutage
    ? 0x1e293b
    : lightingTier === 'fluorescent'
      ? 0xe2e8f0
      : lightingTier === 'warm_cafe'
        ? 0xfbbf24
        : lightingTier === 'rgb_gaming'
          ? 0x38bdf8
          : 0xa855f7;

  const hasSecondFloor = unlockedRooms.includes('second_floor');

  return (
    <group>
      {/* Extended Outdoor Ground Plane */}
      <mesh position={[7.5, -0.04, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={weather === 'rain' ? 0x141b19 : 0x1b2320} roughness={0.95} />
      </mesh>

      {/* Street Asphalt along Front (z = 9..13.2) — glistens when wet */}
      <mesh position={[7.5, -0.02, 11.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 4.4]} />
        <meshStandardMaterial
          map={streetTex}
          color={weather === 'rain' ? 0xcbd5e1 : 0xffffff}
          roughness={weather === 'rain' ? 0.24 : 0.9}
          metalness={weather === 'rain' ? 0.16 : 0.0}
        />
      </mesh>

      {/* Sidewalk Curb flush to storefront at z = 7.55..8.95 */}
      <mesh position={[centerX, -0.02, 8.25]} receiveShadow>
        <boxGeometry args={[Math.max(26, width + 12), 0.06, 1.4]} />
        <meshStandardMaterial color={weather === 'rain' ? 0x475569 : 0x64748b} roughness={weather === 'rain' ? 0.38 : 0.85} />
      </mesh>
      <mesh position={[centerX, -0.03, 8.95]} receiveShadow>
        <boxGeometry args={[Math.max(26, width + 12), 0.05, 0.08]} />
        <meshStandardMaterial color={0x475569} roughness={0.9} />
      </mesh>

      {/* Unlocked Room Floor Slabs */}
      {unlockedRooms.map((roomId) => {
        const b = ROOM_EXPANSIONS[roomId].bounds;
        const rw = b.maxX - b.minX + 1;
        const rd = b.maxZ - b.minZ + 1;
        const rx = (b.minX + b.maxX) / 2;
        const rz = (b.minZ + b.maxZ) / 2;
        const elev = getTileElevation(b.minX, b.minZ);
        const texClone = floorTex.clone();
        texClone.repeat.set(rw / 2, rd / 2);
        texClone.needsUpdate = true;

        return (
          <group key={roomId}>
            {elev > 0 && (
              <mesh position={[rx, elev / 2 - 0.01, rz]} receiveShadow castShadow>
                <boxGeometry args={[rw, elev, rd]} />
                <meshStandardMaterial color={isGamingFloor ? 0x111827 : 0x64748b} roughness={0.78} />
              </mesh>
            )}
            <mesh
              position={[rx, elev, rz]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
              onPointerMove={handleFloorMove}
              onClick={handleFloorClick}
            >
              <planeGeometry args={[rw, rd]} />
              <meshStandardMaterial map={texClone} color={0xffffff} roughness={0.62} />
            </mesh>
          </group>
        );
      })}

      {/* 2nd Floor VIP & Tournament Split-Level Staircase & Glass Mezzanine Balustrade */}
      {hasSecondFloor && (
        <group>
          {/* Illuminated 5-step Staircase at x=15..16, z=1..2 */}
          {[0, 1, 2, 3, 4].map((stepIdx) => {
            const sx = 15.05 + stepIdx * 0.2;
            const sy = (stepIdx + 0.5) * 0.144;
            return (
              <group key={`stair_${stepIdx}`} position={[sx, sy, 1.5]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.22, 0.14, 1.85]} />
                  <meshStandardMaterial color={0x334155} roughness={0.5} metalness={0.35} />
                </mesh>
                <mesh position={[-0.1, 0.06, 0]}>
                  <boxGeometry args={[0.02, 0.02, 1.82]} />
                  <meshBasicMaterial color={powerOutage ? 0x1e293b : 0x38bdf8} />
                </mesh>
              </group>
            );
          })}
          {/* Mezzanine Safety Glass Railing along x = 15.52 (split around stair opening z=0.5..2.5) */}
          <mesh position={[15.52, 1.05, -1.75]}>
            <boxGeometry args={[0.05, 0.65, 4.4]} />
            <meshStandardMaterial color={0x93c5fd} transparent opacity={0.32} roughness={0.12} />
          </mesh>
          <mesh position={[15.52, 1.39, -1.75]} material={metalFrameMat}>
            <boxGeometry args={[0.08, 0.05, 4.44]} />
          </mesh>
          <mesh position={[15.52, 1.05, 5.0]}>
            <boxGeometry args={[0.05, 0.65, 4.9]} />
            <meshStandardMaterial color={0x93c5fd} transparent opacity={0.32} roughness={0.12} />
          </mesh>
          <mesh position={[15.52, 1.39, 5.0]} material={metalFrameMat}>
            <boxGeometry args={[0.08, 0.05, 4.94]} />
          </mesh>
        </group>
      )}

      {/* Interior Zoning Floor Accents */}
      <mesh position={[3.5, 0.008, 3.85]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.45, 5.4]} />
        <meshStandardMaterial map={aisleRugTex} roughness={0.88} />
      </mesh>
      <mesh position={[3.52, 0.014, 7.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.65, 0.72]} />
        <meshStandardMaterial color={0x1e293b} roughness={0.92} />
      </mesh>
      <mesh position={[3.52, 0.015, 7.52]} receiveShadow>
        <boxGeometry args={[1.9, 0.03, 0.14]} />
        <meshStandardMaterial color={0x475569} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.9, 0.007, 5.25]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.3, 1.9]} />
        <meshStandardMaterial map={receptionRugTex} roughness={0.9} />
      </mesh>
      <mesh position={[6.2, 0.008, 6.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.1, 1.55]} />
        <meshStandardMaterial map={waitingRugTex} roughness={0.9} />
      </mesh>

      {/* Subtle PC Bay Floor Strips */}
      {[0, 3].map((rowZ) => (
        <group key={`row_strip_${rowZ}`}>
          <mesh position={[1.5, 0.005, rowZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[2.05, 0.92]} />
            <meshStandardMaterial color={isGamingFloor ? 0x162032 : 0xc5bba8} roughness={0.85} />
          </mesh>
          <mesh position={[5.5, 0.005, rowZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[2.05, 0.92]} />
            <meshStandardMaterial color={isGamingFloor ? 0x162032 : 0xc5bba8} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Structured Warnet PC Cubicle Dividers (Bilik Warnet) along z = 0 */}
      {[0.5, 1.5, 2.5, 4.5, 5.5, 6.5].map((divX) => (
        <group key={`booth_div_${divX}`} position={[divX, 0, -0.14]}>
          <mesh position={[0, 0.54, 0]} material={boothWoodMat} castShadow receiveShadow>
            <boxGeometry args={[0.036, 1.08, 0.62]} />
          </mesh>
          <mesh position={[0, 1.09, 0]} material={trimMat}>
            <boxGeometry args={[0.044, 0.035, 0.64]} />
          </mesh>
        </group>
      ))}

      {/* Back Wall (North perimeter) */}
      <mesh
        position={[centerX, 1.35, bounds.minZ - 0.55]}
        material={wallMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width + 0.24, 2.7, 0.16]} />
      </mesh>
      <mesh position={[centerX, 0.22, bounds.minZ - 0.45]} material={trimMat}>
        <boxGeometry args={[width + 0.12, 0.44, 0.04]} />
      </mesh>
      {/* Wall-hugging LAN/Power Cable Conduit Trunking (North) */}
      <mesh position={[centerX, 0.55, bounds.minZ - 0.45]} material={metalFrameMat}>
        <boxGeometry args={[width - 0.2, 0.045, 0.035]} />
      </mesh>
      <mesh position={[centerX, 0.006, bounds.minZ - 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, 0.14]} />
        <meshBasicMaterial color={0x0f172a} transparent opacity={0.14} depthWrite={false} />
      </mesh>

      {/* Left Wall (West perimeter) */}
      <mesh
        position={[bounds.minX - 0.55, 1.35, centerZ]}
        material={wallMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.16, 2.7, depth + 0.24]} />
      </mesh>
      <mesh position={[bounds.minX - 0.45, 0.22, centerZ]} material={trimMat}>
        <boxGeometry args={[0.04, 0.44, depth + 0.12]} />
      </mesh>
      <mesh position={[bounds.minX - 0.42, 0.006, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.14, depth]} />
        <meshBasicMaterial color={0x0f172a} transparent opacity={0.14} depthWrite={false} />
      </mesh>

      {/* Right Wall (East perimeter, sleek cutaway half-height for isometric readability) */}
      <mesh
        position={[bounds.maxX + 0.55, hasSecondFloor ? 0.81 : 0.45, centerZ]}
        material={wallMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.16, hasSecondFloor ? 1.62 : 0.9, depth + 0.24]} />
      </mesh>
      <mesh position={[bounds.maxX + 0.55, hasSecondFloor ? 1.64 : 0.92, centerZ]} material={trimMat}>
        <boxGeometry args={[0.2, 0.05, depth + 0.26]} />
      </mesh>

      {/* Front Storefront Wall segments flanking the entrance door at x=3..4 */}
      <mesh position={[0.98, 0.42, 7.55]} material={wallMat} castShadow receiveShadow>
        <boxGeometry args={[3.14, 0.84, 0.16]} />
      </mesh>
      <mesh position={[0.98, 2.18, 7.55]} material={wallMat} castShadow receiveShadow>
        <boxGeometry args={[3.14, 0.44, 0.16]} />
      </mesh>
      <mesh position={[-0.36, 1.4, 7.55]} material={wallMat} castShadow>
        <boxGeometry args={[0.48, 1.12, 0.16]} />
      </mesh>
      <mesh position={[1.18, 1.4, 7.55]}>
        <boxGeometry args={[2.45, 1.1, 0.04]} />
        <meshStandardMaterial color={0x93c5fd} transparent opacity={0.32} roughness={0.1} />
      </mesh>
      <mesh position={[1.18, 1.97, 7.55]} material={metalFrameMat}>
        <boxGeometry args={[2.56, 0.07, 0.18]} />
      </mesh>
      <mesh position={[1.18, 0.85, 7.55]} material={metalFrameMat}>
        <boxGeometry args={[2.56, 0.07, 0.18]} />
      </mesh>
      <mesh position={[1.18, 1.4, 7.55]} material={metalFrameMat}>
        <boxGeometry args={[0.05, 1.1, 0.12]} />
      </mesh>

      {/* Front-Right Wall (ground floor right wing + 2nd floor cutaway) */}
      {groundMaxX >= 5 && (
        <group>
          <mesh
            position={[(4.52 + groundMaxX + 0.63) / 2, 0.42, 7.55]}
            material={wallMat}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[groundMaxX + 0.63 - 4.52, 0.84, 0.16]} />
          </mesh>
          <mesh position={[(4.52 + groundMaxX + 0.63) / 2, 0.96, 7.55]}>
            <boxGeometry args={[groundMaxX + 0.63 - 4.52 - 0.16, 0.24, 0.04]} />
            <meshStandardMaterial color={0x93c5fd} transparent opacity={0.3} roughness={0.1} />
          </mesh>
          <mesh
            position={[(4.52 + groundMaxX + 0.63) / 2, 1.09, 7.55]}
            material={metalFrameMat}
          >
            <boxGeometry args={[groundMaxX + 0.63 - 4.52 + 0.04, 0.05, 0.18]} />
          </mesh>
        </group>
      )}
      {hasSecondFloor && (
        <mesh position={[17.5, 1.16, 7.55]} material={wallMat}>
          <boxGeometry args={[4.1, 0.88, 0.16]} />
        </mesh>
      )}

      {/* Entrance Door Frame, Header & Open Double Glass Doors (x=2.55..4.5, z=7.55) */}
      <mesh position={[2.55, 1.2, 7.55]} material={metalFrameMat}>
        <boxGeometry args={[0.12, 2.4, 0.2]} />
      </mesh>
      <mesh position={[4.5, 1.2, 7.55]} material={metalFrameMat}>
        <boxGeometry args={[0.12, 2.4, 0.2]} />
      </mesh>
      <mesh position={[3.52, 2.26, 7.55]} material={metalFrameMat}>
        <boxGeometry args={[2.08, 0.26, 0.22]} />
      </mesh>

      <group position={[2.63, 1.06, 7.55]} rotation={[0, -1.62, 0]}>
        <mesh position={[0.42, 0, 0]} material={metalFrameMat}>
          <boxGeometry args={[0.84, 2.02, 0.05]} />
        </mesh>
        <mesh position={[0.42, 0.04, 0]}>
          <boxGeometry args={[0.7, 1.78, 0.06]} />
          <meshStandardMaterial color={0xbae6fd} transparent opacity={0.38} roughness={0.1} />
        </mesh>
        <mesh position={[0.74, -0.05, 0.05]} material={trimMat}>
          <boxGeometry args={[0.04, 0.34, 0.04]} />
        </mesh>
      </group>

      <group position={[4.42, 1.06, 7.55]} rotation={[0, 1.62, 0]}>
        <mesh position={[-0.42, 0, 0]} material={metalFrameMat}>
          <boxGeometry args={[0.84, 2.02, 0.05]} />
        </mesh>
        <mesh position={[-0.42, 0.04, 0]}>
          <boxGeometry args={[0.7, 1.78, 0.06]} />
          <meshStandardMaterial color={0xbae6fd} transparent opacity={0.38} roughness={0.1} />
        </mesh>
        <mesh position={[-0.74, -0.05, 0.05]} material={trimMat}>
          <boxGeometry args={[0.04, 0.34, 0.04]} />
        </mesh>
      </group>

      {/* Entrance Striped Awning Canopy */}
      <mesh position={[3.52, 2.18, 8.05]} rotation={[0.26, 0, 0]} castShadow>
        <boxGeometry args={[2.5, 0.08, 0.96]} />
        <meshStandardMaterial color={0xb91c1c} roughness={0.75} />
      </mesh>
      <mesh position={[3.52, 2.07, 8.51]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[2.5, 0.12, 0.04]} />
        <meshStandardMaterial color={0xfef3c7} roughness={0.7} />
      </mesh>

      {/* Iconic "WARNET NUSANTARA" Illuminated Storefront Signboard */}
      <group position={[3.52, 2.76, 7.62]}>
        <mesh castShadow>
          <boxGeometry args={[3.6, 0.85, 0.18]} />
          <meshStandardMaterial color={0x0f172a} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[3.45, 0.75]} />
          <meshStandardMaterial
            map={signTex}
            emissive={powerOutage ? new THREE.Color(0x000000) : new THREE.Color(0xfbbf24)}
            emissiveMap={signTex}
            emissiveIntensity={powerOutage ? 0 : 0.45 + nightFactor * 0.75}
          />
        </mesh>
      </group>

      {/* North Wall: Main Notice Board + Indonesian Warnet Posters + Subtle Neon Gaming Sign */}
      <group position={[3.5, 1.62, bounds.minZ - 0.45]}>
        <mesh castShadow>
          <boxGeometry args={[1.5, 1.08, 0.05]} />
          <meshStandardMaterial color={0x5c3d24} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[1.38, 0.96]} />
          <meshStandardMaterial map={noticeTex} roughness={0.7} />
        </mesh>
      </group>

      <group position={[1.5, 1.66, bounds.minZ - 0.45]}>
        <mesh>
          <boxGeometry args={[1.05, 0.78, 0.03]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.96, 0.7]} />
          <meshStandardMaterial map={paketMalamTex} roughness={0.6} />
        </mesh>
      </group>

      <group position={[5.5, 1.66, bounds.minZ - 0.45]}>
        <mesh>
          <boxGeometry args={[1.05, 0.78, 0.03]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.96, 0.7]} />
          <meshStandardMaterial map={tournamentTex} roughness={0.6} />
        </mesh>
      </group>

      {/* Subtle Neon Accent Light Bar on North Wall */}
      <mesh position={[3.5, 2.26, bounds.minZ - 0.44]}>
        <boxGeometry args={[1.8, 0.06, 0.04]} />
        <meshStandardMaterial
          color={0x38bdf8}
          emissive={powerOutage ? 0x000000 : 0x0ea5e9}
          emissiveIntensity={powerOutage ? 0 : 0.75 + nightFactor * 0.6}
        />
      </mesh>

      {/* West Wall Details: Cashier Shelf, Animated Wall Clock, Breaker Panel & Wall Trash/Extinguisher */}
      <group position={[bounds.minX - 0.42, 1.45, 5.0]}>
        <mesh castShadow>
          <boxGeometry args={[0.14, 0.05, 1.6]} />
          <meshStandardMaterial color={0x78553a} roughness={0.65} />
        </mesh>
        <mesh position={[0.02, 0.36, 0]}>
          <boxGeometry args={[0.14, 0.05, 1.6]} />
          <meshStandardMaterial color={0x78553a} roughness={0.65} />
        </mesh>
        <mesh position={[0.02, 0.14, -0.45]}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 8]} />
          <meshStandardMaterial color={0xef4444} roughness={0.4} />
        </mesh>
        <mesh position={[0.02, 0.14, -0.22]}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 8]} />
          <meshStandardMaterial color={0xf59e0b} roughness={0.4} />
        </mesh>
        <mesh position={[0.02, 0.14, 0.04]}>
          <boxGeometry args={[0.08, 0.18, 0.22]} />
          <meshStandardMaterial color={0x10b981} roughness={0.5} />
        </mesh>
        <mesh position={[0.02, 0.48, 0.35]}>
          <boxGeometry args={[0.08, 0.18, 0.34]} />
          <meshStandardMaterial color={0x0284c7} roughness={0.4} />
        </mesh>
      </group>

      {/* West Wall Analog Clock with Live Rotating Hour & Minute Hands */}
      <group position={[bounds.minX - 0.45, 1.95, 2.8]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.22, 0.22, 0.05, 20]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.4} />
        </mesh>
        <mesh position={[0.028, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.18, 20]} />
          <meshBasicMaterial color={0xf8fafc} />
        </mesh>
        <group ref={hourHandRef} position={[0.032, 0, 0]}>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.01, 0.08, 0.018]} />
            <meshBasicMaterial color={0x0f172a} />
          </mesh>
        </group>
        <group ref={minuteHandRef} position={[0.036, 0, 0]}>
          <mesh position={[0, 0.058, 0]}>
            <boxGeometry args={[0.01, 0.115, 0.014]} />
            <meshBasicMaterial color={0xdc2626} />
          </mesh>
        </group>
      </group>

      {/* Breaker Panel & Red Fire Extinguisher on West Wall */}
      <group position={[bounds.minX - 0.44, 1.35, 1.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.45, 0.36]} />
          <meshStandardMaterial color={0x475569} metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0.045, 0.1, 0.08]}>
          <boxGeometry args={[0.02, 0.05, 0.05]} />
          <meshBasicMaterial color={powerOutage ? 0xef4444 : 0x10b981} />
        </mesh>
      </group>
      <group position={[bounds.minX - 0.42, 0.85, 6.45]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.34, 10]} />
          <meshStandardMaterial color={0xdc2626} roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0]} material={metalFrameMat}>
          <cylinderGeometry args={[0.025, 0.035, 0.08, 8]} />
        </mesh>
      </group>

      {/* Wall-Mounted Linear Fluorescent & Neon Fixtures along North & West Upper Walls */}
      <group position={[centerX, 2.46, bounds.minZ - 0.44]}>
        <mesh>
          <boxGeometry args={[width * 0.72, 0.06, 0.08]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.035, 0.02]}>
          <boxGeometry args={[width * 0.68, 0.035, 0.055]} />
          <meshStandardMaterial
            color={lightTubeColor}
            emissive={powerOutage ? 0x000000 : lightTubeColor}
            emissiveIntensity={powerOutage ? 0 : 0.95 + nightFactor * 0.45}
          />
        </mesh>
      </group>
      <group position={[bounds.minX - 0.44, 2.46, centerZ]}>
        <mesh>
          <boxGeometry args={[0.08, 0.06, depth * 0.68]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.5} />
        </mesh>
        <mesh position={[0.02, -0.035, 0]}>
          <boxGeometry args={[0.055, 0.035, depth * 0.64]} />
          <meshStandardMaterial
            color={lightTubeColor}
            emissive={powerOutage ? 0x000000 : lightTubeColor}
            emissiveIntensity={powerOutage ? 0 : 0.95 + nightFactor * 0.45}
          />
        </mesh>
      </group>

      {/* Rotating Ceiling Fans Mounted on Overhead Structural Cross-Beams */}
      {[1.9, 5.1].map((fx, idx) => (
        <group key={`ceiling_fan_${idx}`}>
          {/* Slender rafter anchoring fan cleanly to North wall */}
          <mesh position={[fx, 2.66, (bounds.minZ - 0.5 + 3.0) / 2]} material={metalFrameMat}>
            <boxGeometry args={[0.05, 0.04, 3.0 - (bounds.minZ - 0.5)]} />
          </mesh>
          <group position={[fx, 2.54, 3.0]}>
            <mesh position={[0, 0.07, 0]} material={metalFrameMat}>
              <cylinderGeometry args={[0.025, 0.025, 0.14, 8]} />
            </mesh>
            <group ref={idx === 0 ? fan1Ref : fan2Ref}>
              <mesh material={metalFrameMat}>
                <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
              </mesh>
              {[0, 1, 2, 3].map((b) => (
                <mesh key={b} rotation={[0, (b * Math.PI) / 2, 0]} position={[0, 0, 0]}>
                  <boxGeometry args={[0.92, 0.015, 0.11]} />
                  <meshStandardMaterial color={isGamingFloor ? 0x334155 : 0x5c3d24} roughness={0.55} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      ))}

      {/* Sidewalk Street Lamp + Potted Entrance Plant + Tree + Parked Scooter */}
      <group position={[0.2, 0, 8.6]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.08, 3.2, 8]} />
          <meshStandardMaterial color={0x334155} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0.25, 3.1, 0]}>
          <boxGeometry args={[0.6, 0.12, 0.24]} />
          <meshStandardMaterial
            color={0xfef3c7}
            emissive={0xfbbf24}
            emissiveIntensity={0.4 + nightFactor * 1.1}
          />
        </mesh>
      </group>

      <group position={[2.05, 0, 7.95]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.14, 0.36, 10]} />
          <meshStandardMaterial color={0x9a3412} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.5, 0]} castShadow>
          <dodecahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial color={0x15803d} roughness={0.78} />
        </mesh>
      </group>

      <group position={[-1.6, 0, 8.5]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.2, 1.8, 8]} />
          <meshStandardMaterial color={0x6b4423} roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.2, 0]} castShadow>
          <dodecahedronGeometry args={[0.95, 0]} />
          <meshStandardMaterial color={0x15803d} roughness={0.8} />
        </mesh>
        <mesh position={[0.45, 1.9, 0.2]}>
          <dodecahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial color={0x16a34a} roughness={0.8} />
        </mesh>
      </group>

      {/* Stylized Parked Indonesian Scooter on Sidewalk */}
      <group position={[6.2, 0.01, 8.4]} rotation={[0, -0.35, 0]}>
        <mesh position={[-0.42, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 12]} />
          <meshStandardMaterial color={0x18181b} roughness={0.85} />
        </mesh>
        <mesh position={[0.42, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 12]} />
          <meshStandardMaterial color={0x18181b} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.48, 0]} castShadow>
          <boxGeometry args={[0.92, 0.24, 0.3]} />
          <meshStandardMaterial color={0xdc2626} roughness={0.3} metalness={0.2} />
        </mesh>
        <mesh position={[-0.36, 0.78, 0]}>
          <boxGeometry args={[0.16, 0.48, 0.26]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.4} />
        </mesh>
        <mesh position={[-0.36, 1.02, 0]}>
          <boxGeometry args={[0.08, 0.06, 0.56]} />
          <meshStandardMaterial color={0x94a3b8} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};
