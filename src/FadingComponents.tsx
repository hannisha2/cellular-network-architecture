/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Settings2, 
  Zap, 
  Info, 
  Database, 
  Cpu, 
  Waves, 
  Signal, 
  ArrowRight,
  RefreshCcw,
  Layers,
  ChevronDown,
  Monitor,
  Link2,
  Radio,
  Shuffle,
  Trash2,
  Plus,
  Calculator,
  Maximize2,
  Minimize2,
  TrendingUp,
  Sliders,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell as RechartsCell,
  AreaChart,
  Area,
  ReferenceLine,
  Legend,
  ComposedChart,
  Scatter
} from 'recharts';

// --- Types & Constants ---
export interface MultipathPath {
  id: string;
  delay: number; // microseconds (τ)
  power: number; // linear scale (Pi)
  powerDb?: number; // dB scale
}

interface FadingState {
  carrierFreqMhz: number;    // Carrier Frequency fc (MHz)
  speedVal: number;          // Speed value (m/s or km/h)
  speedUnit: 'ms' | 'kmh';   // Speed unit toggle
  delaySpreadUs: number;     // RMS Delay Spread στ (μs)
  symbolDurationUs: number;  // Symbol Duration Ts (μs)
  signalBandwidthMhz: number; // Signal Bandwidth Bs (MHz)
  spectralProfile: 'flat' | 'selective';
  temporalProfile: 'slow' | 'fast';
}

const LIGHT_SPEED = 3e8; // m/s

// --- Stability Meter Components ---
const StabilityMeter: React.FC<{ isFast: boolean; cohTimeMs: number; tsUs: number }> = ({ isFast, cohTimeMs, tsUs }) => {
  const tsMs = tsUs / 1000;
  const ratio = cohTimeMs > 0 ? tsMs / cohTimeMs : 0;
  const percentage = Math.min(100, Math.max(0, (1 - ratio) * 100));

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Temporal Stability</span>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${!isFast ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {!isFast ? 'Stable (Slow)' : 'Volatile (Fast)'}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
        <motion.div 
          className={`h-full ${!isFast ? 'bg-emerald-500' : 'bg-rose-500'}`}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 60 }}
        />
      </div>
      <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-normal leading-normal mt-1">
        Symbol Period occupies {(ratio * 100).toFixed(1)}% of Coherence Time
      </p>
    </div>
  );
};

// --- Raw Visual Monitors (Tab 1: Live Monitor) ---
const SpectrumAnalyzer: React.FC<{ state: FadingState }> = ({ state }) => {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    let animationFrame: number;
    const update = (t: number) => {
      timeRef.current = t / 1000;
      const newPoints = [];
      const numPoints = 120;
      const width = 800;
      const height = 200;
      
      const speedMs = state.speedUnit === 'ms' ? state.speedVal : state.speedVal / 3.6;
      const fm = (speedMs * state.carrierFreqMhz) / 300;
      
      const isFast = state.temporalProfile === 'fast';
      const speedScale = isFast ? 4 : 0.3; 
      const time = timeRef.current * speedScale;

      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        let amplitude = 0;
        
        if (state.spectralProfile === 'flat') {
          const visualFreq = Math.min(8, fm * 0.05 + 1);
          amplitude = Math.sin(time * visualFreq) * 15 + 60;
          amplitude += Math.random() * 3; 
        } else {
          const Bc = 1 / (5 * state.delaySpreadUs); // MHz
          const normalizedCoherence = Bc / 10;
          const numNotches = Math.max(2, Math.floor(1 / (normalizedCoherence + 0.06)));
          
          amplitude = 65;
          for (let n = 0; n < numNotches; n++) {
            const notchSpeed = 0.4 * (n % 2 === 0 ? 1 : -1);
            const notchPos = (Math.sin(time * notchSpeed + n) + 1) / 2;
            const dist = Math.abs((i / numPoints) - notchPos);
            const w = normalizedCoherence * 0.35;
            amplitude -= 42 * Math.exp(-(dist * dist) / (2 * w * w));
          }
          amplitude += Math.random() * 2;
        }
        
        newPoints.push({ x, y: height - amplitude });
      }
      setPoints(newPoints);
      animationFrame = requestAnimationFrame(update);
    };
    
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [state]);

  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }, [points]);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 p-6 relative overflow-hidden h-[340px] flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl">
             <Activity className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Live Power Spectral Density</h3>
            <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <span className={state.spectralProfile === 'flat' ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded'}>
                {state.spectralProfile} fading
              </span>
              <span className="text-slate-300">•</span>
              <span className={state.temporalProfile === 'slow' ? 'text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded' : 'text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded'}>
                {state.temporalProfile} variation
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-4">
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-5 pointer-events-none opacity-10">
           {[...Array(11)].map((_, i) => <div key={i} className="border-r border-slate-500 h-full" />)}
           {[...Array(6)].map((_, i) => <div key={i} className="border-b border-slate-500 w-full" />)}
        </div>
        
        <svg viewBox="0 0 800 200" className="w-full h-full relative z-10" preserveAspectRatio="none">
          <defs>
            <linearGradient id="psdGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${pathData} L 800 200 L 0 200 Z`} fill="url(#psdGradient)" />
          <path d={pathData} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
        </svg>

        <div className="absolute bottom-3 left-4 py-1 px-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2">
           <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Spectral Bandwidth (Bs): {state.signalBandwidthMhz} MHz</span>
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </div>
    </div>
  );
};

