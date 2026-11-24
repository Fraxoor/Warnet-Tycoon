import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { PcTier, PlacedObject } from '../../types/game';
import { getTileElevation } from '../../simulation/grid';
import { createScreenTexture } from '../textures';

const KENNEY_CDN = 'https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/packs/furniture-kit/';

function KenneyProp({
  asset,
  position = [0, 0, 0],
  rotationY = 0,
  size,
}: {
  asset: string;
  position?: [number, number, number];
  rotationY?: number;
  size: [number, number, number];
}) {
  const { scene } = useGLTF(`${KENNEY_CDN}${asset}.glb`);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const dimensions = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const factors = [
      dimensions.x > 0 ? size[0] / dimensions.x : Number.POSITIVE_INFINITY,
      dimensions.y > 0 ? size[1] / dimensions.y : Number.POSITIVE_INFINITY,
      dimensions.z > 0 ? size[2] / dimensions.z : Number.POSITIVE_INFINITY,
    ];
    const scale = Math.min(...factors);
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = false;
        (child as THREE.Mesh).receiveShadow = false;
      }
    });
    return clone;
  }, [scene, size[0], size[1], size[2]]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <primitive object={model} />
    </group>
  );
}

interface FurnitureMeshProps {
  obj: PlacedObject;
  isSelected: boolean;
  powerOutage: boolean;
  onSelect?: (id: string) => void;
}

const WOOD_MAT = new THREE.MeshStandardMaterial({ color: 0x9c6b43, roughness: 0.72, metalness: 0.05 });
const DARK_DESK_MAT = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.45, metalness: 0.25 });
const ESPORTS_DESK_MAT = new THREE.MeshStandardMaterial({ color: 0x141821, roughness: 0.32, metalness: 0.55 });
const VIP_DESK_MAT = new THREE.MeshStandardMaterial({ color: 0x3b261d, roughness: 0.48, metalness: 0.18 });
const METAL_MAT = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.28, metalness: 0.78 });
const BEIGE_PLASTIC = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.68, metalness: 0.05 });
const DARK_CASE = new THREE.MeshStandardMaterial({ color: 0x181c24, roughness: 0.35, metalness: 0.45 });
const CABLE_MAT = new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.85, metalness: 0.05 });
const PLASTIC_GREEN = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55, metalness: 0.05 });
const CUSHION_DARK = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8, metalness: 0.05 });
const GAMING_RED = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55, metalness: 0.1 });
const PRO_GOLD = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.5 });
const WHITE_APPLIANCE = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.12 });
const GLASS_MAT = new THREE.MeshStandardMaterial({
  color: 0x93c5fd,
  roughness: 0.15,
  metalness: 0.1,
  transparent: true,
  opacity: 0.38,
});

