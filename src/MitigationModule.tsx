import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Wifi, 
  Layers, 
  Activity, 
  ShieldCheck, 
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Subcomponents for each section
import EqualizationSection from './mitigation/EqualizationSection';
import DiversitySection from './mitigation/DiversitySection';
import InterleavingSection from './mitigation/InterleavingSection';
import OFDMSection from './mitigation/OFDMSection';
import ChannelCodingSection from './mitigation/ChannelCodingSection';
import MitigationDashboard from './mitigation/MitigationDashboard';

export default function MitigationModule() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'equalization' | 'diversity' | 'interleaving' | 'ofdm' | 'coding'>('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Summary Dashboard', icon: Layers },
    { id: 'equalization', label: '1. Equalization', icon: Zap },
    { id: 'diversity', label: '2. Diversity', icon: Wifi },
    { id: 'interleaving', label: '3. Interleaving', icon: Activity },
    { id: 'ofdm', label: '4. OFDM', icon: Activity },
    { id: 'coding', label: '5. Channel Coding', icon: ShieldCheck },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA]">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap gap-2 shadow-sm z-10 sticky top-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 xl:p-12 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <MitigationDashboard onNavigate={(tab) => setActiveTab(tab as any)} />}
              {activeTab === 'equalization' && <EqualizationSection />}
              {activeTab === 'diversity' && <DiversitySection />}
              {activeTab === 'interleaving' && <InterleavingSection />}
              {activeTab === 'ofdm' && <OFDMSection />}
              {activeTab === 'coding' && <ChannelCodingSection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
