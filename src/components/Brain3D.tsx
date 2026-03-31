"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, useGLTF } from "@react-three/drei";
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
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += 0.002;
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
   PARTICLES
   ============================================ */
function Particles() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i++) {
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
}

export default function Brain3D({ regions, className = "", autoRotate = true, showParticles = false }: Brain3DProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.5, 3.5], fov: 38 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 6, 4]} intensity={0.9} color="#ffffff" />
        <directionalLight position={[-3, 3, -2]} intensity={0.3} color="#8888ff" />

        <Float speed={0.5} rotationIntensity={0.02} floatIntensity={0.06}>
          <BrainMesh regions={regions} autoRotate={autoRotate} />
        </Float>

        {showParticles && <Particles />}
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={3}
          maxDistance={6}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.8}
          zoomSpeed={0.5}
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
    { name: "L-Frontal", id: "lf", role: "", position: [-0.4, 0.3, 0.7], activation: 0.85, color: "#ffaa00" },
    { name: "R-Frontal", id: "rf", role: "", position: [0.4, 0.3, 0.7], activation: 0.80, color: "#ffcc00" },
    { name: "L-Parietal", id: "lp", role: "", position: [-0.5, 0.5, 0.0], activation: 0.82, color: "#ff8800" },
    { name: "R-Parietal", id: "rp", role: "", position: [0.5, 0.5, 0.0], activation: 0.72, color: "#ddcc00" },
    { name: "L-Motor", id: "lm", role: "", position: [-0.3, 0.6, 0.2], activation: 0.88, color: "#ff6600" },
    { name: "R-Motor", id: "rm", role: "", position: [0.3, 0.6, 0.2], activation: 0.75, color: "#ffaa00" },
    { name: "L-Temporal", id: "lt", role: "", position: [-0.8, -0.1, 0.2], activation: 0.62, color: "#88cc00" },
    { name: "R-Temporal", id: "rt", role: "", position: [0.8, -0.1, 0.2], activation: 0.52, color: "#44aa66" },
    { name: "L-Occipital", id: "ol", role: "", position: [-0.3, 0.2, -0.8], activation: 0.58, color: "#66cc44" },
    { name: "R-Occipital", id: "or2", role: "", position: [0.3, 0.2, -0.8], activation: 0.48, color: "#44aa88" },
    { name: "Prefrontal", id: "pfc", role: "", position: [0, 0.2, 0.9], activation: 0.82, color: "#ffbb00" },
    { name: "Central", id: "cen", role: "", position: [0, 0.6, 0.1], activation: 0.68, color: "#ddaa00" },
  ];

  return <Brain3D regions={regions} className="w-full h-[420px]" autoRotate showParticles />;
}

useGLTF.preload("/models/brain.glb");
