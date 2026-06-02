import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, ArrowRight, Settings2, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function OFDMSection() {
  const [numSubcarriers, setNumSubcarriers] = useState(8);

  const freqResponseData = Array.from({ length: 100 }, (_, i) => {
    // Simulate frequency selective fade dip
    const f = i;
    let fade = 1;
    if (f > 30 && f < 50) fade = 1 - Math.sin((f - 30) / 20 * Math.PI) * 0.8;
    if (f > 70 && f < 85) fade = 1 - Math.sin((f - 70) / 15 * Math.PI) * 0.6;
    return { freq: f, gain: fade };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-500" />
          OFDM (Orthogonal Frequency Division Multiplexing)
        </h2>
        <p className="text-slate-600 text-lg max-w-4xl">
          OFDM transforms a wideband, frequency-selective channel into many approximately flat-fading narrowband subchannels, eliminating ISI and simplifying equalization.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Wi-Fi', desc: '802.11 a/g/n/ac/ax' },
          { title: 'LTE / 4G', desc: 'Downlink Access' },
          { title: '5G NR', desc: 'CP-OFDM' },
          { title: 'DVB-T', desc: 'Digital Television' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center gap-2 mb-2">
               <Wifi className="w-4 h-4 text-cyan-500" />
               <div className="font-bold text-slate-900">{item.title}</div>
             </div>
             <div className="text-xs text-slate-500">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
             <h3 className="font-bold text-slate-900 mb-6 flex items-center justify-between">
               <span>Subcarriers</span>
               <span className="text-cyan-600 font-mono bg-cyan-50 px-2 py-0.5 rounded">{numSubcarriers}</span>
             </h3>
             <input 
               type="range" min="2" max="64" step="2"
               value={numSubcarriers} onChange={(e) => setNumSubcarriers(Number(e.target.value))}
               className="w-full accent-cyan-500 mb-6"
             />
             <div className="space-y-4 text-sm text-slate-600">
                <p>
                  As the number of subcarriers increases, the bandwidth of each individual subchannel becomes narrower.
                </p>
                <p>
                  When subchannel bandwidth $BW \ll$ Coherence Bandwidth, the subchannel experiences <strong>flat fading</strong> instead of frequency-selective fading.
                </p>
             </div>
           </div>

           <div className="bg-slate-900 rounded-2xl p-6 text-white text-sm">
              <h4 className="font-bold text-slate-300 uppercase tracking-widest text-xs mb-4">Signal Processing Chain</h4>
              <div className="space-y-3 font-mono text-cyan-400 border-l border-slate-700 pl-4 py-2">
                 <div>1. Serial-to-Parallel (S/P)</div>
                 <ArrowRight className="w-4 h-4 text-slate-600" />
                 <div>2. Modulator (QAM)</div>
                 <ArrowRight className="w-4 h-4 text-slate-600" />
                 <div>3. IFFT (Freq → Time)</div>
                 <ArrowRight className="w-4 h-4 text-slate-600" />
                 <div>4. Add Cyclic Prefix (CP)</div>
                 <ArrowRight className="w-4 h-4 text-slate-600" />
                 <div className="text-white">Channel</div>
              </div>
           </div>
           
           <div className="bg-cyan-50 rounded-2xl border border-cyan-100 p-6">
             <h4 className="text-cyan-900 font-bold uppercase tracking-widest text-xs mb-2">Trade-Offs</h4>
             <ul className="list-disc list-inside text-sm text-cyan-800 space-y-1">
               <li>Strict synchronization required</li>
               <li>High Peak-to-Average Power Ratio (PAPR) requires linear amplifiers</li>
               <li>Cyclic Prefix (CP) overhead reduces spectral efficiency</li>
             </ul>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 mb-2">Frequency Response & OFDM Subcarriers</h3>
          <p className="text-xs text-slate-500 mb-6">
            The blue area shows a frequency-selective channel with deep fades. The vertical bars represent OFDM subcarriers. Notice how subcarriers experiencing a deep fade (e.g., around freq 40) will have high error rates, which are corrected using Interleaving + Channel Coding.
          </p>

          <div className="flex-1 min-h-[400px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={freqResponseData} margin={{top: 20, right: 20, bottom: 20, left: -20}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="freq" label={{ value: 'Frequency', position: 'insideBottom', offset: -10 }} />
                <YAxis domain={[-0.2, 1.2]} />
                <Tooltip />
                <Area type="monotone" dataKey="gain" stroke="#3B82F6" fillOpacity={0.1} fill="#3B82F6" />
                
                {/* Overlay Subcarriers */}
                {Array.from({ length: numSubcarriers }).map((_, i) => {
                   const f = 10 + (80 / (numSubcarriers - 1)) * i;
                   const gainVal = freqResponseData[Math.round(f)]?.gain || 1;
                   const isFaded = gainVal < 0.5;
                   return (
                     <Area 
                       key={i} 
                       type="monotone" 
                       dataKey={(d) => Math.abs(d.freq - f) < 1 ? gainVal : 0} 
                       stroke={isFaded ? '#F87171' : '#06B6D4'} 
                       fill={isFaded ? '#F87171' : '#06B6D4'} 
                       fillOpacity={0.6}
                     />
                   )
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