function ChairModel({ style }: { style: 'plastic' | 'office' | 'gaming' | 'pro' }) {
  if (style === 'plastic') {
    return (
      <group position={[0, 0, 0.38]}>
        <mesh position={[-0.14, 0.21, -0.14]} material={PLASTIC_GREEN} castShadow>
          <cylinderGeometry args={[0.022, 0.018, 0.42, 8]} />
        </mesh>
        <mesh position={[0.14, 0.21, -0.14]} material={PLASTIC_GREEN} castShadow>
          <cylinderGeometry args={[0.022, 0.018, 0.42, 8]} />
        </mesh>
        <mesh position={[-0.14, 0.21, 0.14]} material={PLASTIC_GREEN} castShadow>
          <cylinderGeometry args={[0.022, 0.018, 0.42, 8]} />
        </mesh>
        <mesh position={[0.14, 0.21, 0.14]} material={PLASTIC_GREEN} castShadow>
          <cylinderGeometry args={[0.022, 0.018, 0.42, 8]} />
        </mesh>
        <mesh position={[0, 0.43, 0]} material={PLASTIC_GREEN} castShadow>
          <boxGeometry args={[0.36, 0.04, 0.36]} />
        </mesh>
        <mesh position={[0, 0.63, 0.16]} material={PLASTIC_GREEN} castShadow>
          <boxGeometry args={[0.34, 0.36, 0.04]} />
        </mesh>
      </group>
    );
  }

  if (style === 'office') {
    return (
      <group position={[0, 0, 0.4]}>
        <mesh position={[0, 0.04, 0]} material={METAL_MAT}>
          <cylinderGeometry args={[0.2, 0.22, 0.04, 8]} />
        </mesh>
        <mesh position={[0, 0.24, 0]} material={METAL_MAT}>
          <cylinderGeometry args={[0.03, 0.03, 0.38, 8]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} material={CUSHION_DARK} castShadow>
          <boxGeometry args={[0.42, 0.07, 0.4]} />
        </mesh>
        <mesh position={[0, 0.72, 0.18]} material={CUSHION_DARK} castShadow>
          <boxGeometry args={[0.4, 0.48, 0.06]} />
        </mesh>
      </group>
    );
  }

  const trim = style === 'pro' ? PRO_GOLD : GAMING_RED;
  return (
    <group position={[0, 0, 0.42]}>
      <mesh position={[0, 0.04, 0]} material={METAL_MAT}>
        <cylinderGeometry args={[0.22, 0.24, 0.04, 10]} />
      </mesh>
      <mesh position={[0, 0.24, 0]} material={METAL_MAT}>
        <cylinderGeometry args={[0.035, 0.035, 0.38, 8]} />
      </mesh>
      <mesh position={[0, 0.45, 0]} material={CUSHION_DARK} castShadow>
        <boxGeometry args={[0.46, 0.08, 0.44]} />
      </mesh>
      <mesh position={[0, 0.78, 0.19]} material={CUSHION_DARK} castShadow>
        <boxGeometry args={[0.42, style === 'pro' ? 0.68 : 0.62, 0.07]} />
      </mesh>
      <mesh position={[-0.2, 0.76, 0.16]} material={trim}>
        <boxGeometry args={[0.07, 0.5, 0.09]} />
      </mesh>
      <mesh position={[0.2, 0.76, 0.16]} material={trim}>
        <boxGeometry args={[0.07, 0.5, 0.09]} />
      </mesh>
      {style === 'pro' && (
        <mesh position={[0, 1.02, 0.14]} material={trim}>
          <boxGeometry args={[0.22, 0.1, 0.05]} />
        </mesh>
      )}
      <mesh position={[-0.23, 0.56, 0.02]} material={DARK_CASE}>
        <boxGeometry args={[0.05, 0.04, 0.26]} />
      </mesh>
      <mesh position={[0.23, 0.56, 0.02]} material={DARK_CASE}>
        <boxGeometry args={[0.05, 0.04, 0.26]} />
      </mesh>
    </group>
  );
}

