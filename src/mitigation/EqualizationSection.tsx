import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Zap, AlertTriangle, Settings } from 'lucide-react';
import { motion } from 'motion/react';

export default function EqualizationSection() {
  const [filterLength, setFilterLength] = useState(5);
  const [isiLevel, setIsiLevel] = useState(0.8);

  // Generate mock data for visualization
  const impulseData = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    val: i === 5 ? 1 : i === 8 ? isiLevel : i === 12 ? isiLevel * 0.5 : 0.05 * Math.random()
  }));

  const signalData = Array.from({ length: 50 }, (_, i) => {
    const original = Math.sin(i * 0.5);
    const delayed = isiLevel * Math.sin((i - 3) * 0.5);
    const received = original + delayed + (Math.random() - 0.5) * 0.2;
    // Simple mock equalization based on filter length
    const equalized = received - (isiLevel * filterLength / 10) * Math.sin((i - 3) * 0.5);
    return {
      time: i,
      original,
      received,
      equalized
    };
  });

  const berData = Array.from({ length: 15 }, (_, i) => {
    const snr = i * 2;
    const withoutEq = Math.max(1e-5, 0.1 * Math.exp(-snr / 4) + 0.05 * isiLevel);
    const withEq = Math.max(1e-5, 0.1 * Math.exp(-snr / (3 + filterLength * 0.1)));
    return { snr, withoutEq, withEq };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Zap className="w-8 h-8 text-yellow-500" />
          Equalization
        </h2>
        <p className="text-slate-600 text-lg">
          Equalization compensates for Intersymbol Interference (ISI) created by multipath propagation. 
          By employing a filter at the receiver, it attempts to invert the channel's impulse response.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              Channel Parameters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Delay Spread (ISI Level)</span>
                  <span className="text-blue-600">{isiLevel.toFixed(2)}</span>
                </label>
                <input 
                  type="range" min="0" max="1.5" step="0.1"
                  value={isiLevel} onChange={(e) => setIsiLevel(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none accent-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                  <span>Equalizer Filter Length</span>
                  <span className="text-purple-600">{filterLength} Taps</span>
                </label>
                <input 
                  type="range" min="1" max="15" step="1"
                  value={filterLength} onChange={(e) => setFilterLength(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none accent-purple-500"
                />
              </div>
            </div>

            <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900 mb-1">Key Trade-off</h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Longer filters (more taps) provide better ISI cancellation but increase computational complexity and may enhance high-frequency noise.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-900 p-6 rounded-2xl shadow-sm text-balance">
             <h4 className="text-white font-bold mb-2">Linear Transversal Equalizer</h4>
             <p className="text-slate-400 text-sm mb-4">
               A Tapped Delay Line attempts to implement an inverse filter $C(f) = 1/H(f)$.
             </p>
             <div className="bg-black/50 p-3 rounded-lg border border-slate-700 font-mono text-xs text-green-400">
                y_eq[n] = Σ c[k] * y[n-k]
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-6">Channel Impulse Response</h3>
             <div className="h-[200px]">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={impulseData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                   <XAxis dataKey="time" type="number" domain={[0, 20]} />
                   <YAxis />
                   <Tooltip />
                   <Area type="step" dataKey="val" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
             <p className="text-xs text-center text-slate-500 mt-2">Notice the multipath reflections causing delayed signal copies.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-6 flex items-center justify-between">
                Signal Recovery
                <span className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-full"></span> Received (Distorted)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Equalized</span>
                </span>
             </h3>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={signalData} margin={{top: 5, right: 5, bottom: 5, left: -20}}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                   <XAxis dataKey="time" tick={false} />
                   <YAxis domain={[-2.5, 2.5]} />
                   <Tooltip />
                   <Line type="monotone" dataKey="received" stroke="#F87171" strokeWidth={2} dot={false} />
                   <Line type="monotone" dataKey="equalized" stroke="#22C55E" strokeWidth={2} dot={false} />
                   <Line type="monotone" dataKey="original" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-6">BER vs SNR Performance</h3>
             <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={berData} margin={{top: 5, right: 20, bottom: 5, left: 10}}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                   <XAxis dataKey="snr" label={{ value: 'SNR (dB)', position: 'insideBottom', offset: -5 }} />
                   <YAxis scale="log" domain={['auto', 'auto']} tickFormatter={(tick) => tick.toExponential(1)} />
                   <Tooltip formatter={(value: number) => value.toExponential(2)} />
                   <Legend verticalAlign="top" height={36}/>
                   <Line type="monotone" dataKey="withoutEq" name="Without Equalization" stroke="#F87171" strokeWidth={3} dot={true} />
                   <Line type="monotone" dataKey="withEq" name="With Equalization" stroke="#22C55E" strokeWidth={3} dot={true} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
