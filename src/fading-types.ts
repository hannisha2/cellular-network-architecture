/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SpectralProfile = 'flat' | 'selective';
export type TemporalProfile = 'fast' | 'slow';

export interface FadingState {
  spectralProfile: SpectralProfile;
  temporalProfile: TemporalProfile;
  coherenceBandwidth: number; // kHz
  delaySpread: number; // microseconds
  speed: number; // km/h
  carrierFreq: number; // GHz
  dopplerShift: number; // Hz
  symbolDuration: number; // microseconds (Ts)
  signalBandwidth: number; // MHz (Bs)
  coherenceTime: number; // ms (Tc)
}

export interface SpectrumDataPoint {
  frequency: number;
  amplitude: number;
}

export interface TimeDomainPoint {
  time: number;
  amplitude: number;
}

export const FADING_CONSTANTS = {
  BANDWIDTH: 10, // MHz
  CENTER_FREQ: 2.1, // GHz
  LIGHT_SPEED: 3e8, // m/s
};

/**
 * Calculates Doppler shift based on speed and frequency
 * fd = (v * fc) / c
 */
export const calculateDoppler = (speedKmh: number, freqGhz: number): number => {
  const v = speedKmh / 3.6; // m/s
  const fc = freqGhz * 1e9; // Hz
  return (v * fc) / FADING_CONSTANTS.LIGHT_SPEED;
};

/**
 * Calculates Coherence Time
 * Tc ≈ 0.179 / fd
 */
export const calculateCoherenceTime = (dopplerShiftHz: number): number => {
  if (dopplerShiftHz === 0) return Infinity;
  return 0.179 / dopplerShiftHz; // seconds
};

export interface MultipathPath {
  id: string;
  delay: number; // microseconds (τ)
  power: number; // linear scale (Pi)
  powerDb?: number; // dB scale
}

export interface PdpMetrics {
  meanExcessDelay: number;
  rmsDelaySpread: number;
  maxExcessDelay: number;
  coherenceBandwidth90: number; // 0.9 correlation
  coherenceBandwidth50: number; // 0.5 correlation
}

/**
 * Calculates PDP metrics from a set of discrete paths
 */
export const calculatePdpMetrics = (paths: MultipathPath[]): PdpMetrics => {
  if (paths.length === 0) return { meanExcessDelay: 0, rmsDelaySpread: 0, maxExcessDelay: 0, coherenceBandwidth90: 0, coherenceBandwidth50: 0 };

  const totalPower = paths.reduce((sum, p) => sum + p.power, 0);
  
  // Mean Excess Delay: Σ (Pi * τi) / Σ Pi
  const meanExcessDelay = paths.reduce((sum, p) => sum + (p.power * p.delay), 0) / totalPower;
  
  // Mean Square Delay: Σ (Pi * τi^2) / Σ Pi
  const meanSquareDelay = paths.reduce((sum, p) => sum + (p.power * p.delay * p.delay), 0) / totalPower;
  
  // RMS Delay Spread: sqrt(τ^2_bar - (τ_bar)^2)
  const rmsDelaySpread = Math.sqrt(Math.max(0, meanSquareDelay - (meanExcessDelay * meanExcessDelay)));
  
  // Max Excess Delay: τ_max - τ_0 (assuming τ_0 is first delay)
  const delays = paths.map(p => p.delay);
  const maxExcessDelay = Math.max(...delays) - Math.min(...delays);

  // Bc ≈ 1 / (5 * delaySpread) (0.9)
  // Bc ≈ 1 / (50 * delaySpread) (0.5) - Note: standard textbooks vary, we use user's request
  const coherenceBandwidth90 = rmsDelaySpread > 0 ? (1 / (5 * rmsDelaySpread * 1e-6)) / 1e6 : Infinity; // MHz
  const coherenceBandwidth50 = rmsDelaySpread > 0 ? (1 / (50 * rmsDelaySpread * 1e-6)) / 1e6 : Infinity; // MHz

  return { meanExcessDelay, rmsDelaySpread, maxExcessDelay, coherenceBandwidth90, coherenceBandwidth50 };
};

/**
 * Classification Logic
 * 
 * Flat Fading: Ts >> στ
 * Frequency Selective: Ts < στ
 * 
 * Slow Fading: Ts << Tc
 * Fast Fading: Ts > Tc
 */
export function classifyChannel(
  rmsDelaySpread: number, 
  symbolDuration: number, // Ts (μs)
  coherenceTime: number,  // Tc (ms)
  signalBandwidth: number, // MHz
) {
  const symbolDurationMs = symbolDuration / 1000;

  // Time Dispersion: Compare Bs with Bc
  const coherenceBw = rmsDelaySpread > 0 ? (1 / (5 * rmsDelaySpread * 1e-6)) / 1e6 : Infinity; // MHz
  
  const timeDispersion = signalBandwidth > coherenceBw 
    ? 'Frequency Selective' 
    : (signalBandwidth < coherenceBw / 10 ? 'Flat Fading' : 'Marginal Selective');
  
  // Frequency Dispersion: Compare Ts with Tc
  const fastFading = symbolDurationMs > coherenceTime 
    ? 'Fast Fading' 
    : 'Slow Fading';

  return { timeDispersion, fastFading };
}
