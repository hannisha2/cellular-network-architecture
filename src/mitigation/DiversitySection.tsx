import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Wifi, Activity, Layers, ArrowRight, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DiversitySection() {
  const [fadeProb, setFadeProb] = useState(0.1);
  const [diversityOrder, setDiversityOrder] = useState(2);
  const [selectedCombining, setSelectedCombining] = useState<'SC' | 'EGC' | 'MRC'>('MRC');

  const outageProb = Math.pow(fadeProb, diversityOrder);

  // Generate BER data for diversity
  const berData = Array.from({ length: 11 }, (_, i) => {
    const snr = i * 2;
    // Approximation of Rayleigh fading BER
    const snrLinear = Math.pow(10, snr / 10);
    const prob1 = 1 / (2 * (1 + snrLinear));
    const prob2 = Math.pow(prob1, 2) * 3; // Approx for L=2
    const prob3 = Math.pow(prob1, 3) * 10; // Approx for L=3
    return { 
      snr, 
      branch1: Math.max(1e-6, prob1), 
      branch2: Math.max(1e-6, prob2),
      branch3: Math.max(1e-6, prob3)
    };
  });

  const outageData = Array.from({ length: 5 }, (_, i) => {
    const L = i + 1;
    return {
      order: L,
      outage: Math.pow(fadeProb, L)
    };
  });

  return (
    <div className="space-y-8">
       <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Wifi className="w-8 h-8 text-blue-500" />
          Diversity
        </h2>
        <p className="text-slate-600 text-lg">
          Diversity techniques combat deep fading by providing the receiver with multiple independent faded replicas of the same information signal.
        </p>
      </div>

      {/* Concept Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Space Diversity', desc: 'Multiple antennas (SIMO/MIMO)' },
          { title: 'Frequency Diversity', desc: 'Different carrier frequencies' },
          { title: 'Time Diversity', desc: 'Interleaving / Re-transmission' },
          { title: 'Polarization Diversity', desc: 'Horizontal / Vertical polarization' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
            <div className="font-bold text-slate-900 mb-1">{item.title}</div>
            <div className="text-xs text-slate-500">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Interactive Formula */}
          <div className="bg-slate-900 rounded-2xl p-8 shadow-sm text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
             <h3 className="font-bold text-slate-200 mb-6 text-sm uppercase tracking-widest">Outage Probability Formula</h3>
             
             <div className="flex justify-center items-baseline gap-4 text-5xl font-mono mb-8 py-4">
                <span className="text-blue-400">P<sub className="text-2xl">out</sub></span>
                <span className="text-slate-400">=</span>
                <span>p<sup className="text-2xl text-orange-400">{diversityOrder}</sup></span>
             </div>

             <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <span>Fade Probability (p)</span>
                    <span>{fadeProb.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.01" max="0.5" step="0.01" value={fadeProb} onChange={e => setFadeProb(Number(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    <span>Diversity Order (L)</span>
                    <span>{diversityOrder}</span>
                  </div>
                  <input type="range" min="1" max="4" step="1" value={diversityOrder} onChange={e => setDiversityOrder(Number(e.target.value))} className="w-full accent-orange-500" />
                </div>
             </div>

             <div className="mt-8 bg-black/40 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Calculated Outage:</span>
                <span className="text-2xl font-bold font-mono text-green-400">
                  {(outageProb * 100).toExponential(2)}%
                </span>
             </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-widest">Combining Techniques</h3>
             <div className="space-y-2">
               {['SC', 'EGC', 'MRC'].map(type => (
                 <button
                   key={type}
                   onClick={() => setSelectedCombining(type as any)}
                   className={`w-full text-left p-3 rounded-lg border transition-all ${
                     selectedCombining === type ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                   <div className="font-bold text-slate-800">
                     {type === 'SC' ? 'Selection Combining (SC)' : type === 'EGC' ? 'Equal Gain Combining (EGC)' : 'Maximal Ratio Combining (MRC)'}
                   </div>
                   <div className="text-xs text-slate-500 mt-1">
                     {type === 'SC' && 'Selects the branch with highest SNR.'}
                     {type === 'EGC' && 'Co-phases and sums all branches equally.'}
                     {type === 'MRC' && 'Weight branches proportional to their SNR. Maximum performance.'}
                   </div>
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 space-y-6">
           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">Outage Probability vs Diversity Order</h3>
              <div className="h-[200px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={outageData} margin={{top: 5, right: 20, bottom: 5, left: 10}}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="order" label={{ value: 'Diversity Order (L)', position: 'insideBottom', offset: -5 }} />
                     <YAxis scale="log" domain={['auto', 'auto']} tickFormatter={(v) => v.toExponential()} />
                     <Tooltip formatter={(v: number) => v.toExponential(2)} />
                     <Bar dataKey="outage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6">BER Performance</h3>
              <div className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={berData} margin={{top: 5, right: 20, bottom: 5, left: 10}}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="snr" label={{ value: 'Average SNR (dB)', position: 'insideBottom', offset: -5 }} />
                     <YAxis scale="log" domain={[1e-6, 1]} tickFormatter={(v) => v.toExponential()} />
                     <Tooltip formatter={(v: number) => v.toExponential(2)} />
                     <Legend verticalAlign="top"/>
                     <Line type="monotone" name="L = 1 (No Diversity)" dataKey="branch1" stroke="#F87171" strokeWidth={2} dot={false} />
                     <Line type="monotone" name="L = 2 branches" dataKey="branch2" stroke="#F59E0B" strokeWidth={2} dot={false} />
                     <Line type="monotone" name="L = 3 branches" dataKey="branch3" stroke="#22C55E" strokeWidth={2} dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
