import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import type { WeatherType } from '../types/game';
import { StreetPedestrian } from './models/CharacterModels';

interface NeighborhoodWorldProps {
  nightFactor: number;
  weather: WeatherType;
  powerOutage: boolean;
  isSoftwareGl: boolean;
}

const RAIN_COUNT = 150;
const _rainDummy = new THREE.Object3D();

const MOTOR_COLORS = [0x0284c7, 0xdc2626, 0x10b981];
const HELMET_COLORS = [0xf8fafc, 0x1e293b, 0xf59e0b];
const CAR_BASE = 'https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/packs/car-kit/';

type KenneyCarModel = 'sedan' | 'hatchback-sports' | 'suv' | 'taxi' | 'van';

const KenneyTrafficCar: React.FC<{ model: KenneyCarModel }> = ({ model }) => {
  const gltf = useGLTF(`${CAR_BASE}${model}.glb`) as unknown as { scene: THREE.Group };
  const normalized = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene) as THREE.Group;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    const bounds = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);
    scene.position.set(-center.x, -bounds.min.y, -center.z);
    const footprint = Math.max(size.x, size.z, 0.001);
    return { scene, scale: 2.45 / footprint };
  }, [gltf.scene]);

  return (
    <group scale={normalized.scale}>
      <primitive object={normalized.scene} />
    </group>
  );
};

