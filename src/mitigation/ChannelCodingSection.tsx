import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShieldCheck, ChevronDown, ChevronUp, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ChannelCodingSection() {
  const [expandedCode, setExpandedCode] = useState<string | null>('LDPC');

  // BER Data to show coding gain
  const berData = Array.from({ length: 11 }, (_, i) => {
    const ebNo = i;
    // Approximation math for visual effect
    const unCoded = 0.5 * Math.exp(-ebNo / 2);
    // Coded acts like a waterfall curve
    const coded = ebNo < 4 ? 0.4 : 10 * Math.exp(-ebNo * 1.5);
    return { ebNo, unCoded: Math.max(1e-6, unCoded), coded: Math.max(1e-6, coded) };
  });

  const codes = [
    { id: 'Hamming', name: 'Hamming Codes', desc: 'Simple block codes capable of single-bit error correction.', usedIn: 'Memory ECC, Legacy systems' },
    { id: 'RS', name: 'Reed-Solomon (RS)', desc: 'Non-binary cyclic error-correcting codes effective against burst errors.', usedIn: 'CDs, DVDs, QR Codes, Deep Space' },
    { id: 'Conv', name: 'Convolutional Codes', desc: 'Continuous bitstream encoding typically decoded using the Viterbi algorithm.', usedIn: 'GSM, 3G, Satellite' },
    { id: 'Turbo', name: 'Turbo Codes', desc: 'Parallel concatenated convolutional codes that approach the Shannon limit.', usedIn: '3G, 4G LTE' },
    { id: 'LDPC', name: 'LDPC (Low-Density Parity-Check)', desc: 'Linear block codes using very sparse parity-check matrices. Excellent performance and highly parallelizable.', usedIn: 'Wi-Fi, 5G NR (Data Channels)' },
    { id: 'Polar', name: 'Polar Codes', desc: 'First codes mathematically proven to achieve channel capacity based on channel polarization.', usedIn: '5G NR (Control Channels)' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-green-500" />
          Channel Coding (FEC)
        </h2>
        <p className="text-slate-600 text-lg max-w-4xl">
          Channel coding adds controlled mathematical redundancy to the transmitted data, allowing the receiver to detect and <strong>correct errors</strong> without requiring re-transmission.
        </p>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3" />
        
        <h3 className="font-black tracking-widest uppercase text-slate-400 text-xs mb-8">Data Flow Visualization</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
           <div className="space-y-2">
             <div className="flex justify-center flex-wrap w-24 gap-1">
               <span className="w-4 h-4 bg-white text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">1</span>
               <span className="w-4 h-4 bg-white text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">0</span>
               <span className="w-4 h-4 bg-white text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">1</span>
               <span className="w-4 h-4 bg-white text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">1</span>
             </div>
             <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Source Data</div>
           </div>
           
           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 hidden md:block" />
           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 md:hidden rotate-90" />

           <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl">
             <div className="font-bold text-green-400 mb-1">FEC Encoder</div>
             <div className="text-xs text-green-300">Adds Redundancy</div>
           </div>

           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 hidden md:block" />
           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 md:hidden rotate-90" />

           <div className="space-y-2">
             <div className="flex justify-center flex-wrap w-32 gap-1">
               <span className="w-4 h-4 bg-slate-300 text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">1</span>
               <span className="w-4 h-4 bg-slate-300 text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">0</span>
               <span className="w-4 h-4 bg-slate-300 text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">1</span>
               <span className="w-4 h-4 bg-slate-300 text-slate-900 text-[10px] font-bold flex items-center justify-center rounded">1</span>
               <span className="w-4 h-4 bg-green-500 text-white text-[10px] font-bold flex items-center justify-center rounded">0</span>
               <span className="w-4 h-4 bg-green-500 text-white text-[10px] font-bold flex items-center justify-center rounded">1</span>
             </div>
             <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Coded Bits</div>
           </div>

           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 hidden md:block" />
           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 md:hidden rotate-90" />
           
           <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl relative">
             <Zap className="absolute -top-3 -right-3 w-6 h-6 text-red-500 fill-red-500" />
             <div className="font-bold text-slate-300 mb-1">Channel</div>
             <div className="text-xs text-slate-500">Noise & Fading</div>
           </div>

           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 hidden md:block" />
           <ArrowRight className="w-6 h-6 text-slate-600 shrink-0 md:hidden rotate-90" />
           
           <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-center">
             <div className="font-bold text-green-400 mb-1">FEC Decoder</div>
             <div className="text-xs text-green-300">Corrects corrupted bits</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 space-y-4">
           <h3 className="font-bold text-slate-900 text-lg">Coding Technologies</h3>
           {codes.map(code => (
             <div key={code.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
               <button 
                 onClick={() => setExpandedCode(expandedCode === code.id ? null : code.id)}
                 className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 transition-colors"
               >
                 <span className="font-bold text-slate-800">{code.name}</span>
                 {expandedCode === code.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
               </button>
               <AnimatePresence>
                 {expandedCode === code.id && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="px-4 pb-4"
                   >
                     <p className="text-sm text-slate-600 mb-3">{code.desc}</p>
                     <div className="flex items-start gap-2 bg-green-50 p-2 rounded-lg text-xs">
                       <span className="font-bold text-green-800">Used In:</span>
                       <span className="text-green-700">{code.usedIn}</span>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           ))}
        </div>

        <div className="lg:col-span-7 space-y-6">
           <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Coding Gain Demonstration</h3>
              <p className="text-xs text-slate-500 mb-6">
                Notice the "waterfall" curve. At strong SNRs, channel coding provides significant performance improvements (Coding Gain).
              </p>
              
              <div className="h-[300px] relative">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={berData} margin={{top: 5, right: 20, bottom: 20, left: 10}}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="ebNo" label={{ value: 'Eb/N0 (dB)', position: 'insideBottom', offset: -10 }} />
                     <YAxis scale="log" domain={[1e-6, 1]} tickFormatter={(v) => v.toExponential()} />
                     <Tooltip formatter={(v: number) => v.toExponential(2)} />
                     <Legend verticalAlign="top"/>
                     <Line type="monotone" name="Uncoded" dataKey="unCoded" stroke="#F87171" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                     <Line type="monotone" name="Coded (FEC)" dataKey="coded" stroke="#22C55E" strokeWidth={3} dot={false} />
                   </LineChart>
                 </ResponsiveContainer>
                 
                 {/* Coding gain annotation - decorative */}
                 <div className="absolute top-1/2 left-[45%] text-xs font-bold text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                   ← Coding Gain →
                 </div>
              </div>
           </div>

           <div className="bg-orange-50 rounded-2xl border border-orange-100 p-6 flex items-start gap-4">
             <ShieldCheck className="w-8 h-8 text-orange-500 shrink-0" />
             <div>
               <h4 className="font-bold text-orange-900 mb-1 tracking-tight">The Shannon Limit</h4>
               <p className="text-sm text-orange-800 leading-relaxed max-w-xl">
                 Claude Shannon proved there is a theoretical maximum error-free data rate (channel capacity) for any given noise level. Modern codes like Turbo, LDPC, and Polar operate phenomenally close to this absolute theoretical limit.
               </p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
