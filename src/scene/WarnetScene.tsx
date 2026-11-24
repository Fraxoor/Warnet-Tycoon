import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { useGameStore } from '../store/gameStore';
import { canPlaceItemAt, getTileElevation } from '../simulation/grid';
import { WarnetBuilding } from './WarnetBuilding';
import { NeighborhoodWorld } from './NeighborhoodWorld';
import { FurnitureModel } from './models/FurnitureModels';
import { CustomerAvatar, StaffAvatar } from './models/CharacterModels';

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

const IS_SOFTWARE_GL = detectSoftwareWebGL();

function computeDayNightLighting(minuteOfDay: number) {
  // 0..1440: noon=720, midnight=0/1440
  const hour = minuteOfDay / 60;
  // nightFactor: 0 during day (9..17), 1 at night (21..5)
  let nightFactor = 0;
  if (hour < 6 || hour >= 20.5) nightFactor = 1;
  else if (hour < 9) nightFactor = 1 - (hour - 6) / 3;
  else if (hour >= 17.5) nightFactor = (hour - 17.5) / 3;

  const isSunset = (hour >= 16.5 && hour < 19.5) || (hour >= 6 && hour < 8.5);
  return { nightFactor, isSunset };
}

const _panVec = new THREE.Vector3();
const _rightVec = new THREE.Vector3();
const _forwardVec = new THREE.Vector3();

