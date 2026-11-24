import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import type { CustomerEntity, StaffMember } from '../../types/game';
import { getTileElevation } from '../../simulation/grid';
import { createContactShadowTexture } from '../textures';

const KENNEY_BASE = 'https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/packs/mini-characters/';
const CHARACTER_MODELS = [
  'character-female-a.glb',
  'character-female-b.glb',
  'character-female-c.glb',
  'character-female-d.glb',
  'character-female-e.glb',
  'character-female-f.glb',
  'character-male-a.glb',
  'character-male-b.glb',
  'character-male-c.glb',
  'character-male-d.glb',
  'character-male-e.glb',
  'character-male-f.glb',
] as const;

type AnimationMode = 'walk' | 'idle' | 'sit' | 'work' | 'drink';

function stableVariant(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % CHARACTER_MODELS.length;
}

function animationCandidates(mode: AnimationMode): string[] {
  switch (mode) {
    case 'walk':
      return ['walk', 'walking', 'move'];
    case 'sit':
      return ['sit', 'sitting', 'idle', 'stand'];
    case 'work':
      return ['type', 'typing', 'work', 'computer', 'idle', 'stand'];
    case 'drink':
      return ['drink', 'idle', 'stand'];
    default:
      return ['idle', 'stand', 'breath'];
  }
}

interface KenneyPersonProps {
  id: string;
  x: number;
  z: number;
  facing: number;
  mode: AnimationMode;
  isChatting?: boolean;
  accentBadgeColor?: number;
}

const KenneyPerson: React.FC<KenneyPersonProps> = ({
  id,
  x,
  z,
  facing,
  mode,
  isChatting = false,
  accentBadgeColor,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const animationRootRef = useRef<THREE.Group>(null);
  const smoothPosRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const shadowTex = useMemo(() => createContactShadowTexture(), []);
  const modelUrl = KENNEY_BASE + CHARACTER_MODELS[stableVariant(id)];
  const gltf = useGLTF(modelUrl) as unknown as {
    scene: THREE.Group;
    animations: THREE.AnimationClip[];
  };

  const normalizedModel = useMemo(() => {
    const model = cloneSkeleton(gltf.scene) as THREE.Group;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    const bounds = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);
    const height = Math.max(size.y, 0.001);
    model.position.set(-center.x, -bounds.min.y, -center.z);

    return { model, scale: 1.16 / height };
  }, [gltf.scene]);

  const { actions, names } = useAnimations(gltf.animations, animationRootRef);

  useEffect(() => {
    const candidates = animationCandidates(mode);
    const selectedName =
      candidates
        .map((candidate) => names.find((name) => name.toLowerCase().includes(candidate)))
        .find((name): name is string => Boolean(name)) ?? names[0];

    const action = selectedName ? actions[selectedName] : null;
    if (!action) return;

    action.reset().fadeIn(0.18).play();
    return () => {
      action.fadeOut(0.14);
    };
  }, [actions, names, mode]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const targetY = getTileElevation(x, z);

    if (!smoothPosRef.current) {
      smoothPosRef.current = { x, y: targetY, z };
    } else {
      const alpha = Math.min(1, dt * 14);
      smoothPosRef.current.x = THREE.MathUtils.lerp(smoothPosRef.current.x, x, alpha);
      smoothPosRef.current.y = THREE.MathUtils.lerp(smoothPosRef.current.y, targetY, alpha);
      smoothPosRef.current.z = THREE.MathUtils.lerp(smoothPosRef.current.z, z, alpha);
    }

    rootRef.current?.position.set(
      smoothPosRef.current.x,
      smoothPosRef.current.y,
      smoothPosRef.current.z,
    );
  });

  return (
    <group ref={rootRef} position={[x, getTileElevation(x, z), z]}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.4} depthWrite={false} />
      </mesh>

      <group ref={animationRootRef} rotation={[0, facing, 0]}>
        <group scale={normalizedModel.scale}>
          <primitive object={normalizedModel.model} />
        </group>

        {accentBadgeColor !== undefined && (
          <mesh position={[0, 0.82, 0.15]}>
            <boxGeometry args={[0.12, 0.12, 0.035]} />
            <meshStandardMaterial color={accentBadgeColor} roughness={0.55} />
          </mesh>
        )}
      </group>

      {isChatting && (
        <group position={[0, 1.43, 0]}>
          <mesh>
            <boxGeometry args={[0.26, 0.13, 0.05]} />
            <meshBasicMaterial color={0xf8fafc} />
          </mesh>
          {[ -0.06, 0, 0.06 ].map((xPos) => (
            <mesh key={xPos} position={[xPos, 0, 0.03]}>
              <boxGeometry args={[0.035, 0.035, 0.01]} />
              <meshBasicMaterial color={0x0284c7} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

export const CustomerAvatar: React.FC<{ customer: CustomerEntity }> = React.memo(({ customer }) => {
  const isSitting = customer.state === 'sitting_playing';
  const isWalking =
    customer.state === 'entering' ||
    customer.state === 'walking_to_pc' ||
    customer.state === 'walking_to_cashier' ||
    customer.state === 'leaving';

  const mode: AnimationMode = isWalking
    ? 'walk'
    : customer.activity === 'drinking'
      ? 'drink'
      : isSitting
        ? 'sit'
        : 'idle';

  return (
    <KenneyPerson
      id={customer.id}
      x={customer.x}
      z={customer.z}
      facing={customer.facing}
      mode={mode}
      isChatting={customer.activity === 'chatting' && !isSitting}
    />
  );
}, (prev, next) => {
  const a = prev.customer;
  const b = next.customer;
  return a.id === b.id &&
    a.x === b.x && a.z === b.z && a.facing === b.facing &&
    a.state === b.state && a.activity === b.activity;
});

export const StaffAvatar: React.FC<{ staff: StaffMember }> = React.memo(({ staff }) => {
  const roleColors: Record<StaffMember['role'], number> = {
    cashier: 0xf59e0b,
    technician: 0x0ea5e9,
    cleaner: 0x10b981,
    security: 0x38bdf8,
  };

  const mode: AnimationMode =
    staff.state === 'walking' ? 'walk' : staff.state === 'working' ? 'work' : 'idle';

  return (
    <KenneyPerson
      id={staff.id}
      x={staff.x}
      z={staff.z}
      facing={staff.facing}
      mode={mode}
      accentBadgeColor={roleColors[staff.role]}
    />
  );
}, (prev, next) => {
  const a = prev.staff;
  const b = next.staff;
  return a.id === b.id &&
    a.role === b.role && a.x === b.x && a.z === b.z &&
    a.facing === b.facing && a.state === b.state;
});
