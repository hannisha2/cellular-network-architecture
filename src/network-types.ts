/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModulationScheme } from './modulation-types';

export type UserState = 'IDLE' | 'CALLING' | 'BLOCKED' | 'DROPPED';

export interface NetworkUser {
  id: string;
  position: { x: number; z: number };
  velocity: { x: number; z: number };
  state: UserState;
  servingCellId: string | null;
  callDuration: number; // remaining time
  signalStrength: number; // dBm
  sinrDb: number; // dB
  modulation: ModulationScheme | null;
  throughput: number; // Mbps
  ber: number; // added for modulation view
  path: { x: number; z: number }[]; // for visualization
}

export interface NetworkCell {
  id: string;
  q: number;
  r: number;
  capacity: number; // total channels
  activeUsers: number;
  blockedCalls: number;
  droppedCalls: number;
  handovers: number;
  load: number; // 0 to 1
  isFailed: boolean;
}

export interface NetworkMetrics {
  totalUsers: number;
  activeCalls: number;
  droppedCalls: number;
  blockedCalls: number;
  blockingProbability: number;
  utilization: number;
  avgThroughput: number; // Mbps
}

export type ScenarioType = 'URBAN';
export type CitySize = 'SMALL_MEDIUM' | 'LARGE';

export interface NetworkScenario {
  type: ScenarioType;
  userDensity: number; // users per km2
  cellRadius: number;
  trafficIntensity: number; // Erlangs per user
  avgCallDuration: number; // seconds
}

export const SCENARIOS: Record<ScenarioType, NetworkScenario> = {
  URBAN: {
    type: 'URBAN',
    userDensity: 500,
    cellRadius: 5,
    trafficIntensity: 0.05,
    avgCallDuration: 120,
  },
};

export function calculateErlangB(A: number, N: number): number {
  if (A === 0) return 0;
  if (N === 0) return 1;
  let b = 1.0;
  for (let k = 1; k <= N; k++) {
    b = (A * b) / (k + A * b);
  }
  return b;
}

export interface NetworkDesignParams {
  i: number;
  j: number;
  clusterSizeN: number;
  totalChannelsS: number;
  cellRadiusR: number;
  pathLossN: number;
}

export interface DerivedParams {
  reuseRatio: number; // D/R
  coChannelDistance: number; // D
  channelsPerCell: number; // k = S/N
  interferenceEstimate: number; // q^-n
  capacityPerCell: number;
  totalSystemCapacity: number;
}

export const DESIGN_SCENARIOS: Record<ScenarioType, NetworkDesignParams> = {
  URBAN: {
    i: 2,
    j: 1,
    clusterSizeN: 7,
    totalChannelsS: 350,
    cellRadiusR: 5,
    pathLossN: 4,
  },
};

