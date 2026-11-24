import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { CustomerActivity, CustomerEntity, StaffMember } from '../../types/game';
import { getTileElevation } from '../../simulation/grid';
import { createContactShadowTexture } from '../textures';

interface CharacterProps {
  id: string;
  x: number;
  z: number;
  facing: number;
  shirtColor: number;
  pantsColor: number;
  hairColor: number;
  skinColor: number;
  walkDistance: number;
  isSitting: boolean;
  isWorking: boolean;
  activity?: CustomerActivity;
  accentBadgeColor?: number;
}

export const StylizedPerson: React.FC<CharacterProps> = ({
  x,
  z,
  facing,
  shirtColor,
  pantsColor,
  hairColor,
  skinColor,
  walkDistance,
  isSitting,
  isWorking,
  activity = 'idle',
  accentBadgeColor,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const cupRef = useRef<THREE.Mesh>(null);
  const seatBlendRef = useRef(isSitting ? 1 : 0);
  const smoothPosRef = useRef<{ x: number; y: number; z: number } | null>(null);

  const shadowTex = useMemo(() => createContactShadowTexture(), []);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const targetY = getTileElevation(x, z);

    // Smooth world position + vertical stair elevation transition
    if (!smoothPosRef.current) {
      smoothPosRef.current = { x, y: targetY, z };
    } else {
      const alpha = Math.min(1, dt * 14);
      smoothPosRef.current.x = THREE.MathUtils.lerp(smoothPosRef.current.x, x, alpha);
      smoothPosRef.current.y = THREE.MathUtils.lerp(smoothPosRef.current.y, targetY, alpha);
      smoothPosRef.current.z = THREE.MathUtils.lerp(smoothPosRef.current.z, z, alpha);
    }
    if (rootRef.current) {
      rootRef.current.position.set(
        smoothPosRef.current.x,
        smoothPosRef.current.y,
        smoothPosRef.current.z,
      );
    }

    // Smooth walking <-> sitting posture blend
    seatBlendRef.current = THREE.MathUtils.lerp(
      seatBlendRef.current,
      isSitting ? 1 : 0,
      Math.min(1, dt * 10),
    );
    const sb = seatBlendRef.current;

    if (sb > 0.45) {
      if (bodyRef.current) {
        bodyRef.current.position.y = THREE.MathUtils.lerp(0, 0.22, sb);
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2.2, sb);
        rightLegRef.current.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2.2, sb);
      }

      if (leftArmRef.current && rightArmRef.current) {
        if (activity === 'mouse') {
          // Left hand on WASD, right hand sweeps mouse laterally
          leftArmRef.current.rotation.x = -0.92;
          leftArmRef.current.rotation.z = 0;
          rightArmRef.current.rotation.x = -0.95;
          rightArmRef.current.rotation.z = Math.sin(t * 5.2) * 0.18;
        } else if (activity === 'drinking') {
          // Right arm lifts iced drink cup to mouth
          leftArmRef.current.rotation.x = -0.35;
          leftArmRef.current.rotation.z = 0;
          rightArmRef.current.rotation.x = -1.65 + Math.sin(t * 3.5) * 0.14;
          rightArmRef.current.rotation.z = 0.16;
        } else if (activity === 'idle') {
          // Relaxed stretch / breathing while watching cutscene
          leftArmRef.current.rotation.x = -0.32 + Math.sin(t * 2) * 0.06;
          rightArmRef.current.rotation.x = -0.32 + Math.cos(t * 2) * 0.06;
          leftArmRef.current.rotation.z = 0.05;
          rightArmRef.current.rotation.z = -0.05;
        } else {
          // Fast mechanical keyboard typing
          leftArmRef.current.rotation.x = -0.9 + Math.sin(t * 14) * 0.14;
          rightArmRef.current.rotation.x = -0.9 + Math.cos(t * 14) * 0.14;
          leftArmRef.current.rotation.z = 0;
          rightArmRef.current.rotation.z = 0;
        }
      }

      if (headRef.current) {
        headRef.current.rotation.x = activity === 'drinking' ? -0.18 : 0.04;
        headRef.current.rotation.y = activity === 'idle' ? Math.sin(t * 1.4) * 0.18 : Math.sin(t * 2.2) * 0.06;
      }
      if (cupRef.current) {
        cupRef.current.visible = activity === 'drinking';
      }
    } else {
      const swing = Math.sin(walkDistance * 6.5) * 0.48;
      if (bodyRef.current) {
        bodyRef.current.position.y = Math.abs(Math.sin(walkDistance * 6.5)) * 0.035;
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = swing;
        rightLegRef.current.rotation.x = -swing;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
        if (isWorking) {
          leftArmRef.current.rotation.x = -0.7 + Math.sin(t * 6) * 0.2;
          rightArmRef.current.rotation.x = -0.7 + Math.cos(t * 6) * 0.2;
        } else if (activity === 'chatting') {
          leftArmRef.current.rotation.x = -0.35 + Math.sin(t * 5) * 0.22;
          rightArmRef.current.rotation.x = -0.45 + Math.cos(t * 5) * 0.26;
        } else {
          leftArmRef.current.rotation.x = -swing * 0.7;
          rightArmRef.current.rotation.x = swing * 0.7;
        }
      }
      if (headRef.current) {
        headRef.current.rotation.x = 0;
        headRef.current.rotation.y =
          activity === 'chatting' ? Math.sin(t * 3.4) * 0.26 : Math.sin(t * 1.1) * 0.08;
      }
      if (cupRef.current) {
        cupRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={rootRef} position={[x, getTileElevation(x, z), z]}>
      {/* Grounded soft radial contact shadow */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.45} depthWrite={false} />
      </mesh>

      <group ref={bodyRef} rotation={[0, facing, 0]}>
        {/* Legs */}
        <mesh ref={leftLegRef} position={[-0.08, 0.28, 0]}>
          <boxGeometry args={[0.11, 0.42, 0.12]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>
        <mesh ref={rightLegRef} position={[0.08, 0.28, 0]}>
          <boxGeometry args={[0.11, 0.42, 0.12]} />
          <meshStandardMaterial color={pantsColor} roughness={0.8} />
        </mesh>

        {/* Torso / Shirt */}
        <mesh position={[0, 0.68, 0]}>
          <boxGeometry args={[0.3, 0.42, 0.18]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>

        {accentBadgeColor !== undefined && (
          <mesh position={[0, 0.7, 0.095]}>
            <boxGeometry args={[0.24, 0.26, 0.02]} />
            <meshStandardMaterial color={accentBadgeColor} roughness={0.5} />
          </mesh>
        )}

        {/* Arms */}
        <mesh ref={leftArmRef} position={[-0.2, 0.66, 0]}>
          <boxGeometry args={[0.09, 0.36, 0.1]} />
          <meshStandardMaterial color={shirtColor} roughness={0.72} />
        </mesh>
        <mesh ref={rightArmRef} position={[0.2, 0.66, 0]}>
          <boxGeometry args={[0.09, 0.36, 0.1]} />
          <meshStandardMaterial color={shirtColor} roughness={0.72} />
        </mesh>

        {/* Drink Cup held near face when sipping */}
        <mesh ref={cupRef} visible={false} position={[0.14, 0.94, 0.22]}>
          <cylinderGeometry args={[0.04, 0.032, 0.11, 8]} />
          <meshStandardMaterial color={0x38bdf8} roughness={0.25} />
        </mesh>

        {/* Head & Hair */}
        <group ref={headRef} position={[0, 1.04, 0]}>
          <mesh>
            <boxGeometry args={[0.24, 0.24, 0.24]} />
            <meshStandardMaterial color={skinColor} roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.11, -0.02]}>
            <boxGeometry args={[0.26, 0.1, 0.26]} />
            <meshStandardMaterial color={hairColor} roughness={0.85} />
          </mesh>
        </group>
      </group>

      {/* Subtle Low-Poly Conversation Bubble when chatting in queue */}
      {activity === 'chatting' && !isSitting && (
        <group position={[0, 1.48, 0]}>
          <mesh>
            <boxGeometry args={[0.26, 0.13, 0.05]} />
            <meshBasicMaterial color={0xf8fafc} />
          </mesh>
          <mesh position={[-0.06, 0, 0.03]}>
            <boxGeometry args={[0.035, 0.035, 0.01]} />
            <meshBasicMaterial color={0x0284c7} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <boxGeometry args={[0.035, 0.035, 0.01]} />
            <meshBasicMaterial color={0x0284c7} />
          </mesh>
          <mesh position={[0.06, 0, 0.03]}>
            <boxGeometry args={[0.035, 0.035, 0.01]} />
            <meshBasicMaterial color={0x0284c7} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export const CustomerAvatar: React.FC<{ customer: CustomerEntity }> = React.memo(({ customer }) => {
  const isSitting = customer.state === 'sitting_playing';

  return (
    <StylizedPerson
      id={customer.id}
      x={customer.x}
      z={customer.z}
      facing={customer.facing}
      shirtColor={customer.shirtColor}
      pantsColor={customer.pantsColor}
      hairColor={customer.hairColor}
      skinColor={customer.skinColor}
      walkDistance={customer.walkDistance}
      isSitting={isSitting}
      isWorking={false}
      activity={customer.activity ?? 'idle'}
    />
  );
});

export const StaffAvatar: React.FC<{ staff: StaffMember }> = React.memo(({ staff }) => {
  const roleColors: Record<StaffMember['role'], { shirt: number; badge: number }> = {
    cashier: { shirt: 0xf59e0b, badge: 0x1e293b },
    technician: { shirt: 0x0ea5e9, badge: 0xfbbf24 },
    cleaner: { shirt: 0x10b981, badge: 0xffffff },
    security: { shirt: 0x1e293b, badge: 0x38bdf8 },
  };
  const pal = roleColors[staff.role];

  return (
    <StylizedPerson
      id={staff.id}
      x={staff.x}
      z={staff.z}
      facing={staff.facing}
      shirtColor={pal.shirt}
      pantsColor={0x0f172a}
      hairColor={0x18181b}
      skinColor={0xd9a077}
      walkDistance={staff.walkDistance}
      isSitting={false}
      isWorking={staff.state === 'working'}
      accentBadgeColor={pal.badge}
    />
  );
});
