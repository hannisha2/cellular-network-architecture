/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TrunkingState {
  numUsers: number;         // U
  arrivalRate: number;      // λ (calls per hour)
  holdingTime: number;      // H (minutes)
  numChannels: number;      // C
  targetGos: number;        // Target Blocking Probability (e.g., 0.02 for 2%)
  mode: 'compute-gos' | 'compute-channels';
  // Daily Traffic Profile
  hourlyTraffic: number[];  // 24 values
  busyHour: number;         // 0-23
  useManualTraffic: boolean;
}

export const TRAFFIC_PRESETS = [
  {
    name: 'Standard Business',
    data: [0.1, 0.05, 0.05, 0.05, 0.1, 0.2, 0.4, 0.7, 0.9, 1.0, 0.95, 0.8, 0.7, 0.8, 0.9, 0.95, 1.0, 0.9, 0.7, 0.5, 0.3, 0.2, 0.15, 0.1]
  },
  {
    name: 'Residential/Evening Peak',
    data: [0.2, 0.15, 0.1, 0.05, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 0.9, 0.7, 0.5, 0.3]
  },
  {
    name: 'Uniform/Industrial',
    data: [0.8, 0.8, 0.8, 0.8, 0.8, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.8, 0.8]
  }
];

export interface TrunkingMetrics {
  trafficPerUser: number;   // Au (Erlangs)
  totalOfferedTraffic: number; // A (Erlangs)
  blockingProbB: number;    // Erlang B
  delayProbC: number;       // Erlang C
  carriedTraffic: number;   // Ac = A(1 - B)
  utilization: number;      // Ac / C
  requiredChannels?: number;
  maxSupportableTraffic?: number;
}

/**
 * Iterative Erlang B calculation to avoid factorial overflow
 * B(k, A) = (A * B(k-1, A)) / (k + A * B(k-1, A))
 */
export const calculateErlangB = (C: number, A: number): number => {
  if (A === 0) return 0;
  if (C === 0) return 1;
  
  let b = 1.0;
  for (let k = 1; k <= C; k++) {
    b = (A * b) / (k + A * b);
  }
  return b;
};

/**
 * Erlang C calculation based on Erlang B
 * C(C, A) = (C * B(C, A)) / (C - A * (1 - B(C, A)))
 * Valid only if A < C
 */
export const calculateErlangC = (C: number, A: number): number => {
  if (A >= C) return 1.0;
  const b = calculateErlangB(C, A);
  return (C * b) / (C - A * (1 - b));
};

/**
 * Finds the minimum number of channels required to meet a target GoS
 */
export const findRequiredChannels = (A: number, targetGos: number): number => {
  if (A === 0) return 1;
  let c = Math.ceil(A);
  while (calculateErlangB(c, A) > targetGos) {
    c++;
    if (c > 1000) break; // Safety break
  }
  return c;
};

/**
 * Finds the maximum offered traffic (A_max) that can be supported by C channels
 * at a given target GoS (targetGos) using a binary search.
 */
export const findMaxTraffic = (C: number, targetGos: number): number => {
  if (C <= 0 || targetGos <= 0) return 0;
  
  // Set search bounds: offered traffic can range from 0 to C * 10
  let low = 0.0;
  let high = C * 10.0;
  
  // Exponentially increase upper bound until the GoS constraint is broken
  while (calculateErlangB(C, high) < targetGos) {
    high *= 2.0;
  }
  
  const tolerance = 1e-6;
  const maxIterations = 100;
  let iterations = 0;
  
  while (high - low > tolerance && iterations < maxIterations) {
    const mid = (low + high) / 2.0;
    const b = calculateErlangB(C, mid);
    
    // Erlang B is strictly increasing with respect to traffic A (mid)
    if (b > targetGos) {
      high = mid; // offered traffic is too high for this target GoS
    } else {
      low = mid;  // offered traffic is low enough, try to find a larger one
    }
    iterations++;
  }
  
  return (low + high) / 2.0;
};