const CarrierWave: React.FC<{ state: FadingState }> = ({ state }) => {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [refPoints, setRefPoints] = useState<{ x: number; y: number }[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    let animationFrame: number;
    const update = (t: number) => {
      timeRef.current = t / 1000;
      const newPoints = [];
      const newRefPoints = [];
      const numPoints = 160; 
      const width = 800;
      const height = 150;
      
      const speedMs = state.speedUnit === 'ms' ? state.speedVal : state.speedVal / 3.6;
      const fm = (speedMs * state.carrierFreqMhz) / 300;
      const isFast = state.temporalProfile === 'fast';
      const speedScale = isFast ? 4.5 : 0.25; 
      const time = timeRef.current * speedScale;

      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const xPhase = (i / numPoints) * 12; 
        
        let gain = 1;
        let phaseShift = 0;
        
        if (state.spectralProfile === 'flat') {
          const visualDoppler = Math.min(4, fm * 0.05 + 0.5);
          gain = (Math.sin(time * visualDoppler) * 0.45 + 0.55);
          if (isFast) {
            gain *= (0.65 + 0.35 * Math.random());
          }
        } else {
          const spreadFactor = state.delaySpreadUs * 0.8;
          const path1 = Math.sin(time * 4 + xPhase);
          const path2 = Math.sin(time * 3 + xPhase * 1.3 - spreadFactor);
          const combined = (path1 + path2) / 2;
          gain = (combined * 0.5 + 0.5);
          phaseShift = Math.sin(time * 1.5 + xPhase * 0.5) * (state.delaySpreadUs * 0.15);
        }
        
        const carrier = Math.sin(xPhase * 4 + time * 14 + phaseShift) * gain * 50;
        const refCarrier = Math.sin(xPhase * 4 + time * 14) * 50;
        
        newPoints.push({ x, y: height / 2 + carrier });
        newRefPoints.push({ x, y: height / 2 + refCarrier });
      }
      setPoints(newPoints);
      setRefPoints(newRefPoints);
      animationFrame = requestAnimationFrame(update);
    };
    
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [state]);

  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }, [points]);

  const refPathData = useMemo(() => {
    if (refPoints.length === 0) return '';
    return `M ${refPoints[0].x} ${refPoints[0].y} ` + refPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }, [refPoints]);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 p-6 h-[280px] flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
            <Waves size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Impulse Distortion Module</h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Carrier Amplitude & Phase Tracking</span>
          </div>
        </div>
        <div className="flex gap-3 text-[9px] font-extrabold uppercase tracking-widest">
          <div className="flex items-center gap-1.5 text-slate-400">
            <div className="w-3.5 h-0.5 border-t-2 border-dashed border-slate-300"></div>
            <span>Ideal</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600">
            <div className="w-3.5 h-0.5 bg-amber-500"></div>
            <span>Faded</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 relative bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden p-4">
        <svg viewBox="0 0 800 150" className="w-full h-full" preserveAspectRatio="none">
          <path d={refPathData} fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="6 4" />
          <path d={pathData} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        
        <div className="absolute bottom-3 left-4 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[8.5px] font-black uppercase tracking-widest text-slate-400">
          Carrier Wave: {state.carrierFreqMhz} MHz
        </div>
      </div>
    </div>
  );
};

const Oscilloscope: React.FC<{ state: FadingState }> = ({ state }) => {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    let animationFrame: number;
    const update = (t: number) => {
      timeRef.current = t / 1000;
      const newPoints = [];
      const numPoints = 120;
      const width = 800;
      const height = 150;
      
      const speedMs = state.speedUnit === 'ms' ? state.speedVal : state.speedVal / 3.6;
      const fm = (speedMs * state.carrierFreqMhz) / 300;
      const isFast = state.temporalProfile === 'fast';
      const speedScale = isFast ? 5.5 : 0.15; 
      
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * width;
        const localTime = timeRef.current * speedScale + (i / numPoints) * 0.15;
        
        let envelope = 0;
        if (state.spectralProfile === 'flat') {
          const visualDoppler = Math.max(0.5, fm * 0.05);
          envelope = (Math.sin(localTime * visualDoppler) * 0.35 + 
                      Math.sin(localTime * visualDoppler * 2.3) * 0.2 + 0.55) * 85;
          if (isFast) {
            envelope *= (0.45 + 0.55 * Math.abs(Math.sin(localTime * 12)));
          }
        } else {
          const spreadFactor = state.delaySpreadUs * 0.6;
          envelope = (Math.sin(localTime * 2.2) * 0.25 + 
                      Math.sin(localTime * spreadFactor) * 0.3 + 0.5) * 80;
        }
        
        newPoints.push({ x, y: height - envelope - 15 });
      }
      setPoints(newPoints);
      animationFrame = requestAnimationFrame(update);
    };
    
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [state]);

  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  }, [points]);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 p-6 h-[280px] flex flex-col shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
            <Monitor size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Time Envelope Tracker</h3>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dynamic Signal Power Attenuation</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 relative bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden p-4">
         <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 pointer-events-none opacity-5">
          {[...Array(9)].map((_, i) => <div key={i} className="border-r border-slate-400 h-full" />)}
          {[...Array(5)].map((_, i) => <div key={i} className="border-b border-slate-400 w-full" />)}
        </div>
        <svg viewBox="0 0 800 150" className="w-full h-full relative z-10" preserveAspectRatio="none">
          <path d={pathData} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
          <path d={`${pathData} L 800 150 L 0 150 Z`} fill="url(#skyGradient)" />
          <defs>
            <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

const MultipathSchematic: React.FC<{ state: FadingState }> = ({ state }) => {
  const isSelective = state.spectralProfile === 'selective';
  const speedKmh = state.speedUnit === 'kmh' ? state.speedVal : state.speedVal * 3.6;
  
  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
            <Radio size={20} />
          </div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none">Multipath Scatter Geometry</h3>
        </div>
        <span className="text-[10px] font-extrabold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">Ray Propagation</span>
      </div>

      <div className="relative h-60 bg-slate-950 rounded-2xl overflow-hidden border border-slate-900 p-4">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          {/* Ground */}
          <line x1="0" y1="180" x2="400" y2="180" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />
          
          {/* Base Station */}
          <g transform="translate(40, 90)">
            <rect x="-8" y="0" width="16" height="90" fill="#1e293b" stroke="#334155" rx="3" />
            <line x1="0" y1="0" x2="0" y2="-15" stroke="#6366f1" strokeWidth="2" />
            <circle cx="0" cy="-20" r="4" fill="#6366f1" className="animate-pulse" />
            <text x="0" y="105" textAnchor="middle" className="fill-slate-500 text-[8px] font-black uppercase tracking-widest">TX NODE</text>
          </g>

          {/* User Mobile */}
          <g transform="translate(340, 140)">
            <rect x="-8" y="0" width="16" height="40" fill="#1e293b" stroke="#334155" rx="3" />
            <circle cx="0" cy="-5" r="3" fill="#0ea5e9" />
            <text x="0" y="55" textAnchor="middle" className="fill-slate-500 text-[8px] font-black uppercase tracking-widest leading-none">RX (v={speedKmh.toFixed(0)} km/h)</text>
          </g>

          {/* Scatterer */}
          <g transform="translate(200, 45)">
            <path d="M -20 15 L 0 -15 L 20 15 Z" fill="#1e293b" stroke="#475569" />
            <text x="0" y="32" textAnchor="middle" className="fill-slate-500 text-[8px] font-black uppercase tracking-widest">REFLECTOR</text>
          </g>

          {/* Direct Path */}
          <line x1="45" y1="70" x2="335" y2="140" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Scattering Reflections */}
          <motion.path
            d="M 45 70 L 200 45 L 335 140"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ strokeDashoffset: [0, -20], opacity: isSelective ? 1 : 0.4 }}
            strokeDasharray="10 5"
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          />
          
           <motion.path
            d="M 45 70 L 180 180 L 335 140"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            opacity="0.3"
            strokeDasharray="5 5"
            animate={{ strokeDashoffset: [0, -15] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          />
        </svg>

        <div className="absolute top-4 right-4 text-right">
          <div className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest mb-1">Scatter Space Spread</div>
          <div className={`text-xs font-black ${isSelective ? 'text-amber-500' : 'text-slate-500'}`}>
            ~{(state.delaySpreadUs * 0.3).toFixed(3)} km Equivalent
          </div>
        </div>
      </div>
    </div>
  );
};


