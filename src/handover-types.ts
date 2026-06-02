/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface HandoverState {
  isActive: boolean;              // Simulation active/inactive
  mobilePosition: { q: number; r: number }; // Hex coordinates
  sourceCell: { q: number; r: number; f: number } | null;        // Current serving cell
  targetCell: { q: number; r: number; f: number } | null;         // Target cell for handover
  speed: number;                  // km/h
  handoverStage: 'idle' | 'initiating' | 'executing' | 'completed';
  initiationDistance: number;     // Distance from source cell center where handover triggers (P_S <= P_min)
  completionDistance: number;     // Distance from source cell center where handover completes (P_T >= P_S + delta)
  timeToEdge: number;             // Estimated time to reach cell edge
  hysteresisMargin: number;       // dB margin to prevent ping-pong
  pathLossExponent: number;       // α for path loss calculation
  pMinThreshold: number;          // P_min threshold in dBm
}

export const calculateHandoverInitiationDistance = (
  cellRadius: number,
  maxPower: number,               // dBm at edge (P_edge)
  pMin: number,                   // P_min threshold in dBm
  pathLossExponent: number        // α
): number => {
  // Handover is initiated at the physical cell boundary (midpoint between adjacent cells)
  const totalDist = cellRadius * Math.sqrt(3);
  return totalDist / 2;
};

export const calculateHandoverCompletionDistance = (
  cellRadius: number,
  hysteresisMargin: number,       // delta in dB
  pathLossExponent: number        // α
): number => {
  // Distance between centers of adjacent cells
  const totalDist = cellRadius * Math.sqrt(3);
  
  // Mathematically correct distance d_comp from source center where:
  // P_T(d) >= P_S(d) + delta
  // maxPower - 10 * alpha * log10((D - d) / R_c) >= maxPower - 10 * alpha * log10(d / R_c) + delta
  // => -10*alpha*log10(D-d) >= -10*alpha*log10(d) + delta
  // => log10(D-d) <= log10(d) - delta/(10*alpha)
  // => D - d <= d * 10^(-delta / (10*alpha))
  // Let k = 10^(-delta / (10*alpha))
  // => D <= d * (1 + k)
  // => d >= D / (1 + k)
  const k = Math.pow(10, -hysteresisMargin / (10 * pathLossExponent));
  const completionDistance = totalDist / (1 + k);
  
  return Math.max(totalDist * 0.51, Math.min(completionDistance, totalDist * 0.99));
};

export const calculateReceivedPower = (
  distance: number,           // meters/pixels from base station
  maxPower: number = 30,      // dBm at cell edge (typical)
  cellRadius: number,         // meters/pixels
  pathLossExponent: number = 3.5 // α (urban environment)
): number => {
  if (distance <= 0) return maxPower + 20; // Stronger at center
  
  // Path loss model: Pr = P_edge - 10 * α * log10(d / R_c)
  const receivedPower = maxPower - 10 * pathLossExponent * Math.log10(distance / cellRadius);
  
  return Math.max(receivedPower, -120); // Minimum -120 dBm
};

export const shouldInitiateHandover = (
  sourcePower: number,
  targetPower: number,
  hysteresisMargin: number,
  currentDistance: number,
  initiationDistance: number,
  handoverStage: string
): boolean => {
  return currentDistance >= initiationDistance && handoverStage === 'idle';
};