function SceneController({ isSoftwareGl }: { isSoftwareGl: boolean }) {
  const { gl, scene, camera, advance } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);

  const screenState = useGameStore((s) => s.screenState);
  const sim = useGameStore((s) => s.sim);
  const buildItem = useGameStore((s) => s.buildItem);
  const buildRotation = useGameStore((s) => s.buildRotation);
  const selectedObjectId = useGameStore((s) => s.selectedObjectId);
  const cameraResetTrigger = useGameStore((s) => s.cameraResetTrigger);
  const tick = useGameStore((s) => s.tick);
  const placeAtTile = useGameStore((s) => s.placeAtTile);
  const setSelectedObjectId = useGameStore((s) => s.setSelectedObjectId);
  const rotateBuildItem = useGameStore((s) => s.rotateBuildItem);
  const selectBuildItem = useGameStore((s) => s.selectBuildItem);

  const [hoverTile, setHoverTile] = useState<{ x: number; z: number } | null>(null);

  // Setup RoomEnvironment PBR studio IBL once
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
    return () => {
      envTex.dispose();
    };
  }, [gl, scene]);

  // Software-WebGL afterDraw paced loop
  useEffect(() => {
    if (!isSoftwareGl) return;
    let alive = true;
    let timerId = 0;

    function afterDraw(cb: () => void) {
      const ctx = gl.getContext() as WebGL2RenderingContext;
      const sync = ctx.fenceSync?.(ctx.SYNC_GPU_COMMANDS_COMPLETE, 0);
      ctx.flush();
      const poll = () => {
        if (!alive) return;
        const status = sync ? ctx.getSyncParameter(sync, ctx.SYNC_STATUS) : ctx.SIGNALED;
        if (status === ctx.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) ctx.deleteSync(sync);
          timerId = window.setTimeout(cb, 80);
        }
      };
      timerId = window.setTimeout(poll, 5);
    }

    function stepLoop() {
      if (!alive) return;
      timerId = requestAnimationFrame(() => {
        if (!alive) return;
        advance(performance.now());
        afterDraw(stepLoop);
      });
    }

    const onResize = () => {
      window.setTimeout(() => {
        if (alive) advance(performance.now());
      }, 60);
    };
    window.addEventListener('resize', onResize);

    // Draw initial frame promptly on next tick, then pace via afterDraw
    advance(performance.now());
    afterDraw(stepLoop);
    return () => {
      alive = false;
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(timerId);
      window.clearTimeout(timerId);
    };
  }, [isSoftwareGl, gl, advance]);

  // Keyboard panning & build shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.code === 'KeyR' && useGameStore.getState().buildItem) {
        rotateBuildItem();
      } else if (e.code === 'Escape' && useGameStore.getState().buildItem) {
        selectBuildItem(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    const onBlur = () => {
      keysRef.current = {};
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [rotateBuildItem, selectBuildItem]);

  // Reset camera smoothly when triggered or entering playing
  useEffect(() => {
    if (cameraResetTrigger === 0) return;
    camera.position.set(14.8, 13.6, 15.8);
    if (controlsRef.current) {
      controlsRef.current.target.set(3.4, 0.45, 4.2);
      controlsRef.current.update();
    }
  }, [cameraResetTrigger, camera]);

  const { nightFactor, isSunset } = computeDayNightLighting(sim.minuteOfDay);
  const weather = sim.weather ?? 'sunny';

  const skyColor = useMemo(() => {
    const dayCol = new THREE.Color(
      weather === 'rain' ? 0x4b5c6e : weather === 'overcast' ? 0x7d92a8 : 0x9fc4e6,
    );
    const sunsetCol = new THREE.Color(weather === 'rain' ? 0x6b6068 : 0xd99b66);
    const nightCol = new THREE.Color(weather === 'rain' ? 0x0a0f1c : 0x0f1526);
    if (nightFactor > 0.5) return sunsetCol.clone().lerp(nightCol, (nightFactor - 0.5) * 2);
    if (isSunset) return dayCol.clone().lerp(sunsetCol, nightFactor * 2);
    return dayCol.clone().lerp(nightCol, nightFactor);
  }, [nightFactor, isSunset, weather]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);

    // Update sky/fog color smoothly
    scene.background = skyColor;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(skyColor);
      scene.fog.density = weather === 'rain' ? 0.022 : weather === 'overcast' ? 0.017 : 0.014;
    }

    // Full sun/moon directional arc + weather intensity attenuation
    const dayFrac = (sim.minuteOfDay % 1440) / 1440;
    const sunAngle = (dayFrac - 0.25) * Math.PI * 2;
    const weatherDim = weather === 'rain' ? 0.68 : weather === 'overcast' ? 0.84 : 1.0;

    if (dirLightRef.current) {
      dirLightRef.current.position.set(
        4 + Math.cos(sunAngle) * 16,
        Math.max(9, Math.sin(sunAngle) * 20 + 6),
        10 + Math.sin(dayFrac * Math.PI) * 5,
      );
      dirLightRef.current.intensity = THREE.MathUtils.lerp(1.45, 0.45, nightFactor) * weatherDim;
      dirLightRef.current.color.setHex(
        nightFactor > 0.6 ? 0x818cf8 : isSunset ? 0xfdba74 : weather === 'rain' ? 0xcbd5e1 : 0xfff3db,
      );
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = THREE.MathUtils.lerp(0.85, 0.48, nightFactor) * (weather === 'rain' ? 0.88 : 1);
    }

    // Title screen gentle front-right isometric camera sway (frames interior + storefront cleanly right of title)
    if (screenState === 'title' && controlsRef.current) {
      const t = performance.now() * 0.00035;
      const angle = 0.76 + Math.sin(t) * 0.22;
      camera.position.x = 2.0 + Math.cos(angle) * 16.0;
      camera.position.z = 2.8 + Math.sin(angle) * 16.0;
      camera.position.y = 12.2;
      controlsRef.current.target.set(1.7, 0.75, 4.3);
      controlsRef.current.update();
      return;
    }

    // WASD / Arrow camera pan in playing mode
    if (screenState === 'playing' && controlsRef.current) {
      const k = keysRef.current;
      const panSpeed = 9 * dt;
      let moveRight = 0;
      let moveFwd = 0;
      if (k['KeyA'] || k['ArrowLeft']) moveRight -= 1;
      if (k['KeyD'] || k['ArrowRight']) moveRight += 1;
      if (k['KeyW'] || k['ArrowUp']) moveFwd += 1;
      if (k['KeyS'] || k['ArrowDown']) moveFwd -= 1;

      if (moveRight !== 0 || moveFwd !== 0) {
        camera.getWorldDirection(_forwardVec);
        _forwardVec.y = 0;
        _forwardVec.normalize();
        _rightVec.crossVectors(_forwardVec, camera.up).normalize();
        _panVec
          .set(0, 0, 0)
          .addScaledVector(_rightVec, moveRight * panSpeed)
          .addScaledVector(_forwardVec, moveFwd * panSpeed);
        camera.position.add(_panVec);
        controlsRef.current.target.add(_panVec);
      }
      controlsRef.current.update();
    }

    tick(dt);
  });

  const placementPreview = useMemo(() => {
    if (!buildItem || !hoverTile) return null;
    const check = canPlaceItemAt(
      buildItem,
      hoverTile.x,
      hoverTile.z,
      sim.unlockedRooms,
      sim.objects,
    );
    return { ...hoverTile, valid: check.valid };
  }, [buildItem, hoverTile, sim.unlockedRooms, sim.objects]);

  const powerOutage = sim.effects.powerOutageHours > 0;

  return (
    <>
      <fogExp2 attach="fog" args={[0x0f1526, 0.015]} />
      <hemisphereLight
        ref={hemiLightRef}
        args={[0xcbe2ff, 0x3b2f26, 0.75]}
      />
      <directionalLight
        ref={dirLightRef}
        position={[14, 22, 12]}
        intensity={1.3}
        castShadow={!isSoftwareGl}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0005}
      />

      {/* Warm interior Warnet lighting (PC bays + entrance/cashier/waiting fill) */}
      <pointLight
        position={[3.5, 2.5, 2.4]}
        intensity={powerOutage ? 0.3 : sim.lightingTier === 'fluorescent' ? 2.9 : 4.2}
        distance={16}
        color={
          sim.lightingTier === 'rgb_gaming'
            ? 0x38bdf8
            : sim.lightingTier === 'esports_arena'
              ? 0xc084fc
              : 0xffedd5
        }
      />
      <pointLight
        position={[3.5, 2.35, 6.2]}
        intensity={powerOutage ? 0.15 : 1.75}
        distance={12}
        color={0xfef3c7}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping={!isSoftwareGl}
        dampingFactor={0.07}
        minDistance={7}
        maxDistance={32}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.35}
        target={[3.4, 0.45, 4.2]}
      />

      <WarnetBuilding
        unlockedRooms={sim.unlockedRooms}
        lightingTier={sim.lightingTier}
        nightFactor={nightFactor}
        minuteOfDay={sim.minuteOfDay}
        weather={weather}
        powerOutage={powerOutage}
        onPointerMoveTile={(x, z) => {
          if (buildItem) setHoverTile({ x, z });
        }}
        onClickTile={(x, z) => {
          if (buildItem) {
            placeAtTile(x, z);
          } else {
            setSelectedObjectId(null);
          }
        }}
      />

      <NeighborhoodWorld
        nightFactor={nightFactor}
        weather={weather}
        powerOutage={powerOutage}
        isSoftwareGl={isSoftwareGl}
      />

      {/* Placed Furniture & PCs */}
      {sim.objects.map((obj) => (
        <FurnitureModel
          key={obj.id}
          obj={obj}
          isSelected={selectedObjectId === obj.id}
          powerOutage={powerOutage}
          onSelect={(id) => {
            if (buildItem) {
              placeAtTile(obj.x, obj.z);
            } else {
              setSelectedObjectId(id);
            }
          }}
        />
      ))}

      {/* Autonomous NPC Customers */}
      {sim.customers.map((cust) => (
        <CustomerAvatar key={cust.id} customer={cust} />
      ))}

      {/* Autonomous Staff Members */}
      {sim.staff.map((st) => (
        <StaffAvatar key={st.id} staff={st} />
      ))}

      {/* Grid Placement Preview Ghost */}
      {placementPreview && buildItem && (
        <group
          position={[
            placementPreview.x,
            getTileElevation(placementPreview.x, placementPreview.z) + 0.04,
            placementPreview.z,
          ]}
          rotation={[0, -buildRotation * (Math.PI / 2), 0]}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.96, 0.96]} />
            <meshBasicMaterial
              color={placementPreview.valid ? 0x10b981 : 0xef4444}
              transparent
              opacity={0.45}
            />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.78, 0.85, 0.62]} />
            <meshBasicMaterial
              color={placementPreview.valid ? 0x34d399 : 0xf87171}
              wireframe
            />
          </mesh>
        </group>
      )}
    </>
  );
}

export const WarnetScene: React.FC = () => {
  const [contextLost, setContextLost] = useState(false);

  return (
    <div
      className="fixed inset-0 w-full h-full bg-[#0e1118]"
      data-testid="warnet-3d-viewport"
    >
      {contextLost ? (
        <div className="flex items-center justify-center w-full h-full text-slate-300">
          <p className="text-sm">3D Viewport recovering context...</p>
        </div>
      ) : (
        <Canvas
          frameloop={IS_SOFTWARE_GL ? 'never' : 'always'}
          shadows={!IS_SOFTWARE_GL}
          dpr={IS_SOFTWARE_GL ? 1 : [1, 1.5]}
          camera={{ position: [14.8, 13.6, 15.8], fov: 34, near: 0.5, far: 120 }}
          gl={{
            antialias: !IS_SOFTWARE_GL,
            preserveDrawingBuffer: IS_SOFTWARE_GL,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
              setContextLost(true);
            });
            gl.domElement.addEventListener('webglcontextrestored', () => {
              setContextLost(false);
            });
          }}
        >
          <SceneController isSoftwareGl={IS_SOFTWARE_GL} />
        </Canvas>
      )}
    </div>
  );
};
