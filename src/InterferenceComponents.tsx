import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  ReferenceLine, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  InterferenceState, 
  InterferenceMetrics, 
  getSirColor,
  InterfererDetail
} from './interference-types';
import { HexCell } from './App';
import { LineChart as LineChartIcon, Table as TableIcon, Layers as LayersIcon } from 'lucide-react';

// --- SIR Gauge ---
// ... (existing code)
export const SirGauge = ({ sir, targetSir }: { sir: number; targetSir: number }) => {
  const color = getSirColor(sir);
  const percentage = Math.min(100, Math.max(0, (sir / 30) * 100)); // Normalize 0-30dB to 0-100%

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg flex flex-col items-center">
      <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">SIR Gauge</h3>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background Circle */}
          <circle 
            cx="50" cy="50" r="45" 
            fill="none" stroke="#1e293b" strokeWidth="10" 
          />
          {/* Gauge Circle */}
          <circle 
            cx="50" cy="50" r="45" 
            fill="none" stroke={color} strokeWidth="10" 
            strokeDasharray={`${(percentage * 282.7) / 100} 282.7`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-500"
          />
          {/* Target Indicator */}
          <line 
            x1="50" y1="5" x2="50" y2="15" 
            stroke="white" strokeWidth="2"
            transform={`rotate(${(targetSir / 30) * 360} 50 50)`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-white">{sir.toFixed(1)}</span>
          <span className="text-[10px] font-bold text-slate-500">dB</span>
        </div>
      </div>
      <div className="mt-4 flex gap-4 text-[10px] font-bold">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-slate-400">GOOD</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-slate-400">FAIR</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-400">POOR</span>
        </div>
      </div>
    </div>
  );
};

// --- Interference Metrics Panel ---
export const InterferenceMetricsPanel = ({ metrics, targetSir }: { metrics: InterferenceMetrics; targetSir: number }) => (
  <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
    <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
      <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
      Interference Metrics
    </h3>
    <div className="space-y-3">
      <MetricRow label="SIR" value={`${metrics.sir.toFixed(1)} dB`} color={getSirColor(metrics.sir)} />
      <MetricRow label="Desired Power" value={`${metrics.desiredPower.toFixed(1)} dBm`} />
      <MetricRow label="Total Interference" value={`${metrics.totalInterferencePower.toFixed(1)} dBm`} />
      <MetricRow label="Reuse Distance (D)" value={`${metrics.reuseDistance.toFixed(1)} m`} />
      <MetricRow label="Reuse Ratio (Q)" value={metrics.reuseRatio.toFixed(2)} />
      <MetricRow label="Capacity Factor" value={`1/${(1/metrics.capacityFactor).toFixed(0)}`} />
      <MetricRow label="Channels/Cell (k)" value={metrics.channelsPerCell.toFixed(0)} />
      <MetricRow label="Interferers" value={metrics.interferersCount.toString()} />
      <MetricRow label="Target SIR" value={`${targetSir} dB`} />
    </div>
  </div>
);

const MetricRow = ({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) => (
  <div className="flex justify-between items-center py-1 border-b border-slate-800/50 last:border-0">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
  </div>
);

// --- SIR vs N Graph ---
export const SirVsNGraph = ({ n, targetSir }: { n: number; targetSir: number }) => {
  const data = [3, 4, 7, 12].map(N => {
    // Simplified SIR = (1/6) * (3N)^(n/2)
    const sirLinear = (1 / 6) * Math.pow(3 * N, n / 2);
    const sirDb = 10 * Math.log10(sirLinear);
    const capacity = 1 / N;
    return { N, sir: sirDb, capacity: capacity * 100 };
  });

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
      <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">SIR & Capacity vs N</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="N" stroke="#475569" fontSize={10} />
            <YAxis stroke="#475569" fontSize={10} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <ReferenceLine y={targetSir} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', fill: '#ef4444', fontSize: 8 }} />
            <Line type="monotone" dataKey="sir" name="SIR (dB)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="capacity" name="Capacity (%)" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Interference Contribution Pie Chart ---
export const InterferencePieChart = ({ interferers }: { interferers: any[] }) => {
  const getWatts = (i: any) => {
    if (typeof i.pWatts === 'number') return i.pWatts;
    const power = typeof i.power === 'number' ? i.power : (typeof i.pDbm === 'number' ? i.pDbm : -85);
    return Math.pow(10, (power - 30) / 10);
  };
  
  const totalPowerWatts = interferers.reduce((sum, i) => sum + getWatts(i), 0);
  const data = interferers.map(i => ({
    name: i.id,
    value: totalPowerWatts > 0 ? (getWatts(i) / totalPowerWatts) * 100 : 0
  }));

  const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#10b981'];

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
      <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Interference Contribution</h4>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
              formatter={(value: number) => `${value.toFixed(1)}%`}
            />
            <Legend wrapperStyle={{ fontSize: '8px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Tier Analysis Component ---
export const InterferenceTierAnalysis = ({ metrics, type }: { metrics: InterferenceMetrics, type: 'cci' | 'aci' }) => (
  <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg space-y-6">
    <div className="flex items-center gap-2 mb-2">
      <LayersIcon className="w-5 h-5 text-blue-500" />
      <h3 className="text-white font-bold text-sm uppercase tracking-wider">
        {type === 'cci' ? 'Tier Analysis (SIR contribution)' : 'ACI Analysis (SIR)'}
      </h3>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Normal Case</p>
          <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">Current Pos</span>
        </div>
        <div className="space-y-1 bg-slate-800/30 p-3 rounded-xl border border-slate-800/50 max-h-[250px] overflow-y-auto custom-scrollbar">
          {type === 'cci' ? (
            metrics.tiers.map(t => (
              <MetricRow key={t.tier} label={`Tier ${t.tier} Only`} value={`${t.sir.toFixed(1)} dB`} />
            ))
          ) : (
            <MetricRow label="Adjacent Channels" value={`${metrics.aciSir.toFixed(1)} dB`} />
          )}
          <div className="pt-2 mt-2 border-t border-slate-700/50 sticky bottom-0 bg-[#0f172a]/95 backdrop-blur-sm">
            <MetricRow label="Combined" value={`${metrics.sir.toFixed(1)} dB`} color={getSirColor(metrics.sir)} />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Worst Case</p>
          <span className="text-[8px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded uppercase">Cell Vertex</span>
        </div>
        <div className="space-y-1 bg-red-900/10 p-3 rounded-xl border border-red-900/20 max-h-[250px] overflow-y-auto custom-scrollbar">
          {type === 'cci' ? (
            metrics.tiers.map(t => (
              <MetricRow key={t.tier} label={`Tier ${t.tier} Only`} value={`${t.worstCaseSir.toFixed(1)} dB`} />
            ))
          ) : (
            <MetricRow label="Adjacent Channels" value={`${metrics.worstCaseSir.toFixed(1)} dB`} />
          )}
          <div className="pt-2 mt-2 border-t border-red-900/20 sticky bottom-0 bg-[#1a1010]/95 backdrop-blur-sm">
            <MetricRow label="Combined worst" value={`${metrics.worstCaseSir.toFixed(1)} dB`} color={getSirColor(metrics.worstCaseSir)} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- Interferer Table Component ---
export const InterfererTable = ({ interferers }: { interferers: InterfererDetail[] }) => (
  <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
    <div className="flex items-center gap-2 mb-4">
      <TableIcon className="w-5 h-5 text-red-500" />
      <h3 className="text-white font-bold text-sm uppercase tracking-wider">Individual Cell Impact</h3>
    </div>
    <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 bg-slate-900 z-10">
          <tr className="border-b border-slate-800">
            <th className="py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cell ID</th>
            <th className="py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Tier</th>
            <th className="py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Effect (%)</th>
            <th className="py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">SIR (dB)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {interferers.map((i, idx) => {
            const tierColors = [
              'bg-red-500/20 text-red-400',
              'bg-orange-500/20 text-orange-400',
              'bg-purple-500/20 text-purple-400',
              'bg-blue-500/20 text-blue-400',
              'bg-emerald-500/20 text-emerald-400'
            ];
            return (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2 text-xs font-mono text-slate-300">{i.id}</td>
                <td className="py-2 text-xs text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${tierColors[(i.tier - 1) % tierColors.length]}`}>
                    T{i.tier}
                  </span>
                </td>
                <td className="py-2 text-xs font-mono text-right text-slate-300">{i.contributionPercentage.toFixed(1)}%</td>
                <td className="py-2 text-xs font-mono text-right text-white font-bold">{i.sirImpact.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// --- SIR vs Path Loss Graph ---
export const SirVsPathLossGraph = ({ currentN, targetSir }: { currentN: number; targetSir: number }) => {
  const data = useMemo(() => {
    return [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map(n => {
      const q = Math.sqrt(3 * currentN);
      const sirLinear = Math.pow(q, n) / 6;
      const sirDb = 10 * Math.log10(sirLinear);
      return { n, sir: sirDb };
    });
  }, [currentN]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <LineChartIcon className="w-5 h-5 text-orange-500" />
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">SIR vs. Path Loss Exponent (n)</h3>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              dataKey="n" 
              stroke="#94a3b8" 
              fontSize={10} 
              label={{ value: 'n', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10} 
              label={{ value: 'SIR (dB)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b', fontSize: '10px', color: '#fff' }}
            />
            <ReferenceLine y={targetSir} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', fill: '#ef4444', fontSize: 8 }} />
            <Line 
              type="monotone" 
              dataKey="sir" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#f59e0b' }} 
              activeDot={{ r: 5 }} 
              name="SIR (dB)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- Mathematical Formulas Panel ---
export const FormulasPanel = () => {
  const formulas = [
    { name: "Reuse Distance", formula: "D = √(3N) × R" },
    { name: "Reuse Ratio", formula: "Q = D / R = √(3N)" },
    { name: "Worst-Case Distance", formula: "D_min = (Q - 1) × R" },
    { name: "Path Loss", formula: "PL(d) = 10n × log₁₀(d / R)" },
    { name: "Desired Signal", formula: "P_desired = P₀ - PL(d)" },
    { name: "SIR (Simplified)", formula: "S/I = (1/6) × (3N)^{n/2}" },
    { name: "SIR (dB)", formula: "SIR_dB = 10 × log₁₀(S/I)" },
    { name: "Capacity Factor", formula: "Capacity ∝ 1/N" },
    { name: "Channels per Cell", formula: "k = S / N" },
    { name: "ACI with Filtering", formula: "I_ACI = (1 - FilterQuality) × P_adjacent" }
  ];

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg">
      <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Mathematical Formulas</h3>
      <div className="space-y-3">
        {formulas.map((f, i) => (
          <div key={i} className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{f.name}</p>
            <p className="text-xs font-mono text-blue-400 bg-slate-800/50 p-1.5 rounded border border-slate-700/50 overflow-x-auto whitespace-nowrap">
              {f.formula}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
