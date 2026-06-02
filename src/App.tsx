/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Info, 
  Maximize2, 
  Minimize2, 
  Layers, 
  ArrowRight, 
  Grid3X3,
  ChevronRight,
  HelpCircle,
  Zap,
  Play,
  RotateCcw,
  Activity,
  History,
  RefreshCw,
  Radio,
  BookOpen,
  Users,
  BarChart3
} from 'lucide-react';
import { 
  HandoverState, 
  calculateHandoverInitiationDistance, 
  calculateHandoverCompletionDistance,
  calculateReceivedPower, 
  shouldInitiateHandover 
} from './handover-types';
import { 
  HandoverStatus, 
  MetricsPanel, 
  PowerDistanceGraph, 
  SpeedTriggerGraph 
} from './HandoverComponents';
import {
  InterferenceState,
  InterferenceMetrics,
  TierMetric,
  calculateReuseDistance,
  calculateReuseRatio,
  calculatePower,
  dbmToWatts,
  wattsToDbm,
  calculateSir,
  getAdjacentFrequencyGroups
} from './interference-types';
import {
  SirGauge,
  InterferenceMetricsPanel,
  InterferenceTierAnalysis,
  InterfererTable,
  SirVsNGraph,
  SirVsPathLossGraph,
  InterferencePieChart,
  FormulasPanel
} from './InterferenceComponents';
import {
  TrunkingState,
  TrunkingMetrics,
  calculateErlangB,
  calculateErlangC,
  findRequiredChannels,
  findMaxTraffic
} from './trunking-types';
import {
  TrunkingMetricsPanel,
  TrunkingCharts,
  BusyHourAnalysis
} from './TrunkingComponents';

import SirSimulation from './SirSimulation';
import NetworkSimulation from './NetworkSimulation';
import NetworkDesignTool from './NetworkDesignTool';
import CellSplittingTool from './CellSplittingTool';
import PropagationModule from './PropagationModule';
import FadingSimulation from './FadingComponents';
import FormulaReference from './FormulaReference';
import MitigationModule from './MitigationModule';
// --- Types & Constants ---

interface Point {
  x: number;
  y: number;
}

export interface HexCell {
  q: number;
  r: number;
  f: number; // Frequency index 0-6
  clusterId: string;
}

const FREQUENCIES = Array.from({ length: 50 }, (_, i) => ({
  id: `${i + 1}`,
  // Golden ratio (phi) approximation for color distribution: 137.508 degrees
  color: `hsl(${(i * 137.508) % 360}, 80%, 55%)`
}));

// --- Math Helpers ---

const SQRT3 = Math.sqrt(3);

/**
 * Validates if N is a valid cluster size (N = i^2 + ij + j^2)
 * Returns {i, j} if valid, null otherwise
 */
const isValidN = (n: number): { i: number; j: number } | null => {
  if (n <= 0) return null;
  const limit = Math.ceil(Math.sqrt(n));
  for (let i = 0; i <= limit; i++) {
    for (let j = 0; j <= i; j++) {
      if (i * i + i * j + j * j === n) {
        return { i, j };
      }
    }
  }
  return null;
};

/**
 * Gets parameters for cluster geometry. Fallback to heuristic for non-standard N.
 */
const getClusterParams = (n: number): { i: number; j: number } => {
  const result = isValidN(n);
  if (result) return result;
  // Heuristic: for coloring we just need N, but for geometry we might need i,j
  // We'll return i=n, j=0 as a fallback that satisfies N if we force it
  return { i: n, j: 0 };
};

// Deterministic, order-independent coset mapping to keep frequencies aligned
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

/**
 * Converts axial coordinates (q, r) to pixel coordinates (x, y)
 */
const axialToPixel = (q: number, r: number, size: number): Point => {
  const x = size * (3/2 * q);
  const y = size * (SQRT3/2 * q + SQRT3 * r);
  return { x, y };
};

/**
 * Generates the 6 vertices of a flat-topped hexagon
 */
const getHexVertices = (center: Point, size: number): Point[] => {
  const vertices: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    vertices.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    });
  }
  return vertices;
};

/**
 * Converts pixel coordinates (x, y) to axial coordinates (q, r)
 */
const pixelToAxial = (x: number, y: number, size: number): { q: number; r: number } => {
  const q = (2/3 * x) / size;
  const r = (Math.sqrt(3)/3 * y - 1/3 * x) / size;
  return { q, r };
};

/**
 * Rounds fractional axial coordinates to the nearest integer axial coordinates
 */
const roundToHex = (fracQ: number, fracR: number): { q: number; r: number } => {
  const fracS = -fracQ - fracR;
  let q = Math.round(fracQ);
  let r = Math.round(fracR);
  let s = Math.round(fracS);

  const qDiff = Math.abs(q - fracQ);
  const rDiff = Math.abs(r - fracR);
  const sDiff = Math.abs(s - fracS);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return { q, r };
};

const VALID_CLUSTERS = [
  { n: 1, i: 1, j: 0 },
  { n: 3, i: 1, j: 1 },
  { n: 4, i: 2, j: 0 },
  { n: 7, i: 2, j: 1 },
  { n: 9, i: 3, j: 0 },
  { n: 12, i: 2, j: 2 },
  { n: 13, i: 3, j: 1 },
  { n: 16, i: 4, j: 0 },
  { n: 19, i: 3, j: 2 },
  { n: 21, i: 4, j: 1 },
  { n: 25, i: 5, j: 0 },
  { n: 27, i: 3, j: 3 },
  { n: 28, i: 4, j: 2 },
  { n: 31, i: 5, j: 1 },
  { n: 36, i: 6, j: 0 },
  { n: 37, i: 4, j: 3 },
  { n: 39, i: 5, j: 2 },
  { n: 43, i: 6, j: 1 },
  { n: 48, i: 4, j: 4 },
  { n: 49, i: 7, j: 0 },
];

// --- Components ---