function ComputerRigModel({
  tier,
  occupied,
  broken,
  powerOutage,
}: {
  tier: PcTier;
  occupied: boolean;
  broken: boolean;
  powerOutage: boolean;
}) {
  const isPowered = !powerOutage && !broken;
  const screenTex = useMemo(
    () => createScreenTexture(tier, isPowered && occupied, broken),
    [tier, isPowered, occupied, broken],
  );

  const screenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: screenTex,
        emissive: isPowered ? new THREE.Color(tier >= 3 ? 0x38bdf8 : 0x60a5fa) : new THREE.Color(0x000000),
        emissiveMap: screenTex,
        emissiveIntensity: isPowered ? (occupied ? 1.15 : 0.45) : 0,
        roughness: 0.15,
      }),
    [screenTex, isPowered, occupied, tier],
  );

  const cableCluster = (
    <group>
      {/* Power & LAN cables routing cleanly behind monitor & tower down into desk conduit */}
      <mesh position={[-0.08, -0.18, -0.22]} rotation={[0.18, 0, 0]} material={CABLE_MAT}>
        <cylinderGeometry args={[0.011, 0.011, 0.48, 6]} />
      </mesh>
      <mesh position={[0.24, -0.18, -0.22]} rotation={[0.15, 0, 0.1]} material={CABLE_MAT}>
        <cylinderGeometry args={[0.011, 0.011, 0.48, 6]} />
      </mesh>
      <mesh position={[0.06, 0.012, 0.02]} rotation={[0, 0.35, Math.PI / 2]} material={CABLE_MAT}>
        <cylinderGeometry args={[0.008, 0.008, 0.36, 5]} />
      </mesh>
    </group>
  );

  if (tier === 1) {
    return (
      <group position={[0, 0.74, -0.05]}>
        {cableCluster}
        {/* CRT Monitor */}
        <mesh position={[-0.08, 0.19, -0.06]} material={BEIGE_PLASTIC} castShadow>
          <boxGeometry args={[0.36, 0.34, 0.34]} />
        </mesh>
        <mesh position={[-0.08, 0.2, 0.115]} material={screenMat}>
          <planeGeometry args={[0.29, 0.25]} />
        </mesh>
        {/* Beige Tower */}
        <mesh position={[0.26, 0.18, -0.04]} material={BEIGE_PLASTIC} castShadow>
          <boxGeometry args={[0.16, 0.36, 0.34]} />
        </mesh>
        {/* Keyboard, Mousepad & Mouse */}
        <mesh position={[-0.08, 0.015, 0.22]} material={BEIGE_PLASTIC}>
          <boxGeometry args={[0.32, 0.025, 0.12]} />
        </mesh>
        <mesh position={[0.16, 0.006, 0.22]} material={CUSHION_DARK}>
          <boxGeometry args={[0.14, 0.008, 0.14]} />
        </mesh>
        <mesh position={[0.16, 0.018, 0.22]} material={BEIGE_PLASTIC}>
          <boxGeometry args={[0.055, 0.022, 0.09]} />
        </mesh>
      </group>
    );
  }

  if (tier === 2) {
    return (
      <group position={[0, 0.74, -0.05]}>
        {cableCluster}
        <mesh position={[-0.08, 0.07, -0.08]} material={DARK_CASE}>
          <cylinderGeometry args={[0.03, 0.08, 0.14, 8]} />
        </mesh>
        <mesh position={[-0.08, 0.24, -0.06]} material={DARK_CASE} castShadow>
          <boxGeometry args={[0.48, 0.28, 0.04]} />
        </mesh>
        <mesh position={[-0.08, 0.24, -0.038]} material={screenMat}>
          <planeGeometry args={[0.44, 0.24]} />
        </mesh>
        {/* Desktop speaker pair + headset stand */}
        <mesh position={[-0.36, 0.08, -0.04]} material={DARK_CASE}>
          <boxGeometry args={[0.06, 0.14, 0.07]} />
        </mesh>
        <mesh position={[0.14, 0.08, -0.04]} material={DARK_CASE}>
          <boxGeometry args={[0.06, 0.14, 0.07]} />
        </mesh>
        {/* Mid-tower with blue LED strip */}
        <mesh position={[0.28, 0.19, -0.04]} material={DARK_CASE} castShadow>
          <boxGeometry args={[0.17, 0.38, 0.35]} />
        </mesh>
        <mesh position={[0.28, 0.2, 0.14]}>
          <boxGeometry args={[0.11, 0.24, 0.01]} />
          <meshBasicMaterial color={isPowered ? 0x38bdf8 : 0x334155} />
        </mesh>
        {/* Keyboard, Mousepad & Mouse */}
        <mesh position={[-0.08, 0.015, 0.2]} material={DARK_CASE}>
          <boxGeometry args={[0.34, 0.025, 0.12]} />
        </mesh>
        <mesh position={[0.16, 0.006, 0.2]} material={CUSHION_DARK}>
          <boxGeometry args={[0.16, 0.008, 0.15]} />
        </mesh>
        <mesh position={[0.16, 0.018, 0.2]} material={DARK_CASE}>
          <boxGeometry args={[0.055, 0.024, 0.09]} />
        </mesh>
      </group>
    );
  }

  const isTier4 = tier === 4;
  return (
    <group position={[0, 0.74, -0.05]}>
      {cableCluster}
      {/* Monitor Stand */}
      <mesh position={[-0.09, 0.12, -0.1]} material={METAL_MAT}>
        <boxGeometry args={[0.05, 0.24, 0.05]} />
      </mesh>
      <mesh position={[-0.09, 0.26, -0.06]} material={DARK_CASE} castShadow>
        <boxGeometry args={[isTier4 ? 0.64 : 0.54, 0.3, 0.04]} />
      </mesh>
      <mesh position={[-0.09, 0.26, -0.038]} material={screenMat}>
        <planeGeometry args={[isTier4 ? 0.6 : 0.5, 0.26]} />
      </mesh>
      {/* Gaming Headset Stand + Cup */}
      <mesh position={[-0.38, 0.12, 0.06]} material={METAL_MAT}>
        <cylinderGeometry args={[0.012, 0.04, 0.22, 6]} />
      </mesh>
      <mesh position={[-0.38, 0.22, 0.06]} material={isTier4 ? PRO_GOLD : GAMING_RED}>
        <torusGeometry args={[0.045, 0.016, 6, 12, Math.PI]} />
      </mesh>
      {isTier4 && (
        <mesh position={[-0.36, 0.34, -0.02]} material={METAL_MAT}>
          <cylinderGeometry args={[0.014, 0.014, 0.24, 6]} />
        </mesh>
      )}
      {/* Tempered Glass RGB PC Case + Glowing GPU Bar */}
      <mesh position={[0.31, 0.21, -0.03]} material={DARK_CASE} castShadow>
        <boxGeometry args={[0.18, 0.42, 0.36]} />
      </mesh>
      <mesh position={[0.218, 0.21, -0.03]}>
        <planeGeometry args={[0.28, 0.32]} />
        <meshBasicMaterial
          color={isPowered ? (isTier4 ? 0xf59e0b : 0xa855f7) : 0x1e293b}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0.31, 0.21, 0.155]}>
        <boxGeometry args={[0.12, 0.3, 0.012]} />
        <meshBasicMaterial color={isPowered ? (isTier4 ? 0x38bdf8 : 0xec4899) : 0x1e293b} />
      </mesh>
      {/* Extended RGB Deskmat + Backlit Keyboard + Gaming Mouse */}
      <mesh position={[-0.01, 0.005, 0.2]} material={CUSHION_DARK}>
        <boxGeometry args={[0.62, 0.008, 0.18]} />
      </mesh>
      <mesh position={[-0.09, 0.018, 0.2]}>
        <boxGeometry args={[0.36, 0.024, 0.13]} />
        <meshStandardMaterial
          color={0x18181b}
          emissive={isPowered ? (isTier4 ? 0x38bdf8 : 0xec4899) : 0x000000}
          emissiveIntensity={0.7}
        />
      </mesh>
      <mesh position={[0.18, 0.018, 0.2]}>
        <boxGeometry args={[0.055, 0.022, 0.09]} />
        <meshStandardMaterial
          color={0x18181b}
          emissive={isPowered ? 0x38bdf8 : 0x000000}
          emissiveIntensity={0.65}
        />
      </mesh>
    </group>
  );
}