// --- ADVANCED INTERACTIVE GRAPH MODULES (Tab 2: Analytical Graphs) ---

// Graph 1: Received Power vs T-R Separation
const TRSeparationGraph: React.FC<{ state: FadingState }> = ({ state }) => {
  const speedMs = state.speedUnit === 'ms' ? state.speedVal : state.speedVal / 3.6;
  
  const chartData = useMemo(() => {
    const data = [];
    const lambda = 300 / state.carrierFreqMhz; // Wavelength (meters)
    
    // Construct 100 points between 14m and 28m
    for (let i = 0; i <= 100; i++) {
      const d = 14 + (i / 100) * 14;
      
      // Large Scale Mean (Standard Log-distance path loss + Tx Power reference)
      // Standardizes around -50 dBm decay
      const meanPower = -34 - 24 * Math.log10(d / 14);
      
      // Multipath envelope superposition sum containing relative Doppler phases
      let I = 0;
      let Q = 0;
      const rayAngles = [0, 45, 90, 135, 180, 245, 305];
      const rayPowers = [0.45, 0.22, 0.14, 0.10, 0.05, 0.03, 0.01];
      
      for (let j = 0; j < rayAngles.length; j++) {
        const theta = (rayAngles[j] * Math.PI) / 180;
        // Spatial Phase shifting component (2 * pi * d / lambda * cos(theta))
        const phase = (2 * Math.PI * d / lambda) * Math.cos(theta) + (j * 1.8);
        I += Math.sqrt(rayPowers[j]) * Math.cos(phase);
        Q += Math.sqrt(rayPowers[j]) * Math.sin(phase);
      }
      
      const envelope = Math.sqrt(I * I + Q * Q);
      const fastFadingDb = 20 * Math.log10(Math.max(1e-3, envelope));
      const totalPower = meanPower + fastFadingDb;

      data.push({
        d: parseFloat(d.toFixed(2)),
        meanPower: parseFloat(meanPower.toFixed(1)),
        totalPower: parseFloat(Math.min(-30, Math.max(-70, totalPower)).toFixed(1))
      });
    }
    return data;
  }, [state.carrierFreqMhz]); // Triggers on carrier frequency change, reflecting physical wavelength spacing!

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
      <div className="mb-3">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center justify-between">
          <span>1. Received Power vs. T-R Separation</span>
          <span className="text-[9px] font-bold text-slate-400 normal-case">14m to 28m Bounds</span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
          Superimposes rapid multipath fluctuations (black) on slow path-loss mean (red).
        </p>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="d" 
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val}m`}
            />
            <YAxis 
              domain={[-70, -30]} 
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val}dBm`}
            />
            <Tooltip 
              contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              itemStyle={{ padding: 0 }}
            />
            <Legend verticalAlign="top" iconSize={8} height={20} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} />
            <Line 
              name="Composite Envelope (Small+Large Scale)" 
              type="monotone" 
              dataKey="totalPower" 
              stroke="#0f172a" 
              strokeWidth={1.5} 
              dot={false} 
              activeDot={{ r: 4 }}
            />
            <Line 
              name="Large Scale Mean (Path Loss)" 
              type="monotone" 
              dataKey="meanPower" 
              stroke="#f43f5e" 
              strokeWidth={2} 
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Graph 2: Power Delay Profile
const PdpCompareGraph: React.FC = () => {
  const [environment, setEnvironment] = useState<'outdoor' | 'indoor'>('outdoor');

  // Exact data reflecting the requested delay values and exponent powers
  const outdoorData = [
    { delay: 0.0, power: -40, label: '0.0μs (Main)' },
    { delay: 10.0, power: -45, label: '10.0μs' },
    { delay: 25.0, power: -48, label: '25.0μs' },
    { delay: 45.0, power: -52, label: '45.0μs' },
    { delay: 70.0, power: -58, label: '70.0μs' },
    { delay: 95.0, power: -65, label: '95.0μs (Tail)' }
  ];

  const indoorData = [
    { delay: 0, power: -35, label: '0ns (LOS)' },
    { delay: 50, power: -38, label: '50ns' },
    { delay: 110, power: -42, label: '110ns' },
    { delay: 180, power: -47, label: '180ns' },
    { delay: 280, power: -55, label: '280ns' },
    { delay: 400, power: -62, label: '400ns (Echo)' }
  ];

  const activeData = environment === 'outdoor' ? outdoorData : indoorData;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span>2. Power Delay Profile (PDP)</span>
          </h4>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
            Discrete multipath component arrivals with decay envelope.
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
          <button 
            onClick={() => setEnvironment('outdoor')}
            className={`px-2.5 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all ${environment === 'outdoor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Urban Outdoor (μs)
          </button>
          <button 
            onClick={() => setEnvironment('indoor')}
            className={`px-2.5 py-1 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all ${environment === 'indoor' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Indoor (ns)
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activeData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="delay" 
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val}${environment === 'outdoor' ? 'μs' : 'ns'}`}
            />
            <YAxis 
              domain={[-70, -30]} 
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val} dBm`}
            />
            <Tooltip 
              formatter={(value, name, props) => [`${value} dBm per 40ns`, 'Power Level']}
              labelFormatter={(val) => `Excess Delay: ${val}${environment === 'outdoor' ? 'μs' : 'ns'}`}
              contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
            />
            <Legend verticalAlign="top" iconSize={8} height={20} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
            <Bar 
              name="Multipath Arrivals (Received Signal Level)"
              dataKey="power" 
              fill={environment === 'outdoor' ? '#6366f1' : '#14b8a6'} 
              barSize={6}
              radius={[4, 4, 0, 0]}
            >
              {activeData.map((entry, index) => (
                <RechartsCell key={`cell-${index}`} fill={index === 0 ? '#10b981' : (environment === 'outdoor' ? '#6366f1' : '#14b8a6')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Graph 3: Doppler Spectrum Frequency Spread
const DopplerSpectrumGraph: React.FC<{ state: FadingState }> = ({ state }) => {
  const speedMs = state.speedUnit === 'ms' ? state.speedVal : state.speedVal / 3.6;
  const fm = (speedMs * state.carrierFreqMhz) / 300; 

  // Generate Classic Jakes Spectrum Envelope data
  const chartData = useMemo(() => {
    const data = [];
    const steps = 40;
    
    for (let i = 0; i <= steps; i++) {
      // Frequency offset ratio x from -0.99 to +0.99
      const ratio = -0.985 + (i / steps) * 1.97;
      const f_offset = ratio * fm;
      
      // Jakes PSD standard J-shape curve: S(f) = 1.5 / (pi * fm * sqrt(1 - (f/fm)^2))
      const psdNormal = 1 / Math.sqrt(Math.max(0.012, 1 - ratio * ratio));
      // Map to dBs
      const psdDb = 10 * Math.log10(psdNormal) - 5;
      
      data.push({
        freqOffset: parseFloat(f_offset.toFixed(1)),
        psd: parseFloat(Math.min(22, Math.max(-10, psdDb)).toFixed(1))
      });
    }
    return data;
  }, [fm]);

  // Discrete component shift rays modeled inside
  const discreteRays = useMemo(() => {
    const angles = [35, 75, 120, 150, 215];
    const powerDb = [-1, -3.5, -5.5, -8, -11];
    return angles.map((ang, idx) => {
      const f_shift = fm * Math.cos(ang * Math.PI / 180);
      return {
        freqOffset: parseFloat(f_shift.toFixed(1)),
        psd: parseFloat((powerDb[idx] + 12).toFixed(1)), // Offset for discrete scaling visual integration
        angle: ang
      };
    });
  }, [fm]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
      <div className="mb-3">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center justify-between">
          <span>3. Doppler Spectrum Frequency Spread</span>
          <span className="text-[9px] font-bold text-sky-600 uppercase bg-sky-50 px-2 py-0.5 rounded-full">
            fc = {state.carrierFreqMhz} MHz | fm = {fm.toFixed(1)} Hz
          </span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
          Visualizes frequency widening (U-shaped Jakes curve) from incoming scattering paths.
        </p>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="freqOffset" 
              type="number"
              domain={[-fm * 1.05 - 1, fm * 1.05 + 1]}
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(0)}Hz`}
            />
            <YAxis 
              domain={[-5, 25]} 
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val}dB`}
            />
            <Tooltip 
              formatter={(value, name) => [`${value} dB`, name === 'psd' ? 'Theoretical PSD' : 'Power Level']}
              labelFormatter={(val) => `Frequency Shift offset: ${val} Hz`}
              contentStyle={{ fontSize: '10px' }}
            />
            <Legend verticalAlign="top" iconSize={8} height={20} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
            
            {/* Filled area for U-shape Jakes spectrum */}
            <Area 
              name="Jakes Spectrum (Theoretical)"
              dataKey="psd" 
              fill="#06b6d4" 
              stroke="#0891b2" 
              strokeDasharray="4 4"
              fillOpacity={0.08}
            />

            {/* Discrete arriving component shifts overlay */}
            <Scatter 
              name="Discrete Multipath Arrival Rays"
              data={discreteRays} 
              fill="#f43f5e" 
              line={{ stroke: '#f43f5e', strokeWidth: 1.5 }}
              lineType="fitting"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Graph 4: Flat vs Frequency-Selective Fading
const FlatFadingVsSelectiveGraph: React.FC<{ state: FadingState }> = ({ state }) => {
  const Ts = state.symbolDurationUs;
  const στ = state.delaySpreadUs;

  // Render Flat PDP Taps
  const flatData = [
    { delay: 0.0, power: 1.0, label: 'Main' },
    { delay: Ts * 0.05, power: 0.35, label: 'Ref1' },
    { delay: Ts * 0.12, power: 0.08, label: 'Ref2' },
    { delay: Ts * 0.3, power: 0.0, label: '' },
    { delay: Ts * 1.0, power: 0.0, label: 'Ts Line' }
  ];

  // Render Selective PDP Taps
  const selectiveData = [
    { delay: 0.0, power: 1.0, label: 'Main' },
    { delay: Ts * 0.4, power: 0.8, label: 'Ref1' },
    { delay: Ts * 0.9, power: 0.5, label: 'Ref2' },
    { delay: Ts * 1.5, power: 0.3, label: 'ISI' },
    { delay: Ts * 2.2, power: 0.15, label: 'ISI 2' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
      <div className="mb-3">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center justify-between">
          <span>4. Flat vs. Frequency-Selective Fading</span>
          <span className="text-[9.5px] font-black uppercase text-slate-400">στ / Ts Relation</span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
          Side-by-side comparison: does delay spread extend past symbol period (Ts)?
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 mt-2">
        {/* Flat Fading Plot */}
        <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-2 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded tracking-widest uppercase">
              Flat (στ &lt;&lt; Ts)
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mb-2">Multipath dies before duration Ts</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flatData} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="delay" 
                  fontSize={8} 
                  stroke="#94a3b8" 
                  tickFormatter={(val) => `${val.toFixed(1)}μ`}
                />
                <YAxis domain={[0, 1.1]} fontSize={8} stroke="#94a3b8" />
                <ReferenceLine x={Ts} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: `Ts (${Ts}μs)`, position: 'top', fill: '#10b981', fontSize: 7, fontWeight: 'bold' }} />
                <Bar dataKey="power" fill="#10b981" barSize={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Selective Fading Plot */}
        <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-2 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8.5px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded tracking-widest uppercase">
              Selective (στ &ge; Ts)
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mb-2">Reflections cause severe ISI cascade</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectiveData} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="delay" 
                  fontSize={8} 
                  stroke="#94a3b8" 
                  tickFormatter={(val) => `${val.toFixed(1)}μ`}
                />
                <YAxis domain={[0, 1.1]} fontSize={8} stroke="#94a3b8" />
                <ReferenceLine x={Ts} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" label={{ value: `Ts (${Ts}μs)`, position: 'top', fill: '#ef4444', fontSize: 7, fontWeight: 'bold' }} />
                <Bar dataKey="power" fill="#f43f5e" barSize={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Graph 5: Slow vs Fast Fading
const SlowVsFastFadingGraph: React.FC<{ state: FadingState }> = ({ state }) => {
  const Ts = state.symbolDurationUs;
  
  // Coherence time tracker in ms
  const speedMs = state.speedUnit === 'ms' ? state.speedVal : state.speedVal / 3.6;
  const fm = (speedMs * state.carrierFreqMhz) / 300; 
  const TcMs = fm > 0 ? (0.423 / fm) * 1000 : Infinity;

  // Time domains for 4 symbol periods (0 to 4Ts)
  const slowData = useMemo(() => {
    const data = [];
    // slow model undulates slowly
    for (let i = 0; i <= 50; i++) {
      const scale = i / 50;
      const t = scale * 4 * Ts; // range 0 to 4 Ts
      const h_mag = 0.75 + 0.15 * Math.sin(scale * Math.PI * 0.7) + 0.05 * Math.sin(scale * Math.PI * 1.8);
      data.push({ t, h_mag });
    }
    return data;
  }, [Ts]);

  const fastData = useMemo(() => {
    const data = [];
    // fast model triggers rapid variations inside individual windows
    for (let i = 0; i <= 50; i++) {
      const scale = i / 50;
      const t = scale * 4 * Ts; // range 0 to 4 Ts
      const h_mag = Math.abs(0.5 + 0.45 * Math.sin(scale * Math.PI * 7.5) + 0.15 * Math.cos(scale * Math.PI * 15));
      data.push({ t, h_mag });
    }
    return data;
  }, [Ts]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
      <div className="mb-3">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center justify-between">
          <span>5. Slow vs. Fast Fading Dynamics</span>
          <span className="text-[10px] font-bold text-sky-600 uppercase bg-sky-50 px-2 py-0.5 rounded-full">
            Tc ≈ {TcMs === Infinity ? '∞' : `${TcMs.toFixed(2)} ms`}
          </span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
          Amplitude variations across 4 symbol grids. Boundaries indicate period Ts.
        </p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 mt-2">
        {/* Slow Fading time envelope */}
        <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-2 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8.5px] font-black text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded tracking-widest uppercase">
              Slow Fading (Ts &lt;&lt; Tc)
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mb-2">Steady state channel stays constant per symbol</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slowData} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                <XAxis dataKey="t" fontSize={8} stroke="#94a3b8" tickFormatter={(val) => `${val.toFixed(0)}μs`} />
                <YAxis domain={[0, 1.2]} fontSize={8} stroke="#94a3b8" />
                <ReferenceLine x={Ts} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="3 3 text" label={{ value: 'S1', position: 'insideTopLeft', fill: '#0ea5e9', fontSize: 6 }} />
                <ReferenceLine x={2*Ts} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="3 3" label={{ value: 'S2', position: 'insideTopLeft', fill: '#0ea5e9', fontSize: 6 }} />
                <ReferenceLine x={3*Ts} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="3 3" label={{ value: 'S3', position: 'insideTopLeft', fill: '#0ea5e9', fontSize: 6 }} />
                <Line type="monotone" dataKey="h_mag" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fast Fading time envelope */}
        <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-2 flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[8.5px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded tracking-widest uppercase">
              Fast Fading (Ts &ge; Tc)
            </span>
          </div>
          <p className="text-[8px] text-slate-400 font-bold uppercase mb-2">Vigorous sweeps & deep nulls within a single symbol</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fastData} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                <XAxis dataKey="t" fontSize={8} stroke="#94a3b8" tickFormatter={(val) => `${val.toFixed(0)}μs`} />
                <YAxis domain={[0, 1.2]} fontSize={8} stroke="#94a3b8" />
                <ReferenceLine x={Ts} stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" label={{ value: 'S1', position: 'insideTopLeft', fill: '#f43f5e', fontSize: 6 }} />
                <ReferenceLine x={2*Ts} stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" label={{ value: 'S2', position: 'insideTopLeft', fill: '#f43f5e', fontSize: 6 }} />
                <ReferenceLine x={3*Ts} stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" label={{ value: 'S3', position: 'insideTopLeft', fill: '#f43f5e', fontSize: 6 }} />
                <Line type="monotone" dataKey="h_mag" stroke="#e11d48" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Graph 6: Coherence Bandwidth vs RMS Delay Spread
const CoherenceBwVsDelaySpreadGraph: React.FC<{ state: FadingState }> = ({ state }) => {
  const currentSpread = state.delaySpreadUs;
  
  // Build hyperbolic plot data: Bc ≈ 1/(5στ) (50%) and Bc ≈ 1/(50στ) (90%)
  const chartData = useMemo(() => {
    const data = [];
    // Delay spread ranging from 0.05 to 5.0 microseconds
    for (let d = 0.05; d <= 5.0; d += 0.05) {
      // Bc in MHz: Bc = 1/5στ
      const Bc50 = 1 / (5 * d);
      const Bc90 = 1 / (50 * d);
      data.push({
        spread: parseFloat(d.toFixed(2)),
        Bc50: parseFloat(Bc50.toFixed(3)),
        Bc90: parseFloat(Bc90.toFixed(4))
      });
    }
    return data;
  }, []);

  const currentBc50 = 1 / (5 * currentSpread);
  const currentBc90 = 1 / (50 * currentSpread);

  const activePointer = [
    { spread: currentSpread, Bc50: currentBc50, Bc90: currentBc90 }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
      <div className="mb-3">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center justify-between">
          <span>6. Coherence Bandwidth vs. RMS Delay Spread</span>
          <span className="text-[9.5px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
            Bc ≈ 1 / (5·στ)
          </span>
        </h4>
        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
          Inverse relationship. Slider modifications slide active glowing points in real-time.
        </p>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 10, left: -25, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="spread" 
              type="number"
              domain={[0, 5.0]}
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val}μs`}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={9} 
              fontWeight="bold"
              tickFormatter={(val) => `${val}MHz`}
              domain={[0, 4.0]}
            />
            <Tooltip 
              formatter={(value, name) => [`${value} MHz`, name === 'Bc50' ? 'Bc (50%)' : 'Bc (90%)']}
              labelFormatter={(val) => `RMS Delay Spread στ: ${val} μs`}
              contentStyle={{ fontSize: '10px' }}
            />
            <Legend verticalAlign="top" iconSize={8} height={20} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
            <Line 
              name="Bc (50% Correlation)" 
              type="monotone" 
              dataKey="Bc50" 
              stroke="#0ea5e9" 
              strokeWidth={2.5} 
              dot={false}
            />
            <Line 
              name="Bc (90% Correlation)" 
              type="monotone" 
              dataKey="Bc90" 
              stroke="#9333ea" 
              strokeWidth={2} 
              dot={false}
            />
            
            {/* Pulsating current operating dot indicators representing dynamic parameters */}
            <ReferenceLine x={currentSpread} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
            <ReferenceLine y={currentBc50} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 grid grid-cols-2 gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></div>
          <span>Active Bc (50%): {currentBc50.toFixed(2)} MHz</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-400"></div>
          <span>Active Bc (90%): {currentBc90.toFixed(3)} MHz</span>
        </div>
      </div>
    </div>
  );
};


// --- PDP Config component (Tab 3: PDP Config) ---
const PdpAnalysis: React.FC<{ 
  onSync: (rms: number, cohBwMhz: number) => void;
  parentState: FadingState;
  onStateUpdate: (u: Partial<FadingState>) => void;
}> = ({ onSync, parentState, onStateUpdate }) => {
  const [paths, setPaths] = useState<MultipathPath[]>([
    { id: '1', delay: 0, power: 1.0, powerDb: 0 },
    { id: '2', delay: 0.5, power: 0.5, powerDb: -3 },
    { id: '3', delay: 1.5, power: 0.25, powerDb: -6 },
    { id: '4', delay: 3.5, power: 0.1, powerDb: -10 },
  ]);
  const [powerMode, setPowerMode] = useState<'linear' | 'db'>('linear');

  // Calculates math elements in micoseconds
  const metrics = useMemo(() => {
    if (paths.length === 0) return { meanDelay: 0, rmsDelay: 0, Bc50: 0 };
    const totalPower = paths.reduce((sum, p) => sum + p.power, 0);
    const meanDelay = paths.reduce((sum, p) => sum + (p.power * p.delay), 0) / totalPower;
    const meanSquareDelay = paths.reduce((sum, p) => sum + (p.power * p.delay * p.delay), 0) / totalPower;
    const rmsDelay = Math.sqrt(Math.max(0, meanSquareDelay - (meanDelay * meanDelay)));
    const Bc50 = rmsDelay > 0 ? 1 / (5 * rmsDelay) : Infinity; // MHz
    return { meanDelay, rmsDelay, Bc50 };
  }, [paths]);

  // Sync state Spread when paths modified
  useEffect(() => {
    if (metrics.rmsDelay > 0) {
      onStateUpdate({ delaySpreadUs: parseFloat(metrics.rmsDelay.toFixed(3)) });
    }
  }, [metrics.rmsDelay, onStateUpdate]);

  const addPath = () => {
    const lastDelay = paths.length > 0 ? paths[paths.length - 1].delay : 0;
    const newPath: MultipathPath = {
      id: Math.random().toString(36).substr(2, 9),
      delay: lastDelay + 1.0,
      power: 0.1,
      powerDb: -10
    };
    setPaths([...paths, newPath]);
  };

  const removePath = (id: string) => {
    if (paths.length <= 1) return;
    setPaths(paths.filter(p => p.id !== id));
  };

  const updatePath = (id: string, field: 'delay' | 'power' | 'powerDb', value: number) => {
    setPaths(paths.map(p => {
      if (p.id === id) {
        if (field === 'power') {
          return { ...p, power: value, powerDb: 10 * Math.log10(Math.max(1e-10, value)) };
        } else if (field === 'powerDb') {
          return { ...p, powerDb: value, power: Math.pow(10, value / 10) };
        }
        return { ...p, [field]: Math.max(0, value) };
      }
      return p;
    }));
  };

  const stemData = useMemo(() => {
    return paths.map(p => ({
      delay: p.delay,
      power: p.power,
      powerDb: p.powerDb
    })).sort((a, b) => a.delay - b.delay);
  }, [paths]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Multipath List Editor */}
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-900 font-black uppercase text-xs tracking-widest flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              Discrete PDP Taps
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setPowerMode(powerMode === 'linear' ? 'db' : 'linear')}
                className="text-[9px] font-black bg-slate-50 text-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-white hover:text-indigo-600 transition-all uppercase tracking-widest"
              >
                {powerMode}
              </button>
              <button 
                onClick={addPath}
                className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-2 scrollbar-thin">
            {paths.map((path, idx) => (
              <div key={path.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 group relative transition-all hover:bg-white hover:border-indigo-100 shadow-sm">
                <button 
                  onClick={() => removePath(path.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-rose-100 shadow-sm z-10"
                >
                  <Trash2 size={11} />
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Delay τ{idx} (μs)</label>
                    <input 
                      type="number"
                      step="0.1"
                      min="0"
                      value={path.delay}
                      onChange={(e) => updatePath(path.id, 'delay', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-900 text-xs font-black focus:border-indigo-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Power {powerMode === 'linear' ? '(P)' : '(dB)'}
                    </label>
                    <input 
                      type="number"
                      step={powerMode === 'linear' ? '0.05' : '1'}
                      value={powerMode === 'linear' ? parseFloat(path.power.toFixed(3)) : parseFloat((path.powerDb || 0).toFixed(0))}
                      onChange={(e) => updatePath(path.id, powerMode === 'linear' ? 'power' : 'powerDb', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-slate-900 text-xs font-black focus:border-indigo-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
             <button 
               onClick={() => onSync(metrics.rmsDelay, metrics.Bc50)}
               className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
             >
               <Zap className="w-4 h-4" />
               Apply Taps to Main Solver
             </button>
          </div>
        </div>

        {/* Dynamic visual graph sync view */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col flex-1">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-500" />
              Dynamic Impulse Delay Power Profile
            </h3>
            
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stemData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="delay" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    fontWeight="bold"
                    type="number"
                    tickFormatter={(val) => `${val.toFixed(1)}μ`}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    fontWeight="bold"
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px' }}
                    labelFormatter={(val) => `DELAY: ${val} μs`}
                  />
                  <Bar dataKey="power" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={6}>
                    {stemData.map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                 <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Mean Delay (τ̄)</div>
                 <div className="text-lg font-black text-slate-950 mt-1">{metrics.meanDelay.toFixed(3)} μs</div>
              </div>
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl">
                 <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">RMS Spread (στ)</div>
                 <div className="text-lg font-black text-slate-950 mt-1">{metrics.rmsDelay.toFixed(3)} μs</div>
              </div>
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl animate-pulse">
                 <div className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Bc (50% Corr)</div>
                 <div className="text-lg font-black text-indigo-600 mt-1">{metrics.Bc50.toFixed(2)} MHz</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Educational Equations Sheet (Tab 4: Formulas) ---
const FormulaList: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h3 className="text-slate-900 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
        <Monitor className="w-5 h-5 text-indigo-500" />
        Time Dispersion Metrics
      </h3>
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-2">Mean Excess Delay</span>
          <p className="font-mono text-[11px] font-black text-indigo-600">τ̄ = Σ (Pi * τi) / Σ Pi</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-2">RMS Delay Spread</span>
          <p className="font-mono text-[11px] font-black text-indigo-600">στ = √[ τ² - (τ̄)² ]</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-2">Coherence Bandwidth</span>
          <p className="font-mono text-[11px] font-black text-slate-800">Bc ≈ 1 / (5 * στ) (50% correlation)</p>
          <p className="font-mono text-[11px] font-black text-slate-800 mt-1">Bc ≈ 1 / (50 * στ) (90% correlation)</p>
        </div>
      </div>
    </div>

    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h3 className="text-slate-900 font-black uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
        <Zap className="w-5 h-5 text-sky-500" />
        Frequency Dispersion Metrics
      </h3>
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-2">Max Doppler Shift</span>
          <p className="font-mono text-[11px] font-black text-sky-600">fm = v / λ = (v * fc) / c</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">Coherence Time (Stability Bound)</span>
          <p className="text-[8px] text-slate-400 mb-2 font-bold uppercase">Standardized to Clarke's isotropic scatter model</p>
          <p className="font-mono text-[11px] font-black text-sky-600">Tc ≈ 0.423 / fm</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fading Bounds</span>
          <p className="text-[9px] font-bold text-slate-600 uppercase">Flat vs Selective: Bs &lt; Bc  vs  Bs &ge; Bc</p>
          <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Slow vs Fast: Ts &lt; Tc  vs  Ts &ge; Tc</p>
        </div>
      </div>
    </div>
  </div>
);


// --- MAIN SIMULATION WRAPPER COMPONENT (PRIMARY SCREEN) ---
export const FadingSimulation: React.FC = () => {
  const [state, setState] = useState<FadingState>({
    carrierFreqMhz: 1800,
    speedVal: 15,
    speedUnit: 'ms',
    delaySpreadUs: 0.8,
    symbolDurationUs: 15,
    signalBandwidthMhz: 5,
    spectralProfile: 'flat',
    temporalProfile: 'slow'
  });
  const [activeSubTab, setActiveSubTab] = useState<'visual' | 'analytics' | 'pdp' | 'formulas'>('analytics');

  const speedKmh = state.speedUnit === 'kmh' ? state.speedVal : state.speedVal * 3.6;
  const speedMs = state.speedUnit === 'ms' ? state.speedVal : state.speedVal / 3.6;
  const carrierFreqHz = state.carrierFreqMhz * 1e6;

  // Maximum Doppler Shift calculation: fm = v * fc_hz / c
  const dopplerShift = (speedMs * carrierFreqHz) / LIGHT_SPEED;

  // Coherence Time calculation: Tc ≈ 0.423 / fm (in milliseconds)
  const coherenceTimeMs = dopplerShift > 0 ? (0.423 / dopplerShift) * 1000 : Infinity;

  // Coherence Bandwidth 50%: Bc_50 = 1 / (5 * στ)
  const Bc50Mhz = state.delaySpreadUs > 0 ? 1 / (5 * state.delaySpreadUs) : Infinity;

  // Real-time Fading Classification Engine
  // Flat vs Selective: στ < Ts * 0.1
  const isSelective = state.delaySpreadUs >= (state.symbolDurationUs * 0.1);
  const derivedSpectralProfile = isSelective ? 'selective' : 'flat';

  // Slow vs Fast: Ts_ms >= Tc_ms
  const symbolDurationMs = state.symbolDurationUs / 1000;
  const isFast = symbolDurationMs >= coherenceTimeMs;
  const derivedTemporalProfile = isFast ? 'fast' : 'slow';

  // Synchronize dynamic classifications perfectly to local state profiles
  useEffect(() => {
    setState(prev => {
      if (prev.spectralProfile !== derivedSpectralProfile || prev.temporalProfile !== derivedTemporalProfile) {
        return {
          ...prev,
          spectralProfile: derivedSpectralProfile,
          temporalProfile: derivedTemporalProfile
        };
      }
      return prev;
    });
  }, [derivedSpectralProfile, derivedTemporalProfile]);

  // Resolves custom wrapper for Spectrum/Wave monitors backwards compatibility
  const legacyStateCompat = useMemo(() => ({
    spectralProfile: state.spectralProfile,
    temporalProfile: state.temporalProfile,
    coherenceBandwidth: Bc50Mhz * 1000, 
    delaySpread: state.delaySpreadUs,
    speed: speedKmh,
    carrierFreq: state.carrierFreqMhz / 1000,
    dopplerShift: dopplerShift,
    symbolDuration: state.symbolDurationUs,
    signalBandwidth: state.signalBandwidthMhz,
    coherenceTime: coherenceTimeMs
  }), [state, Bc50Mhz, speedKmh, dopplerShift, coherenceTimeMs]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 h-full font-sans bg-white overflow-hidden">
      
      {/* Sidebar Parameter Controllers */}
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0 h-full overflow-y-auto pr-1 scrollbar-hide">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Sliders className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-slate-900 font-black uppercase text-xs tracking-tight">Fading Controller</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Physical Channel Links</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Verdict and classifications board */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Spectral Verdict</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isSelective ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   {isSelective ? 'Freq-Selective' : 'Flat Fading'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Temporal Verdict</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isFast ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'}`}>
                  {isFast ? 'Fast Fading' : 'Slow Fading'}
                </span>
              </div>
            </div>

            <div className="pt-2">
               <StabilityMeter isFast={isFast} cohTimeMs={coherenceTimeMs} tsUs={state.symbolDurationUs} />
            </div>

            {/* Inputs sliders */}
            <div className="space-y-5 pt-3 border-t border-slate-100">
              
              {/* Slider 1: Carrier Frequency */}
              <div>
                <div className="flex justify-between mb-1 items-baseline">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Carrier Freq (fc)</span>
                  <span className="text-xs font-black text-slate-900">{state.carrierFreqMhz} MHz</span>
                </div>
                <input
                  type="range" min="500" max="6000" step="50"
                  value={state.carrierFreqMhz}
                  onChange={(e) => setState(prev => ({ ...prev, carrierFreqMhz: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
              </div>

              {/* Slider 2: Speed */}
              <div>
                <div className="flex justify-between mb-1 items-baseline">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Velocity (v)</span>
                  <span className="text-xs font-black text-slate-900">
                    {state.speedVal} {state.speedUnit === 'ms' ? 'm/s' : 'km/h'}
                    <span className="text-[9px] font-bold text-slate-400 normal-case ml-1.5">
                      ({state.speedUnit === 'ms' ? `${speedKmh.toFixed(0)} km/h` : `${speedMs.toFixed(1)} m/s`})
                    </span>
                  </span>
                </div>
                <input
                  type="range" 
                  min="0" 
                  max={state.speedUnit === 'ms' ? "85" : "300"} 
                  step="1"
                  value={state.speedVal}
                  onChange={(e) => setState(prev => ({ ...prev, speedVal: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
                <div className="flex gap-2 mt-1.5">
                   <button 
                     onClick={() => setState(prev => ({ ...prev, speedUnit: 'kmh', speedVal: Math.round(speedKmh) }))}
                     className={`text-[8.5px] font-black px-2 py-0.5 rounded border transition-all ${state.speedUnit === 'kmh' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                   >
                     km/h
                   </button>
                   <button 
                     onClick={() => setState(prev => ({ ...prev, speedUnit: 'ms', speedVal: Math.round(speedMs) }))}
                     className={`text-[8.5px] font-black px-2 py-0.5 rounded border transition-all ${state.speedUnit === 'ms' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                   >
                     m/s
                   </button>
                </div>
              </div>

              {/* Slider 3: RMS Delay Spread */}
              <div>
                <div className="flex justify-between mb-1 items-baseline">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Delay Spread (στ)</span>
                  <span className="text-xs font-black text-indigo-600">
                    {state.delaySpreadUs} μs
                    <span className="text-[9px] font-bold text-slate-400 normal-case ml-1">
                      ({(state.delaySpreadUs * 1000).toFixed(0)} ns)
                    </span>
                  </span>
                </div>
                <input
                  type="range" min="0.05" max="10.0" step="0.05"
                  value={state.delaySpreadUs}
                  onChange={(e) => setState(prev => ({ ...prev, delaySpreadUs: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Slider 4: Symbol Duration */}
              <div>
                <div className="flex justify-between mb-1 items-baseline">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Symbol Period (Ts)</span>
                  <span className="text-xs font-black text-slate-900">{state.symbolDurationUs} μs</span>
                </div>
                <input
                  type="range" min="0.5" max="100" step="0.5"
                  value={state.symbolDurationUs}
                  onChange={(e) => setState(prev => ({ ...prev, symbolDurationUs: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
              </div>

              {/* Slider 5: Signal Bandwidth Bs (Keep compat) */}
              <div>
                <div className="flex justify-between mb-1 items-baseline">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bandwidth (Bs)</span>
                  <span className="text-xs font-black text-sky-600">{state.signalBandwidthMhz} MHz</span>
                </div>
                <input
                  type="range" min="0.1" max="100" step="0.5"
                  value={state.signalBandwidthMhz}
                  onChange={(e) => setState(prev => ({ ...prev, signalBandwidthMhz: parseFloat(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>
            </div>

            {/* Computation Results */}
            <div className="pt-5 border-t border-slate-100">
               <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Active Math Output</span>
                    <RefreshCcw className="w-3 h-3 text-slate-300 animate-spin-slow" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Max Doppler Sweep (fm)</span>
                      <span className="text-lg font-black text-slate-900">{dopplerShift.toFixed(1)} <span className="text-[10px] text-slate-400">Hz</span></span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Coherence Time (Tc)</span>
                      <span className="text-lg font-black text-slate-900">{coherenceTimeMs === Infinity ? '∞' : `${coherenceTimeMs.toFixed(2)} ms`}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider">Bc (50% correlation)</span>
                      <span className="text-lg font-black text-indigo-600">{Bc50Mhz.toFixed(2)} <span className="text-[10px] text-slate-400">MHz</span></span>
                    </div>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Visual Display Tabs Content */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto pr-1 scrollbar-thin">
        
        {/* Navigation Tabs Bar */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit shrink-0">
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-5 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeSubTab === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Advanced Graphs
          </button>
          
          <button
            onClick={() => setActiveSubTab('visual')}
            className={`px-5 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeSubTab === 'visual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Monitor
          </button>

          <button
            onClick={() => setActiveSubTab('pdp')}
            className={`px-5 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeSubTab === 'pdp' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Database className="w-3.5 h-3.5" />
            PDP Config
          </button>
          
          <button
            onClick={() => setActiveSubTab('formulas')}
            className={`px-5 py-2 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeSubTab === 'formulas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Equations
          </button>
        </div>

        {/* Tab 1: Live Monitor Component */}
        {activeSubTab === 'visual' && (
          <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-3xl blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
              
              {!isFast && (
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2 bg-emerald-600 text-white rounded-full shadow-md border border-emerald-400 flex items-center gap-2">
                    <Sparkles size={13} className="fill-white" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Channel State: Slowly Varying (Steady)</span>
                 </div>
              )}
              
              <div className="relative">
                <SpectrumAnalyzer state={state} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Oscilloscope state={state} />
              <CarrierWave state={state} />
            </div>

            <MultipathSchematic state={state} />
          </div>
        )}

        {/* Tab 2: Advanced Interactive Graphs grid - Full representation of all requested validation curves */}
        {activeSubTab === 'analytics' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-500">
            {/* Graph 1: Received Power vs Separation */}
            <TRSeparationGraph state={state} />

            {/* Graph 2: Power Delay Profile Outdoor vs Indoor */}
            <PdpCompareGraph />

            {/* Graph 3: Doppler Spectrum */}
            <DopplerSpectrumGraph state={state} />

            {/* Graph 4: Flat vs Frequency-Selective comparative diagrams */}
            <FlatFadingVsSelectiveGraph state={state} />

            {/* Graph 5: Slow vs Fast Fading time comparison */}
            <SlowVsFastFadingGraph state={state} />

            {/* Graph 6: Coherence Bandwidth hyperbolic curve */}
            <CoherenceBwVsDelaySpreadGraph state={state} />
          </div>
        )}

        {/* Tab 3: PDP Taps Configuration */}
        {activeSubTab === 'pdp' && (
          <PdpAnalysis 
            parentState={state}
            onStateUpdate={(updates) => setState(prev => ({ ...prev, ...updates }))}
            onSync={(rms, cohBwMhz) => {
              setState(prev => ({ 
                ...prev, 
                delaySpreadUs: rms,
                spectralProfile: prev.signalBandwidthMhz > cohBwMhz ? 'selective' : 'flat'
              }));
              setActiveSubTab('analytics');
            }} 
          />
        )}

        {/* Tab 4: Formula references equations */}
        {activeSubTab === 'formulas' && <FormulaList />}

      </div>
    </div>
  );
};

export default FadingSimulation;
