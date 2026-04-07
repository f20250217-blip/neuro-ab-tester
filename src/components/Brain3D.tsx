"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Float, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { BrainRegion } from "@/lib/neuro-engine";

/* ============================================
   Custom brain shader — translucent with glow,
   matching the reference image style
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

  void main() {
    vec3 viewDir = normalize(uCamPos - vWorldPos);

    // Multiple light sources
    vec3 light1 = normalize(vec3(0.5, 1.0, 0.5));
    vec3 light2 = normalize(vec3(-0.3, 0.5, -0.5));
    vec3 light3 = normalize(vec3(0.0, -0.3, 1.0));

    // Diffuse
    float d1 = max(dot(vNormal, light1), 0.0);
    float d2 = max(dot(vNormal, light2), 0.0) * 0.4;
    float d3 = max(dot(vNormal, light3), 0.0) * 0.2;
    float diffuse = d1 + d2 + d3;

    // Strong AO for deep sulci shadows
    float upDot = dot(vNormal, vec3(0.0, 1.0, 0.0));
    float ao = 0.4 + 0.6 * max(upDot, 0.0);
    ao = pow(ao, 0.7);

    // Specular highlights on gyri ridges
    vec3 halfDir = normalize(light1 + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 50.0) * 0.35;

    // Fresnel rim glow - purple/blue like reference
    float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
    fresnel = pow(fresnel, 2.5);
    vec3 rimColor = mix(vec3(0.2, 0.1, 0.5), vec3(0.4, 0.2, 0.8), fresnel);

    // Subsurface scattering - warm glow through brain tissue
    float sss = pow(max(dot(-vNormal, light1), 0.0), 1.5) * 0.12;
    vec3 sssColor = vec3(0.8, 0.4, 0.2) * sss;

    // Combine
    vec3 col = vColor * (0.3 + diffuse * 0.7) * ao;
    col += spec * vec3(1.0, 0.95, 0.9);
    col += rimColor * fresnel * 0.3;
    col += sssColor;

    // Neural activity pulse - subtle travelling wave
    float wave = sin(uTime * 2.0 + vPos.x * 3.0 + vPos.z * 2.0) * 0.015;
    col += wave * vColor;

    gl_FragColor = vec4(col, 0.95);
  }
`;

/* ============================================
   BRAIN MESH — real MRI-derived model
   ============================================ */
function BrainMesh({ regions, autoRotate }: { regions: BrainRegion[]; autoRotate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { scene } = useGLTF("/models/brain.glb");
  const { pointer } = useThree();

  const geometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !geo) {
        geo = (child as THREE.Mesh).geometry.clone();
      }
    });
    if (!geo) geo = new THREE.SphereGeometry(1.3, 64, 48);

    // Center
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox!.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);

    // Scale to ~3 units
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox!.getSize(size);
    const s = 3.0 / Math.max(size.x, size.y, size.z);
    geo.scale(s, s, s);

    geo.computeVertexNormals();
    return geo;
  }, [scene]);

  // Heatmap vertex colors
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

      // Base: teal/green gradient
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
  }), []);

  useFrame((state) => {
    if (groupRef.current) {
      if (autoRotate) groupRef.current.rotation.y += 0.002;
      // Subtle mouse-reactive tilt
      const targetX = pointer.y * 0.06;
      const targetZ = -pointer.x * 0.06;
      groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * 0.03;
      groupRef.current.rotation.z += (targetZ - groupRef.current.rotation.z) * 0.03;
    }
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      matRef.current.uniforms.uCamPos.value.copy(state.camera.position);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main brain */}
      <mesh geometry={coloredGeo}>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertShader}
          fragmentShader={fragShader}
          uniforms={uniforms}
          transparent
        />
      </mesh>

      {/* Subtle outer glow */}
      <mesh geometry={coloredGeo} scale={1.01}>
        <meshBasicMaterial color="#4422aa" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

/* ============================================
   NEURAL PATHWAYS — animated connections
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
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 20, 0.006 + strength * 0.008, 5, false), [curve, strength]);

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
   FLOWING PARTICLES along pathways
   ============================================ */
function FlowingParticles({ regions }: { regions: BrainRegion[] }) {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 40;

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
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.7} />
    </instancedMesh>
  );
}

/* ============================================
   REGION NODES — interactive glowing spheres
   ============================================ */
function RegionNodes({ regions, onHover, interactive }: {
  regions: BrainRegion[];
  onHover?: (region: BrainRegion | null) => void;
  interactive?: boolean;
}) {
  return (
    <group>
      {regions.map((region) => (
        <RegionNode key={region.id} region={region} onHover={onHover} interactive={interactive} />
      ))}
    </group>
  );
}

