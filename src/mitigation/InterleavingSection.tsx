import React, { useState } from 'react';
import { Activity, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export default function InterleavingSection() {
  const [depth, setDepth] = useState(4); // Interleaver depth
  
  // Data sequence Length 24
  const dataSeq = Array.from({length: 24}, (_, i) => i);
  
  // A burst error from index 8 to 11
  const burstErrorIndices = new Set([8, 9, 10, 11]);

  // Interleaving logic (block interleaver)
  // Rows = length / depth, Cols = depth
  const interleave = (seq: number[], d: number) => {
    const rows = Math.ceil(seq.length / d);
    const result = [];
    for (let c = 0; c < d; c++) {
      for (let r = 0; r < rows; r++) {
        const idx = r * d + c;
        if (idx < seq.length) result.push(seq[idx]);
      }
    }
    return result;
  };

  const deinterleave = (seq: number[], d: number) => {
    const rows = Math.ceil(seq.length / d);
    const result = new Array(seq.length);
    let i = 0;
    for (let c = 0; c < d; c++) {
      for (let r = 0; r < rows; r++) {
        const idx = r * d + c;
        if (idx < seq.length) {
          result[idx] = seq[i++];
        }
      }
    }
    return result;
  };

  const interleavedSeq = interleave(dataSeq, depth);
  
  // The burst error hits the channel.
  // In the channel, time indices 8 to 11 are corrupted.
  // So interleavedSeq[8] to interleavedSeq[11] are corrupted.
  const channelCorruptedIndices = new Set([8, 9, 10, 11]);

  // After deinterleaving, where do the errors end up?
  // We apply deinterleaving to track the original data indices that got corrupted.
  const deinterleavedErrors = new Set(
    channelCorruptedIndices.size > 0 
      ? Array.from(channelCorruptedIndices).map(chIndex => deinterleave(interleavedSeq, depth).indexOf(interleavedSeq[chIndex]))
      : []
  );

  return (
    <div className="space-y-8">
       <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-500" />
          Interleaving
        </h2>
        <p className="text-slate-600 text-lg max-w-3xl">
          Fading channels often cause <strong>burst errors</strong> (many consecutive bits corrupted). 
          Interleaving rearranges data before transmission, spreading burst errors across time so that Forward Error Correction (FEC) can correct them.
        </p>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
        
        <h3 className="font-black tracking-widest uppercase text-slate-400 text-xs mb-8">System Block Diagram</h3>
        
        <div className="flex items-center justify-between overflow-x-auto pb-4 gap-4 px-4">
           {['Encoder', 'Interleaver', 'Modulator', 'Fading Channel', 'Demodulator', 'Deinterleaver', 'Decoder'].map((block, i) => (
             <React.Fragment key={block}>
               <div className={`shrink-0 flex items-center justify-center p-3 rounded-lg text-xs font-bold font-mono border ${
                 block === 'Fading Channel' ? 'bg-red-500/20 border-red-500 text-red-300' :
                 block.includes('interleaver') ? 'bg-purple-500/20 border-purple-500 text-purple-300' :
                 'bg-slate-800 border-slate-600 text-slate-300'
               }`}>
                 {block}
               </div>
               {i < 6 && <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />}
             </React.Fragment>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
           <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
             <Clock className="w-5 h-5 text-purple-500" />
             Interleaver Depth
           </h3>
           
           <div className="space-y-6">
             <div>
               <div className="flex justify-between font-bold text-slate-500 text-xs uppercase tracking-widest mb-3">
                 <span>Depth (Columns)</span>
                 <span className="text-purple-600">{depth}</span>
               </div>
               <input 
                 type="range" min="2" max="8" step="1" 
                 value={depth} onChange={(e) => setDepth(Number(e.target.value))}
                 className="w-full accent-purple-500" 
               />
             </div>
             <p className="text-sm text-slate-600 leading-relaxed">
               Higher interleaving depth separates burst errors further apart, making it easier for channel coding to correct them.
             </p>
             <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
               <h4 className="text-purple-900 text-xs font-bold uppercase tracking-widest mb-1">Trade-Off</h4>
               <p className="text-purple-800 text-xs leading-relaxed">
                 Higher depth = Better error protection but introduces <strong>increased processing delay</strong>.
               </p>
             </div>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-8">
          
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-2">1. Original Data Feed</h4>
            <div className="flex flex-wrap gap-1">
              {dataSeq.map(n => (
                <div key={`orig-${n}`} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-mono font-bold rounded">
                  {n}
                </div>
              ))}
            </div>
          </div>

          <div>
             <h4 className="font-bold text-slate-800 text-sm mb-2 flex justify-between">
               <span>2. Channel Transmission (Burst Error Occurs)</span>
               <span className="text-red-500 text-xs bg-red-50 px-2 py-1 rounded">Burst Error</span>
             </h4>
             <div className="flex flex-wrap gap-1">
                {interleavedSeq.map((n, i) => {
                  const isError = channelCorruptedIndices.has(i);
                  return (
                    <motion.div 
                      key={`tx-${n}`} 
                      initial={false}
                      animate={{ scale: isError ? [1, 1.2, 1] : 1 }}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-mono font-bold rounded ${
                        isError ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {n}
                    </motion.div>
                  )
                })}
             </div>
          </div>

          <div>
             <h4 className="font-bold text-slate-800 text-sm mb-2">3. Data After Deinterleaving</h4>
             <p className="text-xs text-slate-500 mb-3">The burst error is now spread out. The decoder can correct these isolated errors.</p>
             <div className="flex flex-wrap gap-1">
                {dataSeq.map(n => {
                  const isError = deinterleavedErrors.has(n);
                  return (
                    <div 
                      key={`rx-${n}`} 
                      className={`w-8 h-8 flex items-center justify-center text-xs font-mono font-bold rounded ${
                        isError ? 'bg-orange-100 text-orange-600 border border-orange-300' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {n}
                    </div>
                  )
                })}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