export const FurnitureModel: React.FC<FurnitureMeshProps> = React.memo(
  ({ obj, isSelected, powerOutage, onSelect }) => {
    const rotY = -obj.rotation * (Math.PI / 2);
    const yElev = getTileElevation(obj.x, obj.z);

    const handleClick = (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect?.(obj.id);
    };

    const renderBody = () => {
      // Desks & Complete Stations
      if (
        obj.type.startsWith('station_') ||
        obj.type === 'basic_desk' ||
        obj.type === 'gaming_desk' ||
        obj.type === 'esports_desk' ||
        obj.type === 'vip_desk'
      ) {
        const isVip = obj.type === 'vip_desk';
        const deskMat = isVip
          ? VIP_DESK_MAT
          : obj.type === 'esports_desk' || obj.type === 'station_tier4'
            ? ESPORTS_DESK_MAT
            : obj.type === 'gaming_desk' || obj.type === 'station_tier2' || obj.type === 'station_tier3'
              ? DARK_DESK_MAT
              : WOOD_MAT;

        return (
          <group>
            <mesh position={[0, 0.71, 0]} material={deskMat} castShadow receiveShadow>
              <boxGeometry args={[0.92, 0.05, 0.62]} />
            </mesh>
            <mesh position={[-0.41, 0.35, -0.25]} material={METAL_MAT} castShadow>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
            </mesh>
            <mesh position={[0.41, 0.35, -0.25]} material={METAL_MAT} castShadow>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
            </mesh>
            <mesh position={[-0.41, 0.35, 0.25]} material={METAL_MAT} castShadow>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
            </mesh>
            <mesh position={[0.41, 0.35, 0.25]} material={METAL_MAT} castShadow>
              <boxGeometry args={[0.05, 0.7, 0.05]} />
            </mesh>
            <mesh position={[0, 0.5, -0.27]} material={deskMat}>
              <boxGeometry args={[0.84, 0.36, 0.03]} />
            </mesh>

            {/* VIP Acoustic Privacy Side & Back Booth Panels */}
            {isVip && (
              <group>
                <mesh position={[-0.46, 0.98, -0.02]} material={VIP_DESK_MAT} castShadow>
                  <boxGeometry args={[0.04, 0.64, 0.62]} />
                </mesh>
                <mesh position={[0.46, 0.98, -0.02]} material={VIP_DESK_MAT} castShadow>
                  <boxGeometry args={[0.04, 0.64, 0.62]} />
                </mesh>
                <mesh position={[0, 1.02, -0.3]} material={VIP_DESK_MAT} castShadow>
                  <boxGeometry args={[0.94, 0.7, 0.04]} />
                </mesh>
                <mesh position={[0, 1.32, -0.27]}>
                  <boxGeometry args={[0.86, 0.035, 0.02]} />
                  <meshBasicMaterial color={powerOutage ? 0x1e293b : 0xf59e0b} />
                </mesh>
              </group>
            )}

            {obj.hasChair && (
              <KenneyProp
                asset="chairmoderncushion"
                position={[0, 0, 0.4]}
                rotationY={Math.PI}
                size={[0.62, 0.95, 0.62]}
              />
            )}

            {obj.computer && (
              <>
                <ComputerRigModel
                  tier={obj.computer.tier}
                  occupied={obj.computer.occupiedByCustomerId !== null}
                  broken={obj.computer.isBroken}
                  powerOutage={powerOutage}
                />
                <KenneyProp asset="computerkeyboard" position={[-0.1, 0.755, 0.2]} size={[0.38, 0.09, 0.16]} />
                <KenneyProp asset="computermouse" position={[0.19, 0.755, 0.2]} size={[0.09, 0.07, 0.12]} />
              </>
            )}

            {obj.computer?.isBroken && (
              <mesh position={[0, 1.45, 0]}>
                <octahedronGeometry args={[0.12, 0]} />
                <meshBasicMaterial color={0xef4444} />
              </mesh>
            )}
          </group>
        );
      }

      if (obj.type === 'plastic_stool') {
        return <KenneyProp asset="chair" position={[0, 0, 0]} size={[0.58, 0.78, 0.58]} />;
      }
      if (['office_chair', 'gaming_chair', 'esports_chair_pro'].includes(obj.type)) {
        return (
          <KenneyProp
            asset="chairmoderncushion"
            position={[0, 0, 0]}
            rotationY={Math.PI}
            size={[0.62, 0.95, 0.62]}
          />
        );
      }

      if (obj.type === 'cashier_counter') {
        return (
          <group>
            <mesh position={[0, 0.45, 0]} material={WOOD_MAT} castShadow receiveShadow>
              <boxGeometry args={[0.94, 0.9, 0.58]} />
            </mesh>
            <mesh position={[0, 0.92, 0]} material={DARK_DESK_MAT} castShadow>
              <boxGeometry args={[0.98, 0.06, 0.64]} />
            </mesh>
            <mesh position={[-0.22, 1.08, 0.04]} material={GLASS_MAT}>
              <boxGeometry args={[0.42, 0.26, 0.4]} />
            </mesh>
            <mesh position={[0.24, 1.06, -0.05]} material={DARK_CASE} castShadow>
              <boxGeometry args={[0.26, 0.22, 0.18]} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'ac_unit') {
        return (
          <group>
            <mesh position={[0, 0.95, -0.3]} material={METAL_MAT}>
              <boxGeometry args={[0.14, 1.9, 0.12]} />
            </mesh>
            <mesh position={[0, 1.92, -0.2]} material={WHITE_APPLIANCE} castShadow>
              <boxGeometry args={[0.88, 0.28, 0.24]} />
            </mesh>
            <mesh position={[0, 1.82, -0.08]}>
              <boxGeometry args={[0.76, 0.03, 0.04]} />
              <meshBasicMaterial color={powerOutage ? 0x334155 : 0x38bdf8} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'router') {
        return (
          <group>
            <mesh position={[0, 0.38, 0]} material={WOOD_MAT} castShadow>
              <boxGeometry args={[0.45, 0.76, 0.45]} />
            </mesh>
            <mesh position={[0, 0.8, 0]} material={DARK_CASE} castShadow>
              <boxGeometry args={[0.34, 0.08, 0.24]} />
            </mesh>
            <mesh position={[-0.12, 0.94, -0.06]} material={DARK_CASE}>
              <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
            </mesh>
            <mesh position={[0.12, 0.94, -0.06]} material={DARK_CASE}>
              <cylinderGeometry args={[0.012, 0.012, 0.24, 6]} />
            </mesh>
            <mesh position={[0, 0.81, 0.125]}>
              <boxGeometry args={[0.18, 0.025, 0.01]} />
              <meshBasicMaterial color={powerOutage ? 0xef4444 : 0x10b981} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'printer') {
        return (
          <group>
            <mesh position={[0, 0.36, 0]} material={METAL_MAT} castShadow>
              <boxGeometry args={[0.64, 0.72, 0.56]} />
            </mesh>
            <mesh position={[0, 0.86, 0]} material={WHITE_APPLIANCE} castShadow>
              <boxGeometry args={[0.56, 0.28, 0.48]} />
            </mesh>
            <mesh position={[0, 1.02, -0.04]} material={DARK_CASE}>
              <boxGeometry args={[0.48, 0.04, 0.38]} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'snack_rack') {
        return (
          <group>
            <mesh position={[-0.36, 0.68, -0.2]} material={METAL_MAT}>
              <boxGeometry args={[0.05, 1.36, 0.05]} />
            </mesh>
            <mesh position={[0.36, 0.68, -0.2]} material={METAL_MAT}>
              <boxGeometry args={[0.05, 1.36, 0.05]} />
            </mesh>
            <mesh position={[0, 0.45, 0]} material={WOOD_MAT} castShadow>
              <boxGeometry args={[0.78, 0.05, 0.42]} />
            </mesh>
            <mesh position={[0, 0.85, 0]} material={WOOD_MAT} castShadow>
              <boxGeometry args={[0.78, 0.05, 0.42]} />
            </mesh>
            <mesh position={[0, 1.25, 0]} material={WOOD_MAT} castShadow>
              <boxGeometry args={[0.78, 0.05, 0.42]} />
            </mesh>
            <mesh position={[-0.18, 0.56, 0.02]}>
              <boxGeometry args={[0.24, 0.16, 0.24]} />
              <meshStandardMaterial color={0xef4444} roughness={0.6} />
            </mesh>
            <mesh position={[0.16, 0.96, 0.02]}>
              <boxGeometry args={[0.24, 0.16, 0.24]} />
              <meshStandardMaterial color={0xf59e0b} roughness={0.6} />
            </mesh>
            <mesh position={[-0.14, 1.35, 0.02]}>
              <boxGeometry args={[0.28, 0.14, 0.22]} />
              <meshStandardMaterial color={0x10b981} roughness={0.6} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'drink_fridge') {
        return (
          <group>
            <mesh position={[0, 0.82, -0.02]} material={WHITE_APPLIANCE} castShadow>
              <boxGeometry args={[0.68, 1.64, 0.58]} />
            </mesh>
            <mesh position={[0, 0.84, 0.275]}>
              <planeGeometry args={[0.56, 1.34]} />
              <meshStandardMaterial
                color={0x0ea5e9}
                emissive={powerOutage ? 0x000000 : 0x0284c7}
                emissiveIntensity={0.65}
                roughness={0.15}
              />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'coffee_station') {
        return (
          <group>
            <mesh position={[0, 0.42, 0]} material={WOOD_MAT} castShadow>
              <boxGeometry args={[0.76, 0.84, 0.52]} />
            </mesh>
            {/* Water Gallon Dispenser */}
            <mesh position={[-0.18, 1.02, 0]} material={WHITE_APPLIANCE} castShadow>
              <boxGeometry args={[0.26, 0.36, 0.28]} />
            </mesh>
            <mesh position={[-0.18, 1.34, 0]}>
              <cylinderGeometry args={[0.11, 0.11, 0.28, 10]} />
              <meshStandardMaterial color={0x38bdf8} transparent opacity={0.65} roughness={0.12} />
            </mesh>
            {/* Coffee Kettle & Cup Stack */}
            <mesh position={[0.18, 0.94, 0.02]} material={METAL_MAT}>
              <cylinderGeometry args={[0.09, 0.11, 0.2, 10]} />
            </mesh>
            <mesh position={[0.22, 0.89, 0.16]} material={WHITE_APPLIANCE}>
              <cylinderGeometry args={[0.04, 0.035, 0.1, 8]} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'cctv_camera') {
        return (
          <group>
            <mesh position={[0, 0.04, 0]} material={METAL_MAT}>
              <cylinderGeometry args={[0.16, 0.18, 0.06, 10]} />
            </mesh>
            <mesh position={[0, 1.05, -0.1]} material={METAL_MAT} castShadow>
              <cylinderGeometry args={[0.03, 0.035, 2.05, 8]} />
            </mesh>
            <mesh position={[0, 2.08, 0.02]} material={METAL_MAT}>
              <boxGeometry args={[0.06, 0.06, 0.26]} />
            </mesh>
            <mesh position={[0, 2.0, 0.14]} material={WHITE_APPLIANCE}>
              <sphereGeometry args={[0.12, 12, 12]} />
            </mesh>
            <mesh position={[0, 1.98, 0.25]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshBasicMaterial color={powerOutage ? 0x334155 : 0xef4444} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'trash_bin') {
        return <KenneyProp asset="trashcan" size={[0.55, 0.72, 0.55]} />;
      }

      if (obj.type === 'waiting_bench') {
        return <KenneyProp asset="bench" size={[1.0, 0.72, 0.55]} />;
      }

      if (obj.type === 'plant') {
        return <KenneyProp asset="pottedplant" size={[0.72, 1.05, 0.72]} />;
      }

      if (obj.type === 'neon_poster') {
        return (
          <group>
            <mesh position={[0, 0.65, 0]} material={DARK_CASE} castShadow>
              <boxGeometry args={[0.58, 1.3, 0.1]} />
            </mesh>
            <mesh position={[0, 0.7, 0.06]}>
              <planeGeometry args={[0.46, 0.96]} />
              <meshBasicMaterial color={powerOutage ? 0x1e293b : 0xf43f5e} />
            </mesh>
          </group>
        );
      }

      if (obj.type === 'wall_neon_sign') {
        return (
          <group>
            <mesh position={[0, 0.04, 0]} material={DARK_CASE}>
              <boxGeometry args={[0.44, 0.08, 0.24]} />
            </mesh>
            <mesh position={[0, 0.78, 0]} material={DARK_CASE} castShadow>
              <boxGeometry args={[0.64, 1.4, 0.08]} />
            </mesh>
            <mesh position={[0, 0.84, 0.048]}>
              <boxGeometry args={[0.46, 0.96, 0.02]} />
              <meshStandardMaterial
                color={0x0ea5e9}
                emissive={powerOutage ? 0x000000 : 0x38bdf8}
                emissiveIntensity={powerOutage ? 0 : 1.15}
              />
            </mesh>
            <mesh position={[0, 0.84, 0.062]}>
              <torusGeometry args={[0.16, 0.022, 8, 18]} />
              <meshStandardMaterial
                color={0xf43f5e}
                emissive={powerOutage ? 0x000000 : 0xf43f5e}
                emissiveIntensity={powerOutage ? 0 : 1.2}
              />
            </mesh>
          </group>
        );
      }

      // rgb_lamp
      return (
        <group>
          <mesh position={[0, 0.04, 0]} material={METAL_MAT}>
            <cylinderGeometry args={[0.16, 0.18, 0.06, 10]} />
          </mesh>
          <mesh position={[0, 0.72, 0]} material={METAL_MAT}>
            <cylinderGeometry args={[0.025, 0.025, 1.36, 8]} />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 0.24, 10]} />
            <meshStandardMaterial
              color={0xfef3c7}
              emissive={powerOutage ? 0x000000 : 0xf59e0b}
              emissiveIntensity={0.95}
            />
          </mesh>
        </group>
      );
    };

    return (
      <group
        position={[obj.x, yElev, obj.z]}
        rotation={[0, rotY, 0]}
        onClick={handleClick}
      >
        {renderBody()}
        {isSelected && (
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.42, 0.5, 24]} />
            <meshBasicMaterial color={0xf59e0b} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  },
  (prev, next) => {
    const a = prev.obj;
    const b = next.obj;
    return (
      a.id === b.id &&
      a.type === b.type &&
      a.x === b.x &&
      a.z === b.z &&
      a.rotation === b.rotation &&
      prev.isSelected === next.isSelected &&
      prev.powerOutage === next.powerOutage &&
      prev.onSelect === next.onSelect &&
      a.computer?.tier === b.computer?.tier &&
      a.computer?.occupiedByCustomerId === b.computer?.occupiedByCustomerId &&
      a.computer?.isBroken === b.computer?.isBroken
    );
  },
);
