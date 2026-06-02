import React, { useState, useEffect } from 'react';
import { NetworkUser } from '../network-types';
import { ModulationMode, ChannelType, MODULATION_SPECS, calculateBER, getModulationColor, ModulationScheme } from '../modulation-types';
import { Activity, Radio, BarChart3, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie } from 'recharts';

interface ModulationDashboardProps {
  users: NetworkUser[];
  onClose: () => void;
  selectedScheme: ModulationMode;
  setSelectedScheme: (s: ModulationMode) => void;
  selectedChannel: ChannelType;
  setSelectedChannel: (c: ChannelType) => void;
}

export const ConstellationDiagram = ({ scheme, snrDb, channelType }: { scheme: ModulationScheme, snrDb: number, channelType: ChannelType }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;
    const animate = (time: number) => {
      if (time - lastTime > 100) { // 10fps limit for performance
        setTick(t => t + 1);
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const points: any[] = [];
  const M = scheme === 'BPSK' ? 2 : scheme === 'QPSK' ? 4 : scheme === '8-PSK' ? 8 : scheme === '16-PSK' ? 16 : scheme === '16-QAM' ? 16 : scheme === '64-QAM' ? 64 : 256;
  
  const snrLinear = Math.pow(10, snrDb / 10);
  const noiseStd = Math.sqrt(1 / (2 * snrLinear));
  
  if (scheme.includes('PSK')) {
    for (let i = 0; i < M; i++) {
      const angle = (2 * Math.PI * i) / M + (scheme === 'QPSK' ? Math.PI/4 : 0);
      const idealX = Math.cos(angle);
      const idealY = Math.sin(angle);
      
      for (let s = 0; s < 5; s++) { // Reduced to 5 samples for 256QAM performance
        let fadeMod = 1;
        if (channelType === 'RAYLEIGH') {
          fadeMod = Math.max(0.1, Math.random() * 2);
        } else if (channelType === 'RICIAN') {
          fadeMod = Math.max(0.5, Math.random() * 1.5);
        }
        
        points.push({
          x: (idealX * fadeMod) + (Math.random() - 0.5) * noiseStd * 2,
          y: (idealY * fadeMod) + (Math.random() - 0.5) * noiseStd * 2,
          type: 'received',
          color: getModulationColor(scheme)
        });
      }
      points.push({ x: idealX, y: idealY, type: 'ideal', color: '#1e293b' }); // dark slate
    }
  } else {
    // QAM
    const size = Math.sqrt(M);
    const step = 2 / (size - 1);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idealX = -1 + i * step;
        const idealY = -1 + j * step;
        
        for (let s = 0; s < (size > 8 ? 2 : 5); s++) { // Fewer scatter points for 256-QAM to keep it performant
          let fadeMod = 1;
          if (channelType === 'RAYLEIGH') fadeMod = Math.max(0.1, Math.random() * 2);
          else if (channelType === 'RICIAN') fadeMod = Math.max(0.5, Math.random() * 1.5);

          points.push({
            x: (idealX * fadeMod) + (Math.random() - 0.5) * noiseStd * 2,
            y: (idealY * fadeMod) + (Math.random() - 0.5) * noiseStd * 2,
            type: 'received',
            color: getModulationColor(scheme)
          });
        }
        points.push({ x: idealX, y: idealY, type: 'ideal', color: '#1e293b' });
      }
    }
  }

  return (
    <div className="w-full h-80 bg-slate-50 border border-slate-200 rounded-xl mt-4 p-2 relative">
      <h3 className="absolute top-2 left-4 text-xs font-bold text-slate-500 uppercase tracking-widest z-10">Constellation</h3>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="I" domain={[-1.5, 1.5]} tick={false} />
          <YAxis type="number" dataKey="y" name="Q" domain={[-1.5, 1.5]} tick={false} />
          <ZAxis type="number" range={[20, 20]} />
          <Scatter name="Received" data={points.filter(p => p.type === 'received')} fill={getModulationColor(scheme)} animationDuration={0} isAnimationActive={false} />
          <Scatter name="Ideal" data={points.filter(p => p.type === 'ideal')} fill="#1e293b" shape="cross" isAnimationActive={false} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ModulationDashboard = ({ users, onClose, selectedScheme, setSelectedScheme, selectedChannel, setSelectedChannel }: ModulationDashboardProps) => {
  const [showInfo, setShowInfo] = useState(false);
  
  // BER Controls
  const [snrMin, setSnrMin] = useState(0);
  const [snrMax, setSnrMax] = useState(30);
  const [snrStep, setSnrStep] = useState(1);
  const [activeCurves, setActiveCurves] = useState<Record<string, boolean>>({
    'BPSK': true, 'QPSK': true, '8-PSK': true, '16-PSK': false, '16-QAM': true, '64-QAM': true, '256-QAM': true
  });

  // Active callers
  const activeUsers = users.filter(u => u.state === 'CALLING');
  
  // Calculate average stats
  const avgSinr = activeUsers.length > 0 ? activeUsers.reduce((sum, u) => sum + (u.sinrDb || 0), 0) / activeUsers.length : 15;
  const targetScheme = selectedScheme === 'ADAPTIVE' ? (activeUsers.length > 0 ? activeUsers[0].modulation || 'QPSK' : 'QPSK') : selectedScheme;
  
  const estimatedBer = calculateBER(targetScheme, avgSinr, selectedChannel);
  
  // Stats
  const avgThroughput = activeUsers.reduce((sum, u) => sum + (u.throughput || 0), 0) / (activeUsers.length || 1);
  const avgSpecEff = activeUsers.reduce((sum, u) => sum + (u.modulation ? MODULATION_SPECS[u.modulation].spectralEfficiency : 0), 0) / (activeUsers.length || 1);
  
  const modCounts: Record<string, number> = {};
  activeUsers.forEach(u => {
    if (u.modulation) modCounts[u.modulation] = (modCounts[u.modulation] || 0) + 1;
  });
  const mostCommon = Object.keys(modCounts).sort((a, b) => modCounts[b] - modCounts[a])[0] || '-';
  const outageProb = activeUsers.length > 0 ? activeUsers.filter(u => u.sinrDb < 5).length / activeUsers.length : 0;

  // Pie Chart Data
  const ALL_SCHEMES = ['BPSK', 'QPSK', '8-PSK', '16-PSK', '16-QAM', '64-QAM', '256-QAM'];
  
  const distributionData = ALL_SCHEMES.map(scheme => ({
    name: scheme,
    value: modCounts[scheme] || 0,
    color: getModulationColor(scheme as ModulationScheme)
  })).filter(d => d.value > 0);

  // BER Graph Data
  const berData = [];
  for (let s = snrMin; s <= snrMax; s += Math.max(0.5, snrStep)) {
    const pt: any = { snr: s };
    ALL_SCHEMES.forEach(sch => {
      pt[sch] = calculateBER(sch as ModulationScheme, s, selectedChannel);
    });
    berData.push(pt);
  }

  // Distance Data
  const centerUsers = activeUsers.filter(u => Math.sqrt(Math.pow(u.position.x, 2) + Math.pow(u.position.z, 2)) < 80);
  const midUsers = activeUsers.filter(u => { const d = Math.sqrt(Math.pow(u.position.x, 2) + Math.pow(u.position.z, 2)); return d >= 80 && d < 180; });
  const edgeUsers = activeUsers.filter(u => Math.sqrt(Math.pow(u.position.x, 2) + Math.pow(u.position.z, 2)) >= 180);

  const distData = activeUsers.map(u => ({
    dist: Number(Math.sqrt(Math.pow(u.position.x, 2) + Math.pow(u.position.z, 2)).toFixed(1)),
    throughput: u.throughput,
    modulation: u.modulation
  })).slice(0, 100);

  return (
    <div className="absolute inset-0 bg-white z-30 flex flex-col pt-6 font-sans overflow-hidden border-l border-slate-200 shadow-xl max-w-2xl right-0 ml-auto">
      <div className="px-6 flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Modulation</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time PHY Layer Analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowInfo(!showInfo)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showInfo ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
             {showInfo ? 'Hide Theory' : 'Show Theory'}
          </button>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg">
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 scrollbar-thin">
        {showInfo && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
            <h3 className="font-bold text-blue-900 mb-2">Educational Reference</h3>
            <ul className="text-xs text-blue-800 space-y-2 list-disc pl-4 mb-4">
              <li><b>ASK / FSK / PSK:</b> Amplitude, Frequency, and Phase Shift Keying. Variations in the carrier wave.</li>
              <li><b>QAM:</b> Quadrature Amplitude Modulation combines amplitude and phase variations.</li>
              <li><b>BER / SER:</b> Bit Error Rate and Symbol Error Rate. Lower is better.</li>
              <li><b>Eb/N0:</b> Energy per bit to noise power spectral density ratio (normalized SNR).</li>
              <li><b>Rayleigh Fading:</b> Multipath fading with no line-of-sight (NLoS) path.</li>
              <li><b>Rician Fading:</b> Multipath fading with a strong dominant line-of-sight (LoS) path.</li>
              <li><b>Adaptive Modulation:</b> Dynamically changing modulation based on channel conditions (SINR) to maximize throughput while maintaining a target BER.</li>
              <li><b>Outage Probability:</b> The probability that the instantaneous SINR falls below the required threshold for successful decoding.</li>
            </ul>
            
            <h4 className="font-bold text-blue-900 mb-2 text-[11px] uppercase tracking-wider">Modulations</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              <div className="bg-white/50 p-2 rounded"><b>BPSK:</b> 1 bit/sym. Most Robust. Lowest Spectral Efficiency. Suitable for Cell Edge Users.</div>
              <div className="bg-white/50 p-2 rounded"><b>QPSK:</b> 2 bits/sym. Same BER as BPSK in AWGN. Twice the Spectral Efficiency.</div>
              <div className="bg-white/50 p-2 rounded"><b>16-QAM:</b> 4 bits/sym. High Spectral Efficiency. Requires Higher SNR.</div>
              <div className="bg-white/50 p-2 rounded"><b>64-QAM:</b> 6 bits/sym. Very High Throughput. Used Near Base Stations.</div>
              <div className="bg-white/50 p-2 rounded col-span-2"><b>256-QAM:</b> 8 bits/sym. Extremely High Throughput. Requires excellent channel quality.</div>
            </div>
          </div>
        )}

        {/* Dashboard Summary Panel */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl mb-6 grid grid-cols-3 gap-y-4 gap-x-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg BER</span>
            <span className="text-xl font-black">{estimatedBer.toExponential(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Throughput</span>
            <span className="text-xl font-black text-emerald-400">{avgThroughput.toFixed(1)} <span className="text-xs">Mbps</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Spec. Efficiency</span>
            <span className="text-xl font-black text-blue-400">{avgSpecEff.toFixed(1)} <span className="text-xs">b/s/Hz</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg SINR</span>
            <span className="text-lg font-bold">{avgSinr.toFixed(1)} dB</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Outage Prob</span>
            <span className="text-lg font-bold text-rose-400">{(outageProb * 100).toFixed(1)}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Most Used</span>
            <span className="text-lg font-bold text-amber-400">{mostCommon}</span>
          </div>
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Channel Type</span>
            <div className="flex flex-col gap-2">
              <select 
                title="Select Channel Type"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value as ChannelType)}
                className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="AWGN">AWGN (No fading)</option>
                <option value="RAYLEIGH">Rayleigh Flat Fading</option>
                <option value="RICIAN">Rician Flat Fading</option>
              </select>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Modulation Selection</span>
            <select 
              title="Select Modulation"
              value={selectedScheme}
              onChange={(e) => setSelectedScheme(e.target.value as ModulationMode)}
              className="w-full bg-white border border-slate-200 text-sm font-bold text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            >
              <option value="ADAPTIVE">Adaptive (SINR Based)</option>
              {ALL_SCHEMES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            
            {selectedScheme !== 'ADAPTIVE' && (
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-[10px] text-slate-500 font-mono">
                <span>{MODULATION_SPECS[selectedScheme as ModulationScheme].bitsPerSymbol} b/s/Hz</span>
                <span>Req: {MODULATION_SPECS[selectedScheme as ModulationScheme].requiredSnr} dB</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Box targeted at active state */}
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-6 flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">Active Diagram Focus</p>
            <p className="text-indigo-900 font-bold">{targetScheme} / {selectedChannel} / SINR: {avgSinr.toFixed(1)} dB</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest">Bits / Symbol</p>
            <p className="text-indigo-900 font-bold">{MODULATION_SPECS[targetScheme].bitsPerSymbol}</p>
          </div>
        </div>

        <ConstellationDiagram scheme={targetScheme} snrDb={avgSinr} channelType={selectedChannel} />

        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 text-center">Modulation Distribution</h3>
              <div className="h-48">
                {distributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number, name: string) => [`${value} Users`, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{fontSize: '10px'}} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-slate-400 font-bold">No Active Users</div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cell-Edge Analysis</h3>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-emerald-600 block">Cell Center (Close)</span>
                <div className="flex justify-between text-xs text-slate-700">
                  <span>Thr: {centerUsers.length ? (centerUsers.reduce((s, u) => s+u.throughput, 0)/centerUsers.length).toFixed(1) : 0} Mbps</span>
                  <span>Avg BER: {centerUsers.length ? (centerUsers.reduce((s, u) => s+u.ber, 0)/centerUsers.length).toExponential(1) : '0'}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-amber-600 block">Mid Cell</span>
                <div className="flex justify-between text-xs text-slate-700">
                  <span>Thr: {midUsers.length ? (midUsers.reduce((s, u) => s+u.throughput, 0)/midUsers.length).toFixed(1) : 0} Mbps</span>
                  <span>Avg BER: {midUsers.length ? (midUsers.reduce((s, u) => s+u.ber, 0)/midUsers.length).toExponential(1) : '0'}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-rose-600 block">Cell Edge (Far)</span>
                <div className="flex justify-between text-xs text-slate-700">
                  <span>Thr: {edgeUsers.length ? (edgeUsers.reduce((s, u) => s+u.throughput, 0)/edgeUsers.length).toFixed(1) : 0} Mbps</span>
                  <span>Avg BER: {edgeUsers.length ? (edgeUsers.reduce((s, u) => s+u.ber, 0)/edgeUsers.length).toExponential(1) : '0'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">BER vs Eb/N0</h3>
            <div className="flex gap-2 mb-4">
              <input type="number" value={snrMin} onChange={e=>setSnrMin(Number(e.target.value))} className="w-16 text-xs p-1 border rounded" title="Min SNR" />
              <input type="number" value={snrMax} onChange={e=>setSnrMax(Number(e.target.value))} className="w-16 text-xs p-1 border rounded" title="Max SNR" />
              <input type="number" value={snrStep} onChange={e=>setSnrStep(Number(e.target.value))} className="w-16 text-xs p-1 border rounded" title="Step" />
              <div className="flex gap-1 flex-wrap items-center ml-4">
                {ALL_SCHEMES.map(s => (
                  <label key={s} className="text-[9px] font-bold flex items-center gap-1 cursor-pointer" style={{color: getModulationColor(s as ModulationScheme)}}>
                    <input type="checkbox" checked={activeCurves[s]} onChange={() => setActiveCurves(prev => ({...prev, [s]: !prev[s]}))} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={berData} margin={{ top: 5, right: 30, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="snr" type="number" domain={[snrMin, snrMax]} tick={{fontSize: 10}} name="Eb/N0 (dB)" label={{ value: 'Eb/N0 (dB)', position: 'bottom', offset: 0, fontSize: 10 }} />
                  <YAxis scale="log" domain={['auto', 'auto']} tick={{fontSize: 10}} tickFormatter={v => v.toExponential(1)} label={{ value: 'BER', angle: -90, position: 'left', offset: 0, fontSize: 10 }} />
                  <RechartsTooltip formatter={(val: number) => val.toExponential(2)} />
                  {ALL_SCHEMES.map(s => activeCurves[s] && (
                    <Line key={s} type="monotone" dataKey={s} stroke={getModulationColor(s as ModulationScheme)} strokeWidth={2} dot={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Throughput vs Distance</h3>
            <p className="text-[10px] text-slate-400 mb-4">Shows throughput degradation as users move toward the cell edge.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 5, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dist" type="number" name="Distance" unit="m" tick={{fontSize: 10}} label={{ value: 'Distance from Source (m)', position: 'bottom', offset: 0, fontSize: 10 }} />
                  <YAxis dataKey="throughput" type="number" name="Throughput" unit=" Mbps" tick={{fontSize: 10}} label={{ value: 'Throughput (Mbps)', angle: -90, position: 'left', offset: 0, fontSize: 10 }} />
                  <RechartsTooltip cursor={{strokeDasharray: '3 3'}} content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-slate-200 shadow rounded text-xs">
                          <p><b>Distance:</b> {data.dist}m</p>
                          <p><b>Throughput:</b> {data.throughput.toFixed(2)} Mbps</p>
                          <p><b>Modulation:</b> <span style={{color: getModulationColor(data.modulation as ModulationScheme)}}>{data.modulation}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}/>
                  {ALL_SCHEMES.map(s => (
                    <Scatter key={s} name={s} data={distData.filter(d => d.modulation === s)} fill={getModulationColor(s as ModulationScheme)} isAnimationActive={false} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
