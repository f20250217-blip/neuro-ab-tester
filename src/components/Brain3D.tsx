"use client";

import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { BrainRegion } from "@/lib/neuro-engine";

/* ============================================
   INFLUENCE SOURCES — what shapes your brain
   ============================================ */
const INFLUENCE_SOURCES = [
  { id: "music",  icon: "♪", label: "Music",  targetRegions: ["auditory", "amygdala", "hippocampus"], orbitRadius: 2.4, orbitSpeed: 0.15, orbitTilt: 0.3, heightOffset: 0.2,  color: "#a855f7", diveDelay: 0 },
  { id: "social", icon: "◎", label: "Social", targetRegions: ["amygdala", "nac", "acc"],              orbitRadius: 2.6, orbitSpeed: -0.12, orbitTilt: -0.2, heightOffset: -0.1, color: "#3b82f6", diveDelay: 2.5 },
  { id: "ads",    icon: "◈", label: "Ads",    targetRegions: ["pfc", "nac", "visual"],               orbitRadius: 2.3, orbitSpeed: 0.1,  orbitTilt: 0.5, heightOffset: 0.5,  color: "#f59e0b", diveDelay: 5 },
  { id: "text",   icon: "¶", label: "Text",   targetRegions: ["broca", "wernicke", "hippocampus"],    orbitRadius: 2.5, orbitSpeed: -0.08, orbitTilt: -0.4, heightOffset: 0.3, color: "#10b981", diveDelay: 7.5 },
  { id: "video",  icon: "▶", label: "Video",  targetRegions: ["visual", "temporal", "amygdala"],     orbitRadius: 2.7, orbitSpeed: 0.13, orbitTilt: 0.1, heightOffset: -0.3, color: "#ef4444", diveDelay: 10 },
  { id: "screen", icon: "▣", label: "Screen", targetRegions: ["acc", "pfc", "motor"],               orbitRadius: 2.2, orbitSpeed: -0.11, orbitTilt: 0.6, heightOffset: 0.0,  color: "#8b5cf6", diveDelay: 12.5 },
];

/* ============================================
   CINEMATIC SEQUENCE — 4 phases, 10s loop
   ============================================ */
const CYCLE = 10; // total loop duration
const PHASE_TIMINGS = [
  { start: 0, end: 2.5, name: "calm" },      // slow rotate, minimal
  { start: 2.5, end: 5, name: "influence" },  // icons appear, approach
  { start: 5, end: 7.5, name: "overload" },   // rapid hits, flicker
  { start: 7.5, end: 10, name: "insight" },   // freeze, spotlight, label
] as const;

type PhaseName = typeof PHASE_TIMINGS[number]["name"];

const INSIGHT_LABELS = [
  "ATTENTION HIJACKED",
  "DOPAMINE LOOP DETECTED",
  "EMOTIONAL OVERRIDE ACTIVE",
  "MEMORY MANIPULATION FOUND",
];

const INSIGHT_REGIONS = ["acc", "nac", "amygdala", "hippocampus"]; // matched to labels

function getPhase(t: number): { name: PhaseName; progress: number; cycleIndex: number } {
  const cycleIndex = Math.floor(t / CYCLE);
  const ct = t % CYCLE;
  for (const p of PHASE_TIMINGS) {
    if (ct >= p.start && ct < p.end) {
      return { name: p.name, progress: (ct - p.start) / (p.end - p.start), cycleIndex };
    }
  }
  return { name: "calm", progress: 0, cycleIndex };
}

interface InfluenceState {
  positions: THREE.Vector3[];
  nearRegions: Map<string, number>;
  activePulses: { center: THREE.Vector3; color: THREE.Color; time: number }[];
  phase: PhaseName;
  phaseProgress: number;
  cycleIndex: number;
}

/* ============================================
   Custom brain shader — translucent with glow
   ============================================ */
