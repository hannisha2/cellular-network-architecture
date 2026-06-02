/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings2, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Activity, 
  Zap, 
  Radio, 
  Info, 
  CheckCircle2, 
  BarChart3, 
  ArrowRightLeft,
  LayoutGrid,
  Cpu,
  TrendingUp,
  ShieldAlert,
  Eye,
  EyeOff,
  Box,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { 
  NetworkDesignParams, 
  DerivedParams, 
  calculateDerivedParams, 
  DESIGN_SCENARIOS, 
  ScenarioType,
  getFrequencyGroups,
  VALID_CLUSTERS,
  calculateTheoreticalSir
} from './network-types';

// --- Components ---

const ParameterSlider = ({ label, value, min, max, step, unit, onChange, icon: Icon, color }: any) => (
  <div className="space-y-3">
    <div className="flex justify-between items-end">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
          <Icon size={14} className={color.replace('bg-', 'text-')} />
        </div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      </div>
      <span className="text-sm font-mono font-black text-slate-900">{value}{unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step}
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-${color.split('-')[1]}-500`}
    />
  </div>
);

const DerivedMetric = ({ label, value, unit, description, highlight }: any) => (
  <div className={`p-4 rounded-2xl border transition-all duration-300 ${highlight ? 'bg-blue-600 border-blue-500 shadow-blue-200' : 'bg-white border-slate-100 shadow-sm'}`}>
    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>{label}</p>
    <div className="flex items-baseline gap-1">
      <span className={`text-xl font-black ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</span>
      <span className={`text-[10px] font-bold uppercase ${highlight ? 'text-blue-200' : 'text-slate-400'}`}>{unit}</span>
    </div>
    <p className={`text-[9px] mt-1 italic ${highlight ? 'text-blue-200' : 'text-slate-400'}`}>{description}</p>
  </div>
);

const FrequencyFormulaCard = ({ params }: { params: NetworkDesignParams }) => (
  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
      <Box size={80} />
    </div>
    <div className="relative z-10">
      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Geometry Definition</p>
      <h3 className="text-3xl font-black mb-4">N = i² + ij + j²</h3>
      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase">Unit Steps (i)</p>
          <p className="text-xl font-black">{params.i}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase">60° Angle (j)</p>
          <p className="text-xl font-black">{params.j}</p>
        </div>
      </div>
    </div>
  </div>
);

const ComparisonCard = ({ title, params, derived, color }: { title: string, params: NetworkDesignParams, derived: DerivedParams, color: string }) => (
  <div className={`p-6 rounded-3xl border-2 ${color} bg-white shadow-xl space-y-6`}>
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${color.replace('border-', 'bg-').replace('border-', 'text-')} bg-opacity-10`}>
        Config Active
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase">Cluster Size</p>
        <p className="text-sm font-black text-slate-900">N = {params.clusterSizeN} ({params.i},{params.j})</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase">Channels/Cell</p>
        <p className="text-sm font-black text-slate-900">{derived.channelsPerCell}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase">Reuse Ratio</p>
        <p className="text-sm font-black text-slate-900">{(derived.reuseRatio).toFixed(2)}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-400 uppercase">Co-Channel Dist</p>
        <p className="text-sm font-black text-slate-900">{derived.coChannelDistance.toFixed(1)} km</p>
      </div>
    </div>

    <div className="pt-4 border-t border-slate-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase">Interference Risk</span>
        <span className={`text-xs font-black ${derived.interferenceEstimate > 0.1 ? 'text-rose-600' : 'text-emerald-600'}`}>
          {(derived.interferenceEstimate * 100).toFixed(2)}%
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${derived.interferenceEstimate > 0.1 ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(100, derived.interferenceEstimate * 500)}%` }}
        />
      </div>
    </div>
  </div>
);

// --- Main Component ---

