import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Float, 
  Text, 
  Html, 
  MeshDistortMaterial, 
  Sphere, 
  Cylinder,
  Torus,
  Line,
  Trail,
  ContactShadows,
  Environment,
  Box,
  Cone,
  Plane,
  useCursor
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HelpCircle,
  Zap, 
  Target, 
  Settings2, 
  Info, 
  Activity,
  Signal,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Minimize2,
  MousePointer2,
  Cpu,
  Radio,
  Layers,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  Play,
  Rotate3d,
  Search,
  Move,
  Pause,
  Shield,
  Grid3X3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// --- Constants ---
const CELL_RADIUS = 12;
const SQRT3 = Math.sqrt(3);

const VALID_N = [1, 3, 4, 7, 9, 12, 13, 16, 19, 21, 25, 27, 28, 31];

// --- Types ---
interface CellData {
  id: string;
  q: number;
  r: number;
  f: number; // Frequency group
  clusterId: string;
  users: number;
}

// --- Math Helpers ---
const axialToPixel = (q: number, r: number, radius: number) => {
  const x = radius * (3/2 * q);
  const y = radius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return { x, y };
};

/**
 * Generates a high-contrast, bold, and unique color for a frequency index.
 */
const getFrequencyColor = (f: number, NTotal: number) => {
  if (NTotal === 1) return '#3b82f6';
  if (NTotal === 3) {
    return ['#ef4444', '#3b82f6', '#22c55e'][f % 3];
  }
  if (NTotal === 4) {
    return ['#f43f5e', '#0ea5e9', '#10b981', '#f59e0b'][f % 4];
  }
  if (NTotal === 7) {
    return ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][f % 7];
  }
  
  const hue = (f * 137.508) % 360;
  const saturation = 85;
  const lightnessTiers = [45, 60, 75];
  const lightness = lightnessTiers[f % 3];
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Determines contrast color based on frequency index lightness.
 */
const getContrastColor = (f: number, NTotal: number) => {
  if (NTotal <= 7) return '#ffffff';
  const lightnessTiers = [45, 60, 75];
  const lightness = lightnessTiers[f % 3];
  return lightness > 65 ? '#1e293b' : '#ffffff';
};

// Deterministic, order-independent coset mapping to keep frequencies aligned across the entire application
const cosetMaps: Record<string, Record<string, number>> = {};

const getCosetIndex = (q: number, r: number, i: number, j: number, N: number): number => {
  const q_p = (i + j) * q + j * r;
  const r_p = -j * q + i * r;
  
  const q_res = ((q_p % N) + N) % N;
  const r_res = ((r_p % N) + N) % N;
  
  // Generate and sort all possible coset representatives deterministically
  const key = `${N}-${i}-${j}`;
  if (!cosetMaps[key]) {
    const pairs: { qr: string, q_res: number, r_res: number }[] = [];
    const seen = new Set<string>();
    
    // Evaluating a neighborhood around (0,0) of radius N is guaranteed to find all N unique residues for any valid N
    for (let lq = -N; lq <= N; lq++) {
      for (let lr = -N; lr <= N; lr++) {
        const lp_q = (i + j) * lq + j * lr;
        const lp_r = -j * lq + i * lr;
        const lq_res = ((lp_q % N) + N) % N;
        const lr_res = ((lp_r % N) + N) % N;
        const resKey = `${lq_res},${lr_res}`;
        if (!seen.has(resKey)) {
          seen.add(resKey);
          pairs.push({ qr: resKey, q_res: lq_res, r_res: lr_res });
        }
        if (pairs.length === N) break;
      }
      if (pairs.length === N) break;
    }
    
    // Sort residues deterministically (by q_res rising, then r_res rising)
    pairs.sort((a, b) => a.q_res !== b.q_res ? a.q_res - b.q_res : a.r_res - b.r_res);
    
    const map: Record<string, number> = {};
    pairs.forEach((p, idx) => {
      map[p.qr] = idx;
    });
    cosetMaps[key] = map;
  }
  
  return cosetMaps[key][`${q_res},${r_res}`] ?? 0;
};

interface ClusterCenter {
  cq: number;
  cr: number;
}

const getHexClusterCenter = (q: number, r: number, i: number, j: number, N: number): ClusterCenter => {
  const m_f = ((i + j) * q + j * r) / N;
  const n_f = (-j * q + i * r) / N;
  const s_f = -m_f - n_f;

  let cq = Math.round(m_f);
  let cr = Math.round(n_f);
  let cs = Math.round(s_f);

  const dq = Math.abs(cq - m_f);
  const dr = Math.abs(cr - n_f);
  const ds = Math.abs(cs - s_f);

  if (dq > dr && dq > ds) cq = -cr - cs;
  else if (dr > ds) cr = -cq - cs;

  return { cq, cr };
};

const isValidN = (n: number): { i: number; j: number } | null => {
  if (n <= 0) return null;
  const limit = Math.ceil(Math.sqrt(n));
  for (let i = 0; i <= limit; i++) {
    for (let j = 0; j <= i; j++) {
      if (i * i + i * j + j * j === n) return { i, j };
    }
  }
  return null;
};
const calculatePower = (distance: number, n: number): number => {
  const d = Math.max(distance, 0.5);
  return 1000 / Math.pow(d, n);
};

const wattsToDbm = (watts: number): number => {
  if (watts <= 0) return -120;
  return 10 * Math.log10(watts);
};

interface Point {
  x: number;
  y: number;
}

// --- 3D Components ---

