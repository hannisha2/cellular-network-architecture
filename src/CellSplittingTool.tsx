/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Settings2, 
  ArrowRight, 
  Radio, 
  Zap, 
  TrendingUp, 
  Info,
  Maximize2,
  ListFilter
} from 'lucide-react';

const isInsideHex = (px: number, py: number, R: number): boolean => {
  const absX = Math.abs(px);
  const absY = Math.abs(py);
  if (absX > R) return false;
  if (absX <= R / 2) {
    return absY <= (Math.sqrt(3) / 2) * R + 0.5;
  } else {
    return absY <= Math.sqrt(3) * (R - absX) + 0.5;
  }
};

export default function CellSplittingTool() {
  const [splitFactorS, setSplitFactorS] = useState<number>(2.0);
  const [originalRadiusR, setOriginalRadiusR] = useState<number>(10.0); // km
  const [pathLossN, setPathLossN] = useState<number>(4.0);
  const [baseCapacity, setBaseCapacity] = useState<number>(45); // Channels or Mbps

  const splitRadius = useMemo(() => {
    return Number((originalRadiusR / splitFactorS).toFixed(2));
  }, [originalRadiusR, splitFactorS]);

  const powerReductionDb = useMemo(() => {
    return Number((10 * pathLossN * Math.log10(splitFactorS)).toFixed(1));
  }, [pathLossN, splitFactorS]);

  const capacityImprovementFactor = splitFactorS; // Capacity equals s exactly as requested

  const finalCapacity = useMemo(() => {
    return Number((baseCapacity * capacityImprovementFactor).toFixed(1));
  }, [baseCapacity, capacityImprovementFactor]);

  // SVG dimensions & centers
  const SVG_R = 110; // Pixels for original cell radius
  const small_r = SVG_R / splitFactorS;

  // Generate sub-cells for AFTER view
  const subCells = useMemo(() => {
    const cells: { q: number; r: number; cx: number; cy: number; isCenterInside: boolean }[] = [];
    // Generate enough range to cover the hexagon
    const limit = Math.ceil(splitFactorS * 2);
    for (let q = -limit; q <= limit; q++) {
      for (let rAxial = -limit; rAxial <= limit; rAxial++) {
        const cx = small_r * 1.5 * q;
        const cy = small_r * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * rAxial);
        
        // Check if the center of this sub-cell is within the original large hexagon
        const isCenterInside = isInsideHex(cx, cy, SVG_R + 0.1);
        
        // We only care about cells that overlap with our boundary
        // To cover the boundary completely and beautifully, filter based on center distance from origin
        const distFromCenter = Math.sqrt(cx * cx + cy * cy);
        if (distFromCenter <= SVG_R + small_r * 1.5) {
          cells.push({ q, r: rAxial, cx, cy, isCenterInside });
        }
      }
    }
    return cells;
  }, [small_r, splitFactorS]);

  const hexPointsString = useMemo(() => {
    return `55,-95.26 110,0 55,95.26 -55,95.26 -110,0 -55,-95.26`;
  }, []);

  const getSmallHexPoints = (r: number) => {
    const h = r * Math.sqrt(3)/2;
    return `${r/2},${-h} ${r},0 ${r/2},${h} ${-r/2},${h} ${-r},0 ${-r/2},${-h}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Top Header Section */}
      <div className="bg-white border-b border-slate-200 p-8 shadow-sm z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cell Splitting Engineering</h1>
            <p className="text-slate-500 text-sm mt-1">
              Subdivide congested cells into smaller microcells to scale frequency reuse and area capacity.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-96 bg-white border-r border-slate-200 p-8 overflow-y-auto z-20 shadow-xl scrollbar-thin">
          <div className="space-y-10">
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Settings2 className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Splitting Parameters</h2>
              </div>

              <div className="space-y-8">
                {/* Split Factor Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500 bg-opacity-10">
                        <TrendingUp size={14} className="text-indigo-600" />
                      </div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Split Factor (s)</label>
                    </div>
                    <span className="text-sm font-mono font-black text-slate-900">{splitFactorS.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min={1.5} 
                    max={4.0} 
                    step={0.5}
                    value={splitFactorS} 
                    onChange={(e) => setSplitFactorS(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                    <span>1.5x</span>
                    <span>2.0x</span>
                    <span>2.5x</span>
                    <span>3.0x</span>
                    <span>3.5x</span>
                    <span>4.0x</span>
                  </div>
                </div>

                {/* Original Cell Radius Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500 bg-opacity-10">
                        <Maximize2 size={14} className="text-blue-600" />
                      </div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Original Radius (R)</label>
                    </div>
                    <span className="text-sm font-mono font-black text-slate-900">{originalRadiusR} km</span>
                  </div>
                  <input 
                    type="range" 
                    min={2} 
                    max={20} 
                    step={1}
                    value={originalRadiusR} 
                    onChange={(e) => setOriginalRadiusR(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Path Loss Exponent Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-500 bg-opacity-10">
                        <Radio size={14} className="text-rose-600" />
                      </div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Path Loss Exponent (n)</label>
                    </div>
                    <span className="text-sm font-mono font-black text-slate-900">{pathLossN.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min={2.0} 
                    max={5.0} 
                    step={0.1}
                    value={pathLossN} 
                    onChange={(e) => setPathLossN(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                {/* Base Capacity Input */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500 bg-opacity-10">
                        <Zap size={14} className="text-emerald-600" />
                      </div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Original Cell Capacity</label>
                    </div>
                    <span className="text-sm font-mono font-black text-slate-900">{baseCapacity} Mbps</span>
                  </div>
                  <input 
                    type="range" 
                    min={10} 
                    max={100} 
                    step={5}
                    value={baseCapacity} 
                    onChange={(e) => setBaseCapacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </section>

            {/* Derived Parameters / Splitting Math */}
            <section className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <Info className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Engineering Physics</h2>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">Radius Reduction</p>
                  <p className="text-lg font-mono font-black">R_split = {splitRadius} km</p>
                  <p className="text-[8px] text-slate-400">Smaller footprint allows frequency reuse over smaller distances.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-wider">Power Reduction</p>
                  <p className="text-lg font-mono font-black">-{powerReductionDb} dB</p>
                  <p className="text-[8px] text-slate-400">To maintain coverage at cell boundary, transmit power must be scaled down by sⁿ to control interference.</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Capacity Scaling</p>
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-mono font-black font-bold text-white">{finalCapacity} Mbps</span>
                    <span className="text-[10px] font-bold text-emerald-400 font-mono">({capacityImprovementFactor.toFixed(1)}x Increase)</span>
                  </div>
                  <p className="text-[8px] text-slate-400">By dividing cell radius, area capacity scales directly with the split factor s.</p>
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* Main Content Pane representing Before/After */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-50 scrollbar-thin">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Split Capacity Stat Box */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Baseline Capacity</p>
                <p className="text-3xl font-black text-slate-800">{baseCapacity} <span className="text-xs text-slate-400">Mbps</span></p>
              </div>
              <div className="flex flex-col justify-center items-center">
                <p className="text-[10px] font-black text-indigo-500 uppercase mb-1">Improvement Factor</p>
                <div className="flex items-center gap-2">
                  <ArrowRight size={18} className="text-indigo-500 animate-pulse" />
                  <p className="text-3xl font-black text-indigo-600">{capacityImprovementFactor.toFixed(1)}x</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Split Capacity</p>
                <p className="text-3xl font-black text-emerald-600">{finalCapacity} <span className="text-xs text-slate-400">Mbps</span></p>
              </div>
            </div>

            {/* Before / After Visual Side-by-Side Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* BEFORE Visualization */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <div className="mb-4">
                  <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">Before Splitting</span>
                  <h3 className="text-lg font-black text-slate-800 mt-1">Original Macrocell</h3>
                  <p className="text-xs text-slate-400">Large area coverage with radius R = {originalRadiusR} km. Single high-power base station.</p>
                </div>

                <div className="flex-1 aspect-square bg-slate-900 rounded-[2.5rem] flex items-center justify-center p-6 relative overflow-hidden">
                  <svg viewBox="-150 -150 300 300" className="w-full h-full max-w-[320px]">
                    <defs>
                      <radialGradient id="before-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Outer Hexagon */}
                    <polygon 
                      points={hexPointsString} 
                      fill="url(#before-glow)" 
                      fillOpacity="0.3"
                      stroke="#3b82f6" 
                      strokeWidth="3" 
                      className="transition-all"
                    />

                    {/* Sector / Cells Reference Marker */}
                    <circle r="4" fill="#60a5fa" />
                    
                    {/* Radials drawing to corners for standard hexagonal look */}
                    <line x1="0" y1="0" x2="55" y2="-95.26" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="0" y1="0" x2="110" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="0" y1="0" x2="55" y2="95.26" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="0" y1="0" x2="-55" y2="95.26" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="0" y1="0" x2="-110" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3"/>
                    <line x1="0" y1="0" x2="-55" y2="-95.26" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3"/>

                    {/* Radio Tower Icon Representation */}
                    <g transform="translate(-12, -22) scale(1.2)">
                      {/* Radiating Waves */}
                      <path d="M 10 0 A 10 10 0 0 1 20 10" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="animate-pulse" />
                      <path d="M 0 10 A 10 10 0 0 1 10 0" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="animate-pulse" />
                      {/* Tower */}
                      <polygon points="10,6 6,24 14,24" fill="none" stroke="#374151" strokeWidth="1.5" />
                      <line x1="6" y1="24" x2="14" y2="24" stroke="#ffffff" strokeWidth="2" />
                      <line x1="10" y1="6" x2="10" y2="24" stroke="#ffffff" strokeWidth="1" />
                      <circle cx="10" cy="5" r="2.5" fill="#ef4444" />
                    </g>

                    {/* Radius text */}
                    <path id="radius-path" d="M 0 0 L 110 0" fill="none" stroke="transparent" />
                    <line x1="0" y1="0" x2="110" y2="0" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrow)" />
                    <text x="50" y="-10" textAnchor="middle" className="text-[10px] font-black fill-amber-500 font-mono">
                      R = {originalRadiusR} km
                    </text>
                  </svg>

                  <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Coverage Density</p>
                    <p className="text-[10px] font-bold text-slate-300">1 Macro BS / {Math.round(2.6 * originalRadiusR * originalRadiusR)} km²</p>
                  </div>
                </div>
              </div>

              {/* AFTER Visualization */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                <div className="mb-4">
                  <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase">After Splitting</span>
                  <h3 className="text-lg font-black text-slate-800 mt-1">Tiled Microcells</h3>
                  <p className="text-xs text-slate-400">Original domain filled with smaller cells of radius R_split = {splitRadius} km. Low-power cell sites.</p>
                </div>

                <div className="flex-1 aspect-square bg-slate-900 rounded-[2.5rem] flex items-center justify-center p-6 relative overflow-hidden">
                  <svg viewBox="-150 -150 300 300" className="w-full h-full max-w-[320px]">
                    <defs>
                      <radialGradient id="after-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                      </radialGradient>
                      
                      {/* Clip path for smaller cells to fit EXACTLY inside the parent boundaries */}
                      <clipPath id="parent-boundary-clip">
                        <polygon points={hexPointsString} />
                      </clipPath>
                    </defs>

                    {/* Original Hexagon Background shaded to keep clear reference */}
                    <polygon 
                      points={hexPointsString} 
                      fill="url(#after-glow)" 
                      fillOpacity="0.15"
                      stroke="#475569" 
                      strokeWidth="2.5" 
                      strokeDasharray="4 4"
                    />

                    {/* Smaller hexagons Tiled EXACTLY inside the original boundary using clip-path */}
                    <g clipPath="url(#parent-boundary-clip)">
                      {subCells.map((cell, idx) => {
                        const cellPoints = getSmallHexPoints(small_r);
                        return (
                          <g key={idx} transform={`translate(${cell.cx}, ${cell.cy})`}>
                            {/* Smaller Hexagon Outline & Semi-transparent fill for outstanding high-fidelity visualization */}
                            <polygon 
                              points={cellPoints} 
                              fill="#10b981" 
                              fillOpacity={cell.isCenterInside ? 0.12 : 0.04}
                              stroke="#10b981" 
                              strokeWidth={cell.isCenterInside ? 1.5 : 0.8}
                              strokeOpacity={cell.isCenterInside ? 0.8 : 0.3}
                            />
                          </g>
                        );
                      })}
                    </g>

                    {/* Mini Base Stations rendered inside */}
                    {subCells.filter(c => c.isCenterInside).map((cell, idx) => (
                      <g key={`macro-antenna-${idx}`} transform={`translate(${cell.cx}, ${cell.cy})`}>
                        {/* Tiny coverage aura */}
                        <circle r={small_r} fill="#10b981" fillOpacity="0.08" stroke="#10b981" strokeWidth="0.5" strokeDasharray="1 1" />
                        {/* Tiny Station Pin */}
                        <circle r="3" fill="#10b981" className="animate-pulse" />
                        <line x1="0" y1="0" x2="-3" y2="-6" stroke="#fff" strokeWidth="0.8" />
                        <circle cx="-3" cy="-6" r="1" fill="#ef4444" />
                      </g>
                    ))}

                    {/* Original boundary drawn with higher contrast on top */}
                    <polygon 
                      points={hexPointsString} 
                      fill="none" 
                      stroke="#818cf8" 
                      strokeWidth="4" 
                      className="pointer-events-none"
                    />

                    {/* Split radius dimension line on one cell */}
                    {(() => {
                      // Move split radius indicator somewhere easily readable (like center cell)
                      return (
                        <g transform="translate(0, 0)">
                          <line x1="0" y1="0" x2={small_r} y2="0" stroke="#10b981" strokeWidth="2" />
                          <circle cx="0" cy="0" r="1.5" fill="#fff" />
                          <circle cx={small_r} cy="0" r="1.5" fill="#fff" />
                          <g transform={`translate(${small_r / 2}, 10)`}>
                            <rect x="-16" y="-6" width="32" height="12" rx="3" fill="#0f172a" />
                            <text y="0" textAnchor="middle" dominantBaseline="middle" className="text-[6px] font-black fill-emerald-400 font-mono">
                              r = {splitRadius}
                            </text>
                          </g>
                        </g>
                      );
                    })()}
                  </svg>

                  <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800">
                    <p className="text-[8px] font-black text-slate-500 uppercase">Micro BS Count</p>
                    <p className="text-[10px] font-bold text-emerald-400 font-mono">
                      {subCells.filter(c => c.isCenterInside).length} Active Cells Tiled
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4 items-start">
              <Info className="text-blue-500 w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-black text-blue-900 uppercase">How Cell Splitting Works</h4>
                <p className="text-xs text-blue-800/80 leading-relaxed">
                  When a cellular cluster exceeds capacity limits in dense locations (e.g. city centers), 
                  splitting factor <strong>s</strong> is introduced. Original cell sites are subdivided into 
                  microcells of radius <strong>R/s</strong>. Because the cell area is reduced, the system can 
                  support the same cluster frequency reuse spacing at much lower power levels, scaling the 
                  local subscriber channels and geographic traffic throughput of the entire network.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