function RegionNode({ region, onHover, interactive }: {
  region: BrainRegion;
  onHover?: (region: BrainRegion | null) => void;
  interactive?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const baseScale = 0.035 + region.activation * 0.045;

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3 + region.activation * 10) * 0.12 * region.activation;
      const targetScale = hovered ? baseScale * 1.6 : baseScale * pulse;
      const cur = meshRef.current.scale.x;
      const next = cur + (targetScale - cur) * 0.1;
      meshRef.current.scale.setScalar(next);
    }
  });

  const handleOver = useCallback(() => {
    if (!interactive) return;
    setHovered(true);
    onHover?.(region);
    document.body.style.cursor = "pointer";
  }, [interactive, onHover, region]);

  const handleOut = useCallback(() => {
    if (!interactive) return;
    setHovered(false);
    onHover?.(null);
    document.body.style.cursor = "auto";
  }, [interactive, onHover]);

  return (
    <mesh ref={meshRef} position={region.position} onPointerOver={handleOver} onPointerOut={handleOut}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshBasicMaterial color={region.color} transparent opacity={hovered ? 0.85 : 0.3 + region.activation * 0.35} />
    </mesh>
  );
}

/* ============================================
   REGION TOOLTIP
   ============================================ */
function RegionTooltip({ region }: { region: BrainRegion | null }) {
  if (!region) return null;
  return (
    <Html position={[region.position[0], region.position[1] + 0.2, region.position[2]]} center style={{ pointerEvents: "none" }}>
      <div className="bg-[#0c0c14]/95 backdrop-blur-xl border border-[#2d2d50] rounded-xl px-4 py-2.5 shadow-2xl whitespace-nowrap"
        style={{ boxShadow: `0 0 20px ${region.color}33, 0 8px 32px rgba(0,0,0,0.5)` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: region.color, boxShadow: `0 0 8px ${region.color}` }} />
          <span className="text-xs font-bold text-[#f0f0f8]">{region.name}</span>
        </div>
        <p className="text-[10px] text-[#7a7a98] mt-1">{region.role}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1 bg-[#1e1e30] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${region.activation * 100}%`, backgroundColor: region.color }} />
          </div>
          <span className="text-[10px] font-bold font-mono" style={{ color: region.color }}>{(region.activation * 100).toFixed(0)}%</span>
        </div>
      </div>
    </Html>
  );
}

/* ============================================
   PARTICLES
   ============================================ */
function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      const r = 1.8 + Math.random() * 0.5;
      arr[i * 3] = r * Math.sin(p) * Math.cos(t);
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      arr[i * 3 + 2] = r * Math.cos(p);
    }
    return arr;
  }, []);

  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8866ff" size={0.008} transparent opacity={0.12} sizeAttenuation />
    </points>
  );
}

/* ============================================
   MAIN COMPONENT
   ============================================ */
interface Brain3DProps {
  regions: BrainRegion[];
  className?: string;
  autoRotate?: boolean;
  showParticles?: boolean;
  interactive?: boolean;
}

export default function Brain3D({ regions, className = "", autoRotate = true, showParticles = false, interactive = false }: Brain3DProps) {
  const [hoveredRegion, setHoveredRegion] = useState<BrainRegion | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile once on mount
  useMemo(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    }
  }, []);

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.2, isMobile ? 4.5 : 3.5], fov: isMobile ? 48 : 38 }}
        dpr={isMobile ? [1, 1] : [1, 1.5]}
        performance={{ min: isMobile ? 0.3 : 0.5 }}
        gl={{ antialias: !isMobile, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, powerPreference: isMobile ? "low-power" : "high-performance" }}
        style={{ background: "transparent", touchAction: "pan-y" }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 6, 4]} intensity={0.9} color="#ffffff" />
        {!isMobile && <directionalLight position={[-3, 3, -2]} intensity={0.3} color="#8888ff" />}

        <Float speed={0.5} rotationIntensity={0.02} floatIntensity={0.06}>
          <BrainMesh regions={regions} autoRotate={autoRotate} />
          {!isMobile && <NeuralPathways regions={regions} />}
          {!isMobile && <FlowingParticles regions={regions} />}
          <RegionNodes regions={regions} onHover={setHoveredRegion} interactive={interactive && !isMobile} />
          {hoveredRegion && !isMobile && <RegionTooltip region={hoveredRegion} />}
        </Float>

        {showParticles && <Particles />}
        <OrbitControls
          enableZoom={!isMobile}
          enablePan={false}
          minDistance={3}
          maxDistance={6}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={isMobile ? 0.5 : 0.8}
          zoomSpeed={0.5}
          touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        />
      </Canvas>
    </div>
  );
}

/* ============================================
   HERO BRAIN
   ============================================ */
export function HeroBrain() {
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

  return <Brain3D regions={regions} className="w-full h-[380px] sm:h-[420px] md:h-[550px]" autoRotate showParticles interactive />;
}

useGLTF.preload("/models/brain.glb");