const vertShader = `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vColor;
  attribute vec3 color;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    vColor = color;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragShader = `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vColor;
  uniform float uTime;
  uniform vec3 uCamPos;
  uniform float uScanY;
  uniform float uScanIntensity;
  uniform vec3 uPulseCenter;
  uniform float uPulseRadius;
  uniform vec3 uPulseColor;
  uniform float uOverload;
  uniform vec3 uSpotlightPos;
  uniform float uSpotlightIntensity;

  void main() {
    vec3 viewDir = normalize(uCamPos - vWorldPos);

    vec3 light1 = normalize(vec3(0.5, 1.0, 0.5));
    vec3 light2 = normalize(vec3(-0.3, 0.5, -0.5));
    vec3 light3 = normalize(vec3(0.0, -0.3, 1.0));

    float d1 = max(dot(vNormal, light1), 0.0);
    float d2 = max(dot(vNormal, light2), 0.0) * 0.4;
    float d3 = max(dot(vNormal, light3), 0.0) * 0.2;
    float diffuse = d1 + d2 + d3;

    float upDot = dot(vNormal, vec3(0.0, 1.0, 0.0));
    float ao = 0.4 + 0.6 * max(upDot, 0.0);
    ao = pow(ao, 0.7);

    vec3 halfDir = normalize(light1 + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 50.0) * 0.35;

    float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
    fresnel = pow(fresnel, 2.5);
    vec3 rimColor = mix(vec3(0.2, 0.1, 0.5), vec3(0.4, 0.2, 0.8), fresnel);

    float sss = pow(max(dot(-vNormal, light1), 0.0), 1.5) * 0.12;
    vec3 sssColor = vec3(0.8, 0.4, 0.2) * sss;

    vec3 col = vColor * (0.3 + diffuse * 0.7) * ao;
    col += spec * vec3(1.0, 0.95, 0.9);
    col += rimColor * fresnel * 0.3;
    col += sssColor;

    float wave = sin(uTime * 2.0 + vPos.x * 3.0 + vPos.z * 2.0) * 0.015;
    col += wave * vColor;

    // Scan line effect
    float scanDist = abs(vPos.y - uScanY);
    float scanLine = smoothstep(0.15, 0.0, scanDist) * uScanIntensity;
    col += vec3(0.3, 0.6, 1.0) * scanLine * 0.4;
    col += vColor * scanLine * 0.3;

    // Pulse wave
    float pulseDist = distance(vPos, uPulseCenter);
    float pulseRing = smoothstep(0.15, 0.0, abs(pulseDist - uPulseRadius)) * step(0.01, uPulseRadius);
    col += uPulseColor * pulseRing * 0.5;

    // Overload — brightness boost + rapid flicker
    float flicker = 1.0 + uOverload * (0.3 + 0.2 * sin(uTime * 25.0) * sin(uTime * 17.0));
    col *= flicker;
    // Add overload rim glow
    col += rimColor * uOverload * 0.6;

    // Spotlight — single region highlight during INSIGHT
    float spotDist = distance(vPos, uSpotlightPos);
    float spot = smoothstep(0.8, 0.0, spotDist) * uSpotlightIntensity;
    col += vec3(1.0, 0.95, 0.8) * spot * 0.5;
    col = mix(col, col * 0.4, uSpotlightIntensity * 0.3 * smoothstep(0.0, 1.5, spotDist));

    gl_FragColor = vec4(col, 0.95);
  }
