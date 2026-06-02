export type ModulationScheme = 'BPSK' | 'QPSK' | '8-PSK' | '16-PSK' | '16-QAM' | '64-QAM' | '256-QAM';
export type ChannelType = 'AWGN' | 'RAYLEIGH' | 'RICIAN';
export type ModulationMode = ModulationScheme | 'ADAPTIVE';

export interface ModulationStats {
  bitsPerSymbol: number;
  spectralEfficiency: number;
  requiredSnr: number; // in dB for target BER (e.g., 10^-3)
}

export const MODULATION_SPECS: Record<ModulationScheme, ModulationStats> = {
  'BPSK': { bitsPerSymbol: 1, spectralEfficiency: 1, requiredSnr: 4 },
  'QPSK': { bitsPerSymbol: 2, spectralEfficiency: 2, requiredSnr: 7 },
  '8-PSK': { bitsPerSymbol: 3, spectralEfficiency: 3, requiredSnr: 12 },
  '16-PSK': { bitsPerSymbol: 4, spectralEfficiency: 4, requiredSnr: 16 },
  '16-QAM': { bitsPerSymbol: 4, spectralEfficiency: 4, requiredSnr: 14 },
  '64-QAM': { bitsPerSymbol: 6, spectralEfficiency: 6, requiredSnr: 20 },
  '256-QAM': { bitsPerSymbol: 8, spectralEfficiency: 8, requiredSnr: 26 },
};

export const getAdaptiveModulation = (sinrDb: number): ModulationScheme => {
  if (sinrDb < 5) return 'BPSK';
  if (sinrDb < 10) return 'QPSK';
  if (sinrDb < 15) return '8-PSK';
  if (sinrDb < 20) return '16-QAM';
  if (sinrDb < 25) return '64-QAM';
  return '256-QAM';
};

export const getModulationColor = (scheme: ModulationScheme): string => {
  switch (scheme) {
    case 'BPSK': return '#ef4444'; // Red
    case 'QPSK': return '#f97316'; // Orange
    case '8-PSK': return '#eab308'; // Yellow
    case '16-PSK': return '#84cc16'; // Lime
    case '16-QAM': return '#22c55e'; // Green
    case '64-QAM': return '#3b82f6'; // Blue
    case '256-QAM': return '#a855f7'; // Purple
    default: return '#a8a29e';
  }
};

// ERFC approximation
function erfc(x: number): number {
  // A&S formula 7.1.26
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * a);
  const y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return 1.0 - sign * y;
}

// Q-function
function Q(x: number): number {
  return 0.5 * erfc(x / Math.sqrt(2));
}

// Calculate Theoretical BER
export const calculateBER = (scheme: ModulationScheme, snrDb: number, channelType: ChannelType): number => {
  const snrLinear = Math.pow(10, snrDb / 10);
  let ber = 1;
  
  if (channelType === 'AWGN') {
    switch(scheme) {
      case 'BPSK':
      case 'QPSK':
        ber = Q(Math.sqrt(2 * snrLinear));
        break;
      case '8-PSK':
      case '16-PSK':
        const M_psk = scheme === '8-PSK' ? 8 : 16;
        ber = (1 / Math.log2(M_psk)) * Q(Math.sqrt(2 * snrLinear) * Math.sin(Math.PI / M_psk));
        break;
      case '16-QAM':
      case '64-QAM':
      case '256-QAM':
        const M_qam = scheme === '16-QAM' ? 16 : scheme === '64-QAM' ? 64 : 256;
        const k = Math.log2(M_qam);
        ber = (4 / k) * (1 - 1 / Math.sqrt(M_qam)) * Q(Math.sqrt((3 * k * snrLinear) / (M_qam - 1)));
        break;
    }
  } else if (channelType === 'RAYLEIGH') {
    // Simplified theoretical Rayleigh BER
    const gamma = snrLinear;
    switch(scheme) {
      case 'BPSK':
      case 'QPSK': // Approximation
        ber = 0.5 * (1 - Math.sqrt(gamma / (1 + gamma)));
        break;
      case '8-PSK':
      case '16-PSK':
      case '16-QAM':
      case '64-QAM':
      case '256-QAM':
        // High SNR approximation for higher order modulations in Rayleigh fading
        ber = 1 / (4 * gamma + 1); // Very rough generic approx for visibility
        break;
    }
  } else if (channelType === 'RICIAN') {
    // Basic approximation (between AWGN and Rayleigh)
    const K = Math.pow(10, 3 / 10); // K-factor 3dB
    const effGamma = snrLinear * (K / (K + 1));
    switch(scheme) {
      case 'BPSK':
      case 'QPSK':
        ber = 0.5 * (1 - Math.sqrt(effGamma / (1 + effGamma)));
        break;
      case '8-PSK':
      case '16-PSK':
      case '16-QAM':
      case '64-QAM':
      case '256-QAM':
        ber = Math.min(1, 1 / (2 * effGamma + 1)); // Rough approx
        break;
    }
  }
  
  return Math.max(1e-8, Math.min(0.5, ber));
};
