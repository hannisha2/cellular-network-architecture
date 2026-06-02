import React, { useState, useMemo } from 'react';
import { 
  PropagationParams, 
  calculateFSPL, 
  calculateLogNormal, 
  calculateOkumuraHata, 
  ScenarioType,
  LinkBudgetInputs,
  LinkBudgetResults,
  calculateNoiseFloor,
  solveForDistance
} from './network-types';
import { 
  Settings2, 
  Zap, 
  Radio, 
  Activity, 
  Maximize2, 
  Layers, 
  Info, 
  TrendingDown, 
  TrendingUp,
  ShieldAlert,
  Map as MapIcon,
  CheckCircle2,
  DollarSign,
  Navigation,
  Box,
  Hash,
  Star
} from 'lucide-react';

const PRESETS = [
  {
    name: "GSM-900 Standard",
    params: { frequencyMHz: 900, txHeightM: 50, rxHeightM: 1.5, environment: 'URBAN', model: 'OKUMURA_HATA' },
    link: { transmitPowerDbm: 43, bandwidthKhz: 200, noiseFigureDb: 7, targetEbNoDb: 12 }
  }
];

const ParameterInput = ({ label, value, unit, onChange, icon: Icon, color, step = 1, min = 0, max = 100 }: any) => (
  <div className="space-y-3 group p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:border-slate-200 hover:shadow-md">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${color} bg-opacity-15`}>
          <Icon size={16} className={color.replace('bg-', 'text-')} />
        </div>
        <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest leading-none">{label}</label>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black text-slate-900 tracking-tighter">{value}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
      </div>
    </div>
    <div className="relative flex items-center h-6">
      <input 
        type="range" min={min} max={max} step={step}
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-${color.split('-')[1]}-500 transition-all touch-none`}
      />
    </div>
  </div>
);