export default function NetworkDesignTool() {
  const [params, setParams] = useState<NetworkDesignParams>(DESIGN_SCENARIOS.URBAN);
  const [comparisonParams, setComparisonParams] = useState<NetworkDesignParams>(DESIGN_SCENARIOS.URBAN);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('URBAN');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [highlightCoChannel, setHighlightCoChannel] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [boundaryColor, setBoundaryColor] = useState<string>('#1e293b');
  const [showOnlySingleCluster, setShowOnlySingleCluster] = useState(false);

  const derived = useMemo(() => calculateDerivedParams(params), [params]);
  const comparisonDerived = useMemo(() => calculateDerivedParams(comparisonParams), [comparisonParams]);
  const freqGroups = useMemo(() => getFrequencyGroups(params.totalChannelsS, params.clusterSizeN), [params.totalChannelsS, params.clusterSizeN]);

  const theoreticalSirNormal = useMemo(() => calculateTheoreticalSir(params.clusterSizeN, params.pathLossN, false), [params.clusterSizeN, params.pathLossN]);
  const theoreticalSirWorst = useMemo(() => calculateTheoreticalSir(params.clusterSizeN, params.pathLossN, true), [params.clusterSizeN, params.pathLossN]);

  const handleScenarioChange = (type: ScenarioType) => {
    setActiveScenario(type);
    setParams(DESIGN_SCENARIOS[type]);
  };

  const getClusterGeometry = (n: number): { i: number; j: number } | null => {
    const found = VALID_CLUSTERS.find(c => c.n === n);
    if (found) return { i: found.i, j: found.j };
    return null;
  };

  const clusterParams = useMemo(() => getClusterGeometry(params.clusterSizeN), [params.clusterSizeN]);

  /**
   * Generates a high-contrast, bold, and unique color for a frequency index.
   */
  const getFrequencyColor = (f: number, NTotal: number) => {
    // Standard high-contrast palettes for common small N
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
   * Determines contrast color based on frequency index.
   */
  const getContrastColor = (f: number, NTotal: number) => {
    if (NTotal <= 7) return '#ffffff';
    const lightnessTiers = [45, 60, 75];
    const lightness = lightnessTiers[f % 3];
    return lightness > 65 ? '#1e293b' : '#ffffff';
  };

  const updateN = (newN: number) => {
    const val = Math.max(1, newN);
    const p = getClusterGeometry(val);
    if (p) {
      setParams(prev => ({ ...prev, clusterSizeN: val, i: p.i, j: p.j }));
    } else {
      setParams(prev => ({ ...prev, clusterSizeN: val }));
    }
  };

  const updateComparisonN = (newN: number) => {
    const val = Math.max(1, newN);
    const p = getClusterGeometry(val);
    if (p) {
      setComparisonParams(prev => ({ ...prev, clusterSizeN: val, i: p.i, j: p.j }));
    } else {
      setComparisonParams(prev => ({ ...prev, clusterSizeN: val }));
    }
  };

  const chartData = useMemo(() => [
    { name: 'Channels/Cell', current: derived.channelsPerCell, comparison: comparisonDerived.channelsPerCell },
    { name: 'Capacity (Mbps)', current: Math.round(derived.capacityPerCell), comparison: Math.round(comparisonDerived.capacityPerCell) },
    { name: 'Interference (%)', current: Math.round(derived.interferenceEstimate * 1000), comparison: Math.round(comparisonDerived.interferenceEstimate * 1000) },
  ], [derived, comparisonDerived]);

// Helper for consistent, deterministic, order-independent group mapping
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

const getGroupIndex = (q: number, r: number, i: number, j: number, N: number) => {
  return getCosetIndex(q, r, i, j, N);
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

// Helper to check cluster membership exactly
const isCellInCluster = (q: number, r: number, target_cq: number, target_cr: number, i: number, j: number, N: number) => {
  const center = getHexClusterCenter(q, r, i, j, N);
  return center.cq === target_cq && center.cr === target_cr;
};

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-8 shadow-sm z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Network Planning & Design</h1>
            <p className="text-slate-500 text-sm mt-1">Configure cluster size, frequency reuse, and capacity parameters</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Compare Configs button has been removed as requested */}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Parameters */}
        <aside className="w-96 bg-white border-r border-slate-200 p-8 overflow-y-auto z-20 shadow-xl scrollbar-thin">
          <div className="space-y-10">
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Settings2 className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Design Parameters</h2>
              </div>
              
              <div className="space-y-8">
                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                       <LayoutGrid size={14} className="text-blue-500" />
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cluster Size (N)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       {!clusterParams && (
                         <span className="text-[7px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded border border-rose-100 uppercase animate-pulse">Non-Standard</span>
                       )}
                       <span className="text-sm font-black text-slate-900">N = {params.clusterSizeN}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateN(params.clusterSizeN - 1)}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 text-slate-600 transition-all shadow-sm active:scale-95"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex-1 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center relative group">
                      <input 
                        type="number"
                        min="1"
                        value={params.clusterSizeN}
                        onChange={(e) => updateN(parseInt(e.target.value) || 1)}
                        className="w-full h-full bg-transparent text-center font-black text-slate-900 border-none outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <button 
                      onClick={() => updateN(params.clusterSizeN + 1)}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 text-slate-600 transition-all shadow-sm active:scale-95"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tighter italic">
                    <span>Min N=1</span>
                    <span>No Upper Limit</span>
                  </div>
                  
                  <p className="text-[9px] text-blue-500 bg-blue-50 p-3 rounded-2xl italic leading-relaxed">
                    {clusterParams 
                      ? `Valid Reuse: i=${clusterParams.i}, j=${clusterParams.j} | D/R = √3N ≈ ${derived.reuseRatio.toFixed(2)}`
                      : `Heuristic Pattern: Applying modulo-N coloring. Ideal geometry not possible for N=${params.clusterSizeN}.`}
                  </p>
                </div>

                <ParameterSlider 
                  label="Total Channels (S)" 
                  value={params.totalChannelsS} min={50} max={1000} step={10} unit=""
                  onChange={(v: number) => setParams(p => ({ ...p, totalChannelsS: v }))}
                  icon={Radio} color="bg-emerald-500"
                />

                <ParameterSlider 
                  label="Cell Radius (R)" 
                  value={params.cellRadiusR} min={1} max={100} step={1} unit=" km"
                  onChange={(v: number) => setParams(p => ({ ...p, cellRadiusR: v }))}
                  icon={Maximize2} color="bg-indigo-500"
                />

                <ParameterSlider 
                  label="Path Loss (n)" 
                  value={params.pathLossN} min={2} max={6} step={0.1} unit=""
                  onChange={(v: number) => setParams(p => ({ ...p, pathLossN: v }))}
                  icon={Activity} color="bg-rose-500"
                />
              </div>
            </section>

            <section className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <Layers className="w-5 h-5 text-purple-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Frequency Groups</h2>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {freqGroups.map((group, idx) => {
                  const color = getFrequencyColor(idx, params.clusterSizeN);
                  const isSelected = selectedGroup === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedGroup(isSelected ? null : idx)}
                      className={`h-10 rounded-xl border text-[10px] font-black transition-all flex items-center justify-center gap-2 ${
                        isSelected 
                          ? 'ring-2 ring-slate-900 ring-offset-2' 
                          : 'hover:scale-105 active:scale-95'
                      }`}
                      style={{ 
                        backgroundColor: color,
                        color: getContrastColor(idx, params.clusterSizeN),
                        borderColor: isSelected ? 'transparent' : 'rgba(0,0,0,0.05)'
                      }}
                    >
                      G{idx + 1}
                    </button>
                  );
                })}
              </div>
              <AnimatePresence>
                {selectedGroup !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden"
                  >
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Channels in Group {selectedGroup + 1}</p>
                    <div className="flex flex-wrap gap-1">
                      {freqGroups[selectedGroup].slice(0, 15).map(ch => (
                        <span key={ch} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono font-bold text-slate-600">
                          {ch}
                        </span>
                      ))}
                      {freqGroups[selectedGroup].length > 15 && <span className="text-[9px] text-slate-400 font-bold">...</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Derived Metrics</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <DerivedMetric label="Reuse Ratio" value={derived.reuseRatio.toFixed(2)} unit="Q = D/R" description="Co-channel reuse distance ratio" />
                <DerivedMetric label="SIR (Normal Case)" value={theoreticalSirNormal.toFixed(1)} unit="dB" description="S/I = (1/6) · Q^n under average conditions" highlight={theoreticalSirNormal > 18} />
                <DerivedMetric label="SIR (Worst Case)" value={theoreticalSirWorst.toFixed(1)} unit="dB" description="Theoretical worst-case vertex location SIR" highlight={theoreticalSirWorst > 15} />
                <DerivedMetric label="Channels / Cell" value={derived.channelsPerCell} unit="Ch" description="Allocated spectrum per cell" />
                <DerivedMetric label="Reuse Distance" value={derived.coChannelDistance.toFixed(1)} unit="km" description="Distance to co-channel neighbor" />
              </div>
            </section>
          </div>
        </aside>

        {/* Main Content: Visualization & Comparison */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50 scrollbar-thin">
          <div className="max-w-6xl mx-auto space-y-8">
            <AnimatePresence mode="wait">
              {isComparisonMode ? (
                <motion.div 
                  key="comparison"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                >
                  <div className="space-y-6">
                    <ComparisonCard title="Current Config" params={params} derived={derived} color="border-blue-500" />
                    <div className="bg-white p-6 rounded-3xl border border-slate-200">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adjust Current</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Cluster Size (N)</span>
                          <span className="text-sm font-black text-blue-600">N = {params.clusterSizeN}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateN(params.clusterSizeN - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-all shadow-sm active:scale-95"
                          >
                            <ChevronLeft size={14} className="text-slate-600" />
                          </button>
                          <div className="h-8 flex-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center">
                            <input 
                              type="number"
                              min="1"
                              value={params.clusterSizeN}
                              onChange={(e) => updateN(parseInt(e.target.value) || 1)}
                              className="w-full bg-transparent text-center font-black text-blue-600 text-xs border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button 
                            onClick={() => updateN(params.clusterSizeN + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-all shadow-sm active:scale-95"
                          >
                            <ChevronRight size={14} className="text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <ComparisonCard title="Benchmark Config" params={comparisonParams} derived={comparisonDerived} color="border-indigo-500" />
                    <div className="bg-white p-6 rounded-3xl border border-slate-200">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adjust Benchmark</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Cluster Size (N)</span>
                          <span className="text-sm font-black text-indigo-600">N = {comparisonParams.clusterSizeN}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateComparisonN(comparisonParams.clusterSizeN - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-indigo-400 transition-all shadow-sm active:scale-95"
                          >
                            <ChevronLeft size={14} className="text-slate-600" />
                          </button>
                          <div className="h-8 flex-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center">
                            <input 
                              type="number"
                              min="1"
                              value={comparisonParams.clusterSizeN}
                              onChange={(e) => updateComparisonN(parseInt(e.target.value) || 1)}
                              className="w-full bg-transparent text-center font-black text-indigo-600 text-xs border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button 
                            onClick={() => updateComparisonN(comparisonParams.clusterSizeN + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:border-indigo-400 transition-all shadow-sm active:scale-95"
                          >
                            <ChevronRight size={14} className="text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Performance Delta</h4>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '2rem', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                            <Bar dataKey="current" name="Current" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="comparison" name="Benchmark" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="visualization"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  {/* Capacity Impact Dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FrequencyFormulaCard params={params} />

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-emerald-500">
                        <TrendingUp size={80} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Signal Quality (SIR)</p>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Normal Case:</span>
                            <span className={`text-2xl font-black ${theoreticalSirNormal > 18 ? 'text-emerald-600' : theoreticalSirNormal > 15 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {theoreticalSirNormal.toFixed(1)} <span className="text-xs font-bold text-slate-400">dB</span>
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-tight">Average conditions: D = Q·R</p>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Worst Case:</span>
                            <span className={`text-2xl font-black ${theoreticalSirWorst > 18 ? 'text-emerald-600' : theoreticalSirWorst > 15 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {theoreticalSirWorst.toFixed(1)} <span className="text-xs font-bold text-slate-400">dB</span>
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 leading-tight">Cell corner (vertex): D_min = (Q-1)·R</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-4 border-t border-slate-100 pt-3">
                        {theoreticalSirWorst > 15 ? 'Excellent/acceptable co-channel interference level.' : 'Critical interference levels detected at cell boundaries.'}
                      </p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform text-blue-500">
                        <Cpu size={80} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reuse Distance (D)</p>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-black text-slate-900">{derived.coChannelDistance.toFixed(1)}</span>
                        <span className="text-sm font-bold text-slate-400">km</span>
                      </div>
                      <p className="text-xs text-slate-500">Separation between cells using {params.totalChannelsS} channels</p>
                    </div>
                  </div>



                  {/* Frequency Reuse Pattern Visualization (SVG) */}
                  <div className="bg-white rounded-[3rem] border border-slate-200 p-10 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Frequency Reuse Pattern</h3>
                        <p className="text-slate-400 text-xs font-bold mt-1">Visualization of Cluster N={params.clusterSizeN} and Co-Channel Tiers</p>
                      </div>
                      <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                          <div className="flex items-center gap-4 px-4 h-10 min-w-[300px]">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Cluster N</span>
                              <span className="text-sm font-black text-slate-900">{params.clusterSizeN}</span>
                            </div>
                            <div className="h-4 w-px bg-slate-300" />
                            <div className="flex-1 flex items-center gap-1.5 h-10">
                                <button 
                                  onClick={() => updateN(params.clusterSizeN - 1)}
                                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded hover:border-blue-400 transition-all shadow-sm active:scale-95"
                                >
                                  <ChevronLeft size={12} className="text-slate-600" />
                                </button>
                                <div className="h-7 w-12 bg-white border border-slate-100 rounded flex items-center justify-center">
                                  <input 
                                    type="number"
                                    min="1"
                                    value={params.clusterSizeN}
                                    onChange={(e) => updateN(parseInt(e.target.value) || 1)}
                                    className="w-full bg-transparent text-center font-black text-slate-900 text-[10px] border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                                <button 
                                  onClick={() => updateN(params.clusterSizeN + 1)}
                                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded hover:border-blue-400 transition-all shadow-sm active:scale-95"
                                >
                                  <ChevronRight size={12} className="text-slate-600" />
                                </button>
                            </div>
                          </div>
                        </div>
                        <div className="h-10 w-px bg-slate-200 hidden md:block" />
                        
                        <div className="flex flex-col gap-1 min-w-[120px]">
                          <span className="text-[8px] font-black text-slate-400 uppercase leading-none px-1">Boundary Color</span>
                          <select 
                            value={boundaryColor}
                            onChange={(e) => setBoundaryColor(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-400 transition-all cursor-pointer shadow-sm"
                          >
                            <option value="#1e293b">Slate (Dark)</option>
                            <option value="#3b82f6">Ocean Blue</option>
                            <option value="#6366f1">Indigo</option>
                            <option value="#10b981">Emerald</option>
                            <option value="#f43f5e">Rose</option>
                            <option value="#f59e0b">Amber</option>
                          </select>
                        </div>

                        <button 
                          onClick={() => setShowOnlySingleCluster(!showOnlySingleCluster)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${showOnlySingleCluster ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500'}`}
                        >
                          <LayoutGrid size={14} />
                          <div className="flex flex-col items-start leading-none">
                            <span className="text-[10px] font-black uppercase">Single Cluster</span>
                            {showOnlySingleCluster && (
                                <span className="text-[7px] font-bold opacity-80">Exactly {params.clusterSizeN} Cells</span>
                            )}
                          </div>
                        </button>

                        <button 
                          onClick={() => setShowBoundaries(!showBoundaries)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${showBoundaries ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}
                        >
                          {showBoundaries ? <Eye size={14} /> : <EyeOff size={14} />}
                          <span className="text-[10px] font-black uppercase">Boundaries</span>
                        </button>
                        <button 
                          onClick={() => setHighlightCoChannel(!highlightCoChannel)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${highlightCoChannel ? 'bg-rose-600 text-white' : 'bg-white text-slate-500'}`}
                        >
                          <Radio size={14} />
                          <span className="text-[10px] font-black uppercase">Co-Channels</span>
                        </button>
                      </div>
                    </div>

                    <div className="aspect-video bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center overflow-hidden relative">
                      <svg viewBox="-200 -150 400 300" className="w-full h-full max-h-[600px]">
                        <defs>
                          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                          <marker id="shift-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
                          </marker>
                          <marker id="shift-arrow-j" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8b5cf6" />
                          </marker>
                        </defs>

                        {/* Hex Grid Visualization */}
                        {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(q => 
                          [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map(r => {
                            if (Math.abs(q + r) > 6) return null;
                            const x = 25 * (3/2 * q);
                            const y = 25 * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
                            
                            // Robust selection logic
                            const isCentralCluster = isCellInCluster(q, r, 0, 0, params.i, params.j, params.clusterSizeN);
                            if (showOnlySingleCluster && !isCentralCluster) return null;

                            const groupIdx = getGroupIndex(q, r, params.i, params.j, params.clusterSizeN);
                            const servingGroupIdx = getGroupIndex(0, 0, params.i, params.j, params.clusterSizeN);
                            const isServing = q === 0 && r === 0;
                            const isCoChannel = groupIdx === servingGroupIdx && !isServing;
                            const isSelectedGroup = selectedGroup !== null && groupIdx === selectedGroup;

                            const cellColor = getFrequencyColor(groupIdx, params.clusterSizeN);
                            const contrastColor = getContrastColor(groupIdx, params.clusterSizeN);

                            // For boundary visualization
                            const m_f = ((params.i + params.j) * q + params.j * r) / params.clusterSizeN;
                            const n_f = (-params.j * q + params.i * r) / params.clusterSizeN;
                            let cq = Math.round(m_f), cr = Math.round(n_f), cs = Math.round(-m_f-n_f);
                            if (Math.abs(cq-m_f) > Math.abs(cr-n_f) && Math.abs(cq-m_f) > Math.abs(cs-(-m_f-n_f))) cq = -cr - cs;
                            else if (Math.abs(cr-n_f) > Math.abs(cs-(-m_f-n_f))) cr = -cq - cs;
                            
                            const clusterId = `${cq},${cr}`;
                            const clusterIdx = cq * 137 + cr * 41; // Seed for varied boundary colors

                            return (
                              <g 
                                key={`${q}-${r}`} 
                                transform={`translate(${x}, ${y})`}
                                className="group/cell"
                              >
                                <polygon 
                                  points="12.5,-21.65 25,0 12.5,21.65 -12.5,21.65 -25,0 -12.5,-21.65" 
                                  fill={isSelectedGroup ? cellColor : (highlightCoChannel ? (isCoChannel ? '#f43f5e' : (isServing ? '#3b82f6' : '#f1f5f9')) : cellColor)} 
                                  fillOpacity={highlightCoChannel ? (isCoChannel || isServing ? 1 : 0.2) : (selectedGroup !== null ? (isSelectedGroup ? 1 : 0.4) : 0.9)}
                                  stroke={showBoundaries ? (isCentralCluster ? boundaryColor : `hsl(${(clusterIdx * 45) % 360}, 30%, 30%)`) : '#000000'} 
                                  strokeWidth={showBoundaries ? (isCentralCluster ? '4.5' : '2.5') : '1.5'}
                                  strokeDasharray={showBoundaries && !isCentralCluster ? '3 1' : '0'}
                                  className="transition-all duration-500 cursor-help"
                                />
                                {(isServing || (highlightCoChannel && isCoChannel)) && (
                                  <circle r="3" fill="white" filter="url(#glow)" />
                                )}
                                <text y="4" textAnchor="middle" className="text-[6px] font-black pointer-events-none opacity-80" fill={contrastColor}>
                                  {groupIdx + 1}
                                </text>
                                
                                {/* Tooltip */}
                                <g className="opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none">
                                  <rect x="-40" y="-45" width="80" height="25" rx="4" fill="#1e293b" />
                                  <text y="-35" textAnchor="middle" className="text-[5px] font-bold fill-white">
                                    Cell ({q},{r}) | Group {groupIdx + 1}
                                  </text>
                                  <text y="-28" textAnchor="middle" className="text-[4px] font-medium fill-slate-400">
                                    Cluster ID: {clusterId}
                                  </text>
                                </g>
                              </g>
                            );
                          })
                        )}
                        
                        {/* (i, j) shift vector arrows from (0,0) to first-tier co-channel cell at (i,j) */}
                        {params.clusterSizeN > 1 && (
                          <g id="shift-vectors">
                            {/* i shift vector: from (0,0) to (i,0) */}
                            {params.i > 0 && (
                              <g>
                                <line 
                                  x1="0" 
                                  y1="0" 
                                  x2={25 * 1.5 * params.i} 
                                  y2={25 * (Math.sqrt(3)/2) * params.i} 
                                  stroke="#3b82f6" 
                                  strokeWidth="3.5" 
                                  markerEnd="url(#shift-arrow)" 
                                />
                                <g transform={`translate(${(25 * 1.5 * params.i) / 2}, ${(25 * (Math.sqrt(3)/2) * params.i) / 2})`}>
                                  <rect x="-16" y="-10" width="32" height="15" rx="4" fill="white" stroke="#3b82f6" strokeWidth="1" />
                                  <text y="1" textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-black fill-blue-600 font-mono">
                                    i = {params.i}
                                  </text>
                                </g>
                              </g>
                            )}
                            {/* j shift vector: from (i,0) to (i,j) */}
                            {params.j > 0 && (
                              <g>
                                <line 
                                  x1={25 * 1.5 * params.i} 
                                  y1={25 * (Math.sqrt(3)/2) * params.i} 
                                  x2={25 * 1.5 * params.i} 
                                  y2={25 * (Math.sqrt(3)/2) * params.i + 25 * Math.sqrt(3) * params.j} 
                                  stroke="#8b5cf6" 
                                  strokeWidth="3.5" 
                                  markerEnd="url(#shift-arrow-j)" 
                                />
                                <g transform={`translate(${25 * 1.5 * params.i}, ${25 * (Math.sqrt(3)/2) * params.i + (25 * Math.sqrt(3) * params.j) / 2})`}>
                                  <rect x="-16" y="-10" width="32" height="15" rx="4" fill="white" stroke="#8b5cf6" strokeWidth="1" />
                                  <text y="1" textAnchor="middle" dominantBaseline="middle" className="text-[9px] font-black fill-purple-600 font-mono">
                                    j = {params.j}
                                  </text>
                                </g>
                              </g>
                            )}
                          </g>
                        )}
                        
                        {highlightCoChannel && (
                          <g>
                            {/* Co-channel distance indicator */}
                            <line x1="0" y1="0" x2="75" y2="43" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
                            <text x="50" y="40" textAnchor="middle" className="text-[8px] font-black fill-rose-500 uppercase" transform="rotate(30, 50, 40)">D = {(derived.coChannelDistance).toFixed(1)} km</text>
                          </g>
                        )}
                      </svg>
                      
                      <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-lg space-y-2">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">Reuse Formula</p>
                          <p className="font-mono text-[10px] font-bold text-slate-900 tracking-tighter">D/R = √3N = √{3 * params.clusterSizeN} ≈ {derived.reuseRatio.toFixed(2)}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Cell Info</p>
                          <p className="text-[10px] font-bold text-slate-600">Group Channels: {derived.channelsPerCell}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
