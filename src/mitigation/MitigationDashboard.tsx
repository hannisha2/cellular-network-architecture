import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Zap, Wifi, Activity, ShieldCheck } from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export default function MitigationDashboard({ onNavigate }: Props) {
  const techniques = [
    {
      id: 'equalization',
      title: 'Equalization',
      problem: 'Intersymbol Interference (ISI)',
      idea: 'Compensate channel distortion',
      tradeoff: 'Complexity, Noise enhancement',
      icon: Zap,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10'
    },
    {
      id: 'diversity',
      title: 'Diversity',
      problem: 'Deep Fades',
      idea: 'Multiple independent branches',
      tradeoff: 'Extra antennas & hardware',
      icon: Wifi,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      id: 'interleaving',
      title: 'Interleaving',
      problem: 'Burst Errors',
      idea: 'Spread errors over time',
      tradeoff: 'Increased Delay',
      icon: Activity,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      id: 'ofdm',
      title: 'OFDM',
      problem: 'Frequency Selective Fading',
      idea: 'Many narrowband subcarriers',
      tradeoff: 'Synchronization, High PAPR',
      icon: Activity,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10'
    },
    {
      id: 'coding',
      title: 'Channel Coding',
      problem: 'Bit Errors',
      idea: 'Add redundancy (Forward Error Correction)',
      tradeoff: 'Lower effective data rate',
      icon: ShieldCheck,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Mitigation Techniques</h2>
        <p className="text-slate-600 text-lg max-w-3xl">
          Wireless channels suffer from various impairments like multipath fading, delay spread, and noise. 
          Discover the key techniques used in modern cellular systems to mitigate these effects.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techniques.map((tech, idx) => {
          const Icon = tech.icon;
          return (
            <motion.div
              key={tech.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => onNavigate(tech.id)}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${tech.bg}`}>
                  <Icon className={`w-6 h-6 ${tech.color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{tech.title}</h3>
              </div>
              
              <div className="space-y-4 flex-1">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Main Problem Addressed</div>
                  <div className="text-slate-700 font-medium">{tech.problem}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Main Idea</div>
                  <div className="text-slate-700 font-medium">{tech.idea}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Trade-Off</div>
                  <div className="text-slate-600 text-sm">{tech.tradeoff}</div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-slate-400 group-hover:text-blue-500 transition-colors">
                <span className="text-sm font-bold">Explore Simulator</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  );
}
