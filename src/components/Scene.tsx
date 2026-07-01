"use client";

/**
 * Hivemind — 3D "hive core" immersive visualization.
 *
 * A crystalline icosahedron (the hive mind) with a pulsing emissive core,
 * surrounded by orbital rings and a sparse starfield. Reacts to hover (brighten
 * + accelerate) and to an optional "sealing" prop (particle inflow via
 * Sparkles). Bloom post-processing for the diamond-glass look. Performance-minded:
 * frustum-culled, damped OrbitControls, reduced-motion aware.
 */

import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Sparkles, Float, Icosahedron, Torus, Sphere } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { Group, Mesh, MeshPhysicalMaterial } from "three";
import * as THREE from "three";

const HIVE_YELLOW = "#facc15";
const HIVE_AMBER = "#fbbf24";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// The crystal + pulsing core
// ---------------------------------------------------------------------------

function HiveCrystal({ hovered, sealing }: { hovered: boolean; sealing: boolean }) {
  const group = useRef<Group>(null);
  const crystal = useRef<Mesh>(null);
  const core = useRef<Mesh>(null);
  const coreMat = useRef<MeshPhysicalMaterial>(null);

  useFrame((state, delta) => {
    const speedMul = hovered ? 2.2 : 1;
    const burst = sealing ? 2.6 : 1;

    if (group.current) {
      group.current.rotation.y += delta * 0.15 * speedMul;
    }
    if (crystal.current) {
      crystal.current.rotation.x += delta * 0.05 * speedMul;
      crystal.current.rotation.z += delta * 0.03 * speedMul;
    }
    // Pulsing core — emissive intensity oscillates; bursts while sealing.
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * (sealing ? 6 : 1.8));
    if (coreMat.current) {
      coreMat.current.emissiveIntensity = (0.6 + pulse * 1.4) * burst;
    }
    if (core.current) {
      const s = 0.42 + pulse * 0.12 * burst;
      core.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={group}>
      {/* Diamond-glass crystal shell */}
      <Icosahedron ref={crystal} args={[1.5, 1]}>
        <meshPhysicalMaterial
          color={HIVE_YELLOW}
          transmission={0.95}
          thickness={2.2}
          roughness={0.08}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          ior={2.4}
          reflectivity={0.6}
          transparent
          opacity={0.85}
          emissive={HIVE_AMBER}
          emissiveIntensity={hovered ? 0.25 : 0.08}
          attenuationColor={HIVE_YELLOW}
          attenuationDistance={1.2}
        />
      </Icosahedron>

      {/* Glowing inner core */}
      <Sphere ref={core} args={[1, 48, 48]}>
        <meshPhysicalMaterial
          ref={coreMat}
          color={HIVE_YELLOW}
          emissive={HIVE_AMBER}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0}
          toneMapped={false}
        />
      </Sphere>

      {/* Wireframe scaffold for extra geometric texture */}
      <Icosahedron args={[1.52, 1]}>
        <meshBasicMaterial color={HIVE_YELLOW} wireframe transparent opacity={hovered ? 0.25 : 0.12} />
      </Icosahedron>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Orbital consensus rings
// ---------------------------------------------------------------------------

function OrbitalRings({ hovered }: { hovered: boolean }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    const s = hovered ? 2 : 1;
    group.current.rotation.x += delta * 0.12 * s;
    group.current.rotation.y -= delta * 0.08 * s;
  });

  const rings = useMemo(() => {
    return [
      { r: 2.4, t: 0.015, axis: [1.2, 0, 0.4] as [number, number, number], op: 0.5 },
      { r: 2.8, t: 0.012, axis: [0, 1.4, 0.3] as [number, number, number], op: 0.4 },
      { r: 3.2, t: 0.01, axis: [0.6, 0.8, 1.1] as [number, number, number], op: 0.3 },
    ];
  }, []);

  return (
    <group ref={group}>
      {rings.map((c, i) => (
        <Torus
          key={i}
          args={[c.r, c.t, 16, 128]}
          rotation={c.axis}
        >
          <meshStandardMaterial
            color={HIVE_YELLOW}
            emissive={HIVE_AMBER}
            emissiveIntensity={hovered ? 1.2 : 0.6}
            transparent
            opacity={c.op}
            toneMapped={false}
          />
        </Torus>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Full scene
// ---------------------------------------------------------------------------

function SceneContents({ sealing }: { sealing: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[6, 6, 6]} intensity={40} color={HIVE_YELLOW} />
      <pointLight position={[-6, -4, -2]} intensity={25} color="#0891b2" />
      <directionalLight position={[0, 5, 5]} intensity={0.6} color="#ffffff" />

      <Float speed={1.1} rotationIntensity={0.3} floatIntensity={0.4}>
        <group
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <HiveCrystal hovered={hovered} sealing={sealing} />
        </group>
      </Float>

      <OrbitalRings hovered={hovered} />

      {/* Particle inflow while a vote is being sealed */}
      {sealing && (
        <Sparkles
          count={120}
          scale={10}
          size={4}
          speed={0.6}
          opacity={0.8}
          color={HIVE_YELLOW}
          noise={1.5}
        />
      )}

      <Stars radius={80} depth={40} count={1800} factor={3.4} saturation={0} fade speed={0.6} />

      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
          radius={0.7}
        />
        <Vignette eskil={false} offset={0.3} darkness={0.85} />
      </EffectComposer>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.4}
        rotateSpeed={0.5}
        dampingFactor={0.08}
        enableDamping
        makeDefault
      />
    </>
  );
}

export default function Scene({ sealing = false }: { sealing?: boolean }) {
  const reduced = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 8, 22]} />
        <Suspense fallback={null}>
          <SceneContents sealing={reduced ? false : sealing} />
        </Suspense>
      </Canvas>
    </div>
  );
}
