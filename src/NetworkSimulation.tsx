/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Float, 
  Text, 
  Html, 
  Sphere, 
  Cylinder,
  Box,
  Plane,
  useCursor,
  Line,
  Trail
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity,
  Users,
  Phone,
  PhoneOff,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Radio,
  Settings2,
  Layers,
  Info,
  RefreshCw,
  TrendingUp,
  BarChart3,
  History,
  Map as MapIcon,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { 
  NetworkUser, 
  NetworkCell, 
  NetworkMetrics, 
  ScenarioType, 
  SCENARIOS, 
  calculateErlangB 
} from './network-types';
import { getAdaptiveModulation, getModulationColor, MODULATION_SPECS, calculateBER } from './modulation-types';
import { ModulationDashboard } from './modulation/ModulationComponents';
import { ModulationMode, ChannelType } from './modulation-types';

// --- Constants ---
const CELL_RADIUS = 20;
const SQRT3 = Math.sqrt(3);
const MAX_USERS = 100;
const GRID_RANGE = 4;

// --- Math Helpers ---
const axialToPixel = (q: number, r: number, radius: number) => {
  const x = radius * (3/2 * q);
  const y = radius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return { x, y };
};

// --- 3D Components ---

const UserIcon = ({ user, showModulation }: { user: NetworkUser, showModulation: boolean }) => {
  let color = user.state === 'CALLING' ? '#10b981' : (user.state === 'BLOCKED' ? '#f59e0b' : (user.state === 'DROPPED' ? '#ef4444' : '#94a3b8'));
  
  if (showModulation && user.state === 'CALLING' && user.modulation) {
    color = getModulationColor(user.modulation);
  }

  return (
    <group position={[user.position.x, 0.5, user.position.z]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <Sphere args={[0.4, 16, 16]}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={user.state === 'CALLING' ? 1 : 0} />
        </Sphere>
        {user.state === 'CALLING' && (
          <group position={[0, 1, 0]}>
            <Cylinder args={[0.05, 0.05, 0.5]} rotation={[Math.PI/2, 0, 0]}>
              <meshBasicMaterial color={color} />
            </Cylinder>
          </group>
        )}
      </Float>
      
      {/* Label for active calls */}
      {user.state === 'CALLING' && (
        <Html position={[0, 2, 0]} center zIndexRange={[100, 0]}>
          <div className="flex flex-col items-center pointer-events-none">
            <div className="px-1.5 py-0.5 text-white text-[8px] font-black rounded shadow-lg whitespace-nowrap" style={{ backgroundColor: color }}>
              {showModulation && user.modulation ? `User ${user.id.slice(0, 4)}: ${user.modulation}` : 'ON CALL'}
            </div>
            {showModulation && user.throughput > 0 && (
              <div className="px-1 py-0.5 mt-0.5 bg-slate-900/80 text-white text-[7px] font-mono rounded shadow">
                {user.throughput.toFixed(1)} Mbps
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

const BaseStation = ({ cell, onClick }: { cell: NetworkCell, onClick: () => void }) => {
  const { x, y } = axialToPixel(cell.q, cell.r, CELL_RADIUS);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const loadColor = cell.isFailed ? '#ef4444' : (cell.load > 0.8 ? '#ef4444' : (cell.load > 0.5 ? '#f59e0b' : '#10b981'));
  
  return (
    <group position={[x, 0, y]} onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      {/* Hex Cell Base */}
      <Cylinder args={[CELL_RADIUS * 0.95, CELL_RADIUS * 0.95, 0.2, 6]} position={[0, 0.1, 0]}>
        <meshStandardMaterial 
          color={loadColor} 
          transparent 
          opacity={0.15} 
          metalness={0.2}
          roughness={0.8}
        />
      </Cylinder>

      {/* Tower */}
      <group position={[0, 0, 0]}>
        <Cylinder args={[0.1, 0.3, 8, 4]} position={[0, 4, 0]}>
          <meshStandardMaterial color={cell.isFailed ? "#ef4444" : "#475569"} wireframe={cell.isFailed} />
        </Cylinder>
        
        {/* Antennas */}
        <group position={[0, 7.5, 0]}>
          {[0, 120, 240].map((angle) => (
            <Box key={angle} args={[0.2, 1.5, 0.5]} position={[0.4 * Math.cos(angle * Math.PI / 180), 0, 0.4 * Math.sin(angle * Math.PI / 180)]} rotation={[0, -angle * Math.PI / 180, 0]}>
              <meshStandardMaterial color={loadColor} emissive={loadColor} emissiveIntensity={cell.load > 0.5 ? 1 : 0} />
            </Box>
          ))}
        </group>

        {cell.isFailed && (
          <Html position={[0, 10, 0]} center>
            <div className="flex items-center gap-1 px-2 py-1 bg-rose-600 text-white text-[10px] font-black rounded-full shadow-xl animate-bounce">
              <ShieldAlert size={12} />
              FAILURE
            </div>
          </Html>
        )}
      </group>

      {/* Load Indicator */}
      <Html position={[0, 2, 0]} center distanceFactor={30}>
        <div className={`px-2 py-1 rounded-lg border backdrop-blur-md transition-all ${
          hovered ? 'scale-110 shadow-lg' : 'scale-100'
        } bg-white/90 border-slate-200`}>
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Load</span>
            <span className={`text-xs font-black ${cell.load > 0.8 ? 'text-rose-600' : 'text-slate-900'}`}>
              {(cell.load * 100).toFixed(0)}%
            </span>
            <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${cell.load * 100}%`, backgroundColor: loadColor }} />
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};

// --- Dashboard Components ---

const MetricCard = ({ label, value, unit, icon: Icon, color }: any) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
        <Icon size={18} className={color.replace('bg-', 'text-')} />
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black text-slate-900">{value}</span>
      <span className="text-xs font-bold text-slate-400">{unit}</span>
    </div>
  </div>
);

// --- Main Simulation Component ---

export default function NetworkSimulation({ initialShowModulation = false }: { initialShowModulation?: boolean } = {}) {
  const [scenario, setScenario] = useState<ScenarioType>('URBAN');
  const [cells, setCells] = useState<NetworkCell[]>([]);
  const [users, setUsers] = useState<NetworkUser[]>([]);
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    totalUsers: 0,
    activeCalls: 0,
    droppedCalls: 0,
    blockedCalls: 0,
    blockingProbability: 0,
    utilization: 0,
    avgThroughput: 0
  });
  const [handoverStats, setHandoverStats] = useState({ success: 0, failed: 0 });
  const [eventLogs, setEventLogs] = useState<{ id: string, msg: string, type: 'info' | 'warn' | 'error', time: string }[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isChannelBorrowingEnabled, setIsChannelBorrowingEnabled] = useState(false);
  const [showModulation, setShowModulation] = useState(initialShowModulation);
  const [selectedScheme, setSelectedScheme] = useState<ModulationMode>('ADAPTIVE');
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('AWGN');
  const [simulationTime, setSimulationTime] = useState(0);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  
  const addLog = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventLogs(prev => [{ id: Math.random().toString(36).substr(2, 9), msg, type, time }, ...prev].slice(0, 50));
  };

  // Initialize Grid
  useEffect(() => {
    const newCells: NetworkCell[] = [];
    for (let q = -GRID_RANGE; q <= GRID_RANGE; q++) {
      for (let r = -GRID_RANGE; r <= GRID_RANGE; r++) {
        if (Math.abs(q + r) <= GRID_RANGE) {
          newCells.push({
            id: `BS-${q}-${r}`,
            q, r,
            capacity: 20, // channels
            activeUsers: 0,
            blockedCalls: 0,
            droppedCalls: 0,
            handovers: 0,
            load: 0,
            isFailed: false
          });
        }
      }
    }
    setCells(newCells);

    // Initial Users
    const initialUsers: NetworkUser[] = Array.from({ length: MAX_USERS }).map((_, i) => ({
      id: `User-${i}`,
      position: { 
        x: (Math.random() - 0.5) * 200, 
        z: (Math.random() - 0.5) * 200 
      },
      velocity: { 
        x: (Math.random() - 0.5) * 0.5, 
        z: (Math.random() - 0.5) * 0.5 
      },
      state: 'IDLE',
      servingCellId: null,
      callDuration: 0,
      signalStrength: -100,
      sinrDb: 10,
      modulation: 'QPSK',
      throughput: 0,
      path: []
    }));
    setUsers(initialUsers);
  }, []);

  // Simulation Loop
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSimulationTime(prev => prev + 1);
      
      setUsers(prevUsers => {
        const currentScenario = SCENARIOS[scenario];
        let activeCallsCount = 0;
        let droppedCount = 0;
        let blockedCount = 0;

        const updatedUsers = prevUsers.map(user => {
          // 1. Mobility
          const newX = user.position.x + user.velocity.x;
          const newZ = user.position.z + user.velocity.z;
          
          // Bounce off boundaries
          let vx = user.velocity.x;
          let vz = user.velocity.z;
          if (Math.abs(newX) > 200) vx *= -1;
          if (Math.abs(newZ) > 200) vz *= -1;

          // 2. Find Nearest Cell & Signal Strength
          let bestCellId = null;
          let maxStrength = -150;
          
          cells.forEach(cell => {
            if (cell.isFailed) return;
            const { x, y } = axialToPixel(cell.q, cell.r, CELL_RADIUS);
            const dist = Math.sqrt((newX - x) ** 2 + (newZ - y) ** 2);
            const strength = -40 - 20 * Math.log10(dist + 1); // simple path loss
            if (strength > maxStrength) {
              maxStrength = strength;
              bestCellId = cell.id;
            }
          });

          // 3. Handover Logic (Hysteresis)
          let servingId = user.servingCellId;
          const HYSTERESIS = 3; // dB
          if (bestCellId && bestCellId !== servingId) {
            if (!servingId || maxStrength > user.signalStrength + HYSTERESIS) {
              if (servingId && user.state === 'CALLING') {
                setHandoverStats(s => ({ ...s, success: s.success + 1 }));
                addLog(`Handover: ${user.id} → ${bestCellId}`, 'info');
              }
              servingId = bestCellId;
            }
          }

          // 4. Call State Machine
          let state = user.state;
          let duration = user.callDuration;
          
          let sinrCalc = maxStrength + 95; // Rough SINR conversion for visual dynamic
          let modScheme = selectedScheme === 'ADAPTIVE' ? getAdaptiveModulation(sinrCalc) : (selectedScheme as import('./modulation-types').ModulationScheme);
          let throughput = 0;
          let ber = 0;
          if (modScheme && MODULATION_SPECS[modScheme]) {
            throughput = MODULATION_SPECS[modScheme].spectralEfficiency * 2.5;
            ber = calculateBER(modScheme, sinrCalc, selectedChannel);
          }

          if (state === 'CALLING') {
            duration -= 1;
            if (duration <= 0) {
              state = 'IDLE';
              servingId = null;
            } else if (!servingId) {
              // Call dropped due to no coverage or BS failure
              state = 'DROPPED';
              droppedCount++;
              addLog(`Call Dropped: ${user.id} (No Coverage)`, 'error');
              duration = 0;
            }
          } else {
            // Poisson Arrival
            if (Math.random() < currentScenario.trafficIntensity / 10) {
              // Try to initiate call
              const targetCell = cells.find(c => c.id === servingId);
              if (targetCell) {
                let hasCapacity = targetCell.activeUsers < targetCell.capacity;
                let borrowed = false;
                
                // Channel Borrowing Logic
                if (!hasCapacity && isChannelBorrowingEnabled) {
                  // Check neighbors for spare capacity
                  const neighbors = cells.filter(c => 
                    Math.abs(c.q - targetCell.q) <= 1 && 
                    Math.abs(c.r - targetCell.r) <= 1 && 
                    c.id !== targetCell.id &&
                    !c.isFailed &&
                    c.activeUsers < c.capacity * 0.5 // only borrow if neighbor is < 50% load
                  );
                  if (neighbors.length > 0) {
                    hasCapacity = true;
                    borrowed = true;
                  }
                }

                if (hasCapacity) {
                  state = 'CALLING';
                  duration = Math.floor(Math.random() * currentScenario.avgCallDuration) + 30;
                  if (borrowed) addLog(`Borrowed Channel: ${targetCell.id} from neighbor`, 'info');
                } else {
                  state = 'BLOCKED';
                  blockedCount++;
                  addLog(`Call Blocked: ${targetCell.id} (Capacity Exceeded)`, 'warn');
                }
              }
            } else if (state === 'BLOCKED' || state === 'DROPPED') {
              // Reset after some time
              if (Math.random() < 0.1) state = 'IDLE';
            }
          }

          if (state === 'CALLING') activeCallsCount++;

          return {
            ...user,
            position: { x: newX, z: newZ },
            velocity: { x: vx, z: vz },
            state,
            servingCellId: servingId,
            callDuration: duration,
            signalStrength: maxStrength,
            sinrDb: sinrCalc,
            modulation: modScheme,
            throughput: throughput,
            ber: ber,
            path: user.path
          };
        });

        // Update Metrics
        setMetrics(m => ({
          ...m,
          totalUsers: updatedUsers.length,
          activeCalls: activeCallsCount,
          droppedCalls: m.droppedCalls + droppedCount,
          blockedCalls: m.blockedCalls + blockedCount,
          blockingProbability: blockedCount / (blockedCount + activeCallsCount + 0.001),
          utilization: activeCallsCount / (cells.length * 20)
        }));

        return updatedUsers;
      });

      // Update Cell Loads
      setCells(prevCells => prevCells.map(cell => {
        const activeInCell = users.filter(u => u.servingCellId === cell.id && u.state === 'CALLING').length;
        return {
          ...cell,
          activeUsers: activeInCell,
          load: activeInCell / cell.capacity
        };
      }));

    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, scenario, cells, users]);

  const handleBSFailure = () => {
    if (!selectedCellId) return;
    const cell = cells.find(c => c.id === selectedCellId);
    const newState = !cell?.isFailed;
    setCells(prev => prev.map(c => c.id === selectedCellId ? { ...c, isFailed: newState } : c));
    addLog(`Base Station ${selectedCellId} ${newState ? 'FAILED' : 'RECOVERED'}`, newState ? 'error' : 'info');
  };

  const handleSurge = () => {
    addLog('Traffic Surge Event Triggered', 'warn');
    // Suddenly add 50 users in calling state or high traffic intensity
    setScenario(prev => prev); // trigger update
    // For simplicity, just set all idle users to try to call
    setUsers(prev => prev.map(u => u.state === 'IDLE' ? { ...u, state: 'CALLING', callDuration: 100 } : u));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Top Header / Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6 bg-white border-b border-slate-200 shadow-sm z-20">
        <MetricCard label="Total Users" value={metrics.totalUsers} unit="UEs" icon={Users} color="bg-blue-500" />
        <MetricCard label="Active Calls" value={metrics.activeCalls} unit="Sessions" icon={Phone} color="bg-emerald-500" />
        <MetricCard label="Dropped" value={metrics.droppedCalls} unit="Calls" icon={PhoneOff} color="bg-rose-500" />
        <MetricCard label="Blocking" value={(metrics.blockingProbability * 100).toFixed(1)} unit="%" icon={AlertTriangle} color="bg-amber-500" />
        <MetricCard label="Utilization" value={(metrics.utilization * 100).toFixed(1)} unit="%" icon={TrendingUp} color="bg-indigo-500" />
        <MetricCard label="Throughput" value={(metrics.activeCalls * 2.5).toFixed(1)} unit="Mbps" icon={Zap} color="bg-purple-500" />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Controls */}
        <div className="w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto z-20 shadow-xl">
          <div className="space-y-8">
            {/* Environment section removed as requested */}

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-slate-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Resource Management</h2>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => setIsChannelBorrowingEnabled(!isChannelBorrowingEnabled)}
                  className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-all ${
                    isChannelBorrowingEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isChannelBorrowingEnabled ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Layers size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-700">Channel Borrowing</p>
                      <p className="text-[10px] text-slate-400">Dynamic resource sharing</p>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-all ${isChannelBorrowingEnabled ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isChannelBorrowingEnabled ? 'left-6' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Events & Triggers</h2>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={handleSurge}
                  className="w-full flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-2xl hover:bg-amber-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <TrendingUp size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-amber-900">Traffic Surge</p>
                      <p className="text-[10px] text-amber-600">Simulate peak hour rush</p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={handleBSFailure}
                  disabled={!selectedCellId}
                  className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-all group ${
                    selectedCellId 
                      ? 'bg-rose-50 border-rose-100 hover:bg-rose-100' 
                      : 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg text-white group-hover:scale-110 transition-transform ${selectedCellId ? 'bg-rose-500' : 'bg-slate-400'}`}>
                      <ShieldAlert size={18} />
                    </div>
                    <div className="text-left">
                      <p className={`text-xs font-black ${selectedCellId ? 'text-rose-900' : 'text-slate-500'}`}>BS Failure</p>
                      <p className="text-[10px] text-slate-400">Toggle failure for {selectedCellId || 'selected BS'}</p>
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-5 h-5 text-purple-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Advanced Modules</h2>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowModulation(true)}
                  className="w-full flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500 rounded-lg text-white group-hover:scale-110 transition-transform">
                      <Radio size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-purple-900">Modulation Analysis</p>
                      <p className="text-[10px] text-purple-600">Adaptive PHY layer viz</p>
                    </div>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Network Status</h2>
              </div>
              <div className="bg-slate-900 rounded-2xl p-4 text-white space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Sim Time</span>
                  <span className="text-xs font-mono">{Math.floor(simulationTime / 60)}m {simulationTime % 60}s</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Handovers</span>
                  <span className="text-xs font-mono text-emerald-400">{handoverStats.success}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Active Users</span>
                  <span className="text-xs font-mono">{users.filter(u => u.servingCellId).length}</span>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-slate-400" />
                <h2 className="font-bold text-slate-800 uppercase text-sm tracking-wider">Event Log</h2>
              </div>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 h-48 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                {eventLogs.length === 0 && <p className="text-[10px] text-slate-400 text-center py-8">No events recorded</p>}
                {eventLogs.map(log => (
                  <div key={log.id} className="flex gap-2 items-start">
                    <span className="text-[8px] font-mono text-slate-400 mt-0.5">{log.time}</span>
                    <p className={`text-[10px] font-medium leading-tight ${
                      log.type === 'error' ? 'text-rose-600' : (log.type === 'warn' ? 'text-amber-600' : 'text-slate-600')
                    }`}>
                      {log.msg}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-3 ${
                isPaused ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isPaused ? <CheckCircle2 size={18} /> : <RefreshCw size={18} className="animate-spin-slow" />}
              {isPaused ? 'Resume Simulation' : 'Simulation Running'}
            </button>
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative bg-slate-100">
          <Canvas shadows dpr={[1, 2]} camera={{ position: [150, 150, 150], fov: 45 }}>
            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={50} maxDistance={1000} />
            
            <Suspense fallback={null}>
              <color attach="background" args={['#f8fafc']} />
              <fog attach="fog" args={['#f8fafc', 200, 1000]} />
              
              <ambientLight intensity={0.6} />
              <pointLight position={[100, 100, 100]} intensity={1} />
              <directionalLight position={[-50, 80, -50]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />

              <gridHelper args={[1000, 50, '#cbd5e1', '#f1f5f9']} position={[0, -0.05, 0]} />
              
              {/* Cells */}
              {cells.map((cell) => (
                <BaseStation 
                  key={cell.id} 
                  cell={cell} 
                  onClick={() => setSelectedCellId(cell.id)} 
                />
              ))}

              {/* Users */}
              {users.map((user) => (
                <UserIcon key={user.id} user={user} showModulation={showModulation} />
              ))}

              {/* Handover Lines (Visual only for active calls) */}
              {users.filter(u => u.state === 'CALLING' && u.servingCellId).map(user => {
                const cell = cells.find(c => c.id === user.servingCellId);
                if (!cell) return null;
                const { x, y } = axialToPixel(cell.q, cell.r, CELL_RADIUS);
                return (
                  <Line 
                    key={`line-${user.id}`}
                    points={[[user.position.x, 0.5, user.position.z], [x, 7.5, y]] as any}
                    color="#10b981"
                    lineWidth={1}
                    transparent
                    opacity={0.3}
                  />
                );
              })}
            </Suspense>
          </Canvas>

          {showModulation && (
            <div className="absolute inset-y-0 right-0 w-[550px] pointer-events-auto">
              <ModulationDashboard 
                users={users} 
                onClose={() => setShowModulation(false)} 
                selectedScheme={selectedScheme}
                setSelectedScheme={setSelectedScheme}
                selectedChannel={selectedChannel}
                setSelectedChannel={setSelectedChannel}
              />
            </div>
          )}

          {/* Selection Overlay */}
          <AnimatePresence>
            {selectedCellId && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-slate-200 p-6 rounded-[2.5rem] shadow-2xl flex items-center gap-8 z-30"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cells.find(c => c.id === selectedCellId)?.isFailed ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Radio size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{selectedCellId}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Station Controller</p>
                  </div>
                </div>

                <div className="h-10 w-px bg-slate-200" />

                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Active Users</p>
                    <p className="text-xl font-black text-slate-900">{cells.find(c => c.id === selectedCellId)?.activeUsers}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Capacity</p>
                    <p className="text-xl font-black text-slate-900">{cells.find(c => c.id === selectedCellId)?.capacity}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${cells.find(c => c.id === selectedCellId)?.isFailed ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {cells.find(c => c.id === selectedCellId)?.isFailed ? 'FAILED' : 'ONLINE'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedCellId(null)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
                >
                  <RefreshCw size={20} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