export const VALID_CLUSTERS = [
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

export function calculateTheoreticalSir(N: number, n: number, isWorstCase: boolean = false, sectoringMode: 'omni' | '120' | '60' = 'omni'): number {
  const Q = Math.sqrt(3 * N);
  const numInterferers = sectoringMode === '120' ? 2 : sectoringMode === '60' ? 1 : 6;
  
  if (isWorstCase) {
    // Worst Case with sector-scaled co-channel interferers:
    // Scale the general 6-interferer formula proportionally by (numInterferers / 6)
    const qMin = Math.max(0.1, Q - 1);
    const sumInterference = 2 * Math.pow(qMin, -n) + 2 * Math.pow(Q, -n) + 2 * Math.pow(Q + 1, -n);
    const scaledInterference = sumInterference * (numInterferers / 6);
    const sirLinear = 1 / scaledInterference;
    return 10 * Math.log10(sirLinear);
  } else {
    // Normal Case assumes numInterferers first-tier interferers are at distance D = Q * R.
    // SIR = (1/numInterferers) * (D/R)^n = (1/numInterferers) * Q^n
    const sirLinear = Math.pow(Q, n) / numInterferers;
    return 10 * Math.log10(sirLinear);
  }
}

export function calculateDerivedParams(params: NetworkDesignParams, sectoringMode: 'omni' | '120' | '60' = 'omni'): DerivedParams {
  const { clusterSizeN, totalChannelsS, cellRadiusR, pathLossN } = params;
  
  const reuseRatio = Math.sqrt(3 * clusterSizeN);
  const coChannelDistance = cellRadiusR * reuseRatio;
  const channelsPerCell = Math.floor(totalChannelsS / clusterSizeN);
  
  // Adjusted co-channel interferers count based on sectoring
  const numInterferers = sectoringMode === '120' ? 2 : sectoringMode === '60' ? 1 : 6;
  const interferenceEstimate = numInterferers * Math.pow(reuseRatio, -pathLossN);
  
  const capacityPerCell = channelsPerCell * 2.5; // Mbps (assuming 2.5Mbps per channel)
  const totalSystemCapacity = capacityPerCell * 100; // Assuming 100 cells in system
  
  return {
    reuseRatio,
    coChannelDistance,
    channelsPerCell,
    interferenceEstimate,
    capacityPerCell,
    totalSystemCapacity,
  };
}

export function getFrequencyGroups(totalChannels: number, N: number) {
  const groups: number[][] = [];
  const channelsPerGroup = Math.floor(totalChannels / N);
  
  for (let i = 0; i < N; i++) {
    const group: number[] = [];
    for (let j = 0; j < channelsPerGroup; j++) {
      group.push(i + 1 + j * N);
    }
    groups.push(group);
  }
  return groups;
}

// --- Propagation Models ---

export interface PropagationParams {
  frequencyMHz: number;
  txHeightM: number;
  rxHeightM: number;
  environment: ScenarioType;
  citySize: CitySize;
  isLOS: boolean;
  pathLossExponent: number;
  shadowingStdDev: number;
}

export interface LinkBudgetInputs {
  transmitPowerDbm: number;
  txAntennaGainDbi: number;
  rxAntennaGainDbi: number;
  hardwareLossDb: number;
  miscLossDb: number;
  bandwidthKhz: number;
  receiverNoiseFigureDb: number;
  targetEbNoDb: number;
  spectralEfficiency: number; // e.g., 2 for QPSK
  designMarginDb: number;
  totalAreaKm2: number;
  baseStationPrice: number;
}

export interface LinkBudgetResults {
  noiseFloorDbm: number;
  thresholdSnrDb: number;
  requiredRxPowerDbm: number;
  maxAllowablePathLossDb: number;
  coverageDistanceKm: number;
  cellAreaKm2: number;
  numCellsRequired: number;
  totalCost: number;
}

export function calculateNoiseFloor(bandwidthKhz: number, noiseFigureDb: number): number {
  return -174 + 10 * Math.log10(bandwidthKhz * 1000) + noiseFigureDb;
}

export function solveForDistance(maxPathLoss: number, params: PropagationParams, model: 'FSPL' | 'LOG_DISTANCE' | 'LOG_NORMAL' | 'OKUMURA_HATA' | 'COST231_HATA'): number {
  // Simple binary search or inverse algebraic solution for distance
  // Algebraic is possible for these models
  const f = params.frequencyMHz;
  const h_t = params.txHeightM;
  const h_r = params.rxHeightM;
  
  if (model === 'FSPL') {
    // L = 32.44 + 20log(d) + 20log(f)
    // 20log(d) = L - 32.44 - 20log(f)
    const logD = (maxPathLoss - 32.44 - 20 * Math.log10(f)) / 20;
    return Math.pow(10, logD);
  } else if (model === 'LOG_DISTANCE' || model === 'LOG_NORMAL') {
    // L = L(d0) + 10n log(d/d0)
    // Using d0 = 1km for outdoor cellular planning
    const d0 = 1.0;
    const Ld0 = calculateFSPL(d0, f);
    const logD_d0 = (maxPathLoss - Ld0) / (10 * params.pathLossExponent);
    return d0 * Math.pow(10, logD_d0);
  } else if (model === 'COST231_HATA') {
    // L = 46.3 + 33.9 log10(f) - 13.82 log10(h_t) - a_hr + [44.9 - 6.55 log10(h_t)] log10(d) + Cm
    const a_hr = (1.1 * Math.log10(f) - 0.7) * h_r - (1.56 * Math.log10(f) - 0.8);
    const Cm = params.citySize === 'LARGE' ? 3 : 0;
    const A = 46.3 + 33.9 * Math.log10(f) - 13.82 * Math.log10(h_t) - a_hr + Cm;
    const B = 44.9 - 6.55 * Math.log10(h_t);
    const logD = (maxPathLoss - A) / B;
    return Math.pow(10, logD);
  } else {
    // OKUMURA_HATA
    // L = A + B log10(d)
    // A = 69.55 + 26.16 log10(f) - 13.82 log10(h_t) - a_hr
    // B = 44.9 - 6.55 log10(h_t)
    
    let a_hr = 0;
    if (params.citySize === 'LARGE') {
      if (f <= 300) {
        a_hr = 8.29 * Math.pow(Math.log10(1.54 * h_r), 2) - 1.1;
      } else {
        a_hr = 3.2 * Math.pow(Math.log10(11.75 * h_r), 2) - 4.97;
      }
    } else {
      // Small to medium city
      a_hr = (1.1 * Math.log10(f) - 0.7) * h_r - (1.56 * Math.log10(f) - 0.8);
    }

    let A = 69.55 + 26.16 * Math.log10(f) - 13.82 * Math.log10(h_t) - a_hr;

    const B = 44.9 - 6.55 * Math.log10(h_t);
    const logD = (maxPathLoss - A) / B;
    return Math.pow(10, logD);
  }
}

export function calculateFSPL(distanceKm: number, frequencyMHz: number): number {
  if (distanceKm <= 0) return 0;
  return 32.44 + 20 * Math.log10(distanceKm) + 20 * Math.log10(frequencyMHz);
}

export function calculateLogNormal(distanceKm: number, params: PropagationParams): number {
  if (distanceKm <= 0) return 0;
  const d0 = 1.0; // 1 km reference
  const L_d0 = calculateFSPL(d0, params.frequencyMHz);
  let pathLoss = L_d0 + 10 * params.pathLossExponent * Math.log10(distanceKm / d0);
  return pathLoss;
}

export function calculateOkumuraHata(distanceKm: number, params: PropagationParams): number {
  if (distanceKm < 1) distanceKm = 1; // Hata is valid for d > 1km
  const f = params.frequencyMHz;
  const h_t = params.txHeightM;
  const h_r = params.rxHeightM;
  
  // Correction factor a(h_r)
  let a_hr = 0;
  if (params.citySize === 'LARGE') {
    if (f <= 300) {
      a_hr = 8.29 * Math.pow(Math.log10(1.54 * h_r), 2) - 1.1;
    } else {
      a_hr = 3.2 * Math.pow(Math.log10(11.75 * h_r), 2) - 4.97;
    }
  } else {
    a_hr = (1.1 * Math.log10(f) - 0.7) * h_r - (1.56 * Math.log10(f) - 0.8);
  }

  let L = 69.55 + 26.16 * Math.log10(f) - 13.82 * Math.log10(h_t) - a_hr + (44.9 - 6.55 * Math.log10(h_t)) * Math.log10(distanceKm);

  // LOS adjustment (simplified)
  if (params.isLOS) L -= 10;

  return L;
}

export function calculateCost231Hata(distanceKm: number, params: PropagationParams): number {
  if (distanceKm < 1) distanceKm = 1;
  const f = params.frequencyMHz;
  const h_t = params.txHeightM;
  const h_r = params.rxHeightM;
  
  const a_hr = (1.1 * Math.log10(f) - 0.7) * h_r - (1.56 * Math.log10(f) - 0.8);
  const Cm = params.citySize === 'LARGE' ? 3 : 0;
  
  const L = 46.3 + 33.9 * Math.log10(f) - 13.82 * Math.log10(h_t) - a_hr + (44.9 - 6.55 * Math.log10(h_t)) * Math.log10(distanceKm) + Cm;
  
  return L;
}