`;

/* ============================================
   BRAIN MESH
   ============================================ */
function BrainMesh({ regions, autoRotate, isMobile, influenceRef }: { regions: BrainRegion[]; autoRotate: boolean; isMobile: boolean; influenceRef?: React.RefObject<InfluenceState | null> }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { scene } = useGLTF("/models/brain-optimized.glb");

  const geometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !geo) {
        geo = (child as THREE.Mesh).geometry.clone();
      }
    });
    if (!geo) geo = new THREE.SphereGeometry(1.3, 64, 48);

    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox!.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);

    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox!.getSize(size);
    const s = 3.0 / Math.max(size.x, size.y, size.z);
    geo.scale(s, s, s);

    geo.computeVertexNormals();
    return geo;
  }, [scene]);

  const coloredGeo = useMemo(() => {
    const geo = geometry.clone();
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      let tw = 0, cr = 0, cg = 0, cb = 0;

      for (const reg of regions) {
        const rp = new THREE.Vector3(...reg.position);
        const dist = v.distanceTo(rp);
        const inf = Math.max(0, 1 - dist / 1.4);
        const w = inf * inf * inf * reg.activation;
        const c = new THREE.Color(reg.color);
        cr += c.r * w;
        cg += c.g * w;
        cb += c.b * w;
        tw += w;
      }

      if (tw > 0) { cr /= tw; cg /= tw; cb /= tw; }

      const hf = (v.y + 1.5) / 3.0;
      const bR = 0.08 + hf * 0.06;
      const bG = 0.35 + hf * 0.15;
      const bB = 0.30 + hf * 0.10;

      const blend = Math.min(tw * 3.0, 1);
      colors[i * 3]     = bR * (1 - blend) + cr * blend;
      colors[i * 3 + 1] = bG * (1 - blend) + cg * blend;
      colors[i * 3 + 2] = bB * (1 - blend) + cb * blend;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [geometry, regions]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uCamPos: { value: new THREE.Vector3(0, 2, 4) },
    uScanY: { value: -5 },
    uScanIntensity: { value: 0 },
    uPulseCenter: { value: new THREE.Vector3(0, 0, 0) },
    uPulseRadius: { value: 0 },
    uPulseColor: { value: new THREE.Vector3(1, 1, 1) },
    uOverload: { value: 0 },
    uSpotlightPos: { value: new THREE.Vector3(0, 0, 0) },
    uSpotlightIntensity: { value: 0 },
  }), []);

  // Region lookup for spotlight
  const regionMap = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    for (const r of regions) m.set(r.id, new THREE.Vector3(...r.position));
    return m;
  }, [regions]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { name: phase, progress, cycleIndex } = getPhase(t);

    if (groupRef.current) {
      // Phase-driven rotation speed
      const rotSpeeds: Record<PhaseName, number> = { calm: 0.001, influence: 0.003, overload: 0.008, insight: 0 };
      if (autoRotate) groupRef.current.rotation.y += rotSpeeds[phase];
      if (!isMobile) {
        const tiltScale = phase === "insight" ? 0.02 : 0.06;
        const targetX = state.pointer.y * tiltScale;
        const targetZ = -state.pointer.x * tiltScale;
        groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.03;
        groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.03;
      }
    }
    if (matRef.current) {
      const u = matRef.current.uniforms;
      u.uTime.value = t;
      u.uCamPos.value.copy(state.camera.position);

      // Scan sweep during INFLUENCE phase
      if (phase === "influence") {
        u.uScanY.value = -2 + progress * 4;
        u.uScanIntensity.value = Math.sin(progress * Math.PI);
      } else {
        u.uScanIntensity.value = Math.max(0, u.uScanIntensity.value - 0.08);
      }

      // Overload flicker
      if (phase === "overload") {
        const ramp = Math.min(1, progress * 2); // ramp up in first half
        u.uOverload.value += (ramp * 0.7 - u.uOverload.value) * 0.1;
      } else {
        u.uOverload.value *= 0.9;
      }

      // Insight spotlight
      if (phase === "insight") {
        const spotRegionId = INSIGHT_REGIONS[cycleIndex % INSIGHT_REGIONS.length];
        const spotPos = regionMap.get(spotRegionId);
        if (spotPos) u.uSpotlightPos.value.copy(spotPos);
        const fadeIn = Math.min(1, progress * 4); // snap on
        u.uSpotlightIntensity.value += (fadeIn - u.uSpotlightIntensity.value) * 0.15;
      } else {
        u.uSpotlightIntensity.value *= 0.85;
      }

      // Pulse from influence hits
      const inf = influenceRef?.current;
      if (inf && inf.activePulses.length > 0) {
        const pulse = inf.activePulses[0];
        const age = t - pulse.time;
        if (age < 1.5) {
          u.uPulseCenter.value.copy(pulse.center);
          u.uPulseRadius.value = age * 1.2;
          u.uPulseColor.value.set(pulse.color.r, pulse.color.g, pulse.color.b);
        } else {
          u.uPulseRadius.value = Math.max(0, u.uPulseRadius.value - 0.1);
          inf.activePulses.shift();
        }
      } else {
        u.uPulseRadius.value = Math.max(0, u.uPulseRadius.value - 0.1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={coloredGeo}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertShader}
          fragmentShader={fragShader}
          uniforms={uniforms}
          transparent
        />
      </mesh>
      <mesh geometry={coloredGeo} scale={1.01}>
        <meshBasicMaterial color="#4422aa" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ============================================
   NEURAL PATHWAYS — animated connections (desktop only)
   ============================================ */
function NeuralPathways({ regions }: { regions: BrainRegion[] }) {
  const active = useMemo(() => regions.filter((r) => r.activation > 0.4).sort((a, b) => b.activation - a.activation).slice(0, 6), [regions]);

  const curves = useMemo(() => {
    const conns: { curve: THREE.QuadraticBezierCurve3; strength: number; color: THREE.Color }[] = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const from = new THREE.Vector3(...active[i].position);
        const to = new THREE.Vector3(...active[j].position);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        mid.y += from.distanceTo(to) * 0.25;
        const strength = (active[i].activation + active[j].activation) / 2;
        if (strength > 0.45) {
          conns.push({
            curve: new THREE.QuadraticBezierCurve3(from, mid, to),
            strength,
            color: new THREE.Color(active[i].color).lerp(new THREE.Color(active[j].color), 0.5),
          });
        }
      }
    }
    return conns.sort((a, b) => b.strength - a.strength).slice(0, 8);
  }, [active]);

  return (
    <group>
      {curves.map((c, i) => (
        <PathTube key={i} curve={c.curve} strength={c.strength} color={c.color} index={i} />
      ))}
    </group>
  );
}

function PathTube({ curve, strength, color, index }: { curve: THREE.QuadraticBezierCurve3; strength: number; color: THREE.Color; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 16, 0.006 + strength * 0.008, 4, false), [curve, strength]);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + Math.sin(state.clock.elapsedTime * 2 + index * 1.5) * 0.06 + strength * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geo}>
      <meshBasicMaterial color={color} transparent opacity={0.15} />
    </mesh>
  );
}

/* ============================================
   FLOWING PARTICLES (desktop only)
   ============================================ */
function FlowingParticles({ regions }: { regions: BrainRegion[] }) {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 30;

  const active = useMemo(() => regions.filter((r) => r.activation > 0.4).sort((a, b) => b.activation - a.activation).slice(0, 5), [regions]);

  const connections = useMemo(() => {
    const conns: { curve: THREE.QuadraticBezierCurve3; color: THREE.Color }[] = [];
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const from = new THREE.Vector3(...active[i].position);
        const to = new THREE.Vector3(...active[j].position);
        const mid = from.clone().add(to).multiplyScalar(0.5);
        mid.y += from.distanceTo(to) * 0.25;
        conns.push({
          curve: new THREE.QuadraticBezierCurve3(from, mid, to),
          color: new THREE.Color(active[i].color).lerp(new THREE.Color(active[j].color), 0.5),
        });
      }
    }
    return conns.slice(0, 6);
  }, [active]);

  const particleData = useMemo(() => {
    return Array.from({ length: COUNT }, () => ({
      connIdx: Math.floor(Math.random() * Math.max(1, connections.length)),
      speed: 0.12 + Math.random() * 0.2,
      offset: Math.random(),
    }));
  }, [connections.length]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!instancedRef.current || connections.length === 0) return;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < COUNT; i++) {
      const pd = particleData[i];
      const conn = connections[pd.connIdx % connections.length];
      const progress = (t * pd.speed + pd.offset) % 1;
      const pos = conn.curve.getPoint(progress);

      dummy.position.copy(pos);
      const scale = 0.01 + Math.sin(progress * Math.PI) * 0.012;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, dummy.matrix);

      tempColor.copy(conn.color).multiplyScalar(1.2);
      instancedRef.current.setColorAt(i, tempColor);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
    if (instancedRef.current.instanceColor) instancedRef.current.instanceColor.needsUpdate = true;
  });

  if (connections.length === 0) return null;

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial transparent opacity={0.7} />
    </instancedMesh>
  );
}

/* ============================================
   REGION NODES — pulsing spheres with influence glow
   ============================================ */
function RegionNodes({ regions, influenceRef }: { regions: BrainRegion[]; influenceRef?: React.RefObject<InfluenceState | null> }) {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const white = useMemo(() => new THREE.Color("#ffffff"), []);

  useFrame((state) => {
    if (!instancedRef.current) return;
    const t = state.clock.elapsedTime;
    const nearRegions = influenceRef?.current?.nearRegions;

    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      const proximity = nearRegions?.get(r.id) || 0;
      const baseScale = 0.035 + r.activation * 0.045;
      const influenceBoost = 1 + proximity * 0.5;
      const pulse = 1 + Math.sin(t * 3 + r.activation * 10) * 0.12 * r.activation;

      dummy.position.set(...r.position);
      dummy.scale.setScalar(baseScale * pulse * influenceBoost);
      dummy.updateMatrix();
      instancedRef.current.setMatrixAt(i, dummy.matrix);

      tempColor.set(r.color);
      if (proximity > 0) tempColor.lerp(white, proximity * 0.3);
      instancedRef.current.setColorAt(i, tempColor);
    }
    instancedRef.current.instanceMatrix.needsUpdate = true;
    if (instancedRef.current.instanceColor) instancedRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, regions.length]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.45} />
    </instancedMesh>
  );
}

/* ============================================
   INFLUENCE ICONS — cinematic phase-driven
   ============================================ */
function InfluenceIcons({ regions, influenceRef }: { regions: BrainRegion[]; influenceRef: React.MutableRefObject<InfluenceState> }) {
  const groupRef = useRef<THREE.Group>(null);

  const textures = useMemo(() => {
    return INFLUENCE_SOURCES.map((src) => {
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, 96, 96);
      const gradient = ctx.createRadialGradient(48, 48, 0, 48, 48, 46);
      gradient.addColorStop(0, src.color + "cc");
      gradient.addColorStop(0.35, src.color + "66");
      gradient.addColorStop(0.7, src.color + "22");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(48, 48, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = src.color;
      ctx.shadowBlur = 12;
      ctx.fillText(src.icon, 48, 50);
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    });
  }, []);

  const regionMap = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    for (const r of regions) m.set(r.id, new THREE.Vector3(...r.position));
    return m;
  }, [regions]);

  const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const { name: phase, progress } = getPhase(t);
    const nearRegions = new Map<string, number>();
    const positions: THREE.Vector3[] = [];

    groupRef.current.children.forEach((child, i) => {
      const src = INFLUENCE_SOURCES[i];
      if (!src) return;
      const sprite = child as THREE.Sprite;
      const mat = sprite.material as THREE.SpriteMaterial;

      // Orbital position (always computed)
      const speed = phase === "overload" ? src.orbitSpeed * 3 : src.orbitSpeed;
      const angle = t * speed;
      const ox = Math.cos(angle) * src.orbitRadius;
      const oz = Math.sin(angle) * src.orbitRadius;
      const oy = src.heightOffset + Math.sin(angle * 0.7) * 0.3;
      const cosT = Math.cos(src.orbitTilt);
      const sinT = Math.sin(src.orbitTilt);
      const orbitPos = new THREE.Vector3(ox, oy * cosT - oz * sinT, oy * sinT + oz * cosT);

      const targetPos = regionMap.get(src.targetRegions[0]) || new THREE.Vector3();

      if (phase === "calm") {
        // Hidden — scale to 0, far away
        child.position.copy(orbitPos.multiplyScalar(1.5));
        sprite.scale.setScalar(0.01);
        mat.opacity = 0;
      } else if (phase === "influence") {
        // Staggered appearance: icon i appears at progress = i/6
        const appearAt = i / INFLUENCE_SOURCES.length;
        const localP = Math.max(0, (progress - appearAt) / (1 - appearAt));

        if (localP <= 0) {
          child.position.copy(orbitPos.multiplyScalar(1.5));
          sprite.scale.setScalar(0.01);
          mat.opacity = 0;
        } else if (localP < 0.5) {
          // Appear at orbit, fade in
          const fadeIn = ease(localP * 2);
          child.position.copy(orbitPos);
          sprite.scale.setScalar(0.35 * fadeIn);
          mat.opacity = fadeIn * 0.8;
        } else {
          // Dive toward brain
          const diveP = ease((localP - 0.5) * 2);
          child.position.lerpVectors(orbitPos, targetPos, diveP);
          sprite.scale.setScalar(0.35 - diveP * 0.1);
          mat.opacity = 0.8 + diveP * 0.2;

          // Trigger pulse on arrival
          if (diveP > 0.9 && diveP < 0.98) {
            const last = influenceRef.current.activePulses[influenceRef.current.activePulses.length - 1];
            if (!last || t - last.time > 0.2) {
              influenceRef.current.activePulses.push({ center: targetPos.clone(), color: new THREE.Color(src.color), time: t });
            }
          }

          if (diveP > 0.5) {
            for (const rid of src.targetRegions) nearRegions.set(rid, diveP);
          }
        }
      } else if (phase === "overload") {
        // Rapid orbit + repeated dives
        const rapidCycle = (progress * 3 + i * 0.4) % 1; // fast cycle
        if (rapidCycle < 0.6) {
          // Orbit fast
          child.position.copy(orbitPos);
          sprite.scale.setScalar(0.3 + Math.sin(t * 8 + i) * 0.05);
          mat.opacity = 0.7 + Math.sin(t * 12 + i * 2) * 0.2;
        } else {
          // Rapid dive
          const dP = ease((rapidCycle - 0.6) / 0.4);
          child.position.lerpVectors(orbitPos, targetPos, dP);
          sprite.scale.setScalar(0.25);
          mat.opacity = 1.0;

          // Trigger rapid pulses
          if (dP > 0.85) {
            const last = influenceRef.current.activePulses[influenceRef.current.activePulses.length - 1];
            if (!last || t - last.time > 0.15) {
              influenceRef.current.activePulses.push({ center: targetPos.clone(), color: new THREE.Color(src.color), time: t });
            }
          }
          for (const rid of src.targetRegions) nearRegions.set(rid, Math.max(nearRegions.get(rid) || 0, dP));
        }
      } else {
        // INSIGHT — freeze near target, dim non-spotlight icons
        const spotIdx = influenceRef.current.cycleIndex % INSIGHT_REGIONS.length;
        const isSpotlit = src.targetRegions.includes(INSIGHT_REGIONS[spotIdx]);
        child.position.copy(targetPos.clone().add(orbitPos.normalize().multiplyScalar(0.4)));
        sprite.scale.setScalar(isSpotlit ? 0.4 + Math.sin(t * 2) * 0.05 : 0.15);
        mat.opacity = isSpotlit ? 1.0 : 0.15;

        if (isSpotlit) {
          for (const rid of src.targetRegions) nearRegions.set(rid, 1.0);
        }
      }

      positions.push(child.position.clone());
    });

    const { cycleIndex } = getPhase(t);
    influenceRef.current.positions = positions;
    influenceRef.current.nearRegions = nearRegions;
    influenceRef.current.phase = phase;
    influenceRef.current.phaseProgress = progress;
    influenceRef.current.cycleIndex = cycleIndex;
  });

  return (
    <group ref={groupRef}>
      {INFLUENCE_SOURCES.map((src, i) => (
        <sprite key={src.id} scale={[0.01, 0.01, 1]}>
          <spriteMaterial map={textures[i]} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

/* ============================================
   INFLUENCE CONNECTIONS — lines from icons to brain
   ============================================ */
function InfluenceConnections({ regions, influenceRef }: { regions: BrainRegion[]; influenceRef: React.RefObject<InfluenceState> }) {
  const MAX_SEGMENTS = 36;
  const lineRef = useRef<THREE.LineSegments>(null);

  const regionMap = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    for (const r of regions) m.set(r.id, new THREE.Vector3(...r.position));
    return m;
  }, [regions]);

  // Pre-allocate buffer
  const { geometry, colorAttr } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(MAX_SEGMENTS * 2 * 3);
    const colArr = new Float32Array(MAX_SEGMENTS * 2 * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
    geo.setDrawRange(0, 0);
    return { geometry: geo, colorAttr: colArr };
  }, []);

  useFrame(() => {
    if (!lineRef.current || !influenceRef.current) return;
    const { positions, nearRegions } = influenceRef.current;
    if (!positions.length) return;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colAttrBuf = geometry.attributes.color as THREE.BufferAttribute;
    let segIdx = 0;

    for (let i = 0; i < INFLUENCE_SOURCES.length && segIdx < MAX_SEGMENTS; i++) {
      const src = INFLUENCE_SOURCES[i];
      const iconPos = positions[i];
      if (!iconPos) continue;
      const col = new THREE.Color(src.color);

      for (const targetId of src.targetRegions) {
        if (segIdx >= MAX_SEGMENTS) break;
        const regionPos = regionMap.get(targetId);
        if (!regionPos) continue;
        const proximity = nearRegions.get(targetId) || 0;
        if (proximity < 0.05) continue;

        const base = segIdx * 2 * 3;
        // Start point (icon)
        posAttr.array[base] = iconPos.x;
        posAttr.array[base + 1] = iconPos.y;
        posAttr.array[base + 2] = iconPos.z;
        // End point (region)
        posAttr.array[base + 3] = regionPos.x;
        posAttr.array[base + 4] = regionPos.y;
        posAttr.array[base + 5] = regionPos.z;
        // Colors with proximity fade
        const alpha = proximity * 0.6;
        colAttrBuf.array[base] = col.r * alpha;
        colAttrBuf.array[base + 1] = col.g * alpha;
        colAttrBuf.array[base + 2] = col.b * alpha;
        colAttrBuf.array[base + 3] = col.r * alpha * 0.3;
        colAttrBuf.array[base + 4] = col.g * alpha * 0.3;
        colAttrBuf.array[base + 5] = col.b * alpha * 0.3;

        segIdx++;
      }
    }

    geometry.setDrawRange(0, segIdx * 2);
    posAttr.needsUpdate = true;
    colAttrBuf.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
}

/* ============================================
   PARTICLES — ambient + floating dust
   ============================================ */
function Particles({ enhanced }: { enhanced?: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const count = enhanced ? 80 : 40;

  const { positions: posArr, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      const r = 1.6 + Math.random() * (enhanced ? 1.5 : 0.5);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);
      // Color variety
      const hue = Math.random();
      const c = new THREE.Color().setHSL(0.7 + hue * 0.2, 0.6, 0.5 + Math.random() * 0.3);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, [count, enhanced]);

  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.elapsedTime * 0.015;
    if (enhanced) {
      // Gentle float
      const posAttr = ref.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        const baseY = posArr[i * 3 + 1];
        (posAttr.array as Float32Array)[i * 3 + 1] = baseY + Math.sin(s.clock.elapsedTime * 0.5 + i * 0.3) * 0.03;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posArr, 3]} />
        {enhanced && <bufferAttribute attach="attributes-color" args={[colors, 3]} />}
      </bufferGeometry>
      <pointsMaterial
        color={enhanced ? undefined : "#8866ff"}
        vertexColors={enhanced}
        size={enhanced ? 0.012 : 0.008}
        transparent
        opacity={enhanced ? 0.2 : 0.12}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

/* ============================================
   SCAN PLANE — phase-synced sweep
   ============================================ */
function ScanPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const { name: phase, progress } = getPhase(state.clock.elapsedTime);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;

    if (phase === "influence") {
      meshRef.current.position.y = -2 + progress * 4;
      meshRef.current.visible = true;
      mat.opacity = Math.sin(progress * Math.PI) * 0.15;
    } else if (phase === "overload") {
      // Rapid multi-scan
      const rapidY = Math.sin(state.clock.elapsedTime * 6) * 2;
      meshRef.current.position.y = rapidY;
      meshRef.current.visible = true;
      mat.opacity = 0.08 + Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.1;
      mat.color.setHex(0xff4444); // red during overload
    } else {
      meshRef.current.visible = false;
      mat.color.setHex(0x4488ff); // reset to blue
    }
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
      <planeGeometry args={[5, 5]} />
      <meshBasicMaterial color="#4488ff" transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

/* ============================================
   ERROR BOUNDARY — catches WebGL/Three.js crashes
   ============================================ */
import React from "react";

class Brain3DErrorBoundary extends React.Component<
  { children: React.ReactNode; className?: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; className?: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className={this.props.className} style={{ contain: "layout style paint" }}>
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[280px] h-[220px] sm:w-[360px] sm:h-[280px]">
              <div className="absolute inset-0 rounded-full bg-[#2a6844]/40 blur-[60px] animate-pulse" />
              <div className="absolute top-[10%] left-[15%] w-[60%] h-[50%] rounded-full bg-[#cc8800]/25 blur-[50px] animate-pulse" />
              <div className="absolute bottom-[10%] right-[10%] w-[45%] h-[40%] rounded-full bg-[#ff6600]/20 blur-[40px] animate-pulse" />
              <div className="absolute top-[20%] right-[20%] w-[35%] h-[35%] rounded-full bg-[#7c6cf0]/15 blur-[35px] animate-pulse" />
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================
   MAIN COMPONENT
   ============================================ */
interface Brain3DProps {
  regions: BrainRegion[];
  className?: string;
  autoRotate?: boolean;
  showParticles?: boolean;
  showInfluence?: boolean;
  onStatusChange?: (msg: string) => void;
  onPhaseChange?: (phase: string, insightLabel: string | null) => void;
}

export default function Brain3D({ regions, className = "", autoRotate = true, showParticles = false, showInfluence = false, onStatusChange, onPhaseChange }: Brain3DProps) {
  const [isMobile, setIsMobile] = useState(false);
  const influenceRef = useRef<InfluenceState>({ positions: [], nearRegions: new Map(), activePulses: [], phase: "calm", phaseProgress: 0, cycleIndex: 0 });

  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
  }, []);

  return (
    <Brain3DErrorBoundary className={className}>
    <div className={className} style={{ contain: "layout style paint" }}>
      <Canvas
        camera={{ position: [0, 1.2, isMobile ? 4.5 : 3.5], fov: isMobile ? 48 : 38 }}
        dpr={[1, isMobile ? 1 : 1.5]}
        performance={{ min: isMobile ? 0.3 : 0.5 }}
        frameloop={isMobile ? "demand" : "always"}
        gl={{
          antialias: false,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          powerPreference: isMobile ? "low-power" : "default",
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false,
        }}
        style={{ background: "transparent", touchAction: "pan-y" }}
      >
        {isMobile ? (
          <MobileScene regions={regions} autoRotate={autoRotate} />
        ) : (
          <>
            <ambientLight intensity={0.2} />
            <directionalLight position={[3, 6, 4]} intensity={0.9} color="#ffffff" />
            <directionalLight position={[-3, 3, -2]} intensity={0.3} color="#8888ff" />
            <pointLight position={[0, 0, 0]} intensity={0.15} color="#7c6cf0" distance={4} />
            <BrainMesh regions={regions} autoRotate={autoRotate} isMobile={false} influenceRef={showInfluence ? influenceRef : undefined} />
            <NeuralPathways regions={regions} />
            <FlowingParticles regions={regions} />
            <RegionNodes regions={regions} influenceRef={showInfluence ? influenceRef : undefined} />
            {showInfluence && <InfluenceIcons regions={regions} influenceRef={influenceRef} />}
            {showInfluence && <InfluenceConnections regions={regions} influenceRef={influenceRef} />}
            {showInfluence && <ScanPlane />}
            {showInfluence && <StatusSync influenceRef={influenceRef} onStatusChange={onStatusChange} onPhaseChange={onPhaseChange} />}
            {showParticles && <Particles enhanced={showInfluence} />}
            <OrbitControls
              enableZoom
              enablePan={false}
              minDistance={2.5}
              maxDistance={7}
              enableDamping
              dampingFactor={0.15}
              rotateSpeed={0.8}
              zoomSpeed={0.6}
            />
          </>
        )}
      </Canvas>
    </div>
    </Brain3DErrorBoundary>
  );
}

/* Syncs 3D phase → React overlay text */
function StatusSync({ influenceRef, onStatusChange, onPhaseChange }: {
  influenceRef: React.RefObject<InfluenceState>;
  onStatusChange?: (msg: string) => void;
  onPhaseChange?: (phase: PhaseName, insightLabel: string | null) => void;
}) {
  const lastPhase = useRef<string>("");

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { name: phase, cycleIndex } = getPhase(t);

    if (phase !== lastPhase.current) {
      lastPhase.current = phase;

      if (onStatusChange) {
        const msgs: Record<PhaseName, string> = {
          calm: "Initializing neural scan...",
          influence: "Detecting incoming signals...",
          overload: "WARNING: Stimulus overload detected",
          insight: INSIGHT_LABELS[cycleIndex % INSIGHT_LABELS.length],
        };
        onStatusChange(msgs[phase]);
      }

      if (onPhaseChange) {
        const insightLabel = phase === "insight" ? INSIGHT_LABELS[cycleIndex % INSIGHT_LABELS.length] : null;
        onPhaseChange(phase, insightLabel);
      }
    }
  });

  return null;
}

/* Mobile scene — absolute bare minimum, manually invalidates at ~24fps */
function MobileScene({ regions, autoRotate }: { regions: BrainRegion[]; autoRotate: boolean }) {
  const { invalidate } = useThree();

  // Tick at ~24fps instead of 60fps
  useEffect(() => {
    let id: number;
    const tick = () => {
      invalidate();
      id = setTimeout(tick, 42) as unknown as number; // ~24fps
    };
    tick();
    return () => clearTimeout(id);
  }, [invalidate]);

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 6, 4]} intensity={0.9} color="#ffffff" />
      <BrainMesh regions={regions} autoRotate={autoRotate} isMobile />
      <OrbitControls
        enableZoom
        enablePan={false}
        minDistance={3}
        maxDistance={6}
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        onChange={() => invalidate()}
      />
    </>
  );
}

/* ============================================
   HERO BRAIN
   ============================================ */
export function HeroBrain({ onStatusChange, onPhaseChange }: { onStatusChange?: (msg: string) => void; onPhaseChange?: (phase: string, insightLabel: string | null) => void } = {}) {
  const regions: BrainRegion[] = [
    { name: "Decision Making", id: "pfc", role: "Helps viewers decide to take action", position: [0, 0.2, 0.9], activation: 0.85, color: "#ffbb00" },
    { name: "Emotions", id: "amygdala", role: "Creates excitement and urgency", position: [0.4, -0.2, 0.3], activation: 0.82, color: "#ff8800" },
    { name: "Memory", id: "hippocampus", role: "Makes content stick in mind", position: [0.5, -0.3, 0], activation: 0.78, color: "#ffaa00" },
    { name: "Visual Appeal", id: "visual", role: "Eye-catching visual processing", position: [0, -0.5, -1.2], activation: 0.72, color: "#88cc00" },
    { name: "Sound Quality", id: "auditory", role: "Audio and voice processing", position: [1.2, 0, 0], activation: 0.65, color: "#44aa66" },
    { name: "Word Power", id: "broca", role: "Language and speech production", position: [-0.8, 0.5, 0.8], activation: 0.70, color: "#ddaa00" },
    { name: "Clarity", id: "wernicke", role: "Message comprehension", position: [-1.1, 0.2, -0.2], activation: 0.68, color: "#66cc44" },
    { name: "Desire", id: "nac", role: "Want and reward processing", position: [0, 0.1, 0.6], activation: 0.80, color: "#ffcc00" },
    { name: "Trust", id: "insula", role: "Credibility and authenticity", position: [0.8, 0.2, 0.2], activation: 0.75, color: "#ff6600" },
    { name: "Attention", id: "acc", role: "Focus and vigilance", position: [0, 0.6, 0.5], activation: 0.88, color: "#ff4500" },
    { name: "Urge to Act", id: "motor", role: "Action and response drive", position: [0, 1.0, 0.3], activation: 0.73, color: "#ddcc00" },
    { name: "Storytelling", id: "temporal", role: "Narrative understanding", position: [1.0, -0.3, 0.8], activation: 0.69, color: "#44aa88" },
  ];

  return <Brain3D regions={regions} className="w-full h-[380px] sm:h-[420px] md:h-[550px]" autoRotate showParticles showInfluence onStatusChange={onStatusChange} onPhaseChange={onPhaseChange} />;
}

useGLTF.preload("/models/brain-optimized.glb");