export default function PropagationModule() {
  const [params, setParams] = useState<PropagationParams>({
    frequencyMHz: 900,
    txHeightM: 50,
    rxHeightM: 1.5,
    environment: 'URBAN',
    citySize: 'SMALL_MEDIUM',
    isLOS: false,
    pathLossExponent: 3.5,
    shadowingStdDev: 8
  });

  const [linkParams, setLinkParams] = useState<LinkBudgetInputs>({
    transmitPowerDbm: 44, // Results in L_max = 146 dB
    txAntennaGainDbi: 15,
    rxAntennaGainDbi: 0,
    hardwareLossDb: 5,
    miscLossDb: 0,
    bandwidthKhz: 200,
    receiverNoiseFigureDb: 5,
    targetEbNoDb: 11,
    spectralEfficiency: 2,
    designMarginDb: 10,
    totalAreaKm2: 100,
    baseStationPrice: 50000
  });

  const [selectedModel, setSelectedModel] = useState<'FSPL' | 'LOG_DISTANCE' | 'LOG_NORMAL' | 'OKUMURA_HATA'>('OKUMURA_HATA');

  const applyPreset = (preset: any) => {
    setParams(p => ({ ...p, ...preset.params }));
    setLinkParams(l => ({ ...l, ...preset.link }));
    setSelectedModel(preset.params.model);
  };

  const results = useMemo((): LinkBudgetResults => {
    // Step 1: Required SNR and Noise Floor
    const noiseFloor = calculateNoiseFloor(linkParams.bandwidthKhz, linkParams.receiverNoiseFigureDb);
    
    // SNR = Eb/N0 + 10log10(SpectralEfficiency) + Margin
    const thresholdSnr = linkParams.targetEbNoDb + 10 * Math.log10(linkParams.spectralEfficiency) + linkParams.designMarginDb;
    
    // Required Received Power Pr,req = SNR + N
    const requiredRxPower = thresholdSnr + noiseFloor;
    
    // Step 2: Maximum allowable path loss Lmax = Pt + Gt + Gr - L_hardware - L_misc - Pr,req
    const maxPathLoss = linkParams.transmitPowerDbm + linkParams.txAntennaGainDbi + linkParams.rxAntennaGainDbi 
                        - linkParams.hardwareLossDb - linkParams.miscLossDb 
                        - requiredRxPower;
    
    // Step 3: Solve for distance based on Lmax
    const distance = solveForDistance(maxPathLoss, params, selectedModel);
    
    // Network Coverage Calculations
    const cellArea = Math.PI * Math.pow(distance, 2);
    const numCells = Math.ceil(linkParams.totalAreaKm2 / cellArea);
    const totalCost = numCells * linkParams.baseStationPrice;

    return {
      noiseFloorDbm: noiseFloor,
      thresholdSnrDb: thresholdSnr,
      requiredRxPowerDbm: requiredRxPower,
      maxAllowablePathLossDb: maxPathLoss,
      coverageDistanceKm: distance,
      cellAreaKm2: cellArea,
      numCellsRequired: numCells,
      totalCost
    };
  }, [params, linkParams, selectedModel]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-6 shadow-sm z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wireless Coverage Analysis</h1>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Okumura-Hata Planning & Link Budget</p>
          </div>
          <div className="flex items-center gap-3">
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[28rem] bg-white border-r border-slate-200 p-8 overflow-y-auto z-20 scrollbar-thin">
          <div className="space-y-12">
            {/* Quick Presets */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                  <Star size={20} />
                </div>
                <div>
                   <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest leading-none mb-1">Quick Presets</h2>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Load Standard Models</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(p)}
                    className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left transition-all hover:bg-white hover:border-amber-200 hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{p.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{p.params.frequencyMHz}MHz Reference</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="pt-10 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                  <Radio size={20} />
                </div>
                <div>
                   <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest leading-none mb-1">Link Budget</h2>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">System hardware & gains</p>
                </div>
              </div>
              <div className="space-y-4">
                <ParameterInput 
                   label="Transmit Power (P)" 
                   value={linkParams.transmitPowerDbm} min={10} max={60} unit=" dBm"
                   onChange={(v: number) => setLinkParams(lp => ({ ...lp, transmitPowerDbm: v }))}
                   icon={Zap} color="bg-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <ParameterInput 
                    label="TX Gain (Gt)" 
                    value={linkParams.txAntennaGainDbi} min={0} max={25} unit=" dBi"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, txAntennaGainDbi: v }))}
                    icon={TrendingUp} color="bg-emerald-500"
                  />
                  <ParameterInput 
                    label="RX Gain (Gr)" 
                    value={linkParams.rxAntennaGainDbi} min={0} max={10} unit=" dBi"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, rxAntennaGainDbi: v }))}
                    icon={TrendingUp} color="bg-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ParameterInput 
                    label="HW Loss (Lh)" 
                    value={linkParams.hardwareLossDb} min={0} max={20} unit=" dB"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, hardwareLossDb: v }))}
                    icon={Settings2} color="bg-slate-500"
                  />
                  <ParameterInput 
                    label="Misc Loss (Lm)" 
                    value={linkParams.miscLossDb} min={0} max={30} unit=" dB"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, miscLossDb: v }))}
                    icon={Settings2} color="bg-slate-400"
                  />
                </div>
                <ParameterInput 
                   label="Bandwidth (B)" 
                   value={linkParams.bandwidthKhz} min={1} max={1000} unit=" kHz"
                   onChange={(v: number) => setLinkParams(lp => ({ ...lp, bandwidthKhz: v }))}
                   icon={Activity} color="bg-amber-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <ParameterInput 
                    label="Noise Fig. (NF)" 
                    value={linkParams.receiverNoiseFigureDb} min={0} max={15} unit=" dB"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, receiverNoiseFigureDb: v }))}
                    icon={ShieldAlert} color="bg-rose-500"
                  />
                  <ParameterInput 
                    label="Target Eb/N0" 
                    value={linkParams.targetEbNoDb} min={0} max={30} unit=" dB"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, targetEbNoDb: v }))}
                    icon={CheckCircle2} color="bg-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ParameterInput 
                    label="Spectral Eff." 
                    value={linkParams.spectralEfficiency} min={1} max={10} unit=" b/s/Hz"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, spectralEfficiency: v }))}
                    icon={Activity} color="bg-blue-400"
                  />
                  <ParameterInput 
                    label="Design Margin" 
                    value={linkParams.designMarginDb} min={0} max={30} unit=" dB"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, designMarginDb: v }))}
                    icon={ShieldAlert} color="bg-orange-500"
                  />
                </div>
              </div>
            </section>

            <section className="pt-10 border-t border-slate-100">
               <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                  <Navigation size={20} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest leading-none mb-1">Propagation</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Antenna & Physics</p>
                </div>
              </div>
              <div className="space-y-4">
                 <ParameterInput 
                   label="Carrier Freq" 
                   value={params.frequencyMHz} min={150} max={2000} step={10} unit=" MHz"
                   onChange={(v: number) => setParams(p => ({ ...p, frequencyMHz: v }))}
                   icon={Radio} color="bg-blue-600"
                />
                <div className="grid grid-cols-2 gap-4">
                  <ParameterInput 
                    label="BS Height" 
                    value={params.txHeightM} min={30} max={200} unit=" m"
                    onChange={(v: number) => setParams(p => ({ ...p, txHeightM: v }))}
                    icon={Maximize2} color="bg-slate-700"
                  />
                  <ParameterInput 
                    label="Mobile H." 
                    value={params.rxHeightM} min={1} max={10} step={0.1} unit=" m"
                    onChange={(v: number) => setParams(p => ({ ...p, rxHeightM: v }))}
                    icon={Maximize2} color="bg-slate-500"
                  />
                </div>
                <ParameterInput 
                   label="Path Loss Exp." 
                   value={params.pathLossExponent} min={2} max={5} step={0.1} unit=" n"
                   onChange={(v: number) => setParams(p => ({ ...p, pathLossExponent: v }))}
                   icon={TrendingDown} color="bg-indigo-400"
                />
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2">
                         <Layers size={14} className="text-indigo-500" />
                         Propagation Model
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          { id: 'FSPL', label: 'Free Space (FSPL)' },
                          { id: 'LOG_DISTANCE', label: 'Log-Distance' },
                          { id: 'LOG_NORMAL', label: 'Log-Normal' },
                          { id: 'OKUMURA_HATA', label: 'Okumura-Hata' }
                        ] as const).map(model => (
                          <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border text-left flex items-center justify-between group ${
                              selectedModel === model.id 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200'
                            }`}
                          >
                            {model.label}
                            {selectedModel === model.id && <CheckCircle2 size={14} className="text-white" />}
                          </button>
                        ))}
                      </div>
                      <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/30">
                        <p className="text-[10px] text-indigo-600 font-bold leading-relaxed">
                          {selectedModel === 'OKUMURA_HATA' && "Classic model for 150-1500 MHz. Best for standard cellular macros."}
                          {selectedModel === 'LOG_DISTANCE' && "Predicts average path loss for a wide range of environments using exponents."}
                          {selectedModel === 'LOG_NORMAL' && "Incorporates random shadowing effects for more realistic coverage probability."}
                          {selectedModel === 'FSPL' && "Ideal line-of-sight model with no obstructions. Theoretical maximum range."}
                        </p>
                      </div>
                    </div>

                    {/* Environment label removed as requested */}

                    {selectedModel === 'OKUMURA_HATA' && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none flex items-center gap-2">
                           <Box size={14} className="text-indigo-600" />
                           City Size
                        </label>
                        <div className="flex bg-indigo-50/50 p-1.5 rounded-2xl border border-indigo-50 md:flex-row flex-col">
                           <button
                             onClick={() => setParams(p => ({ ...p, citySize: 'SMALL_MEDIUM' }))}
                             className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                               params.citySize === 'SMALL_MEDIUM' 
                                 ? 'bg-white text-indigo-700 shadow-md ring-1 ring-indigo-500/10' 
                                 : 'text-indigo-400 hover:text-indigo-600'
                             }`}
                           >
                             Small/Medium
                           </button>
                           <button
                             onClick={() => setParams(p => ({ ...p, citySize: 'LARGE' }))}
                             className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                               params.citySize === 'LARGE' 
                                 ? 'bg-white text-indigo-700 shadow-md ring-1 ring-indigo-500/10' 
                                 : 'text-indigo-400 hover:text-indigo-600'
                             }`}
                           >
                             Large City
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
              </div>
            </section>

            <section className="pt-6 border-t border-slate-100">
               <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h2 className="font-black text-slate-800 uppercase text-[10px] tracking-wider">Economical Inputs</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <ParameterInput 
                    label="Total Area" 
                    value={linkParams.totalAreaKm2} min={10} max={1000} unit=" km²"
                    onChange={(v: number) => setLinkParams(lp => ({ ...lp, totalAreaKm2: v }))}
                    icon={MapIcon} color="bg-indigo-600"
                  />
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BS Price ($)</label>
                    <input 
                      type="number"
                      value={linkParams.baseStationPrice}
                      onChange={(e) => setLinkParams(lp => ({ ...lp, baseStationPrice: Number(e.target.value) }))}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>
            </section>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto bg-slate-100/50 scrollbar-thin">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Top Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <ResultCard 
                 label="Max Loss Allowance" 
                 value={`${results.maxAllowablePathLossDb.toFixed(1)} dB`}
                 sub="Link Sensitivity"
                 icon={<Zap className="text-blue-500" />}
                 color="blue"
               />
               <ResultCard 
                 label="Coverage Distance" 
                 value={`${results.coverageDistanceKm.toFixed(2)} km`}
                 sub={`Radius (d) via ${selectedModel.replace('_', ' ')}`}
                 icon={<Navigation className="text-indigo-500" />}
                 color="indigo"
               />
               <ResultCard 
                 label="Cells Required" 
                 value={results.numCellsRequired.toString()}
                 sub={`Grid Density`}
                 icon={<Hash className="text-emerald-500" />}
                 color="emerald"
               />
               <ResultCard 
                 label="Total System Cost" 
                 value={`$${(results.totalCost / 1e6).toFixed(2)}M`}
                 sub={`Network CAPEX`}
                 icon={<DollarSign className="text-amber-500" />}
                 color="amber"
               />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               {/* Simplified Breakdown Card */}
               <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                        <Activity size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">System Link Budget Analysis</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                      <div className="absolute -left-2 top-6 w-1 h-8 bg-indigo-500 rounded-full" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Step 1: Receiver Threshold (P_r,min)</h4>
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                          <span className="text-slate-500 text-[10px]">Noise Floor (N = -174 + 10log(B) + NF)</span>
                          <span className="text-slate-900 font-bold">{results.noiseFloorDbm.toFixed(1)} dBm</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                          <span className="text-slate-500 text-[10px]">SNR (Eb/No + 10logη + M)</span>
                          <span className="text-indigo-600 font-bold">+{results.thresholdSnrDb.toFixed(1)} dB</span>
                        </div>
                        <div className="flex justify-between items-center font-bold px-3 py-3 bg-white rounded-xl shadow-sm border border-slate-100">
                          <span className="text-slate-900">Required Power (P_r,min)</span>
                          <span className="text-emerald-600 text-sm">{results.requiredRxPowerDbm.toFixed(1)} dBm</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                      <div className="absolute -left-2 top-6 w-1 h-8 bg-blue-500 rounded-full" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Step 2: Allowable Path Loss (L_max)</h4>
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[10px]">Transmit Output (P_t)</span>
                          <span className="text-slate-900 font-bold">{linkParams.transmitPowerDbm} dBm</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-[10px]">Total Gain (G_t + G_r)</span>
                          <span className="text-slate-900 font-bold">+{linkParams.txAntennaGainDbi + linkParams.rxAntennaGainDbi} dBi</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                          <span className="text-slate-500 text-[10px]">Total Losses (L_h + L_m)</span>
                          <span className="text-rose-500 font-bold">-{linkParams.hardwareLossDb + linkParams.miscLossDb} dB</span>
                        </div>
                        <div className="flex justify-between items-center font-bold px-4 py-4 bg-blue-600 rounded-2xl text-white shadow-xl overflow-hidden relative">
                          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 animate-pulse" />
                          <span className="text-xs uppercase tracking-tight">Max Allowable Path Loss</span>
                          <span className="text-lg tracking-tighter">{results.maxAllowablePathLossDb.toFixed(1)} dB</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl">
                      <div className="flex justify-between items-center mb-4">
                         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 3: Distance Solution</h4>
                         <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[8px] font-black uppercase">{selectedModel}</span>
                      </div>
                      
                      {selectedModel === 'OKUMURA_HATA' && (
                        <div className="text-[10px] font-mono text-slate-500 leading-relaxed overflow-x-auto whitespace-nowrap scrollbar-none opacity-80 mb-6">
                          {params.citySize === 'LARGE' ? (
                            params.frequencyMHz <= 300 ? (
                              `L = 69.55 + 26.16 log(f) - 13.82 log(hb) - [8.29 (log(1.54 hm))² - 1.1] + [44.9 - 6.55 log(hb)] log(d)`
                            ) : (
                              `L = 69.55 + 26.16 log(f) - 13.82 log(hb) - [3.2 (log(11.75 hm))² - 4.97] + [44.9 - 6.55 log(hb)] log(d)`
                            )
                          ) : (
                            `L = 69.55 + 26.16 log(f) - 13.82 log(hb) - [(1.1 log f - 0.7) hm - (1.56 log f - 0.8)] + [44.9 - 6.55 log(hb)] log(d)`
                          )}
                        </div>
                      )}

                      {(selectedModel === 'LOG_DISTANCE' || selectedModel === 'LOG_NORMAL') && (
                         <div className="text-[10px] font-mono text-slate-500 leading-relaxed overflow-x-auto whitespace-nowrap scrollbar-none opacity-80 mb-6">
                            L = L(d0) + 10n log(d/d0) {selectedModel === 'LOG_NORMAL' ? '+ Xσ' : ''} (d0 = 1km)
                         </div>
                      )}

                      {selectedModel === 'FSPL' && (
                         <div className="text-[10px] font-mono text-slate-500 leading-relaxed overflow-x-auto whitespace-nowrap scrollbar-none opacity-80 mb-6">
                            L = 32.44 + 20 log(d) + 20 log(f)
                         </div>
                      )}
                      <div className="flex flex-col gap-1 items-center justify-center py-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest opacity-70">Coverage Radius (d)</div>
                        <div className="text-4xl font-black text-white tracking-widest">{results.coverageDistanceKm.toFixed(2)}<span className="text-lg text-slate-500 ml-1">km</span></div>
                      </div>
                    </div>
                  </div>
               </div>

               {/* Result Breakdown Card */}
               <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-white/10 pb-4 flex items-center gap-2">
                       <Navigation size={14} className="text-indigo-400" />
                       Coverage Analysis Result
                    </h3>
                    
                    <div className="space-y-8">
                       <div>
                         <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Calculated Coverage Distance</div>
                         <div className="flex items-baseline gap-2">
                           <span className="text-5xl font-black text-white">{results.coverageDistanceKm.toFixed(2)}</span>
                           <span className="text-xl font-bold text-indigo-400">km</span>
                         </div>
                         <p className="text-[10px] text-slate-400 mt-2 italic">Based on {selectedModel.replace('_', ' ')} path loss analysis</p>
                       </div>

                       <div className="grid grid-cols-2 gap-6">
                         <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                           <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Cell Area</div>
                           <div className="text-xl font-black">{results.cellAreaKm2.toFixed(1)} km²</div>
                         </div>
                         <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                           <div className="text-[9px] font-black text-slate-500 uppercase mb-1">Base Stations</div>
                           <div className="text-xl font-black text-emerald-400">{results.numCellsRequired} Units</div>
                         </div>
                       </div>
                    </div>
                  </div>
                  
                  <div className="mt-10 p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
                     <div className="flex items-center gap-2 mb-3">
                        <Info size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Network Geometry</span>
                     </div>
                     <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        Deployment of <span className="text-white font-bold">{results.numCellsRequired} cells</span> is required to cover the target <span className="text-white font-bold">{linkParams.totalAreaKm2} km²</span> area, assuming hexagonal lattice packing and full link visibility.
                     </p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Box size={20} />
                    </div>
                    <h4 className="text-sm font-black text-slate-900">Cell Coverage Geometry</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Cell Radius (d)</div>
                        <div className="text-xl font-black text-slate-800">{results.coverageDistanceKm.toFixed(2)} km</div>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Single Cell Area</div>
                        <div className="text-xl font-black text-slate-800">{results.cellAreaKm2.toFixed(2)} km²</div>
                     </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-6 leading-relaxed">
                    Based on the {selectedModel} model at {params.frequencyMHz} MHz. {results.numCellsRequired} base stations will provide continuous coverage for the specified {linkParams.totalAreaKm2} km² region.
                  </p>
               </div>
               
               <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <h4 className="text-sm font-black text-emerald-900 mb-2">Network Economics Summary</h4>
                      <p className="text-xs text-emerald-700/80 leading-relaxed max-w-xs">
                        Deployment of a scalable network infrastructure requires balancing path loss allowance with hardware costs.
                      </p>
                    </div>
                    <div className="flex items-end justify-between mt-10">
                      <div>
                        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Estimated Budget</div>
                        <div className="text-4xl font-black text-emerald-950">${(results.totalCost / 1e6).toFixed(2)}M</div>
                      </div>
                      <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/30">
                        Active Simulation
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const ResultCard = ({ label, value, sub, icon, color = "indigo" }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6 group hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
    <div className="flex items-center justify-between">
      <div className={`p-3 bg-${color}-50 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <div className="w-8 h-1 bg-slate-100 rounded-full group-hover:bg-indigo-100 transition-colors" />
    </div>
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{label}</div>
      <div className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{sub}</div>
    </div>
  </div>
);