export const NeighborhoodWorld: React.FC<NeighborhoodWorldProps> = ({
  nightFactor,
  weather,
  powerOutage,
  isSoftwareGl,
}) => {
  const motorRefs = useRef<Array<THREE.Group | null>>([]);
  const carRefs = useRef<Array<THREE.Group | null>>([]);
  const pedRefs = useRef<Array<THREE.Group | null>>([]);
  const rainMeshRef = useRef<THREE.InstancedMesh>(null);

  const rainSeeds = useMemo(
    () =>
      Array.from({ length: RAIN_COUNT }, (_, i) => ({
        x: -6 + ((i * 7.13) % 28),
        y: (i * 1.37) % 8,
        z: -5 + ((i * 4.91) % 20),
        speed: 9.5 + (i % 5) * 1.1,
      })),
    [],
  );

  const motorData = useMemo(
    () => [
      { laneZ: 10.15, dir: -1, speed: 5.4, offset: 0 },
      { laneZ: 12.15, dir: 1, speed: 6.2, offset: 14 },
      { laneZ: 10.25, dir: -1, speed: 4.6, offset: 21 },
    ],
    [],
  );

  const carData = useMemo(
    () => [
      { laneZ: 10.05, dir: -1, speed: 3.2, offset: 4, model: 'sedan' as const },
      { laneZ: 12.25, dir: 1, speed: 3.6, offset: 17, model: 'hatchback-sports' as const },
      { laneZ: 10.05, dir: -1, speed: 3.0, offset: 25, model: 'suv' as const },
      { laneZ: 12.25, dir: 1, speed: 3.4, offset: 34, model: 'taxi' as const },
    ],
    [],
  );

  const pedData = useMemo(
    () => [
      { z: 8.58, dir: 1, speed: 1.05, offset: 2 },
      { z: 8.72, dir: -1, speed: 0.92, offset: 15 },
      { z: 8.62, dir: 1, speed: 1.18, offset: 24 },
    ],
    [],
  );

  const lampGlow = nightFactor > 0.15 || weather === 'rain';
  const showHeadlights = nightFactor > 0.25 || weather === 'rain';

  useFrame((state, rawDelta) => {
    const t = state.clock.getElapsedTime();
    const dt = Math.min(rawDelta, 0.05);

    // 1. Passing Indonesian motorcycles along road lanes
    for (let i = 0; i < motorData.length; i++) {
      const m = motorRefs.current[i];
      if (!m) continue;
      const cfg = motorData[i];
      const span = 38;
      const raw = (t * cfg.speed + cfg.offset) % span;
      m.position.x = cfg.dir > 0 ? -12 + raw : 26 - raw;
      m.position.z = cfg.laneZ;
      m.position.y = Math.abs(Math.sin(t * 14 + i)) * 0.015;
    }

    // 2. Kenney cars cruising along both road lanes
    for (let i = 0; i < carData.length; i++) {
      const car = carRefs.current[i];
      if (!car) continue;
      const cfg = carData[i];
      const span = 38;
      const raw = (t * cfg.speed + cfg.offset) % span;
      car.position.x = cfg.dir > 0 ? -12 + raw : 26 - raw;
      car.position.z = cfg.laneZ;
      car.position.y = 0;
    }

    // 3. Sidewalk pedestrians strolling past storefronts
    for (let i = 0; i < pedData.length; i++) {
      const p = pedRefs.current[i];
      if (!p) continue;
      const cfg = pedData[i];
      const span = 32;
      const raw = (t * cfg.speed + cfg.offset) % span;
      p.position.x = cfg.dir > 0 ? -9 + raw : 23 - raw;
      p.position.z = cfg.z;
      p.position.y = Math.abs(Math.sin(t * 6 + i)) * 0.018;
    }

    // 4. Instanced rain streaks (active only during rain)
    if (weather === 'rain' && rainMeshRef.current) {
      for (let i = 0; i < RAIN_COUNT; i++) {
        const s = rainSeeds[i];
        s.y -= s.speed * dt;
        if (s.y < 0) s.y = 8.0;
        _rainDummy.position.set(s.x, s.y, s.z);
        _rainDummy.rotation.set(0, 0, -0.08);
        _rainDummy.updateMatrix();
        rainMeshRef.current.setMatrixAt(i, _rainDummy.matrix);
      }
      rainMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Left Neighbor Shop: Warung Kelontong & Bakso (x = -4.2, z = 4.6) */}
      <group position={[-4.2, 0, 4.6]}>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 2.7, 5.4]} />
          <meshStandardMaterial color={0xd6cbb8} roughness={0.85} />
        </mesh>
        {/* Terracotta Roof Rim */}
        <mesh position={[0, 2.78, 0]} castShadow>
          <boxGeometry args={[3.6, 0.18, 5.6]} />
          <meshStandardMaterial color={0x9a3412} roughness={0.75} />
        </mesh>
        {/* Front Shop Window & Warm Glow */}
        <mesh position={[0, 1.35, 2.71]}>
          <planeGeometry args={[2.3, 1.1]} />
          <meshStandardMaterial
            color={0x1e293b}
            emissive={powerOutage ? 0x000000 : 0xf59e0b}
            emissiveIntensity={0.35 + nightFactor * 0.75}
            roughness={0.2}
          />
        </mesh>
        {/* Striped Green/White Warung Awning */}
        <mesh position={[0, 2.15, 3.12]} rotation={[0.28, 0, 0]} castShadow>
          <boxGeometry args={[3.1, 0.08, 0.92]} />
          <meshStandardMaterial color={0x15803d} roughness={0.75} />
        </mesh>
        <mesh position={[0, 2.04, 3.55]}>
          <boxGeometry args={[3.1, 0.12, 0.05]} />
          <meshStandardMaterial color={0xfef3c7} roughness={0.7} />
        </mesh>
        {/* Hanging Warung Signboard */}
        <mesh position={[0, 2.55, 2.78]}>
          <boxGeometry args={[2.1, 0.36, 0.1]} />
          <meshStandardMaterial
            color={0x14532d}
            emissive={powerOutage ? 0x000000 : 0x22c55e}
            emissiveIntensity={0.25 + nightFactor * 0.45}
          />
        </mesh>
        {/* Front Snack Display Bench */}
        <mesh position={[0, 0.36, 2.95]} castShadow>
          <boxGeometry args={[2.2, 0.72, 0.42]} />
          <meshStandardMaterial color={0x78553a} roughness={0.75} />
        </mesh>
      </group>

      {/* Right Neighbor Shop: Fotokopi & Pulsa Kiosk (x = 22.8, z = 4.6 — clear of all expansions up to x=19) */}
      <group position={[22.8, 0, 4.6]}>
        <mesh position={[0, 1.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 2.7, 5.4]} />
          <meshStandardMaterial color={0xcbd5e1} roughness={0.82} />
        </mesh>
        <mesh position={[0, 2.78, 0]} castShadow>
          <boxGeometry args={[3.6, 0.18, 5.6]} />
          <meshStandardMaterial color={0x1e3a8a} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.32, 2.71]}>
          <planeGeometry args={[2.2, 1.25]} />
          <meshStandardMaterial
            color={0x0f172a}
            emissive={powerOutage ? 0x000000 : 0x38bdf8}
            emissiveIntensity={0.3 + nightFactor * 0.7}
            roughness={0.18}
          />
        </mesh>
        <mesh position={[0, 2.15, 3.12]} rotation={[0.28, 0, 0]}>
          <boxGeometry args={[3.1, 0.08, 0.92]} />
          <meshStandardMaterial color={0x0284c7} roughness={0.72} />
        </mesh>
        <mesh position={[0, 2.56, 2.78]}>
          <boxGeometry args={[2.2, 0.36, 0.1]} />
          <meshStandardMaterial
            color={0x0f172a}
            emissive={powerOutage ? 0x000000 : 0x38bdf8}
            emissiveIntensity={0.35 + nightFactor * 0.6}
          />
        </mesh>
      </group>

      {/* Street Vendor Pushcart (Gerobak Kopi & Gorengan) on Outer Sidewalk (x = 9.0, z = 8.4) */}
      <group position={[9.0, 0, 8.4]}>
        {/* Cart Frame & Wood Body */}
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[1.35, 0.72, 0.68]} />
          <meshStandardMaterial color={0x0284c7} roughness={0.65} />
        </mesh>
        <mesh position={[-0.25, 1.05, 0]} castShadow>
          <boxGeometry args={[0.72, 0.42, 0.58]} />
          <meshStandardMaterial color={0x93c5fd} transparent opacity={0.42} roughness={0.15} />
        </mesh>
        {/* Kettle & Snack Tray */}
        <mesh position={[0.38, 0.98, 0.05]}>
          <cylinderGeometry args={[0.1, 0.12, 0.22, 10]} />
          <meshStandardMaterial color={0xcbd5e1} metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Cart Wheels */}
        <mesh position={[-0.48, 0.2, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.8} />
        </mesh>
        <mesh position={[0.48, 0.2, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
          <meshStandardMaterial color={0x1e293b} roughness={0.8} />
        </mesh>
        {/* Canopy Pole & Umbrella Roof */}
        <mesh position={[0, 1.55, -0.25]}>
          <cylinderGeometry args={[0.03, 0.03, 1.4, 8]} />
          <meshStandardMaterial color={0x475569} metalness={0.6} />
        </mesh>
        <mesh position={[0, 2.2, 0]} castShadow>
          <coneGeometry args={[1.05, 0.38, 8]} />
          <meshStandardMaterial color={0xf59e0b} roughness={0.75} />
        </mesh>
        {/* Hanging Warm Vendor Bulb */}
        <mesh position={[0.35, 1.88, 0.18]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial
            color={0xfef08a}
            emissive={0xf59e0b}
            emissiveIntensity={0.6 + nightFactor * 1.2}
          />
        </mesh>
      </group>

      {/* Second Parked Indonesian Matic Scooter (next to starter red scooter) */}
      <group position={[7.35, 0.01, 8.42]} rotation={[0, 0.28, 0]}>
        <mesh position={[-0.4, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.11, 12]} />
          <meshStandardMaterial color={0x18181b} roughness={0.85} />
        </mesh>
        <mesh position={[0.4, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.11, 12]} />
          <meshStandardMaterial color={0x18181b} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.46, 0]} castShadow>
          <boxGeometry args={[0.9, 0.22, 0.29]} />
          <meshStandardMaterial color={0x1e3a8a} roughness={0.3} metalness={0.25} />
        </mesh>
        <mesh position={[-0.35, 0.75, 0]}>
          <boxGeometry args={[0.15, 0.45, 0.24]} />
          <meshStandardMaterial color={0x0f172a} roughness={0.4} />
        </mesh>
        <mesh position={[-0.35, 0.99, 0]}>
          <boxGeometry args={[0.07, 0.05, 0.54]} />
          <meshStandardMaterial color={0xcbd5e1} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Second Animated Street Lamp at East Sidewalk (x = 11.2, z = 8.6) */}
      <group position={[11.2, 0, 8.6]}>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.08, 3.2, 8]} />
          <meshStandardMaterial color={0x334155} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.25, 3.1, 0]}>
          <boxGeometry args={[0.6, 0.12, 0.24]} />
          <meshStandardMaterial
            color={0xfef3c7}
            emissive={0xfbbf24}
            emissiveIntensity={lampGlow ? 1.45 : 0.3}
          />
        </mesh>
        {!isSoftwareGl && lampGlow && (
          <pointLight position={[-0.25, 2.85, 0.3]} intensity={1.8} distance={9} color={0xfde68a} />
        )}
      </group>

      {/* Street Lamp Pool Light for West Lamp (at x = 0.2, z = 8.6) */}
      {!isSoftwareGl && lampGlow && (
        <pointLight position={[0.45, 2.85, 8.9]} intensity={1.8} distance={9} color={0xfde68a} />
      )}

      {/* Animated Passing Motorcycles on Road */}
      {motorData.map((cfg, i) => (
        <group
          key={`motor_${i}`}
          ref={(el) => {
            motorRefs.current[i] = el;
          }}
          position={[0, 0, cfg.laneZ]}
          rotation={[0, cfg.dir > 0 ? 0 : Math.PI, 0]}
        >
          {/* Wheels */}
          <mesh position={[-0.42, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.1, 10]} />
            <meshStandardMaterial color={0x0f172a} roughness={0.85} />
          </mesh>
          <mesh position={[0.42, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.1, 10]} />
            <meshStandardMaterial color={0x0f172a} roughness={0.85} />
          </mesh>
          {/* Fairing */}
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.96, 0.24, 0.28]} />
            <meshStandardMaterial color={MOTOR_COLORS[i]} roughness={0.3} metalness={0.3} />
          </mesh>
          <mesh position={[0.36, 0.76, 0]}>
            <boxGeometry args={[0.14, 0.44, 0.24]} />
            <meshStandardMaterial color={0x1e293b} roughness={0.4} />
          </mesh>
          {/* Headlight */}
          <mesh position={[0.46, 0.78, 0]}>
            <boxGeometry args={[0.05, 0.12, 0.16]} />
            <meshStandardMaterial
              color={0xfef9c3}
              emissive={0xfef08a}
              emissiveIntensity={showHeadlights ? 1.8 : 0.25}
            />
          </mesh>
          {/* Rider + Helmet */}
          <mesh position={[-0.08, 0.85, 0]} castShadow>
            <boxGeometry args={[0.26, 0.44, 0.26]} />
            <meshStandardMaterial color={0x334155} roughness={0.75} />
          </mesh>
          <mesh position={[-0.04, 1.2, 0]} castShadow>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshStandardMaterial color={HELMET_COLORS[i]} roughness={0.25} metalness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Kenney Mini Characters strolling on the sidewalk */}
      {pedData.map((cfg, i) => (
        <group
          key={`ped_${i}`}
          ref={(el) => {
            pedRefs.current[i] = el;
          }}
          position={[0, 0, cfg.z]}
          rotation={[0, cfg.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
        >
          <StreetPedestrian id={`street-pedestrian-${i}`} x={0} z={0} facing={0} />
          {weather === 'rain' && (
            <group position={[0.12, 1.15, 0.08]}>
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.46, 6]} />
                <meshStandardMaterial color={0x334155} />
              </mesh>
              <mesh position={[0, 0.4, 0]}>
                <coneGeometry args={[0.46, 0.18, 8]} />
                <meshStandardMaterial color={i === 1 ? 0xef4444 : 0x38bdf8} roughness={0.65} />
              </mesh>
            </group>
          )}
        </group>
      ))}

      {/* Instanced Tropical Rain Particles */}
      {weather === 'rain' && (
        <instancedMesh ref={rainMeshRef} args={[undefined, undefined, RAIN_COUNT]} frustumCulled={false}>
          <boxGeometry args={[0.022, 0.38, 0.022]} />
          <meshBasicMaterial color={0xbae6fd} transparent opacity={0.55} />
        </instancedMesh>
      )}
    </group>
  );
};
