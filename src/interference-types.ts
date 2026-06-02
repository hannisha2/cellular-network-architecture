import { HexCell } from './App';

export interface InterferenceState {
  isAnalysisMode: boolean;
  servingCell: HexCell | null;
  mobilePos: { q: number; r: number };
  pathLossExponent: number; // n
  referencePower: number;   // P0 at cell edge (dBm)
  targetSir: number;        // dB
  filterQuality: number;    // 0-1 (ACI filtering effectiveness)
  isPowerControlActive: boolean;
  totalChannels: number;    // S
  nearFarScenario: 'off' | 'bs-side' | 'ms-side';
  showInterferers: boolean;
  numTiers: number;         // Dynamic tiers
  selectedTiers: number[];  // Tiers to include in calculation
}

export interface TierMetric {
  tier: number;
  sir: number;
  worstCaseSir: number;
  powerWatts: number;
  interfererCount: number;
}

export interface InterferenceMetrics {
  sir: number;
  rawSir: number;
  desiredPower: number;
  totalInterferencePower: number;
  coChannelInterference: number;
  adjacentChannelInterference: number;
  reuseDistance: number;
  reuseRatio: number;
  capacityFactor: number;
  channelsPerCell: number;
  interferersCount: number;
  aciSir: number;
  worstCaseSir: number;
  tiers: TierMetric[];
}

export interface InterfererDetail {
  id: string;
  tier: number;
  distance: number;
  power: number; // dBm
  contributionPercentage: number;
  sirImpact: number; // How much SIR would be if ONLY this interferer existed
}

export const calculateReuseDistance = (cellRadius: number, N: number): number => {
  return Math.sqrt(3 * N) * cellRadius;
};

export const calculateReuseRatio = (N: number): number => {
  return Math.sqrt(3 * N);
};

export const calculatePathLoss = (distance: number, cellRadius: number, n: number): number => {
  if (distance <= 0) return 0;
  // Standard propagation model: PL(d) = PL(d0) + 10n * log10(d / d0)
  // Assuming d0 is cell radius R and PL(R) is normalized or handled in P0
  return 10 * n * Math.log10(distance / cellRadius);
};

export const calculatePower = (distance: number, cellRadius: number, n: number, p0: number): number => {
  // P(d) = P(R) * (R/d)^n in linear
  // P(d)_dBm = P(R)_dBm - 10n * log10(d / R)
  return p0 - calculatePathLoss(distance, cellRadius, n);
};

export const dbmToWatts = (dbm: number): number => {
  return Math.pow(10, (dbm - 30) / 10);
};

export const wattsToDbm = (watts: number): number => {
  if (watts <= 0) return -200; // Floor
  return 10 * Math.log10(watts) + 30;
};

export const calculateSir = (desiredPowerDbm: number, interferencePowerDbm: number): number => {
  return desiredPowerDbm - interferencePowerDbm;
};

export const getSirColor = (sir: number): string => {
  if (sir > 18) return '#22c55e'; // Green
  if (sir > 12) return '#eab308'; // Yellow
  return '#ef4444'; // Red
};

export const getAdjacentFrequencyGroups = (freq: string): string[] => {
  const match = freq.match(/(\d+)/);
  if (!match) return [];
  const f = parseInt(match[1]);
  return [`${f - 1}`, `${f + 1}`];
};