export default function App() {
  // Parameters
  const [width, setWidth] = useState(800);  // Service Area Width
  const [height, setHeight] = useState(600); // Service Area Length (Height)
  const [rc, setRc] = useState(40);  // Cell Radius
  const [currentN, setCurrentN] = useState(7);
  const [manualN, setManualN] = useState("7");
  const [nError, setNError] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  // --- Zoom and Pan State ---
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.min(Math.max(prev * delta, 0.2), 10));
    };

    svg.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheelEvent);
  }, []);

  // --- Handover Simulation State ---
  const [handoverMode, setHandoverMode] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [speed, setSpeed] = useState(60);
  const [leadTime, setLeadTime] = useState(0.8);
  const [hysteresisMargin, setHysteresisMargin] = useState(3.0);
  const [pathLossExponent, setPathLossExponent] = useState(3.5);
  const [pMinThreshold, setPMinThreshold] = useState(-85); // P_min threshold in dBm
  const [handoverStage, setHandoverStage] = useState<'idle' | 'initiating' | 'executing' | 'completed'>('idle');
  const [mobilePos, setMobilePos] = useState({ q: 0, r: 0 });
  const [sourceCell, setSourceCell] = useState<HexCell | null>(null);
  const [targetCell, setTargetCell] = useState<HexCell | null>(null);
  const [simulationProgress, setSimulationProgress] = useState(0); // 0 to 1 along the path

  // --- Interference Simulation State ---
  const [interferenceMode, setInterferenceMode] = useState(false);
  const [interferenceN, setInterferenceN] = useState(4); // n path loss exponent
  const [targetSir, setTargetSir] = useState(15);
  const [filterQuality, setFilterQuality] = useState(0.8);
  const [isPowerControlActive, setIsPowerControlActive] = useState(false);
  const [totalChannels, setTotalChannels] = useState(50);
  const [nearFarScenario, setNearFarScenario] = useState<'off' | 'bs-side' | 'ms-side'>('off');
  const [interferenceTier, setInterferenceTier] = useState<number>(2); // Number of tiers to include
  const [interferenceType, setInterferenceType] = useState<'cci' | 'aci'>('cci');
  const [showInterferers, setShowInterferers] = useState(true);
  const [selectedCell, setSelectedCell] = useState<HexCell | null>(null);
  const [sectoringMode, setSectoringMode] = useState<'omni' | '120' | '60'>('omni');
  const [interferenceMobilePos, setInterferenceMobilePos] = useState({ q: 1, r: 0 });
  const [isWorstCase, setIsWorstCase] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<HexCell | null>(null);
  const [selectedFrequencyGroup, setSelectedFrequencyGroup] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'sir' | 'interference' | 'network' | 'fading' | 'trunking' | 'propagation' | 'formulas' | 'mitigation' | 'modulation'>('sir');
  const [networkSubTab, setNetworkSubTab] = useState<'planning' | 'splitting' | 'operations'>('planning');

  // --- Trunking Analysis State ---
  const [trunkingState, setTrunkingState] = useState<TrunkingState>({
    numUsers: 1000,
    arrivalRate: 2, // 2 calls per hour
    holdingTime: 3, // 3 minutes
    numChannels: 50,
    targetGos: 0.02, // 2%
    mode: 'compute-gos',
    hourlyTraffic: [0.1, 0.05, 0.05, 0.05, 0.1, 0.2, 0.4, 0.7, 0.9, 1.0, 0.95, 0.8, 0.7, 0.8, 0.9, 0.95, 1.0, 0.9, 0.7, 0.5, 0.3, 0.2, 0.15, 0.1],
    busyHour: 16, // 16:00
    useManualTraffic: false,
  });

  // --- Trunking Calculations ---
  const trunkingMetrics = useMemo((): TrunkingMetrics => {
    const { numUsers, arrivalRate, holdingTime, numChannels, targetGos, mode, hourlyTraffic, busyHour, useManualTraffic } = trunkingState;
    
    let totalOfferedTraffic: number;
    let trafficPerUser: number;

    if (useManualTraffic) {
      // Use the traffic at the selected busy hour
      totalOfferedTraffic = hourlyTraffic[busyHour];
      trafficPerUser = totalOfferedTraffic / numUsers;
    } else {
      trafficPerUser = (arrivalRate * holdingTime) / 60; // Au = λ * H
      totalOfferedTraffic = numUsers * trafficPerUser; // A = U * Au
    }

    const numSectors = sectoringMode === '120' ? 3 : sectoringMode === '60' ? 6 : 1;
    const channelsPerSector = Math.max(1, Math.floor(numChannels / numSectors));
    const trafficPerSector = totalOfferedTraffic / numSectors;
    
    const blockingProbB = calculateErlangB(channelsPerSector, trafficPerSector);
    const delayProbC = calculateErlangC(channelsPerSector, trafficPerSector);
    const carriedTrafficPerSector = trafficPerSector * (1 - blockingProbB);
    const carriedTraffic = carriedTrafficPerSector * numSectors;
    const utilization = carriedTrafficPerSector / channelsPerSector;
    
    const maxSupportableTrafficPerSector = findMaxTraffic(channelsPerSector, targetGos);
    const maxSupportableTraffic = maxSupportableTrafficPerSector * numSectors;
    
    let requiredChannels = undefined;
    if (mode === 'compute-channels') {
      const requiredChannelsPerSector = findRequiredChannels(trafficPerSector, targetGos);
      requiredChannels = requiredChannelsPerSector * numSectors;
    }
    
    return {
      trafficPerUser,
      totalOfferedTraffic,
      blockingProbB,
      delayProbC,
      carriedTraffic,
      utilization,
      requiredChannels,
      maxSupportableTraffic
    };
  }, [trunkingState, sectoringMode]);

  // Derived Reuse Parameters
  const clusterParams = useMemo(() => {
    const params = getClusterParams(currentN);
    return params ? { n: currentN, ...params } : { n: 7, i: 2, j: 1 };
  }, [currentN]);
  const { n: N, i: iParam, j: jParam } = clusterParams;

  /**
   * Generates a high-contrast, bold, and unique color for a frequency index.
   * Uses a combination of Golden Angle distribution and lightness cycling
   * to maximize visual separation between any two frequency groups.
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
    
    // Improved distribution for N >= 9
    // Using a prime-based multiplier for even better distribution of Hues
    const hue = (f * 137.508) % 360;
    const saturation = 85;
    // For large N, we use 3 lightness tiers to distinguish neighboring indices
    const lightnessTiers = [45, 60, 75];
    const lightness = lightnessTiers[f % 3];
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  /**
   * Determines if text should be light or dark based on the color's lightness.
   */
  const getContrastColor = (f: number, NTotal: number) => {
    if (NTotal <= 7) return '#ffffff';
    const lightnessTiers = [45, 60, 75];
    const lightness = lightnessTiers[f % 3];
    return lightness > 65 ? '#1e293b' : '#ffffff';
  };

  const prevN = useRef(currentN);
  const prevTier = useRef(interferenceTier);
  useEffect(() => {
    if (prevN.current !== currentN || prevTier.current !== interferenceTier) {
      // Auto-expand area based on N and Tiers
      const D = Math.sqrt(3 * currentN) * rc;
      // Each tier adds a distance of roughly D to the radius
      const expansionFactor = interferenceMode ? Math.max(2.5, interferenceTier * 1.2) : 2.5;
      setWidth(Math.max(800, Math.ceil(D * expansionFactor)));
      setHeight(Math.max(600, Math.ceil(D * expansionFactor * 0.8)));
      prevN.current = currentN;
      prevTier.current = interferenceTier;
    }
  }, [currentN, rc, interferenceTier, interferenceMode]);

  // Derived Grid Data
  const gridData = useMemo(() => {
    const cells: HexCell[] = [];
    const clusters: Record<string, HexCell[]> = {};
    
    // Basis vectors for co-channel super-grid
    // These vectors point to the centers of the next clusters of the same frequency
    const w1 = { q: iParam, r: jParam };
    const w2 = { q: -jParam, r: iParam + jParam };

    // Frequency shift coefficients (k1, k2) for axial formula: f = (q*k1 + r*k2) % N
    // This allows perfect linear frequency reuse mapping.
    // For hexagonal cells, it can be derived that k1=1, k2=i+2j? 
    // Let's use a simpler approach: finding unique f for each cell in the master cluster
    // and using tiling logic.
    
    const det = N; // The determinant of the supergrid basis (w1, w2) is N

    // Determine range of q and r to cover the entire view area
    const qRange = Math.ceil((width + 200) / (rc * 1.5)) + 2;
    const rRange = Math.ceil((height + 200) / (SQRT3 * rc)) + 2;

    for (let q = -qRange; q <= qRange; q++) {
      for (let r = -rRange; r <= rRange; r++) {
        const pos = axialToPixel(q, r, rc);
        
        if (Math.abs(pos.x) <= width / 2 + 100 && Math.abs(pos.y) <= height / 2 + 100) {
          // 1. Determine Cluster ID (q_c, r_c) exactly using hexagonal coordinate rounding
          const center = getHexClusterCenter(q, r, iParam, jParam, N);
          const clusterId = `${center.cq}_${center.cr}`;

          // 2. Determine Frequency f deterministically matching the Cluster Design tab
          const f = getCosetIndex(q, r, iParam, jParam, N);

          const cell = { q, r, f, clusterId };
          cells.push(cell);
          
          if (!clusters[clusterId]) clusters[clusterId] = [];
          clusters[clusterId].push(cell);
        }
      }
    }

    return { cells, clusters };
  }, [width, height, rc, iParam, jParam, N]);

  // Calculate cluster borders
  const clusterPaths = useMemo(() => {
    return Object.entries(gridData.clusters).map(([id, clusterCells]) => {
      const cells = clusterCells as HexCell[];
      // Only draw border if cluster is "full" or mostly full for the given N
      if (cells.length < N) return null;

      // Logic to find the outer boundary of a set of hexagons:
      // 1. Collect all edges of all hexagons in the cluster.
      // 2. Edges that appear twice are internal; edges that appear once are boundary.
      // 3. Chain boundary edges into a path.
      
      const edgeCounts: Record<string, number> = {};
      
      cells.forEach(cell => {
        const center = axialToPixel(cell.q, cell.r, rc);
        const verts = getHexVertices(center, rc);
        for (let i = 0; i < 6; i++) {
          const p1 = verts[i];
          const p2 = verts[(i + 1) % 6];
          // Create a stable key for the edge
          const key = [
            Math.round(p1.x * 100) / 100, Math.round(p1.y * 100) / 100,
            Math.round(p2.x * 100) / 100, Math.round(p2.y * 100) / 100
          ].sort().join(',');
          edgeCounts[key] = (edgeCounts[key] || 0) + 1;
        }
      });

      const boundaryEdges: [Point, Point][] = [];
      cells.forEach(cell => {
        const center = axialToPixel(cell.q, cell.r, rc);
        const verts = getHexVertices(center, rc);
        for (let i = 0; i < 6; i++) {
          const p1 = verts[i];
          const p2 = verts[(i + 1) % 6];
          const key = [
            Math.round(p1.x * 100) / 100, Math.round(p1.y * 100) / 100,
            Math.round(p2.x * 100) / 100, Math.round(p2.y * 100) / 100
          ].sort().join(',');
          if (edgeCounts[key] === 1) {
            boundaryEdges.push([p1, p2]);
          }
        }
      });

      // Sort edges to form a continuous path
      if (boundaryEdges.length === 0) return null;
      
      const path: Point[] = [boundaryEdges[0][0]];
      let current = boundaryEdges[0][1];
      const used = new Set([0]);

      while (used.size < boundaryEdges.length) {
        let found = false;
        for (let i = 0; i < boundaryEdges.length; i++) {
          if (used.has(i)) continue;
          const [p1, p2] = boundaryEdges[i];
          if (Math.abs(p1.x - current.x) < 0.1 && Math.abs(p1.y - current.y) < 0.1) {
            path.push(p1);
            current = p2;
            used.add(i);
            found = true;
            break;
          } else if (Math.abs(p2.x - current.x) < 0.1 && Math.abs(p2.y - current.y) < 0.1) {
            path.push(p2);
            current = p1;
            used.add(i);
            found = true;
            break;
          }
        }
        if (!found) break; // Should not happen for closed shapes
      }

      return `M ${path.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
    }).filter(Boolean);
  }, [gridData.clusters, rc]);

  const cellCount = gridData.cells.length;
  const reuseDistance = (Math.sqrt(3 * N) * rc).toFixed(1);

  // --- Handover Simulation Logic ---
  const initiationDistance = useMemo(() => 
    calculateHandoverInitiationDistance(rc, -70, pMinThreshold, pathLossExponent),
    [rc, pMinThreshold, pathLossExponent]
  );

  const completionDistance = useMemo(() => 
    calculateHandoverCompletionDistance(rc, hysteresisMargin, pathLossExponent),
    [rc, hysteresisMargin, pathLossExponent]
  );

  // --- Interference Calculation ---
  const interferenceMetrics = useMemo(() => {
    if (!interferenceMode) return null;

    // 1. Identify Serving Cell
    let serving = selectedCell;
    if (!serving) {
      serving = gridData.cells.find(c => c.q === 0 && c.r === 0) || gridData.cells[0];
    }
    if (!serving) return null;

    const servingCenter = axialToPixel(serving.q, serving.r, rc);
    const mobilePixel = axialToPixel(interferenceMobilePos.q, interferenceMobilePos.r, rc);
    
    const p0 = -85; // Reference power at cell edge (dBm)

    // Basis vectors for co-channel super-grid
    const w1 = { q: iParam, r: jParam };
    const w2 = { q: -jParam, r: iParam + jParam };

    const calculateMetricsForPos = (pos: {x: number, y: number}) => {
      const d = Math.sqrt(Math.pow(pos.x - servingCenter.x, 2) + Math.pow(pos.y - servingCenter.y, 2));
      const pDesiredDbm = calculatePower(d, rc, interferenceN, p0);
      const pDesiredWatts = dbmToWatts(pDesiredDbm);

      const tiers: TierMetric[] = [];
      let totalCciWatts = 0;
      let allInterfererDetails: any[] = [];

      // Generate co-channel interferers mathematically for N tiers
      const tiersToCalculate = typeof interferenceTier === 'number' ? interferenceTier : 2;
      for (let t = 1; t <= tiersToCalculate; t++) {
        let tierWatts = 0;
        const tierInterferers: any[] = [];
        
        // Hexagonal walking trace of radius t to generate exactly 6t cells
        const directions = [
          { qStep: -1, rStep: 1 },  // side 0: top right to top left
          { qStep: -1, rStep: 0 },  // side 1: top left to bottom left
          { qStep: 0,  rStep: -1 }, // side 2: bottom left to bottom
          { qStep: 1,  rStep: -1 }, // side 3: bottom to bottom right
          { qStep: 1,  rStep: 0 },  // side 4: bottom right to top right
          { qStep: 0,  rStep: 1 }   // side 5: top right to starting vertex
        ];
        
        let curQ = t;
        let curR = 0;
        
        for (let side = 0; side < 6; side++) {
          const dir = directions[side];
          for (let step = 0; step < t; step++) {
            const i = curQ;
            const j = curR;
            
            const cq = serving!.q + i * w1.q + j * w2.q;
            const cr = serving!.r + i * w1.r + j * w2.r;
            
            const center = axialToPixel(cq, cr, rc);
            const distToMS = Math.sqrt(Math.pow(center.x - pos.x, 2) + Math.pow(center.y - pos.y, 2));
            const pDbm = calculatePower(distToMS, rc, interferenceN, p0);
            const pWatts = dbmToWatts(pDbm);
            
            const detail = { 
              id: `Cell(${cq},${cr})`, 
              pWatts, 
              pDbm, 
              q: cq, 
              r: cr, 
              tier: t, 
              type: 'cci' as const,
              distToMS
            };
            tierInterferers.push(detail);
            
            curQ += dir.qStep;
            curR += dir.rStep;
          }
        }
        
        // Sort closest first (under sectoring only the closest/unobstructed ones are visible/cause interference)
        tierInterferers.sort((a, b) => a.distToMS - b.distToMS);
        
        const allowedCount = sectoringMode === '120' ? 2 * t : sectoringMode === '60' ? 1 * t : 6 * t;
        const activeTierInterferers = tierInterferers.slice(0, allowedCount);
        
        const activeTierWatts = activeTierInterferers.reduce((s, item) => s + item.pWatts, 0);
        tierWatts = activeTierWatts;
        
        activeTierInterferers.forEach(item => {
          allInterfererDetails.push(item);
        });
        
        const tierSir = calculateSir(pDesiredDbm, wattsToDbm(tierWatts));
        totalCciWatts += tierWatts;
        tiers.push({
          tier: t,
          sir: tierSir,
          worstCaseSir: 0, 
          powerWatts: tierWatts,
          interfererCount: activeTierInterferers.length
        });
      }

      // Adjacent Channel Interference
      let aciWatts = 0;
      const aciDetails = gridData.cells
        .filter(c => 
          (c.f === (serving!.f - 1 + FREQUENCIES.length) % FREQUENCIES.length || 
           c.f === (serving!.f + 1) % FREQUENCIES.length) &&
          (c.q !== serving!.q || c.r !== serving!.r)
        )
        .map(c => {
          const center = axialToPixel(c.q, c.r, rc);
          const distToMS = Math.sqrt(Math.pow(center.x - pos.x, 2) + Math.pow(center.y - pos.y, 2));
          let pDbm = calculatePower(distToMS, rc, interferenceN, p0);
          if (isPowerControlActive) pDbm -= 10;
          const pWatts = dbmToWatts(pDbm) * (1 - filterQuality);
          aciWatts += pWatts;
          return { id: `Cell(${c.q},${c.r})`, pWatts, pDbm: wattsToDbm(pWatts), q: c.q, r: c.r, tier: 1 as const, type: 'aci' as const };
        })
        .sort((a, b) => b.pWatts - a.pWatts)
        .slice(0, 12); 

      const aciSir = calculateSir(pDesiredDbm, wattsToDbm(aciWatts));
      const activeTotalIWatts = interferenceType === 'cci' ? totalCciWatts : aciWatts;
      const sir = calculateSir(pDesiredDbm, wattsToDbm(activeTotalIWatts));

      return {
        sir,
        desiredPower: pDesiredDbm,
        totalInterferencePower: wattsToDbm(activeTotalIWatts),
        tiers,
        aciSir,
        aciWatts,
        totalCciWatts,
        interferers: (interferenceType === 'cci' ? allInterfererDetails : aciDetails).sort((a, b) => b.pWatts - a.pWatts)
      };
    };

    const currentMetrics = calculateMetricsForPos(mobilePixel);
    
    // Calculate worst case by checking vertices
    const worstMetrics: any[] = [];
    for (let i = 0; i < 6; i++) {
       const angleRad = (Math.PI / 180) * (60 * i);
       const vertex = {
         x: servingCenter.x + rc * Math.cos(angleRad),
         y: servingCenter.y + rc * Math.sin(angleRad)
       };
       worstMetrics.push(calculateMetricsForPos(vertex));
    }
    const worstCase = worstMetrics.reduce((prev, curr) => curr.sir < prev.sir ? curr : prev);

    // Merge worst case results into tiers for display
    const mergedTiers = currentMetrics.tiers.map((t, idx) => ({
      ...t,
      worstCaseSir: worstCase.tiers[idx].sir
    }));

    const totalReturnedPowerWatts = currentMetrics.interferers.reduce((sum, i) => sum + i.pWatts, 0);
    const finalInterferers = currentMetrics.interferers.map(i => {
       return {
         ...i,
         contributionPercentage: totalReturnedPowerWatts > 0 ? (i.pWatts / totalReturnedPowerWatts) * 100 : 0,
         sirImpact: calculateSir(currentMetrics.desiredPower, i.pDbm),
       };
    });

    return {
      metrics: {
        sir: currentMetrics.sir,
        rawSir: currentMetrics.sir,
        desiredPower: currentMetrics.desiredPower,
        totalInterferencePower: currentMetrics.totalInterferencePower,
        coChannelInterference: wattsToDbm(currentMetrics.totalCciWatts),
        adjacentChannelInterference: wattsToDbm(currentMetrics.aciWatts),
        reuseDistance: calculateReuseDistance(rc, N),
        reuseRatio: calculateReuseRatio(N),
        capacityFactor: 1/N,
        channelsPerCell: totalChannels / N,
        interferersCount: finalInterferers.length,
        aciSir: currentMetrics.aciSir,
        worstCaseSir: worstCase.sir,
        tiers: mergedTiers
      },
      interferers: finalInterferers,
      worstInterferers: worstCase.interferers
    };
  }, [interferenceMode, activeTab, selectedCell, interferenceMobilePos, interferenceN, rc, gridData.cells, N, totalChannels, interferenceTier, interferenceType, filterQuality, isPowerControlActive, sectoringMode]);

  const startHandoverSimulation = () => {
    setHandoverStage('idle');
    setSimulationProgress(0);
    setIsSimulating(true);
  };

  const resetHandover = () => {
    setIsSimulating(false);
    setHandoverStage('idle');
    setSimulationProgress(0);
    setMobilePos({ q: 0, r: 0 });
  };

  // Define a path that crosses an adjacent cell boundary
  // (0,0) to (1,0) are adjacent
  const pathStart = { q: 0, r: 0 };
  const pathEnd = { q: 1, r: 0 };

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulationProgress(prev => {
        // Linear scaling with respect to speed: at 60 km/h, step is 0.005 (runs in ~3.3 seconds)
        const step = (speed / 60) * 0.005;
        const next = prev + step;
        if (next >= 1) {
          setIsSimulating(false);
          return 1;
        }
        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [isSimulating, speed]);

  useEffect(() => {
    // Update mobile position based on progress
    const q = pathStart.q + (pathEnd.q - pathStart.q) * simulationProgress;
    const r = pathStart.r + (pathEnd.r - pathStart.r) * simulationProgress;
    setMobilePos({ q, r });

    // Find source and target cells
    // Source is (0,0) initially
    const currentSource = gridData.cells.find(c => c.q === 0 && c.r === 0) || null;
    setSourceCell(currentSource);

    // Target is (1,0)
    const currentTarget = gridData.cells.find(c => c.q === 1 && c.r === 0) || null;
    setTargetCell(currentTarget);

    if (!currentSource || !currentTarget) return;

    // Calculate distances and powers
    const sourcePixel = axialToPixel(currentSource.q, currentSource.r, rc);
    const mobilePixel = axialToPixel(q, r, rc);

    const distSource = Math.sqrt(Math.pow(mobilePixel.x - sourcePixel.x, 2) + Math.pow(mobilePixel.y - sourcePixel.y, 2));

    // Determine the mathematically precise stage based on physical thresholds
    let nextStage: 'idle' | 'initiating' | 'executing' | 'completed' = 'idle';
    if (!isSimulating && simulationProgress === 0) {
      nextStage = 'idle';
    } else if (distSource < initiationDistance) {
      nextStage = 'idle';
    } else if (distSource >= initiationDistance && distSource < completionDistance) {
      nextStage = 'initiating';
    } else if (distSource >= completionDistance && simulationProgress < 0.95) {
      nextStage = 'executing';
    } else {
      nextStage = 'completed';
    }

    if (nextStage !== handoverStage) {
      setHandoverStage(nextStage);
    }
  }, [simulationProgress, isSimulating, gridData.cells, rc, initiationDistance, completionDistance, handoverStage]);

  const sourcePixel = axialToPixel(sourceCell?.q || 0, sourceCell?.r || 0, rc);
  const targetPixel = axialToPixel(targetCell?.q || 1, targetCell?.r || 0, rc);
  const mobilePixel = axialToPixel(mobilePos.q, mobilePos.r, rc);
  const distSource = Math.sqrt(Math.pow(mobilePixel.x - sourcePixel.x, 2) + Math.pow(mobilePixel.y - sourcePixel.y, 2));
  const distTarget = Math.sqrt(Math.pow(mobilePixel.x - targetPixel.x, 2) + Math.pow(mobilePixel.y - targetPixel.y, 2));
  const pSource = calculateReceivedPower(distSource, -70, rc, pathLossExponent); // Reference power P_edge is -70 dBm
  const pTarget = calculateReceivedPower(distTarget, -70, rc, pathLossExponent);
  const boundaryDist = (rc * Math.sqrt(3)) / 2;
  const timeToEdge = Math.max(0, (boundaryDist - distSource) / (speed / 3.6));

  const handoverState: HandoverState = {
    isActive: isSimulating,
    mobilePosition: mobilePos,
    sourceCell: sourceCell ? { ...sourceCell } : null,
    targetCell: targetCell ? { ...targetCell } : null,
    speed,
    handoverStage,
    initiationDistance,
    completionDistance,
    timeToEdge,
    hysteresisMargin,
    pathLossExponent,
    pMinThreshold
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-100 transition-colors duration-500 bg-[#F8F9FA] text-slate-900`}>
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 backdrop-blur-md border-b z-50 px-6 py-4 flex items-center justify-between transition-all duration-500 bg-white/80 border-slate-200`}>
        <div className="flex items-center gap-3">
          <div className={`bg-slate-900 p-2 rounded-lg`}>
            <Grid3X3 className={`w-6 h-6 text-white`} />
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight text-slate-900`}>Cellular Network Architect</h1>
            <p className={`text-xs font-medium uppercase tracking-widest text-slate-500`}>Technical Visualization System</p>
          </div>
        </div>
        
        <div className={`flex p-1 rounded-xl border transition-all duration-500 bg-slate-100 border-slate-200`}>
          <button 
            onClick={() => { setActiveTab('sir'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sir' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            SIR Simulation
          </button>
          <button 
            onClick={() => { setActiveTab('network'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'network' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Network Design
          </button>
          <button 
            onClick={() => { setActiveTab('fading'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'fading' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Small Scale Fading
          </button>
          <button 
            onClick={() => { setActiveTab('interference'); setInterferenceMode(true); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'interference' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Interference Analysis
          </button>
          <button 
            onClick={() => { setActiveTab('trunking'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'trunking' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Trunking Analysis
          </button>
          <button 
            onClick={() => { setActiveTab('propagation'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'propagation' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Large Scale Fading
          </button>
          <button 
            onClick={() => { setActiveTab('formulas'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'formulas' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Formula Sheet
          </button>
          <button 
            onClick={() => { setActiveTab('mitigation'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'mitigation' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Mitigation
          </button>
          <button 
            onClick={() => { setActiveTab('modulation'); setInterferenceMode(false); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'modulation' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Modulation
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
            <span className={`text-sm font-mono font-bold flex items-center gap-1.5 text-green-600`}>
              <span className={`w-2 h-2 rounded-full animate-pulse bg-green-500`} />
              SYSTEM_ACTIVE
            </span>
          </div>
        </div>
      </header>

      <main className={`transition-all duration-500 ${activeTab === 'sir' || activeTab === 'network' || activeTab === 'modulation' ? 'px-0 max-w-none' : 'px-6 max-w-[1600px] mx-auto'} pt-24 pb-12`}>
        {activeTab === 'sir' ? (
          <div className="h-[calc(100vh-6rem)] overflow-hidden">
            <SirSimulation mode="sir" />
          </div>
        ) : activeTab === 'modulation' ? (
          <div className="h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
            <NetworkSimulation initialShowModulation={true} />
          </div>
        ) : activeTab === 'fading' ? (
          <div className="h-[calc(100vh-6rem)] overflow-hidden">
            <FadingSimulation />
          </div>
        ) : activeTab === 'network' ? (
          <div className="h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
            <div className="bg-white border-b border-slate-200 px-8 py-2 flex items-center gap-4 z-30">
              <button 
                onClick={() => setNetworkSubTab('planning')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  networkSubTab === 'planning' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Planning & Design
              </button>
              <button 
                onClick={() => setNetworkSubTab('splitting')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  networkSubTab === 'splitting' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Cell Splitting
              </button>
              <button 
                onClick={() => setNetworkSubTab('operations')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  networkSubTab === 'operations' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Live Operations
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {networkSubTab === 'planning' ? <NetworkDesignTool /> : networkSubTab === 'splitting' ? <CellSplittingTool /> : <NetworkSimulation />}
            </div>
          </div>
        ) : activeTab === 'propagation' ? (
          <div className="h-[calc(100vh-6rem)] overflow-hidden">
            <PropagationModule />
          </div>
        ) : activeTab === 'formulas' ? (
          <div className="h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
            <FormulaReference />
          </div>
        ) : activeTab === 'mitigation' ? (
          <div className="h-[calc(100vh-6rem)] overflow-hidden">
            <MitigationModule />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar: Controls & Parameters */}
        <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {activeTab === 'interference' && (
            <>
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-orange-500" />
                  <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Interference Analysis</h2>
                </div>

                {/* Main Tabs: CCI / ACI */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                  {['cci', 'aci'].map(type => (
                    <button
                      key={type}
                      onClick={() => setInterferenceType(type as any)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        interferenceType === type 
                          ? 'bg-white text-orange-600 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  {interferenceType === 'cci' ? (
                    <>
                      {/* Analysis Tier Control Panel */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis Tiers</label>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Rings:</span>
                            <input 
                              type="number" 
                              min="1" 
                              max="100"
                              value={interferenceTier}
                              onChange={(e) => setInterferenceTier(Math.max(1, Math.min(100, Number(e.target.value))))}
                              className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-orange-600 text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                            />
                          </div>
                        </div>
                        <input 
                          type="range" min="1" max="25" step="1"
                          value={interferenceTier > 25 ? 25 : interferenceTier} 
                          onChange={(e) => setInterferenceTier(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-widest px-0.5">
                          <span>Local</span>
                          <span>Regional</span>
                          <span>Network Wide</span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic leading-tight">
                          Assessment depth: {interferenceTier} concentric rings ({3 * interferenceTier * (interferenceTier + 1)} total interferers).
                        </p>
                      </div>

                      {/* Path Loss Exponent */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-xs font-bold text-slate-500 uppercase">Path Loss Exponent (n)</label>
                          <span className="text-sm font-mono font-bold text-slate-900">{interferenceN}</span>
                        </div>
                        <input 
                          type="range" min="2" max="6" step="0.5"
                          value={interferenceN} onChange={(e) => setInterferenceN(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                        <p className="text-[10px] text-slate-400 italic">
                          {interferenceN === 2 ? 'Free Space' : interferenceN <= 3 ? 'Sub-urban' : interferenceN <= 4 ? 'Urban' : 'Dense Urban'}
                        </p>
                      </div>

                      {/* Cell Sectoring Configuration inside Interference Panel */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cell Sectoring</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          {(['omni', '120', '60'] as const).map(mode => (
                            <button
                              key={mode}
                              onClick={() => setSectoringMode(mode)}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                sectoringMode === mode 
                                  ? 'bg-white text-orange-600 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {mode === 'omni' ? 'Omni' : mode === '120' ? '120°' : '60°'}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 italic leading-tight">
                          {sectoringMode === 'omni' && 'Omnidirectional baseline with 6 co-channel interferers.'}
                          {sectoringMode === '120' && '3-sector model: co-channel interferers reduced to 2.'}
                          {sectoringMode === '60' && '6-sector model: co-channel interferers reduced to 1.'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* ACI Parameters */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <label className="text-xs font-bold text-slate-500 uppercase">Filter Quality</label>
                          <span className="text-sm font-mono font-bold text-slate-900">{(filterQuality * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={filterQuality} onChange={(e) => setFilterQuality(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      <button 
                        onClick={() => setIsPowerControlActive(!isPowerControlActive)}
                        className={`w-full flex items-center justify-between px-4 py-2 rounded-xl border transition-all ${isPowerControlActive ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}
                      >
                        <span className="text-xs font-bold">Power Control</span>
                        <div className={`w-8 h-4 rounded-full relative transition-colors ${isPowerControlActive ? 'bg-orange-500' : 'bg-slate-200'}`}>
                          <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${isPowerControlActive ? 'right-1 bg-white' : 'left-1 bg-slate-400'}`} />
                        </div>
                      </button>
                    </>
                  )}

                  {/* Common Controls */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase">Target SIR (dB)</label>
                      <span className="text-sm font-mono font-bold text-slate-900">{targetSir} dB</span>
                    </div>
                    <input 
                      type="range" min="5" max="25" step="1"
                      value={targetSir} onChange={(e) => setTargetSir(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => setShowInterferers(!showInterferers)}
                      className={`w-full flex items-center justify-between px-4 py-2 rounded-xl border transition-all ${showInterferers ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      <span className="text-xs font-bold">Highlight Interferers</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${showInterferers ? 'bg-orange-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${showInterferers ? 'right-1 bg-white' : 'left-1 bg-slate-400'}`} />
                      </div>
                    </button>
                  </div>

                  {/* Worst Case Toggle */}
                  <button 
                    onClick={() => {
                      setIsWorstCase(!isWorstCase);
                      if (!isWorstCase) {
                        setInterferenceMobilePos({ q: 0.66, r: -0.33 });
                      } else {
                        setInterferenceMobilePos({ q: 0, r: 0 });
                      }
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-sm ${isWorstCase ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-900 text-white shadow-slate-200'}`}
                  >
                    {isWorstCase ? 'EXIT WORST-CASE' : 'SNAP TO WORST-CASE'}
                  </button>

                  {/* Handover Simulation Toggle and Parameters */}
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <button 
                      onClick={() => setHandoverMode(!handoverMode)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${handoverMode ? 'bg-emerald-100 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                      <span className="text-xs font-bold">ENABLE HANDOVER SIMULATION</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${handoverMode ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${handoverMode ? 'right-1 bg-white' : 'left-1 bg-slate-400'}`} />
                      </div>
                    </button>

                    {handoverMode && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4 animate-fadeIn">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-1">Simulation Parameters</div>

                        {/* Speed parameter */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Mobile Speed (v)</span>
                            <span className="text-xs font-mono font-bold text-slate-800">{speed} km/h</span>
                          </div>
                          <input 
                            type="range" min="15" max="150" step="5"
                            value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded accent-emerald-500"
                          />
                        </div>

                        {/* Hysteresis margin Δ */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Hysteresis Margin (Δ)</span>
                            <span className="text-xs font-mono font-bold text-slate-800">{hysteresisMargin} dB</span>
                          </div>
                          <input 
                            type="range" min="0" max="10" step="0.5"
                            value={hysteresisMargin} onChange={(e) => setHysteresisMargin(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded accent-emerald-500"
                          />
                        </div>

                        {/* P_min threshold */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">P_min Threshold</span>
                            <span className="text-xs font-mono font-bold text-slate-800">{pMinThreshold} dBm</span>
                          </div>
                          <input 
                            type="range" min="-110" max="-75" step="1"
                            value={pMinThreshold} onChange={(e) => setPMinThreshold(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded accent-emerald-500"
                          />
                        </div>

                        {/* Path Loss Exponent for Handover */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Path Loss α</span>
                            <span className="text-xs font-mono font-bold text-slate-800">{pathLossExponent}</span>
                          </div>
                          <input 
                            type="range" min="2" max="6" step="0.5"
                            value={pathLossExponent} onChange={(e) => setPathLossExponent(Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded accent-emerald-500"
                          />
                        </div>

                        {/* Simulation trigger buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={startHandoverSimulation}
                            disabled={isSimulating}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all text-white shadow-sm ${isSimulating ? 'bg-slate-300 text-slate-500 cursor-not-allowed border-none' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]'}`}
                          >
                            {isSimulating ? 'Simulating...' : 'Start'}
                          </button>
                          <button
                            onClick={resetHandover}
                            className="flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all bg-slate-800 hover:bg-slate-950 text-white active:scale-[0.98]"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
              <FormulasPanel />
            </>
          )}

          {activeTab === 'trunking' && (
            <>
              <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                  <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Trunking Parameters</h2>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
                  <button
                    onClick={() => setTrunkingState(prev => ({ ...prev, mode: 'compute-gos' }))}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                      trunkingState.mode === 'compute-gos' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    COMPUTE GOS
                  </button>
                  <button
                    onClick={() => setTrunkingState(prev => ({ ...prev, mode: 'compute-channels' }))}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${
                      trunkingState.mode === 'compute-channels' 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    COMPUTE CHANNELS
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Number of Users */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase">Number of Users (U)</label>
                      <span className="text-sm font-mono font-bold text-slate-900">{trunkingState.numUsers}</span>
                    </div>
                    <input 
                      type="range" min="100" max="5000" step="100"
                      value={trunkingState.numUsers} onChange={(e) => setTrunkingState(prev => ({ ...prev, numUsers: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Call Arrival Rate */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase">Arrival Rate (λ)</label>
                      <span className="text-sm font-mono font-bold text-slate-900">{trunkingState.arrivalRate} calls/hr</span>
                    </div>
                    <input 
                      type="range" min="0.5" max="10" step="0.5"
                      value={trunkingState.arrivalRate} onChange={(e) => setTrunkingState(prev => ({ ...prev, arrivalRate: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Average Holding Time */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase">Holding Time (H)</label>
                      <span className="text-sm font-mono font-bold text-slate-900">{trunkingState.holdingTime} min</span>
                    </div>
                    <input 
                      type="range" min="1" max="10" step="0.5"
                      value={trunkingState.holdingTime} onChange={(e) => setTrunkingState(prev => ({ ...prev, holdingTime: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Number of Channels */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase">Available Channels (C)</label>
                      <span className="text-sm font-mono font-bold text-slate-900">{trunkingState.numChannels}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" min="1" max="200" step="1"
                        value={trunkingState.numChannels} onChange={(e) => setTrunkingState(prev => ({ ...prev, numChannels: Number(e.target.value) }))}
                        className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <button 
                        onClick={() => {
                          if (interferenceMetrics) {
                            setTrunkingState(prev => ({ ...prev, numChannels: Math.floor(interferenceMetrics.metrics.channelsPerCell) }));
                          }
                        }}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        title="Sync with Network Design"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      Sync button uses channels per cell from Network Design.
                    </p>
                  </div>

                  {/* Target GoS */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-slate-500 uppercase">Target GoS</label>
                      <span className="text-sm font-mono font-bold text-slate-900">{(trunkingState.targetGos * 100).toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range" min="0.005" max="0.1" step="0.005"
                      value={trunkingState.targetGos} onChange={(e) => setTrunkingState(prev => ({ ...prev, targetGos: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <p className="text-[10px] text-indigo-700 leading-relaxed font-medium text-center">
                      Trunking allows a limited pool of radio channels to efficiently serve many users with random call activity.
                    </p>
                  </div>

                  {/* Cell Sectoring Configuration inside Trunking Panel */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cell Sectoring</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      {(['omni', '120', '60'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setSectoringMode(mode)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            sectoringMode === mode 
                              ? 'bg-white text-indigo-600 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {mode === 'omni' ? 'Omni' : mode === '120' ? '120°' : '60°'}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic leading-tight">
                      {sectoringMode === 'omni' && 'Omnidirectional mode: All channels are pooled together.'}
                      {sectoringMode === '120' && `3-sector: Channels are divided into 3 groups of ${Math.max(1, Math.floor(trunkingState.numChannels / 3))} channels per sector.`}
                      {sectoringMode === '60' && `6-sector: Channels are divided into 6 groups of ${Math.max(1, Math.floor(trunkingState.numChannels / 6))} channels per sector.`}
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </aside>

        {/* Center: Main Diagram or Trunking Analysis */}
        <section className="lg:col-span-6 flex flex-col gap-6">
          {activeTab === 'trunking' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900">Cellular Trunking & Busy Hour Capacity Analysis</h2>
                    <p className="text-slate-500">Statistical sharing of limited radio channels among many cellular users</p>
                  </div>
                  <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                    <Activity size={20} className="text-indigo-600" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Target GoS</span>
                      <span className="text-sm font-bold text-indigo-700">{(trunkingState.targetGos * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <TrunkingMetricsPanel metrics={trunkingMetrics} state={trunkingState} sectoringMode={sectoringMode} />
                
                <TrunkingCharts metrics={trunkingMetrics} state={trunkingState} />
                
                {/* Educational Overlay Section */}
                <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">How Cellular Trunking Works</h3>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col items-center text-center max-w-[120px] mx-auto group">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-3 border border-indigo-200 group-hover:scale-110 group-hover:shadow-md transition-all">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 mb-1">Many Users</div>
                      <p className="text-[9px] text-slate-600 leading-tight">Users generate random intermittent traffic</p>
                    </div>

                    <ArrowRight className="text-indigo-300 w-5 h-5 hidden md:block" />

                    <div className="flex flex-col items-center text-center max-w-[120px] mx-auto group">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-600 mb-3 border border-purple-200 group-hover:scale-110 group-hover:shadow-md transition-all">
                        <Radio className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 mb-1">Shared Channel Pool</div>
                      <p className="text-[9px] text-slate-600 leading-tight">Channels assigned only during active calls</p>
                    </div>

                    <ArrowRight className="text-purple-300 w-5 h-5 hidden md:block" />

                    <div className="flex flex-col items-center text-center max-w-[120px] mx-auto group">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 mb-3 border border-indigo-200 group-hover:scale-110 group-hover:shadow-md transition-all">
                        <Settings2 className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 mb-1">Dynamic Allocation</div>
                      <p className="text-[9px] text-slate-600 leading-tight">Statistical multiplexing improves efficiency</p>
                    </div>

                    <ArrowRight className="text-indigo-300 w-5 h-5 hidden md:block" />

                    <div className="flex flex-col items-center text-center max-w-[120px] mx-auto group">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 mb-3 border border-emerald-200 group-hover:scale-110 group-hover:shadow-md transition-all">
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 mb-1">Efficient Spectrum Use</div>
                      <p className="text-[9px] text-slate-600 leading-tight">Limited spectrum supports many subscribers</p>
                    </div>
                  </div>
                </div>

                <BusyHourAnalysis 
                  metrics={trunkingMetrics} 
                  state={trunkingState} 
                  onUpdateState={(newState) => setTrunkingState(prev => ({ ...prev, ...newState }))}
                />
                
                {/* Final Insight Box */}
                <div className="mt-8 bg-slate-900 border-l-4 border-indigo-500 p-6 rounded-r-2xl shadow-lg">
                  <div className="flex gap-4 items-start">
                    <Info className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
                    <div>
                      <h4 className="text-white font-bold mb-2">Engineering Insight</h4>
                      <p className="text-slate-300 leading-relaxed text-sm">
                        Cellular trunking uses statistical multiplexing to allow thousands of users to share limited radio resources efficiently while maintaining acceptable Grade of Service during busy hour traffic.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'interference' ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative aspect-square lg:aspect-auto lg:h-[800px]">
              {/* Diagram Label */}
              <div className="absolute top-6 left-6 z-10 flex gap-2">
                <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Maximize2 className="w-3 h-3" />
                    Network Geometry View
                  </span>
                </div>
                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-full border border-slate-200 shadow-sm text-[10px] font-bold text-slate-600">
                  Zoom: {(zoom * 100).toFixed(0)}%
                </div>
                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-full border border-slate-200 shadow-sm text-[10px] font-bold text-slate-400">
                  Scroll to Zoom • Drag to Pan
                </div>
                <button 
                  onClick={() => {
                    setZoom(1);
                    setPanOffset({ x: 0, y: 0 });
                  }}
                  className="bg-white/90 backdrop-blur px-3 py-2 rounded-full border border-slate-200 shadow-sm text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Reset View
                </button>
              </div>

              <svg 
                ref={svgRef}
                viewBox={`${panOffset.x - (width + 100) / (2 * zoom)} ${panOffset.y - (height + 100) / (2 * zoom)} ${(width + 100) / zoom} ${(height + 100) / zoom}`}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                preserveAspectRatio="xMidYMid meet"
                onMouseDown={(e) => {
                  if (e.button === 1 || e.button === 2 || (e.button === 0 && !interferenceMode)) {
                    setIsPanning(true);
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                  } else if (e.button === 0 && interferenceMode) {
                    setIsDragging(true);
                  }
                }}
                onMouseMove={(e) => {
                  if (isPanning) {
                    const dx = e.clientX - lastMousePos.x;
                    const dy = e.clientY - lastMousePos.y;
                    const svg = e.currentTarget;
                    const CTM = svg.getScreenCTM();
                    if (CTM) {
                      setPanOffset(prev => ({
                        x: prev.x - dx / CTM.a,
                        y: prev.y - dy / CTM.d
                      }));
                    }
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                  } else if (isDragging && interferenceMode) {
                    const svg = e.currentTarget;
                    const point = svg.createSVGPoint();
                    point.x = e.clientX;
                    point.y = e.clientY;
                    const transformedPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
                    
                    const axial = pixelToAxial(transformedPoint.x, transformedPoint.y, rc);
                    setInterferenceMobilePos(axial);
                    setIsWorstCase(false);
                  }
                }}
                onMouseUp={() => {
                  setIsDragging(false);
                  setIsPanning(false);
                }}
                onMouseLeave={() => {
                  setIsDragging(false);
                  setIsPanning(false);
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <defs>
                  <pattern id="dotGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#E2E8F0" />
                  </pattern>
                  <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
                    <feOffset dx="0" dy="1" result="offsetblur" />
                    <feComponentTransfer>
                      <feFuncA type="linear" slope="0.3" />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#dotGrid)" />

                {/* Service Area Boundary */}
                <rect 
                  x={-width/2} y={-height/2} width={width} height={height}
                  fill="none" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="8,4" 
                />

                {/* Individual Hexagons */}
                <g id="cells">
                  {gridData.cells.map((cell, i) => {
                    const center = axialToPixel(cell.q, cell.r, rc);
                    const vertices = getHexVertices(center, rc);
                    const path = `M ${vertices.map(v => `${v.x},${v.y}`).join(' L ')} Z`;
                    const cellColor = getFrequencyColor(cell.f, currentN);
                    const contrastColor = getContrastColor(cell.f, currentN);
                    const isSelectedGroup = selectedFrequencyGroup === (cell.f % currentN);
                    
                    const isServing = interferenceMode && selectedCell?.q === cell.q && selectedCell?.r === cell.r;
                    const interferer = interferenceMode && interferenceMetrics?.interferers.find(i => i.q === cell.q && i.r === cell.r);
                    const isInterferer = !!interferer;
                    
                    // Visibility logic based on selected tier or frequency group
                    let cellOpacity = 0.9;
                    if (interferenceMode) {
                      if (!isServing && !isInterferer) {
                        cellOpacity = 0; // Make others invisible as requested
                      }
                    } else if (selectedFrequencyGroup !== null) {
                      if (!isSelectedGroup) {
                        cellOpacity = 0.1; // Dim others when a specific group is selected
                      }
                    }

                    let cellFill = (interferenceMode || selectedFrequencyGroup === null || isSelectedGroup) ? cellColor : '#F1F5F9';
                    
                    return (
                      <g 
                        key={`${cell.q}-${cell.r}`} 
                        className="transition-all duration-300 cursor-pointer"
                        onClick={() => {
                          if (interferenceMode) {
                            setSelectedCell(cell);
                          } else {
                            // If not in interference mode, clicking a cell could also select its group
                            setSelectedFrequencyGroup(cell.f % FREQUENCIES.length);
                          }
                        }}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <path 
                          d={path} 
                          fill={cellFill} 
                          stroke={isServing ? "#F59E0B" : "#000000"} 
                          strokeWidth={isServing ? "4" : "1.5"} 
                          className="transition-opacity duration-300"
                          style={{ opacity: cellOpacity }}
                        />
                        {interferenceMode && showInterferers && isInterferer && (
                          <path 
                            d={path} 
                            fill="none" 
                            stroke={
                              interferer.tier === 1 ? "#EF4444" : 
                              interferer.tier === 2 ? "#F97316" : 
                              interferer.tier === 3 ? "#A855F7" :
                              interferer.tier === 4 ? "#3B82F6" : 
                              "#10B981"
                            } 
                            strokeWidth="3" 
                            className="animate-pulse"
                            style={{ opacity: cellOpacity }}
                          />
                        )}
                        {showLabels && cellOpacity > 0.1 && (
                          <text 
                            x={center.x} y={center.y} 
                            textAnchor="middle" dominantBaseline="middle"
                            className="font-black text-[14px] pointer-events-none"
                            fill={contrastColor}
                            style={{ filter: 'url(#labelShadow)' }}
                          >
                            {cell.f + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* Hover Tooltip Overlay */}
                <AnimatePresence>
                  {interferenceMode && hoveredCell && (
                    <motion.g
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      pointerEvents="none"
                    >
                      {(() => {
                        const center = axialToPixel(hoveredCell.q, hoveredCell.r, rc);
                        const interferer = interferenceMetrics?.interferers.find(i => i.q === hoveredCell.q && i.r === hoveredCell.r);
                        const worstInterferer = interferenceMetrics?.worstInterferers.find(i => i.q === hoveredCell.q && i.r === hoveredCell.r);
                        const isServing = selectedCell?.q === hoveredCell.q && selectedCell?.r === hoveredCell.r;

                        if (!interferer && !isServing) return null;

                        return (
                          <g transform={`translate(${center.x}, ${center.y - rc - 10})`}>
                            <rect 
                              x="-70" y="-65" width="140" height="60" rx="8" 
                              fill="#0f172a" stroke="#1e293b" strokeWidth="1"
                              className="shadow-xl"
                            />
                            <text x="0" y="-50" textAnchor="middle" fill="white" className="text-[10px] font-bold uppercase tracking-wider">
                              {isServing ? "Serving Cell" : `Interferer (T${interferer?.tier})`}
                            </text>
                            {!isServing && interferer && (
                              <>
                                <text x="0" y="-35" textAnchor="middle" fill="#94a3b8" className="text-[9px] font-mono">
                                  Normal: {interferer.contributionPercentage.toFixed(1)}% | {interferer.sirImpact.toFixed(1)} dB
                                </text>
                                {worstInterferer && (
                                  <text x="0" y="-22" textAnchor="middle" fill="#ef4444" className="text-[9px] font-mono">
                                    Worst: {worstInterferer.contributionPercentage.toFixed(1)}% | {worstInterferer.sirImpact.toFixed(1)} dB
                                  </text>
                                )}
                              </>
                            )}
                          </g>
                        );
                      })()}
                    </motion.g>
                  )}
                </AnimatePresence>

                {/* Cluster Borders (Most Prominent) */}
                <g id="clusters">
                  {clusterPaths.map((path, i) => (
                    <motion.path 
                      key={i}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      d={path} 
                      fill="none" 
                      stroke="black" 
                      strokeWidth="4" 
                      strokeLinejoin="round"
                      className="drop-shadow-sm"
                    />
                  ))}
                </g>

                {/* Basis Vectors */}
                {showVectors && (
                  <g id="vectors" transform={`translate(${-width/2 + 20}, ${height/2 - 20})`}>
                    {/* i vector at 60 degrees */}
                    <g>
                      <line 
                        x1="0" y1="0" 
                        x2={60 * Math.cos(Math.PI/3)} 
                        y2={-60 * Math.sin(Math.PI/3)} 
                        stroke="black" strokeWidth="3" markerEnd="url(#arrow)" 
                      />
                      <text 
                        x={75 * Math.cos(Math.PI/3)} 
                        y={-75 * Math.sin(Math.PI/3)} 
                        className="font-bold text-sm italic"
                        textAnchor="middle"
                      >i</text>
                    </g>
                    {/* j vector upward (90 degrees) */}
                    <g>
                      <line 
                        x1="0" y1="0" 
                        x2="0" 
                        y2="-60" 
                        stroke="black" strokeWidth="3" markerEnd="url(#arrow)" 
                      />
                      <text 
                        x="0" 
                        y="-75" 
                        className="font-bold text-sm italic" 
                        textAnchor="middle"
                      >j</text>
                    </g>
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="black" />
                      </marker>
                    </defs>
                  </g>
                )}

                {/* Handover Simulation Layer */}
                {handoverMode && (
                  <g id="handover-layer">
                    {/* Path Line */}
                    <line 
                      x1={axialToPixel(pathStart.q, pathStart.r, rc).x} 
                      y1={axialToPixel(pathStart.q, pathStart.r, rc).y}
                      x2={axialToPixel(pathEnd.q, pathEnd.r, rc).x} 
                      y2={axialToPixel(pathEnd.q, pathEnd.r, rc).y}
                      stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4"
                    />

                    {/* Initiation Point Marker */}
                    {(() => {
                      const start = axialToPixel(pathStart.q, pathStart.r, rc);
                      const end = axialToPixel(pathEnd.q, pathEnd.r, rc);
                      const dx = end.x - start.x;
                      const dy = end.y - start.y;
                      const totalDist = Math.sqrt(dx * dx + dy * dy);
                      const ratio = initiationDistance / totalDist;
                      const cx = start.x + dx * ratio;
                      const cy = start.y + dy * ratio;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r="5" fill="#EAB308" stroke="white" strokeWidth="1.5" className="drop-shadow-sm" />
                          <text x={cx} y={cy - 10} textAnchor="middle" className="text-[9px] font-extrabold fill-amber-700 bg-white">P_min</text>
                        </g>
                      );
                    })()}

                    {/* Completion Point Marker */}
                    {(() => {
                      const start = axialToPixel(pathStart.q, pathStart.r, rc);
                      const end = axialToPixel(pathEnd.q, pathEnd.r, rc);
                      const dx = end.x - start.x;
                      const dy = end.y - start.y;
                      const totalDist = Math.sqrt(dx * dx + dy * dy);
                      const ratio = completionDistance / totalDist;
                      const cx = start.x + dx * ratio;
                      const cy = start.y + dy * ratio;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r="5" fill="#2563EB" stroke="white" strokeWidth="1.5" className="drop-shadow-sm" />
                          <text x={cx} y={cy - 10} textAnchor="middle" className="text-[9px] font-extrabold fill-blue-700 bg-white">Δ Handoff</text>
                        </g>
                      );
                    })()}

                    {/* Mobile User */}
                    <g transform={`translate(${mobilePixel.x}, ${mobilePixel.y})`}>
                      <circle r={rc * 0.25} fill="#3B82F6" fillOpacity="0.2" className="animate-ping" />
                      <circle r={rc * 0.15} fill="#3B82F6" stroke="white" strokeWidth="2" className="drop-shadow-lg" />
                      <circle r={rc * 0.15} fill="none" stroke="#3B82F6" strokeWidth="1" className="animate-pulse" />
                    </g>

                    {/* Cell Center Markers for Source/Target */}
                    <circle cx={sourcePixel.x} cy={sourcePixel.y} r="3" fill="#4ADE80" />
                    <circle cx={targetPixel.x} cy={targetPixel.y} r="3" fill="#60A5FA" />
                    
                    {/* Glow effects for active cells */}
                    {handoverStage !== 'idle' && (
                      <circle cx={sourcePixel.x} cy={sourcePixel.y} r={rc} fill="#4ADE80" fillOpacity="0.1" stroke="#4ADE80" strokeWidth="2" strokeDasharray="4 4" />
                    )}
                    {handoverStage === 'executing' && (
                      <circle cx={targetPixel.x} cy={targetPixel.y} r={rc} fill="#60A5FA" fillOpacity="0.1" stroke="#60A5FA" strokeWidth="2" strokeDasharray="4 4" />
                    )}
                  </g>
                )}

                {/* Interference Analysis Layer */}
                {interferenceMode && interferenceMetrics && (
                  <g id="interference-layer">
                    {/* Reuse Distance Circle */}
                    {selectedCell && (
                      <circle 
                        cx={axialToPixel(selectedCell.q, selectedCell.r, rc).x}
                        cy={axialToPixel(selectedCell.q, selectedCell.r, rc).y}
                        r={interferenceMetrics.metrics.reuseDistance}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                        strokeDasharray="8 4"
                        className="opacity-30"
                      />
                    )}

                    {/* Interference Arrows */}
                    {showInterferers && interferenceMetrics.interferers.slice(0, 30).map((interferer, idx) => {
                      const start = axialToPixel(interferer.q, interferer.r, rc);
                      const end = axialToPixel(interferenceMobilePos.q, interferenceMobilePos.r, rc);
                      
                      const tierColors = ["#EF4444", "#F97316", "#A855F7", "#3B82F6", "#10B981", "#64748B"];
                      const color = tierColors[(interferer.tier - 1) % tierColors.length];
                      
                      // Circular highlight region based on N
                      const highlightRadius = rc * (1 + 1/interferenceN);

                      return (
                        <g key={`arrow-${idx}`}>
                          <circle 
                            cx={start.x} cy={start.y} 
                            r={highlightRadius} 
                            fill={color} 
                            fillOpacity="0.05" 
                            stroke={color} 
                            strokeWidth="1" 
                            strokeDasharray="2 2"
                            className="opacity-40"
                          />
                          
                          <line 
                            x1={start.x} y1={start.y}
                            x2={end.x} y2={end.y}
                            stroke={color}
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            markerEnd="url(#interference-arrow)"
                            className="opacity-60"
                          />
                          <circle cx={start.x} cy={start.y} r={rc * 0.3} fill={color} fillOpacity="0.2" className="animate-ping" />
                          
                          {/* Tier Label */}
                          <text 
                            x={start.x} y={start.y - rc * 0.5} 
                            textAnchor="middle" 
                            fill={color} 
                            className="text-[8px] font-black"
                          >
                            T{interferer.tier}
                          </text>
                        </g>
                      );
                    })}

                    {/* Desired Signal Wave */}
                    {selectedCell && (
                      <g>
                        <line 
                          x1={axialToPixel(selectedCell.q, selectedCell.r, rc).x}
                          y1={axialToPixel(selectedCell.q, selectedCell.r, rc).y}
                          x2={axialToPixel(interferenceMobilePos.q, interferenceMobilePos.r, rc).x}
                          y2={axialToPixel(interferenceMobilePos.q, interferenceMobilePos.r, rc).y}
                          stroke="#F59E0B"
                          strokeWidth="3"
                          strokeDasharray="none"
                          className="opacity-40"
                        />
                      </g>
                    )}

                    {/* Mobile User in Interference Mode */}
                    <g 
                      transform={`translate(${axialToPixel(interferenceMobilePos.q, interferenceMobilePos.r, rc).x}, ${axialToPixel(interferenceMobilePos.q, interferenceMobilePos.r, rc).y})`}
                      className="cursor-move"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsDragging(true);
                      }}
                    >
                      <circle r={rc * 0.25} fill="#F59E0B" fillOpacity="0.2" className="animate-ping" />
                      <circle r={rc * 0.15} fill="#F59E0B" stroke="white" strokeWidth="2" className="drop-shadow-lg" />
                      <circle r={rc * 0.1} fill="#1E293B" />
                    </g>

                    <defs>
                      <marker id="interference-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
                      </marker>
                    </defs>
                  </g>
                )}
              </svg>

              {/* Formula Overlay */}
              <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-lg max-w-[280px]">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Network Capacity Formula</h4>
                <div className="font-mono text-xs space-y-1 text-slate-700">
                  <p className="flex justify-between">
                    <span>N<sub>cells</sub> ≈</span>
                    <span className="font-bold">πR<sub>s</sub>² / (3√3/2)R<sub>c</sub>²</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2 italic">Calculated value: {cellCount}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Right Sidebar: Legend & Details */}
        <aside className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <AnimatePresence mode="wait">

            {activeTab === 'interference' && interferenceMetrics && !handoverMode && (
              <motion.div
                key="interference-metrics"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className="space-y-6"
              >
                <SirGauge 
                  sir={interferenceMetrics.metrics.sir} 
                  targetSir={targetSir} 
                />
                <InterferenceTierAnalysis 
                  metrics={interferenceMetrics.metrics} 
                  type={interferenceType}
                />
                <InterfererTable 
                  interferers={interferenceMetrics.interferers} 
                />
                <InterferenceMetricsPanel 
                  metrics={interferenceMetrics.metrics} 
                  targetSir={targetSir}
                />
                <SirVsNGraph 
                  n={interferenceN} 
                  targetSir={targetSir} 
                />
                <SirVsPathLossGraph 
                  currentN={N} 
                  targetSir={targetSir} 
                />
                <InterferencePieChart 
                  interferers={interferenceMetrics.interferers} 
                />
              </motion.div>
            )}

            {activeTab === 'interference' && handoverMode && (
              <motion.div
                key="handover-metrics"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Grid3X3 className="w-5 h-5 text-emerald-500" />
                    <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Handover Metrics</h2>
                  </div>
                  <HandoverStatus state={handoverState} />
                </div>
                
                <MetricsPanel 
                  sourcePower={pSource} 
                  targetPower={pTarget} 
                  sourceDistance={distSource} 
                  targetDistance={distTarget} 
                />

                <PowerDistanceGraph 
                  sourcePower={pSource} 
                  targetPower={pTarget} 
                  distance={distSource} 
                  initiationPoint={initiationDistance} 
                  completionPoint={completionDistance} 
                  cellRadius={rc}
                  pathLossExponent={pathLossExponent}
                />

                <SpeedTriggerGraph 
                  currentSpeed={speed} 
                  cellRadius={rc} 
                />
              </motion.div>
            )}

            {activeTab === 'trunking' && (
              <motion.div
                key="trunking-summary"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 50, opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Traffic Summary</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Offered Traffic</span>
                      <span className="text-sm font-bold text-slate-900">{trunkingMetrics.totalOfferedTraffic.toFixed(2)} Erlang</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Blocking Prob.</span>
                      <span className={`text-sm font-bold ${trunkingMetrics.blockingProbB > trunkingState.targetGos ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {(trunkingMetrics.blockingProbB * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Utilization</span>
                      <span className="text-sm font-bold text-slate-900">{(trunkingMetrics.utilization * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-bold uppercase text-sm tracking-wider">Quick Calc</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase mb-1">Busy Hour Traffic</p>
                      <p className="text-lg font-bold">{trunkingMetrics.totalOfferedTraffic.toFixed(0)} Erlang</p>
                    </div>
                    <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                      <p className="text-[10px] text-slate-400 uppercase mb-1">GoS Target Achieved</p>
                      <p className={`text-lg font-bold ${trunkingMetrics.blockingProbB <= trunkingState.targetGos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trunkingMetrics.blockingProbB <= trunkingState.targetGos ? 'YES' : 'NO'}
                      </p>
                      {trunkingMetrics.blockingProbB > trunkingState.targetGos && (
                        <>
                          <p className="text-[10px] text-rose-300 mt-1 leading-tight mb-2">High Blocking Due to Limited Channels</p>
                          <button
                            onClick={() => {
                              const reqChannels = findRequiredChannels(trunkingMetrics.totalOfferedTraffic, trunkingState.targetGos);
                              setTrunkingState(prev => ({ ...prev, numChannels: reqChannels }));
                            }}
                            className="w-full py-1.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-bold rounded flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Settings2 size={12} />
                            Fix Issue
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400" />
                <h2 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Legend & Mapping</h2>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 border-b-2 border-black" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cluster</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-1.5 border-b border-slate-300 border-dashed" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cell</span>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* Frequency Mapping - Compact Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Frequency Groups (N={N})</h3>
                  {selectedFrequencyGroup !== null && (
                    <button 
                      onClick={() => setSelectedFrequencyGroup(null)}
                      className="text-[8px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: N }).map((_, idx) => (
                    <button 
                      key={`legend-${idx}`} 
                      onClick={() => setSelectedFrequencyGroup(selectedFrequencyGroup === idx ? null : idx)}
                      className={`group relative flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all border ${
                        selectedFrequencyGroup === idx 
                          ? 'bg-slate-100 border-slate-200 ring-2 ring-slate-200' 
                          : 'hover:bg-slate-50 border-transparent hover:border-slate-100'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black shadow-sm border border-black/10" style={{ backgroundColor: getFrequencyColor(idx, N), color: getContrastColor(idx, N) }}>
                        {/* Tiny hexagon inside group icon */}
                        <svg width="18" height="18" viewBox="-1.5 -1.5 3 3" className="opacity-80">
                            <polygon points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5" fill="none" stroke="currentColor" strokeWidth="0.2"/>
                        </svg>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500">{idx + 1}</span>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20">
                        Group {idx + 1}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex flex-col items-center mt-3 p-2 bg-slate-50 rounded-lg">
                  <div className="flex justify-center -space-x-1.5 mb-2">
                     <div className="w-6 h-6 flex items-center justify-center -mt-3"><svg width="16" height="16" viewBox="-1 -1 2 2"><polygon points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.1"/></svg></div>
                     <div className="w-6 h-6 flex items-center justify-center"><svg width="16" height="16" viewBox="-1 -1 2 2"><polygon points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5" fill="#0033CC" stroke="#000" strokeWidth="0.1"/></svg></div>
                     <div className="w-6 h-6 flex items-center justify-center -mt-3"><svg width="16" height="16" viewBox="-1 -1 2 2"><polygon points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5" fill="#FF0000" stroke="#000" strokeWidth="0.1"/></svg></div>
                  </div>
                  <p className="text-[10px] text-slate-700 font-medium text-center leading-tight">
                    Frequency reuse increases capacity while controlling interference.
                  </p>
                </div>
              </div>

              {/* Frequency Mapping Legend */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                   <Layers className="text-orange-500 w-5 h-5" />
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Frequency Reuse Legend</h3>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-9 gap-3">
                  {Array.from({ length: N }).map((_, idx) => (
                    <div 
                      key={idx}
                      className="flex flex-col items-center gap-1.5 group cursor-default"
                    >
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shadow-[0_4px_0_0_rgba(0,0,0,0.1)] border-2 border-slate-900 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: getFrequencyColor(idx, N), color: getContrastColor(idx, N) }}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Group {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reuse Geometry - Compact */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Reuse Factor</p>
                  <p className="text-xs font-mono font-bold text-slate-900">N = {N}</p>
                  <p className="text-[8px] text-slate-400 italic">i={iParam}, j={jParam}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Reuse Distance</p>
                  <p className="text-xs font-mono font-bold text-slate-900">D ≈ {(rc * Math.sqrt(3 * N)).toFixed(0)}px</p>
                  <p className="text-[8px] text-slate-400 italic">R<sub>c</sub> × √3N</p>
                </div>
              </div>

              {/* Handover Indicators - Only if active */}
              {handoverMode && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Mobile</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-yellow-500" />
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Initiate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-500" />
                    <span className="text-[9px] font-bold text-slate-600 uppercase">Complete</span>
                  </div>
                </div>
              )}

              {/* Technical Summary */}
              <div className="pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    <span className="font-bold text-slate-800">N={N} Pattern:</span> Minimizes co-channel interference by ensuring no adjacent cells share frequencies. 
                    Shift <span className="font-italic">{iParam}</span> cells along <span className="italic">i</span>, turn 60°, shift <span className="italic">{jParam}</span> along <span className="italic">j</span>.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </aside>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 py-8 px-6 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
          Cellular Network Visualization System &copy; 2026
        </p>
      </footer>
    </div>
  );
}
