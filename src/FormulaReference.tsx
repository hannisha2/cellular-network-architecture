import React from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  Zap, 
  Cpu, 
  Radio, 
  Activity, 
  Layers, 
  Navigation,
  Target,
  Maximize2
} from 'lucide-react';

const FormulaCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  formulas: { label: string; equation: string; note?: string }[];
  legend?: { symbol: string; meaning: string }[];
  description?: string;
}> = ({ title, icon, color, formulas, legend, description }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
  >
    <div className="flex items-center gap-3 mb-8">
      <div className={`p-2 rounded-xl scale-110 ${color} bg-opacity-10`}>
        {React.cloneElement(icon as React.ReactElement<any>, { 
          className: (icon as React.ReactElement<any>).props?.className + " " + color.replace('bg-', 'text-') 
        })}
      </div>
      <h3 className="text-slate-900 font-black uppercase text-xs tracking-widest leading-none">{title}</h3>
    </div>

    <div className="space-y-6 flex-grow">
      {formulas.map((f, i) => (
        <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 group transition-colors hover:border-slate-300">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{f.label}</span>
              {f.note && <span className="text-[9px] font-bold text-indigo-400 uppercase">{f.note}</span>}
            </div>
            <div className="flex items-center justify-center py-6 bg-white rounded-xl border border-slate-200 shadow-inner group-hover:border-slate-300 transition-colors">
              <span className="text-xl font-mono font-bold text-slate-900 tracking-tight text-center px-4 leading-relaxed whitespace-pre-line">
                {f.equation}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>

    {legend && (
      <div className="mt-8 pt-8 border-t border-slate-100">
        <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Variable Legend</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {legend.map((item, i) => (
            <div key={i} className="flex gap-2 items-baseline">
              <span className={`font-mono text-[11px] font-black ${color.replace('bg-', 'text-')}`}>{item.symbol}:</span>
              <span className="text-[10px] text-slate-500 font-medium leading-tight">{item.meaning}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {description && (
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight text-left mt-6 italic">
        • {description}
      </p>
    )}
  </motion.div>
);

const FormulaReference: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto p-8 space-y-12 pb-24">
      <div className="flex flex-col items-center text-center space-y-4 mb-20">
        <div className="px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-2">
          Technical Documentation
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
          Cellular Math & Logic
        </h2>
        <p className="text-slate-500 font-bold uppercase text-[11px] tracking-[0.25em] max-w-xl">
          A definitive reference for the mathematical models governing signal propagation, fading, and network capacity.
        </p>
        <div className="w-24 h-1.5 bg-slate-900 rounded-full mt-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Fading: Time Dispersion */}
        <FormulaCard 
          title="Fading: Time Dispersion"
          icon={<Database />}
          color="bg-indigo-500"
          formulas={[
            { label: "RMS Delay Spread", equation: "σ_τ = √(τ²_avg - (τ_avg)²)", note: "Pulse Smearing" },
            { label: "Coherence Bandwidth", equation: "B_c ≈ 1 / (5σ_τ)", note: "90% Correlation" }
          ]}
          legend={[
            { symbol: "σ_τ", meaning: "RMS Delay Spread (μs)" },
            { symbol: "τ_avg", meaning: "Mean Excess Delay" },
            { symbol: "B_c", meaning: "Coherence Bandwidth" }
          ]}
          description="Measures how echos smear symbols in the frequency domain."
        />

        {/* Fading: Doppler Dynamics */}
        <FormulaCard 
          title="Fading: Doppler Dynamics"
          icon={<Zap />}
          color="bg-sky-500"
          formulas={[
            { label: "Max Doppler Shift", equation: "f_d = (v · f_c) / c", note: "Freq. Offset" },
            { label: "Coherence Time", equation: "T_c ≈ 0.179 / f_d", note: "Channel Stability" }
          ]}
          legend={[
            { symbol: "v", meaning: "Velocity (m/s)" },
            { symbol: "f_c", meaning: "Carrier Frequency" },
            { symbol: "c", meaning: "Speed of Light (~3e8 m/s)" },
            { symbol: "f_d", meaning: "Doppler Shift (Hz)" }
          ]}
          description="Calculates how fast distance changes affect channel stability."
        />

        {/* Channel Classification */}
        <FormulaCard 
          title="Channel Character"
          icon={<Cpu />}
          color="bg-emerald-500"
          formulas={[
            { label: "Selectivity Condition", equation: "B_s > B_c", note: "Needs Equalizer" },
            { label: "Stability Condition", equation: "T_s > T_c", note: "Fast Fading" }
          ]}
          legend={[
            { symbol: "B_s", meaning: "Signal Bandwidth" },
            { symbol: "T_s", meaning: "Symbol Duration (s)" },
            { symbol: "T_c", meaning: "Coherence Time (s)" }
          ]}
          description="Compares User Signal vs. Physics of the Environment."
        />

        {/* Propagation: Basics */}
        <FormulaCard 
          title="Propagation Basics"
          icon={<Radio />}
          color="bg-orange-500"
          formulas={[
            { label: "Free Space Loss (dB)", equation: "32.4 + 20log(d) + 20log(f)", note: "Ideal Case" },
            { label: "Received Power (dBm)", equation: "P_t + G_t + G_r - Loss", note: "Link Budget" }
          ]}
          legend={[
            { symbol: "d", meaning: "Distance (km)" },
            { symbol: "f", meaning: "Frequency (MHz)" },
            { symbol: "P_t", meaning: "Transmit Power" },
            { symbol: "G", meaning: "Antenna Gain" }
          ]}
          description="The basic math of how signal dies over distance."
        />

        {/* Network: Reuse */}
        <FormulaCard 
          title="Frequency Reuse"
          icon={<Target />}
          color="bg-rose-500"
          formulas={[
            { label: "Reuse Distance", equation: "D = R · √(3N)", note: "Geometric" },
            { label: "Cochannel Ratio", equation: "Q = D/R", note: "Q-Factor" }
          ]}
          legend={[
            { symbol: "N", meaning: "Cluster Size (e.g., 7)" },
            { symbol: "R", meaning: "Cell Radius" },
            { symbol: "D", meaning: "Distance between Cells" }
          ]}
          description="Planning how far to move before reusing frequency."
        />

        {/* Capacity: SIR */}
        <FormulaCard 
          title="Capacity & Interference"
          icon={<Activity />}
          color="bg-blue-500"
          formulas={[
            { label: "SIR (Normal Case / Average)", equation: "S/I = (1/6) · Q^n", note: "Omni: 6 interferers (Baseline)" },
            { label: "SIR (120° / 3-Sector)", equation: "S/I = (1/2) · Q^n (+4.77 dB)", note: "3-Sector: 2 interferers" },
            { label: "SIR (60° / 6-Sector)", equation: "S/I = (1/1) · Q^n (+7.78 dB)", note: "6-Sector: 1 interferer" },
            { label: "Trunking Recalculation", equation: "C_sector = C / S_sector", note: "Channels divided per sector" },
            { label: "Traffic (Erlangs)", equation: "A = λ · H", note: "Usage Load" }
          ]}
          legend={[
            { symbol: "S/I", meaning: "Signal-Interference Ratio" },
            { symbol: "n", meaning: "Path Loss Exponent" },
            { symbol: "λ", meaning: "Call Arrival Rate" },
            { symbol: "H", meaning: "Holding Time" }
          ]}
          description="Math for handling thousands of users simultaneously."
        />
      </div>

      {/* Logic Breakdown Table Style */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full -ml-20 -mb-20 blur-3xl" />
        
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-12 flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Maximize2 className="text-indigo-400 w-5 h-5" />
            </div>
            CRITICAL CHANNEL BOUNDARIES
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Spectral Domain</h4>
                <p className="text-sm text-slate-400 font-medium italic">Determines if the signal experiences distortion across its bandwidth.</p>
              </div>
              <div className="space-y-4">
                <div className="group/item flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <div className="space-y-1">
                    <span className="text-sm font-bold block">Frequency Selective</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">Distortion Present</span>
                  </div>
                  <span className="text-rose-400 font-mono font-black text-lg">B_s &gt; B_c</span>
                </div>
                <div className="group/item flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <div className="space-y-1">
                    <span className="text-sm font-bold block">Flat Fading</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">Uniform Gain</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-black text-lg">B_s &lt; B_c</span>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex flex-col gap-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Temporal Domain</h4>
                <p className="text-sm text-slate-400 font-medium italic">Determines if the channel remains constant during a transmission.</p>
              </div>
              <div className="space-y-4">
                <div className="group/item flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <div className="space-y-1">
                    <span className="text-sm font-bold block">Fast Fading</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">Doppler Spreading</span>
                  </div>
                  <span className="text-rose-400 font-mono font-black text-lg">T_s &gt; T_c</span>
                </div>
                <div className="group/item flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                  <div className="space-y-1">
                    <span className="text-sm font-bold block">Slow Fading</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight italic">Easy Tracking</span>
                  </div>
                  <span className="text-sky-400 font-mono font-black text-lg">T_s &lt; T_c</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-12 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
              Formula Reference v1.2 • Cellular Engineering Standard
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Physics Based</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Verified Models</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FormulaReference;
