/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  ReferenceLine, 
  ReferenceDot,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { HandoverState, calculateReceivedPower } from './handover-types';

// --- HandoverStatus ---
export const HandoverStatus = ({ state }: { state: HandoverState }) => (
  <div className={`bg-slate-900 rounded-2xl p-5 border-l-4 shadow-lg transition-all ${
    state.handoverStage === 'idle' ? 'border-green-500' :
    state.handoverStage === 'initiating' ? 'border-yellow-500' :
    state.handoverStage === 'executing' ? 'border-orange-500' :
    'border-blue-500'
  }`}>
    <div className="flex justify-between items-center mb-4">
      <div>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Handover Status</p>
        <p className={`text-xl font-black tracking-tight ${
          state.handoverStage === 'idle' ? 'text-green-400' :
          state.handoverStage === 'initiating' ? 'text-yellow-400' :
          state.handoverStage === 'executing' ? 'text-orange-400' :
          'text-blue-400'
        }`}>
          {state.handoverStage.toUpperCase()}
        </p>
      </div>
      <div className="text-right">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Time to Edge</p>
        <p className="text-white font-mono font-bold text-lg">{state.timeToEdge.toFixed(1)}s</p>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
        <p className="text-slate-400 font-medium">Mobile Speed</p>
        <p className="text-white font-bold">{state.speed} km/h</p>
      </div>
      <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
        <p className="text-slate-400 font-medium">Initiation Dist.</p>
        <p className="text-yellow-400 font-bold">{state.initiationDistance.toFixed(0)} m</p>
      </div>
      <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
        <p className="text-slate-400 font-medium">Hysteresis</p>
        <p className="text-white font-bold">{state.hysteresisMargin} dB</p>
      </div>
      <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
        <p className="text-slate-400 font-medium">Path Loss (α)</p>
        <p className="text-white font-bold">{state.pathLossExponent}</p>
      </div>
    </div>
  </div>
);

// --- MetricsPanel ---
export const MetricsPanel = ({ 
  sourcePower, 
  targetPower, 
  sourceDistance, 
  targetDistance 
}: { 
  sourcePower: number; 
  targetPower: number; 
  sourceDistance: number; 
  targetDistance: number;
}) => {
  const getQuality = (power: number) => {
    if (power > -70) return <span className="text-green-400 font-bold">EXCELLENT</span>;
    if (power > -85) return <span className="text-blue-400 font-bold">GOOD</span>;
    if (power > -100) return <span className="text-yellow-400 font-bold">FAIR</span>;
    return <span className="text-red-400 font-bold">POOR</span>;
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
      <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
        Handover Metrics
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-800">
          <div>Metric</div>
          <div className="text-center">Source</div>
          <div className="text-center">Target</div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-xs font-medium text-slate-400">Power</div>
          <div className="text-center font-mono text-xs text-green-400 font-bold">{sourcePower.toFixed(1)} dBm</div>
          <div className="text-center font-mono text-xs text-blue-400 font-bold">{targetPower.toFixed(1)} dBm</div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-xs font-medium text-slate-400">Distance</div>
          <div className="text-center font-mono text-xs text-green-400 font-bold">{sourceDistance.toFixed(0)} m</div>
          <div className="text-center font-mono text-xs text-blue-400 font-bold">{targetDistance.toFixed(0)} m</div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 items-center">
          <div className="text-xs font-medium text-slate-400">Quality</div>
          <div className="text-center text-[10px]">{getQuality(sourcePower)}</div>
          <div className="text-center text-[10px]">{getQuality(targetPower)}</div>
        </div>
      </div>
    </div>
  );
};

// --- PowerDistanceGraph ---
export const PowerDistanceGraph = ({ 
  sourcePower, 
  targetPower, 
  distance, 
  initiationPoint, 
  completionPoint,
  cellRadius,
  pathLossExponent
}: { 
  sourcePower: number; 
  targetPower: number; 
  distance: number; 
  initiationPoint: number; 
  completionPoint: number;
  cellRadius: number;
  pathLossExponent: number;
}) => {
  const powerData = React.useMemo(() => {
    const data = [];
    const centerDist = cellRadius * Math.sqrt(3);
    const maxDist = centerDist * 1.5;
    for (let d = 0; d <= maxDist; d += maxDist / 50) {
      data.push({
        distance: d,
        sourcePower: calculateReceivedPower(d, -70, cellRadius, pathLossExponent),
        targetPower: calculateReceivedPower(Math.abs(centerDist - d), -70, cellRadius, pathLossExponent)
      });
    }
    return data;
  }, [cellRadius, pathLossExponent]);

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
      <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Power vs Distance</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={powerData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="distance" hide />
            <YAxis domain={[-120, -40]} stroke="#475569" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
              itemStyle={{ fontWeight: 'bold' }}
            />
            <Line type="monotone" dataKey="sourcePower" stroke="#4ADE80" strokeWidth={3} dot={false} animationDuration={300} />
            <Line type="monotone" dataKey="targetPower" stroke="#60A5FA" strokeWidth={3} dot={false} animationDuration={300} />
            <ReferenceLine x={initiationPoint} stroke="#FACC15" strokeDasharray="5 5" label={{ value: 'INIT', position: 'top', fill: '#FACC15', fontSize: 10, fontWeight: 'bold' }} />
            <ReferenceLine x={completionPoint} stroke="#3B82F6" strokeDasharray="5 5" label={{ value: 'EDGE', position: 'top', fill: '#3B82F6', fontSize: 10, fontWeight: 'bold' }} />
            <ReferenceDot x={distance} y={sourcePower} r={4} fill="#FFFFFF" stroke="#4ADE80" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- SpeedTriggerGraph ---
export const SpeedTriggerGraph = ({ 
  currentSpeed, 
  cellRadius 
}: { 
  currentSpeed: number; 
  cellRadius: number; 
}) => {
  const boundaryDist = (cellRadius * Math.sqrt(3)) / 2;
  const leadTime = 0.8;

  const speedTriggerData = React.useMemo(() => {
    const data = [];
    for (let v = 0; v <= 120; v += 10) {
      const speedMps = v / 3.6;
      const dist = Math.max(boundaryDist - (speedMps * leadTime), boundaryDist * 0.1);
      data.push({ speed: v, distance: dist });
    }
    return data;
  }, [cellRadius]);

  const currentTriggerDist = React.useMemo(() => {
    const speedMps = currentSpeed / 3.6;
    return Math.max(boundaryDist - (speedMps * leadTime), boundaryDist * 0.1);
  }, [currentSpeed, cellRadius]);

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
      <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Trigger Dist vs Speed</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={speedTriggerData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="speed" stroke="#475569" fontSize={10} />
            <YAxis stroke="#475569" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
            />
            <Line type="monotone" dataKey="distance" stroke="#FACC15" strokeWidth={3} dot={false} />
            <ReferenceDot x={currentSpeed} y={currentTriggerDist} r={5} fill="#FFFFFF" stroke="#FACC15" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
        <p className="text-yellow-400 font-mono text-[10px] font-bold mb-1">D_init = R_c - (k × v × t_exec × s)</p>
        <p className="text-white font-bold text-xs">
          {currentTriggerDist.toFixed(0)}m at {currentSpeed}km/h
        </p>
      </div>
    </div>
  );
};