const Tower = ({ position, isServing, id, f, txPower, onClick, onGroundClick, N }: { position: [number, number, number], isServing: boolean, id: string, f: number, txPower: number, onClick?: () => void, onGroundClick?: (point: THREE.Vector3) => void, N: number }) => {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const clusterColor = getFrequencyColor(f, N);
  const color = isServing ? "#10b981" : clusterColor;
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 2) * 0.1);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = (isServing ? 0.4 : 0.1) + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    }
  });

  return (
    <group 
      position={position} 
      onClick={(e) => { 
        e.stopPropagation(); 
        onClick?.(); 
      }} 
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
    >
      {/* Black Base Station Tower - Mechanical Style */}
      <group position={[0, 0, 0]}>
        {/* Foundation */}
        <Cylinder args={[0.8, 1, 0.5, 6]} position={[0, 0.25, 0]}>
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </Cylinder>
        
        {/* Main Pillar */}
        <Cylinder args={[0.15, 0.4, 8, 4]} position={[0, 4, 0]} rotation={[0, Math.PI/4, 0]}>
          <meshStandardMaterial color="#0f172a" metalness={1} roughness={0.1} />
        </Cylinder>

        {/* Support Struts */}
        {[0, 120, 240].map((angle) => (
          <group key={angle} rotation={[0, angle * Math.PI / 180, 0]}>
             <Box args={[0.1, 8.5, 0.1]} position={[0.3, 4, 0]} rotation={[0, 0, 0.04]}>
                <meshStandardMaterial color="#1e293b" />
             </Box>
          </group>
        ))}
        
        {/* Antennas - Bold Panels */}
        <group position={[0, 7.8, 0]}>
          {[0, 120, 240].map((angle) => (
            <Box key={angle} args={[0.4, 1.8, 0.2]} position={[0.6 * Math.cos(angle * Math.PI / 180), 0, 0.6 * Math.sin(angle * Math.PI / 180)]} rotation={[0, -angle * Math.PI / 180, 0]}>
              <meshStandardMaterial 
                color={isServing ? "#10b981" : "#1e293b"} 
                emissive={isServing ? "#10b981" : "#000"} 
                emissiveIntensity={isServing ? 3 : 0} 
              />
            </Box>
          ))}
        </group>
      </group>

      {/* Glow Effect */}
      <Sphere ref={glowRef} args={[2.8, 16, 16]} position={[0, 7.8, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </Sphere>

      {/* Label */}
      <Html position={[0, 10.5, 0]} center distanceFactor={20} occlude>
        <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-tighter border whitespace-nowrap backdrop-blur-md transition-all ${
          hovered ? 'scale-110 shadow-xl' : 'scale-100'
        } ${
          isServing ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-white/80 border-slate-200 text-slate-800'
        }`}>
          {id} ({f + 1})
        </div>
      </Html>

      {isServing && (
        <SignalWaves 
          color="#10b981" 
          position={[0, 7.8, 0]} 
          intensity={Math.max(0.3, (txPower - 30) / 20)} 
        />
      )}
    </group>
  );
};

const InterferenceOverlay = ({ q, r, radius, color, visible }: { q: number, r: number, radius: number, color: string, visible: boolean }) => {
  const { x, y } = axialToPixel(q, r, radius);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current && visible) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 3) * 0.05);
      (meshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(clock.getElapsedTime() * 3) * 0.1;
    }
  });

  if (!visible) return null;

  return (
    <group position={[x, 0.5, y]}>
      <Cylinder ref={meshRef} args={[radius * 1.5, radius * 1.5, 0.1, 32]} rotation={[0, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </Cylinder>
    </group>
  );
};

const SignalWaves = ({ color, position, intensity = 1 }: { color: string, position: [number, number, number], intensity?: number }) => {
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <Wave key={i} delay={i * 1.5} color={color} intensity={intensity} />
      ))}
    </group>
  );
};

const Wave = ({ delay, color, intensity }: { delay: number, color: string, intensity: number }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = (clock.getElapsedTime() + delay) % 4.5;
      ref.current.scale.setScalar(t * 3);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.2 * intensity * (1 - t / 4.5));
    }
  });

  return (
    <Torus ref={ref} args={[1, 0.05, 8, 32]} rotation={[Math.PI / 2, 0, 0]}>
      <meshBasicMaterial color={color} transparent opacity={0.3} />
    </Torus>
  );
};

// --- Draggable Mobile Station ---
const MobileStation = ({ 
  position, 
  rotation = 0, 
  sirStatus, 
  isServing, 
  onDrag, 
  handoffActive 
}: { 
  position: THREE.Vector3, 
  rotation: number, 
  sirStatus: any, 
  isServing: boolean,
  onDrag: (pos: THREE.Vector3) => void,
  handoffActive: boolean
}) => {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { size, raycaster, camera } = useThree();
  useCursor(hovered || dragging);

  const dragPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: any) => {
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (dragging) {
      const intersection = new THREE.Vector3();
      if (e.raycaster.ray.intersectPlane(dragPlane, intersection)) {
        onDrag(intersection);
      }
    }
  };

  return (
    <group 
      position={position} 
      rotation={[0, rotation, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
    >
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <group scale={[0.5, 0.5, 0.5]}>
          <Box args={[1.2, 2.2, 0.3]} position={[0, 1.1, 0]}>
            <meshStandardMaterial color="#000" metalness={1} roughness={0} />
          </Box>
          <Box args={[1.1, 2.1, 0.1]} position={[0, 1.1, 0.15]}>
            <meshStandardMaterial color={sirStatus.hex} emissive={sirStatus.hex} emissiveIntensity={2} />
          </Box>
          
          <Torus args={[2.5, 0.3, 16, 48]} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
            <meshStandardMaterial 
              color={dragging ? "#3b82f6" : sirStatus.hex} 
              opacity={0.8} 
              transparent 
              emissive={dragging ? "#3b82f6" : sirStatus.hex}
              emissiveIntensity={dragging ? 2 : 1}
            />
          </Torus>
        </group>

        <Sphere args={[0.4, 16, 16]} position={[0, 2, 0]}>
          <meshStandardMaterial color={sirStatus.hex} emissive={sirStatus.hex} emissiveIntensity={10} />
        </Sphere>
      </Float>

      <Html position={[0, 5, 0]} center>
         <div className="flex flex-col items-center gap-2 pointer-events-none">
            <AnimatePresence>
               {handoffActive && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="px-4 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.5)] uppercase tracking-widest border-2 border-white/20"
                  >
                    Handover In Progress
                  </motion.div>
               )}
            </AnimatePresence>

            <motion.div 
              className={`px-3 py-1.5 rounded-full text-[10px] font-black border-2 backdrop-blur-2xl shadow-xl flex flex-col items-center gap-0.5 ${sirStatus.bg} ${sirStatus.color} border-current`}
              animate={{ scale: dragging ? 1.2 : 1, y: dragging ? -5 : 0 }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: sirStatus.hex }} />
                <span>{sirStatus.value.toFixed(1)} dB</span>
              </div>
            </motion.div>
         </div>
      </Html>
    </group>
  );
};

const Environment3D = React.memo(({ onGroundClick }: { onGroundClick?: (point: THREE.Vector3) => void }) => {
  const objects = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const x = (Math.random() - 0.5) * 400;
      const z = (Math.random() - 0.5) * 400;
      if (Math.abs(x) < 30 && Math.abs(z) < 30) return null;
      
      const isBuilding = Math.random() > 0.6;
      const height = 5 + Math.random() * 20;
      return { id: i, x, z, isBuilding, height, color: isBuilding ? "#cbd5e1" : "#14532d" };
    }).filter(Boolean);
  }, []);

  return (
    <group>
      <Plane 
        args={[2000, 2000]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.1, 0]} 
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onGroundClick?.(e.point);
        }}
      >
        <meshStandardMaterial color="#ffffff" metalness={0.05} roughness={0.95} />
      </Plane>

      {/* Grid Lines for 3D depth */}
      <gridHelper args={[2000, 100, '#f1f5f9', '#f8fafc']} position={[0, 0.01, 0]} />

      {objects.map((obj: any) => (
        obj.isBuilding ? (
          <Box key={obj.id} args={[6, obj.height, 6]} position={[obj.x, obj.height/2, obj.z]} castShadow receiveShadow>
            <meshStandardMaterial color={obj.color} metalness={0.2} roughness={0.8} />
          </Box>
        ) : (
          <group key={obj.id} position={[obj.x, 0, obj.z]}>
            <Cylinder args={[0.3, 0.4, 2.5]} position={[0, 1.25, 0]}>
              <meshStandardMaterial color="#451a03" />
            </Cylinder>
            <Cone args={[2, 4, 8]} position={[0, 4, 0]}>
              <meshStandardMaterial color={obj.color} />
            </Cone>
          </group>
        )
      ))}
    </group>
  );
});

const SignalPulse = ({ from, to, color }: { from: THREE.Vector3, to: THREE.Vector3, color: string }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = (clock.getElapsedTime() * 0.5) % 1;
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      mid.y += 8;
      
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const pos = curve.getPoint(t);
      ref.current.position.copy(pos);
    }
  });
  return (
    <Sphere ref={ref} args={[0.5, 16, 16]}>
      <meshBasicMaterial color="#fff" transparent opacity={0.8} />
    </Sphere>
  );
};

const ConnectionBeam = ({ from, to, color }: { from: THREE.Vector3, to: THREE.Vector3, color: string }) => {
  const points = useMemo(() => {
    // Direct path for "Arrow" feel
    return [from, to];
  }, [from, to]);

  const dir = useMemo(() => new THREE.Vector3().subVectors(from, to).normalize(), [from, to]);
  const dist = from.distanceTo(to);

  return (
    <group>
      {/* Dynamic Arrow Beam */}
      <Line points={[[from.x, from.y, from.z], [to.x, to.y, to.z]] as any} color={color} lineWidth={25} transparent opacity={0.6} />
      <Line points={[[from.x, from.y, from.z], [to.x, to.y, to.z]] as any} color="white" lineWidth={8} transparent opacity={0.9} />
      
      {/* Arrow Head at MS (pointing from BS to MS) */}
      <group position={[from.x, from.y, from.z]} rotation={[0, Math.atan2(from.x - to.x, from.z - to.z), 0]}>
         <Cone args={[4, 8, 4]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
            <meshBasicMaterial color={color} />
         </Cone>
      </group>

      {/* Moving Signal Pulse from BS to MS */}
      <SignalPulse from={to} to={from} color={color} />
      
      {/* Impact/Coverage Ripple at MS */}
      <SignalImpact position={from} color={color} />
    </group>
  );
};

const MovementPath = ({ history, color }: { history: { pos: THREE.Vector3 }[], color: string }) => {
  if (history.length < 2) return null;
  return (
    <group>
      {history.map((point, i) => {
        if (i === 0) return null;
        const prev = history[i - 1].pos;
        const curr = point.pos;
        
        // Don't draw if same position
        if (prev.distanceTo(curr) < 1) return null;
        
        return (
          <group key={i}>
            {/* Trail Line */}
            <Line 
              points={[[prev.x, 1, prev.z], [curr.x, 1, curr.z]] as any} 
              color={color} 
              lineWidth={20} 
              opacity={0.6} 
              transparent 
              dashed
              dashScale={1}
              dashSize={2}
            />
            {/* Arrowhead at the end of each segment */}
            <group position={[curr.x, 1, curr.z]} rotation={[0, Math.atan2(curr.x - prev.x, curr.z - prev.z), 0]}>
               <Cone args={[2.5, 6, 16]} rotation={[Math.PI / 2, 0, 0]}>
                  <meshBasicMaterial color={color} transparent opacity={0.8} />
               </Cone>
            </group>
          </group>
        );
      })}
    </group>
  );
};

const SignalImpact = ({ position, color }: { position: THREE.Vector3, color: string }) => {
  const ref1 = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref1.current) {
      const s = 1 + (t % 2) * 4;
      ref1.current.scale.set(s, 0.1, s);
      (ref1.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - (t % 2) / 2);
    }
    if (ref2.current) {
      const s = 1 + ((t + 1) % 2) * 4;
      ref2.current.scale.set(s, 0.1, s);
      (ref2.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - ((t + 1) % 2) / 2);
    }
  });

  return (
    <group position={[position.x, 0.5, position.z]}>
      <Cylinder ref={ref1} args={[1, 1, 0.2, 32]}>
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </Cylinder>
      <Cylinder ref={ref2} args={[1, 1, 0.2, 32]}>
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </Cylinder>
    </group>
  );
};

const HandoverArrow = ({ from, to, active, color = "#3b82f6" }: { from: THREE.Vector3, to: THREE.Vector3, active: boolean, color?: string }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      if (active) {
        meshRef.current.position.y = 1.5 + Math.sin(t * 5) * 0.3;
      }
    }
  });

  const dir = new THREE.Vector3().subVectors(to, from).normalize();
  const dist = from.distanceTo(to);
  const length = dist * 0.5;
  const centerPos = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

  return (
    <group position={[centerPos.x, active ? 1.5 : 0.5, centerPos.z]} rotation={[0, Math.atan2(dir.x, dir.z), 0]} ref={meshRef}>
      <Box args={[0.5, 0.1, length]}>
        <meshStandardMaterial 
          color={color} 
          transparent={!active}
          opacity={active ? 1 : 0.1} 
          emissive={color}
          emissiveIntensity={active ? 3 : 0}
        />
      </Box>
      <Cone args={[1.2, 3, 16]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, length / 2 + 1.5]}>
        <meshStandardMaterial 
          color={color} 
          transparent={!active}
          opacity={active ? 1 : 0.1}
          emissive={color}
          emissiveIntensity={active ? 3 : 0}
        />
      </Cone>
      {active && (
        <SignalPulse from={from} to={to} color={color} />
      )}
    </group>
  );
};

const HexCell3D = ({ q, r, radius, color, opacity, onClick, isSelected, clusterId, f, showClusters, isServing, isInterferer, zoomFactor, onGroundClick, N, msPos }: { 
  q: number, r: number, radius: number, color: string, opacity: number, onClick: () => void, isSelected: boolean, clusterId: string, f: number, showClusters: boolean, isServing: boolean, isInterferer: boolean, zoomFactor: number, onGroundClick?: (point: THREE.Vector3) => void, N: number, msPos: THREE.Vector3
}) => {
  const { x, y } = axialToPixel(q, r, radius);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  // SIR visualization logic for serving cell
  const dist = Math.sqrt((x - msPos.x) ** 2 + (y - msPos.z) ** 2);
  const normDist = Math.max(0, Math.min(1, dist / (radius * 1.1)));
  
  // Color mapping for signal quality
  const getSimulatedSirColor = (d: number) => {
    if (d < 0.4) return "#10b981"; // Green (Excellent)
    if (d < 0.75) return "#f59e0b"; // Yellow/Amber (Good)
    return "#ef4444"; // Red (Poor)
  };

  const sirColor = isServing ? getSimulatedSirColor(normDist) : color;
  const clusterColor = showClusters ? getFrequencyColor(f, N) : sirColor;

  // Visual logic for boundaries
  const inMarginZone = isServing && normDist > 0.75;
  const borderColor = isServing ? getSimulatedSirColor(normDist) : "#000000"; 
  const borderWidth = isServing ? 32 : 18;
  const depth = isServing ? 5 : 2;

  useFrame(({ clock }) => {
    if (inMarginZone && boundaryRef.current) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 10) * 0.2;
      boundaryRef.current.scale.set(pulse, 1, pulse);
    } else if (boundaryRef.current) {
      boundaryRef.current.scale.set(1, 1, 1);
    }
  });

  const boundaryRef = useRef<THREE.Group>(null);

  return (
    <group 
      position={[x, 0, y]} 
      onClick={(e) => { 
        e.stopPropagation(); 
        onClick(); 
      }} 
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
    >
      {/* 3D Cell Base with depth */}
      <Cylinder args={[radius * 0.99, radius, depth, 6]} position={[0, depth/2, 0]}>
        <meshStandardMaterial 
          color={isSelected ? "#3b82f6" : (hovered ? "#cbd5e1" : clusterColor)} 
          transparent={!isServing}
          opacity={isServing ? 1 : 0.4} 
          metalness={isServing ? 0.3 : 0.1}
          roughness={0.5}
        />
      </Cylinder>
      
      {/* Signal Heatmap Plane */}
      {isServing && (
        <group position={[0, depth + 0.05, 0]}>
           <Cylinder args={[radius * 0.9, radius * 0.9, 0.1, 6]}>
             <meshBasicMaterial color={getSimulatedSirColor(normDist)} transparent opacity={0.3} />
           </Cylinder>
        </group>
      )}

      {/* Cell Boundary with depth */}
      <group position={[0, depth + 0.05, 0]} ref={boundaryRef}>
        <Line 
          points={Array.from({ length: 7 }).map((_, i) => {
            const angle = (Math.PI / 3) * i;
            return [radius * Math.cos(angle), 0, radius * Math.sin(angle)];
          }) as any} 
          color={borderColor} 
          lineWidth={borderWidth} 
          opacity={1}
          transparent
        />
      </group>

      {/* Base/Foundation for BS */}
      <Cylinder args={[3, 3.2, 0.4, 6]} position={[0, depth + 0.2, 0]}>
        <meshStandardMaterial color="#1e293b" />
      </Cylinder>

      {(isServing || isInterferer) && (
        <group position={[0, depth + 0.1, 0]}>
           <mesh rotation={[-Math.PI / 2, 0, 0]}>
             <ringGeometry args={[radius * 0.75, radius, 6]} />
             <meshBasicMaterial color={isServing ? getSimulatedSirColor(normDist) : borderColor} transparent opacity={0.3} />
           </mesh>
           <gridHelper args={[radius * 2, 8, isServing ? getSimulatedSirColor(normDist) : borderColor, borderColor]} rotation={[0,0,0]} position={[0, 0.01, 0]} />
        </group>
      )}

      {zoomFactor < 150 && (
        <Html position={[0, depth + 1.5, 0]} center distanceFactor={25}>
          <div className={`px-2 py-0.5 rounded-sm text-[7px] font-black whitespace-nowrap pointer-events-none transition-all shadow-lg ${
            isServing ? 'bg-white border-2 border-emerald-500 text-emerald-600 scale-125' : 
            (isInterferer ? 'bg-rose-500 text-white scale-110' : 'bg-white/40 text-slate-400')
          }`}>
            {isServing ? `ACTIVE BS (SIR: ${getSimulatedSirColor(normDist) === '#10b981' ? 'EXC' : 'POOR'})` : (isInterferer ? `INTERFERER (${f + 1})` : `CELL`)}
          </div>
        </Html>
      )}
    </group>
  );
};

// --- Simulation Controller (Internal to Canvas) ---
const SimulationController = ({ isAutoMoving, setMsPos, setMsRotation, msPos, manualDistance }: { 
  isAutoMoving: boolean, 
  setMsPos: (pos: THREE.Vector3) => void, 
  setMsRotation: (rot: number) => void,
  msPos: THREE.Vector3,
  manualDistance: number
}) => {
  // Autonomous movement disabled as per user request
  return null;
};

// --- Main Simulation Component ---

class SimulationErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Simulation Encountered an Error</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-md">The 3D environment crashed due to a rendering issue. This can happen on some devices with limited graphics memory.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Simulation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- UI Components ---

const VerticalSlider = ({ label, value, min, max, step, onChange, color, icon: Icon }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col items-center gap-1.5 group/slider h-24">
      <div className="relative flex-1 w-10 bg-slate-200/30 rounded-full border border-white/20 overflow-hidden cursor-pointer shadow-inner"
           onMouseDown={() => setIsDragging(true)}
           onMouseUp={() => setIsDragging(false)}
           onMouseLeave={() => setIsDragging(false)}
           onMouseMove={(e) => {
             if (isDragging) {
               const rect = e.currentTarget.getBoundingClientRect();
               const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
               const val = max - (y / rect.height) * (max - min);
               onChange(Math.round(val / step) * step);
             }
           }}>
        {/* Track Fill */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ height: `${percentage}%`, backgroundColor: color }}
          animate={{ height: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="absolute top-0 left-0 right-0 h-full w-full opacity-30 bg-gradient-to-t from-transparent to-white" />
        </motion.div>

        {/* Glow Effect */}
        <div 
          className="absolute bottom-0 left-0 right-0 blur-md opacity-40"
          style={{ height: `${percentage}%`, backgroundColor: color }}
        />

        {/* Handle */}
        <motion.div 
          className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-slate-100 flex items-center justify-center z-10"
          style={{ bottom: `calc(${percentage}% - 16px)` }}
          animate={{ bottom: `calc(${percentage}% - 16px)` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        </motion.div>

        {/* Value Display Overlay while dragging */}
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 40 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] font-black rounded-md whitespace-nowrap z-50 pointer-events-none"
            >
              {value.toFixed(step < 1 ? 1 : 0)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <div className="p-1.5 rounded-lg bg-white/50 shadow-sm border border-white/50">
          <Icon size={12} className="text-slate-600" />
        </div>
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter text-center leading-none w-12">
          {label}
        </span>
        <span className="text-[10px] font-mono font-black text-slate-800 mt-1">
          {value.toFixed(step < 1 ? 1 : 0)}
        </span>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
    <div className={`p-2 rounded-lg bg-slate-50 self-start ${color}`}>
      <Icon size={14} />
    </div>
    <div>
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
      <span className={`text-xs font-black ${color} truncate`}>{value}</span>
    </div>
  </div>
);

const ControlBtn = ({ icon: Icon, onClick, title, active }: any) => (
  <button 
    onClick={onClick}
    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
    title={title}
  >
    <Icon size={18} />
  </button>
);

export default function SirSimulation({ mode = 'sir' }: { mode?: 'sir' | 'network' }) {
  const [msPos, setMsPos] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [msRotation, setMsRotation] = useState(0);
  const [isAutoMoving, setIsAutoMoving] = useState(false);
  const [manualDistance, setManualDistance] = useState(15);
  const [n, setN] = useState(3.5);
  const [txPower, setTxPower] = useState(43); // dBm
  const [interfererLimit, setInterfererLimit] = useState(6);
  
  const [clusterSizeN, setClusterSizeN] = useState(7);
  const [cellHistory, setCellHistory] = useState<{ id: string, pos: THREE.Vector3 }[]>([]);
  
  const [handoverMarginDb, setHandoverMarginDb] = useState(3);
  const [autoHandover, setAutoHandover] = useState(true);
  const [servingCellIdRef, setServingCellIdRef] = useState<string | null>(null);
  const [signalGraph, setSignalGraph] = useState<any[]>([]);

  const clusterParams = useMemo(() => isValidN(clusterSizeN), [clusterSizeN]);
  const i_param = useMemo(() => clusterParams?.i || clusterSizeN, [clusterParams, clusterSizeN]);
  const j_param = useMemo(() => clusterParams?.j || 0, [clusterParams]);

  const [history, setHistory] = useState<{ time: number; sir: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'graphs' | 'settings'>('metrics');
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [showClusters, setShowClusters] = useState(mode === 'network');
  const [showInterference, setShowInterference] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(100);

  const orbitControlsRef = useRef<any>(null);

  // Sync showClusters with mode
  useEffect(() => {
    setShowClusters(mode === 'network');
  }, [mode]);

  // Generate Hex Grid Data (Organized Clusters)
  const gridData = useMemo(() => {
    const cells: CellData[] = [];
    const range = 6;
    const i = i_param;
    const j = j_param;
    const N = clusterSizeN;

    for (let q = -range; q <= range; q++) {
      for (let r = -range; r <= range; r++) {
        if (Math.abs(q + r) <= range) {
          const f = getCosetIndex(q, r, i, j, N);
          
          const center = getHexClusterCenter(q, r, i, j, N);
          const clusterId = `${center.cq}_${center.cr}`;
          cells.push({
            id: `Cell-${q}-${r}`,
            q, r, f, clusterId,
            users: Math.floor(Math.random() * 40) + 10
          });
        }
      }
    }
    return cells;
  }, [i_param, j_param, clusterSizeN]);

  // Power metrics
  const cellMetrics = useMemo(() => {
    const pRefWatts = (Math.pow(10, txPower / 10) / 1000);
    return [...gridData].map(cell => {
      const { x, y } = axialToPixel(cell.q, cell.r, CELL_RADIUS);
      const dist = Math.max(1, Math.sqrt((msPos.x - x) ** 2 + (msPos.z - y) ** 2));
      const powerWatts = calculatePower(dist, n) * pRefWatts;
      const powerDbm = 10 * Math.log10(powerWatts) + 30;
      return { cell, dist, powerWatts, powerDbm };
    }).sort((a, b) => b.powerDbm - a.powerDbm);
  }, [gridData, msPos, n, txPower]);

  // Derived serving cell
  const servingItem = useMemo(() => {
     let current = cellMetrics.find(c => c.cell.id === servingCellIdRef);
     if (!current) current = cellMetrics[0];
     return current || { cell: gridData[0], dist: 0, powerWatts: 0, powerDbm: -100 };
  }, [cellMetrics, servingCellIdRef, gridData]);

  const targetItem = useMemo(() => {
     return cellMetrics.find(c => c.cell.id !== servingItem.cell.id);
  }, [cellMetrics, servingItem]);

  // Auto handover logic && Graph recording
  useEffect(() => {
    if (!servingItem || !targetItem) return;
    
    // Graph
    setSignalGraph(prev => {
      const time = prev.length > 0 ? prev[prev.length - 1].time + 1 : 0;
      const newPoint = {
        time,
        servingDbm: servingItem.powerDbm,
        targetDbm: targetItem.powerDbm,
        marginDbm: servingItem.powerDbm + handoverMarginDb,
      };
      return [...prev, newPoint].slice(-100); // keep last 100 points
    });

    // Auto Handoff
    if (autoHandover) {
      if (targetItem.powerDbm > servingItem.powerDbm + handoverMarginDb) {
        setServingCellIdRef(targetItem.cell.id);
      }
    }
  }, [cellMetrics, autoHandover, handoverMarginDb]);
  
  // Create object resembling original return
  const { metrics, servingCell, interferers, handoffStatus, targetCell } = useMemo(() => {
    const nearest = servingItem.cell;
    const minDist = servingItem.dist;
    const sPower = servingItem.powerWatts;
    
    const activeInterferers = gridData.filter(c => c.f === nearest.f && c.id !== nearest.id);
    let totalInterference = 0;
    const interfererDetails = activeInterferers.map(bs => {
      const { x, y } = axialToPixel(bs.q, bs.r, CELL_RADIUS);
      const dist = Math.sqrt((msPos.x - x) ** 2 + (msPos.z - y) ** 2);
      const p = calculatePower(dist, n) * (Math.pow(10, txPower / 10) / 1000);
      totalInterference += p;
      return { id: bs.id, dist, power: p, q: bs.q, r: bs.r };
    }).sort((a, b) => b.power - a.power).slice(0, 6);

    const sirLinear = sPower / Math.max(totalInterference, 1e-10);
    const sirDb = 10 * Math.log10(sirLinear);
    
    let isHandoffPending = false;
    if (targetItem && targetItem.powerDbm > servingItem.powerDbm) {
        isHandoffPending = true;
    }

    return {
      metrics: { sirDb, sPowerWatts: sPower, totalInterferenceWatts: totalInterference, distToServing: minDist, margin: handoverMarginDb },
      servingCell: nearest,
      interferers: interfererDetails,
      handoffStatus: isHandoffPending ? 'PENDING' : 'STABLE',
      targetCell: targetItem?.cell
    };
  }, [servingItem, targetItem, gridData, msPos, n, txPower, handoverMarginDb]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => [...prev, { time: Date.now(), sir: metrics.sirDb }].slice(-30));
    }, 500);
    return () => clearInterval(interval);
  }, [metrics.sirDb]);

  const getSirStatus = (sir: number) => {
    if (sir > 18) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-500/10', hex: '#10b981' };
    if (sir > 12) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-500/10', hex: '#3b82f6' };
    if (sir > 6) return { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-500/10', hex: '#f59e0b' };
    return { label: 'Poor', color: 'text-rose-600', bg: 'bg-rose-500/10', hex: '#ef4444' };
  };

  const sirStatus = getSirStatus(metrics.sirDb);
  const selectedCell = gridData.find(c => c.id === selectedCellId);

  // Update cell history when serving cell changes
  useEffect(() => {
    if (servingCell) {
      setCellHistory(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.id !== servingCell.id) {
          const { x, y } = axialToPixel(servingCell.q, servingCell.r, CELL_RADIUS);
          const newPos = new THREE.Vector3(x, 0, y);
          return [...prev, { id: servingCell.id, pos: newPos }].slice(-10); // Keep last 10 cells
        }
        return prev;
      });
    }
  }, [servingCell.id]);

  const handleGroundClick = (point: THREE.Vector3) => {
    if (!isAutoMoving) {
      // Calculate rotation to face the new point
      const direction = point.clone().sub(msPos).normalize();
      const rotation = Math.atan2(direction.x, direction.z);
      setMsPos(new THREE.Vector3(point.x, 0, point.z));
      setMsRotation(rotation);
    }
  };

  const [lastServingId, setLastServingId] = useState<string | null>(null);
  const [showHandoffToast, setShowHandoffToast] = useState(false);

  useEffect(() => {
    if (servingCell.id !== lastServingId) {
      if (lastServingId !== null) {
        setShowHandoffToast(true);
        setTimeout(() => setShowHandoffToast(false), 2000);
      }
      setLastServingId(servingCell.id);
    }
  }, [servingCell.id, lastServingId]);

  return (
    <SimulationErrorBoundary>
      <div className="flex flex-col h-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
        <AnimatePresence>
          {showHandoffToast && (
            <motion.div 
               initial={{ opacity: 0, y: -50, x: '-50%' }}
               animate={{ opacity: 1, y: 50, x: '-50%' }}
               exit={{ opacity: 0, y: -50, x: '-50%' }}
               className="absolute top-0 left-1/2 z-[100] px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 font-black uppercase tracking-widest border-2 border-white/20"
            >
              <RefreshCw className="w-5 h-5 animate-spin" />
              Handover Complete: Switching BS
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 flex overflow-hidden relative">
        {/* Vertical Side Control Panel (Glass Effect) */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-24">
          <div className="bg-white/60 backdrop-blur-2xl border border-white/40 p-3 rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col items-center gap-3 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-purple-500/5 pointer-events-none" />
            
             {/* Auto-Pilot Toggle Disabled */}

            <div className="flex flex-col gap-3">
              <VerticalSlider 
                label="Tx Power" 
                value={txPower} min={30} max={50} step={1} 
                onChange={setTxPower} color="#10b981" icon={Zap} 
              />
              <VerticalSlider 
                label="HO Margin" 
                value={handoverMarginDb} min={0} max={10} step={1} 
                onChange={setHandoverMarginDb} color="#8b5cf6" icon={Move} 
              />
              <VerticalSlider 
                label="Interferers" 
                value={interfererLimit} min={0} max={18} step={1} 
                onChange={setInterfererLimit} color="#f59e0b" icon={Radio} 
              />
              <VerticalSlider 
                label="Distance" 
                value={manualDistance} min={5} max={80} step={1} 
                onChange={setManualDistance} color="#64748b" icon={MousePointer2} 
              />
            </div>
            


            {/* Zoom Controls */}
            <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/20">
              <button 
                onClick={() => {
                  if (orbitControlsRef.current) {
                    const camera = orbitControlsRef.current.object;
                    camera.position.multiplyScalar(0.9);
                  }
                }}
                className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 hover:border-blue-200 text-slate-600 hover:text-blue-600 transition-all"
              >
                <Maximize2 size={16} />
              </button>
              <button 
                onClick={() => {
                  if (orbitControlsRef.current) {
                    const camera = orbitControlsRef.current.object;
                    camera.position.multiplyScalar(1.1);
                  }
                }}
                className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 hover:border-blue-200 text-slate-600 hover:text-blue-600 transition-all"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative bg-white overflow-hidden">


          {/* Minimal Controls top bar */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-xl border border-slate-200 p-1.5 flex items-center gap-1">
             <div className="flex items-center gap-1 px-3">
                <MousePointer2 size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Manual Mode</span>
             </div>
             <div className="w-px h-6 bg-slate-200 mx-1" />
             <ControlBtn icon={Rotate3d} onClick={() => { if (orbitControlsRef.current) orbitControlsRef.current.autoRotate = !orbitControlsRef.current.autoRotate }} title="Auto Rotate" />
             <ControlBtn icon={RotateCcw} onClick={() => { setMsPos(new THREE.Vector3(0, 0, 0)); setHistory([]); setCellHistory([]); }} title="Reset" />
             <ControlBtn icon={Search} onClick={() => { if (orbitControlsRef.current) orbitControlsRef.current.object.position.multiplyScalar(0.9) }} title="Zoom In" />
          </div>

          <Canvas shadows dpr={[1, 2]} camera={{ position: [100, 100, 100], fov: 40 }}>
            <OrbitControls 
              ref={orbitControlsRef}
              makeDefault
              enablePan={true} 
              maxPolarAngle={Math.PI / 2.1} 
              minDistance={20} 
              maxDistance={500} 
              onChange={(e: any) => {
                if (e?.target?.object) {
                  setZoomFactor(e.target.object.position.length());
                }
              }}
            />
            
            <Suspense fallback={
              <Html center>
                <div className="flex flex-col items-center gap-4 bg-white/80 p-8 rounded-3xl backdrop-blur-md border border-slate-200 shadow-2xl">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Optimizing Scene...</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Loading Telecom Visualization</p>
                  </div>
                </div>
              </Html>
            }>
              <SimulationController 
                isAutoMoving={isAutoMoving} 
                setMsPos={setMsPos} 
                setMsRotation={setMsRotation} 
                msPos={msPos} 
                manualDistance={manualDistance}
              />
              <color attach="background" args={['#f8fafc']} />
              <fog attach="fog" args={['#f8fafc', 150, 600]} />
              
              <ambientLight intensity={1.2} />
              <pointLight position={[100, 100, 100]} intensity={1.5} castShadow />
              <directionalLight 
                position={[-50, 100, -50]} 
                intensity={1.8} 
                castShadow
                shadow-mapSize={[4096, 4096]}
              />

              <Environment3D onGroundClick={handleGroundClick} />
              
              {/* Movement Path History */}
              <MovementPath history={cellHistory} color="#3b82f6" />

              {/* Handover Indication Arrows */}
              {gridData.filter(cell => {
                // Find immediate neighbors of serving cell
                const dq = Math.abs(cell.q - servingCell.q);
                const dr = Math.abs(cell.r - servingCell.r);
                const ds = Math.abs((cell.q + cell.r) - (servingCell.q + servingCell.r));
                return (dq <= 1 && dr <= 1 && ds <= 1) && cell.id !== servingCell.id;
              }).map(neighbor => {
                const sourcePos = axialToPixel(servingCell.q, servingCell.r, CELL_RADIUS);
                const targetPos = axialToPixel(neighbor.q, neighbor.r, CELL_RADIUS);
                const isTarget = targetCell?.id === neighbor.id && handoffStatus === 'PENDING';
                return (
                  <HandoverArrow 
                    key={`arrow-${neighbor.id}`}
                    from={new THREE.Vector3(sourcePos.x, 7.5, sourcePos.y)}
                    to={new THREE.Vector3(targetPos.x, 7.5, targetPos.y)}
                    active={isTarget}
                    color={isTarget ? "#f59e0b" : "#cbd5e1"}
                  />
                );
              })}

              {/* Grid Helper for better orientation */}
              <gridHelper args={[1000, 50, '#cbd5e1', '#f1f5f9']} position={[0, -0.05, 0]} />
              
              {/* Cells */}
              {gridData.map((cell) => (
                <React.Fragment key={cell.id}>
                    <HexCell3D 
                      q={cell.q}
                      r={cell.r}
                      radius={CELL_RADIUS}
                      color={getFrequencyColor(cell.f, clusterSizeN)}
                      opacity={cell.id === servingCell.id ? 0.9 : (cell.f === servingCell.f ? 0.6 : 0.25)}
                      isSelected={selectedCellId === cell.id}
                      onClick={() => {
                        setSelectedCellId(cell.id);
                        const { x, y } = axialToPixel(cell.q, cell.r, CELL_RADIUS);
                        const newPos = new THREE.Vector3(x, 0, y);
                        const dir = newPos.clone().sub(msPos).normalize();
                        if (dir.length() > 0.1) setMsRotation(Math.atan2(dir.x, dir.z));
                        setMsPos(newPos);
                      }}
                      clusterId={cell.clusterId}
                      f={cell.f}
                      showClusters={showClusters}
                      isServing={cell.id === servingCell.id}
                      isInterferer={cell.f === servingCell.f && cell.id !== servingCell.id}
                      zoomFactor={zoomFactor}
                      N={clusterSizeN}
                      msPos={msPos}
                    />
                  {/* Interference Glowing Overlays */}
                  <InterferenceOverlay 
                    q={cell.q}
                    r={cell.r}
                    radius={CELL_RADIUS}
                    color="#ef4444"
                    visible={showInterference && cell.f === servingCell.f && cell.id !== servingCell.id}
                  />
                </React.Fragment>
              ))}

              {/* Towers */}
              {gridData.map((cell) => {
                const { x, y } = axialToPixel(cell.q, cell.r, CELL_RADIUS);
                return (
                  <Tower 
                    key={`bs-${cell.id}`}
                    position={[x, 0, y]}
                    isServing={cell.id === servingCell.id}
                    f={cell.f}
                    txPower={txPower}
                    id={`${cell.f + 1}`}
                    onClick={() => {
                      setSelectedCellId(cell.id);
                      const { x, y } = axialToPixel(cell.q, cell.r, CELL_RADIUS);
                      const newPos = new THREE.Vector3(x, 0, y);
                      const dir = newPos.clone().sub(msPos).normalize();
                      if (dir.length() > 0.1) setMsRotation(Math.atan2(dir.x, dir.z));
                      setMsPos(newPos);
                    }}
                    N={clusterSizeN}
                  />
                );
              })}

              {/* Mobile Station */}
              <MobileStation 
                position={msPos} 
                sirStatus={{ ...sirStatus, value: metrics.sirDb }}
                rotation={msRotation}
                isServing={true}
                onDrag={(newPos) => {
                  setMsPos(newPos);
                }}
                handoffActive={handoffStatus === 'PENDING'}
              />

              {/* Signal Propagation Lines */}
              {showInterference && interferers.map((i, idx) => {
                const { x, y } = axialToPixel(i.q, i.r, CELL_RADIUS);
                return (
                  <Line
                    key={`int-${idx}`}
                    points={[[x, 7.5, y], [msPos.x, 1, msPos.z]]}
                    color="#ef4444"
                    lineWidth={1}
                    opacity={0.3}
                    transparent
                    dashed
                    dashScale={2}
                    dashSize={1}
                  />
                );
              })}

              <ContactShadows resolution={1024} scale={300} blur={2} opacity={0.1} far={100} />
            </Suspense>
          </Canvas>

          {/* Legend Overlay */}
          <div className="absolute top-6 right-6 z-10">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Network Legend</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-[10px] font-bold text-slate-600">Serving Cell</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm" />
                  <span className="text-[10px] font-bold text-slate-600">Co-Channel Interferer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300" />
                  <span className="text-[10px] font-bold text-slate-600">Inactive Cell</span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <div className="w-4 h-1 bg-amber-500 rounded-full" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Handover Target</span>
                </div>
              </div>
            </div>
          </div>

          {/* The selected cell info popup has been removed. */}
        </div>

        {/* Floating Metrics Dash - Elegant Glass Card */}
        <AnimatePresence mode="wait">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute right-8 top-8 bottom-8 w-80 z-40 hidden md:block"
          >
            <div className="h-full bg-white/90 backdrop-blur-3xl border border-slate-200 rounded-[3rem] shadow-[0_32px_96px_-24px_rgba(0,0,0,0.12)] flex flex-col items-stretch overflow-hidden">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">SIR Console</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Telemetry Phase 2</p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border-2 transition-colors ${handoffStatus === 'PENDING' ? 'bg-amber-100/50 text-amber-600 border-amber-200' : 'bg-emerald-100/50 text-emerald-600 border-emerald-200'}`}>
                    <div className={`w-2 h-2 rounded-full ${handoffStatus === 'PENDING' ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
                    {handoffStatus === 'PENDING' ? 'Handoff' : 'Stable'}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {/* SIR Gauge Section */}
                  <div className="relative h-44 flex flex-col items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="65" fill="none" stroke="#f1f5f9" strokeWidth="14" strokeDasharray="408" strokeLinecap="round" />
                      <motion.circle 
                        cx="50%" cy="50%" r="65" fill="none" stroke={sirStatus.hex} strokeWidth="14" 
                        strokeDasharray="408" 
                        initial={{ strokeDashoffset: 408 }}
                        animate={{ strokeDashoffset: 408 - (Math.min(100, Math.max(0, metrics.sirDb + 5) * 4) / 100) * 408 }}
                        transition={{ type: 'spring', damping: 20 }}
                        strokeLinecap="round" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.span 
                          key={metrics.sirDb.toFixed(1)}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-4xl font-black text-slate-900 tracking-tighter"
                        >
                          {metrics.sirDb.toFixed(1)}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SIR (dB)</span>
                    </div>
                  </div>
               </div>

               {/* Instruction Panel */}
               <div className="p-6 bg-slate-950 text-white flex items-center gap-4 group cursor-help transition-all hover:bg-black">
                  <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-all">
                    <MousePointer2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Manual Command</h4>
                    <p className="text-[9px] font-medium leading-tight text-slate-400">
                      Primary navigation enabled. CLICK GROUND to redirect.
                    </p>
                  </div>
               </div>
            </div>
          </motion.div>
        </AnimatePresence>



      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        input[type='range']::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
    </SimulationErrorBoundary>
  );
}
