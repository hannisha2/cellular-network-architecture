/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { 
  Activity, 
  Users, 
  PhoneCall, 
  Clock, 
  Radio, 
  Percent, 
  TrendingUp, 
  AlertCircle, 
  Info, 
  ArrowRight,
  Zap,
  Layers,
  BarChart3,
  Gauge,
  Database,
  ShieldAlert,
  Settings2,
  Table,
  Calculator,
  BookOpen,
  History,
  LayoutGrid,
  CircleDot,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Download,
  Share2,
  Printer,
  FileText,
  Mail,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Minus,
  Trash2,
  Copy,
  Edit,
  Save,
  Check,
  X,
  Menu,
  Bell,
  User,
  LogOut,
  Settings,
  HelpCircle as Help,
  MessageSquare,
  Globe,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Tv,
  Watch,
  Camera,
  Mic,
  Speaker,
  Headphones,
  Bluetooth,
  Wifi,
  Cast,
  Battery,
  BatteryMedium,
  BatteryLow,
  BatteryFull,
  BatteryCharging,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
  HardDrive,
  Cpu,
  MousePointer2,
  Keyboard,
  Gamepad,
  Music,
  Video,
  Image,
  Map,
  Navigation,
  Compass,
  MapPin,
  Flag,
  Calendar,
  Clock as ClockIcon,
  Timer,
  AlarmClock,
  Briefcase,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Wallet,
  DollarSign,
  Euro,
  PoundSterling,
  JapaneseYen,
  Bitcoin,
  TrendingDown,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
  Activity as ActivityIcon,
  Heart,
  Star,
  Bookmark,
  Tag,
  Hash,
  AtSign,
  Link,
  Paperclip,
  Scissors,
  Pen,
  Eraser,
  Pencil,
  Brush,
  Palette,
  Droplet,
  Cloud,
  Sun as SunIcon,
  Moon as MoonIcon,
  Wind,
  Thermometer,
  Zap as ZapIcon,
  Flame,
  Snowflake,
  Umbrella,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudDrizzle,
  CloudFog,
  CloudSun,
  CloudMoon,
  CloudHail,
  Binary,
  Code,
  Terminal,
  Database as DatabaseIcon,
  Server,
  Cloud as CloudIcon,
  Cpu as CpuIcon,
  MemoryStick,
  HardDrive as HardDriveIcon,
  Disc,
  Usb,
  EthernetPort,
  Router,
  Monitor as MonitorIcon,
  Laptop as LaptopIcon,
  Tablet as TabletIcon,
  Smartphone as SmartphoneIcon,
  Watch as WatchIcon,
  Headphones as HeadphonesIcon,
  Speaker as SpeakerIcon,
  Mic as MicIcon,
  Camera as CameraIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Image as ImageIcon,
  File,
  FileText as FileTextIcon,
  FileCode,
  FileJson,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  Presentation,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderMinus,
  FolderSearch,
  FolderArchive,
  FolderLock,
  Archive,
  Inbox,
  Send,
  Mail as MailIcon,
  MessageSquare as MessageSquareIcon,
  MessageCircle,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video as VideoCall,
  Share,
  Share2 as Share2Icon,
  ExternalLink as ExternalLinkIcon,
  Link2,
  Link2Off,
  Globe as GlobeIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  List,
  Grid,
  Layout,
  Columns,
  Rows,
  Maximize,
  Minimize,
  RefreshCw as RefreshCwIcon,
  RotateCcw,
  RotateCw,
  Undo,
  Redo,
  Play,
  Pause,
  StopCircle,
  SkipBack,
  SkipForward,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Repeat,
  Shuffle,
  MicOff,
  VideoOff,
  CameraOff,
  WifiOff,
  BluetoothOff,
  SignalLow as SignalLowIcon,
  SignalMedium as SignalMediumIcon,
  SignalHigh as SignalHighIcon,
  SignalZero as SignalZeroIcon,
  BatteryLow as BatteryLowIcon,
  BatteryMedium as BatteryMediumIcon,
  BatteryFull as BatteryFullIcon,
  BatteryCharging as BatteryChargingIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Shield,
  ShieldCheck,
  ShieldAlert as ShieldAlertIcon,
  ShieldOff,
  Key,
  Fingerprint,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  User as UserIcon,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Users as UsersIcon,
  UserCircle,
  Settings as SettingsIcon,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Check as CheckIcon,
  X as XIcon,
  Plus as PlusIcon,
  Minus as MinusIcon,
  Divide,
  Equal,
  Percent as PercentIcon,
  Hash as HashIcon,
  Asterisk,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsUp,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight as ArrowRightIcon,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Move,
  Grab,
  Hand,
  Pointer,
  MousePointer,
  Touchpad,
  Navigation as NavigationIcon,
  Navigation2,
  Compass as CompassIcon,
  Map as MapIcon,
  MapPin as MapPinIcon,
  Flag as FlagIcon,
  Home,
  Building,
  Building2,
  Store,
  Factory,
  Warehouse,
  School,
  University,
  Hospital,
  Hotel,
  Church,
  Tent,
  TreeDeciduous,
  TreePine,
  Trees,
  Flower,
  Flower2,
  Leaf,
  Sprout,
  Sun as SunIcon2,
  Moon as MoonIcon2,
  Cloud as CloudIcon2,
  CloudRain as CloudRainIcon,
  CloudLightning as CloudLightningIcon,
  CloudSnow as CloudSnowIcon,
  CloudDrizzle as CloudDrizzleIcon,
  CloudFog as CloudFogIcon,
  CloudSun as CloudSunIcon,
  CloudMoon as CloudMoonIcon,
  CloudHail as CloudHailIcon,
  Wind as WindIcon,
  Thermometer as ThermometerIcon,
  Zap as ZapIcon2,
  Flame as FlameIcon,
  Snowflake as SnowflakeIcon,
  Umbrella as UmbrellaIcon,
  Droplet as DropletIcon,
  Waves,
  Mountain,
  Sunset,
  Sunrise,
  Tornado,
  Zap as ZapIcon3,
  Upload,
  FileUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TrunkingState, TrunkingMetrics, calculateErlangB, calculateErlangC, TRAFFIC_PRESETS } from './trunking-types';

interface TrunkingMetricsPanelProps {
  metrics: TrunkingMetrics;
  state: TrunkingState;
  sectoringMode?: 'omni' | '120' | '60';
}

export const TrunkingMetricsPanel: React.FC<TrunkingMetricsPanelProps> = ({ metrics, state, sectoringMode }) => {
  const formatPercent = (val: number) => (val * 100).toFixed(2) + '%';
  const formatErlang = (val: number) => val.toFixed(3) + ' Erlang';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <Activity size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Total Offered Traffic</span>
        </div>
        <div className="text-2xl font-bold text-slate-900">{formatErlang(metrics.totalOfferedTraffic)}</div>
        <div className="text-xs text-slate-400 mt-1">
          {sectoringMode && sectoringMode !== 'omni' ? (
            <span className="text-indigo-600 font-medium">
              {formatErlang(metrics.totalOfferedTraffic / (sectoringMode === '120' ? 3 : 6))} per sector
            </span>
          ) : (
            "Formula: A = U × λ × H"
          )}
        </div>
      </motion.div>

      {metrics.maxSupportableTraffic !== undefined && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <CheckCircle2 size={16} className={metrics.totalOfferedTraffic > metrics.maxSupportableTraffic ? 'text-rose-500' : 'text-emerald-500'} />
            <span className="text-xs font-semibold uppercase tracking-wider">Max Supportable Traffic</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatErlang(metrics.maxSupportableTraffic)}</div>
          <div className="text-xs text-slate-400 mt-1">
            {sectoringMode && sectoringMode !== 'omni' ? (
              <span className="text-indigo-600 font-medium">
                {formatErlang(metrics.maxSupportableTraffic / (sectoringMode === '120' ? 3 : 6))} / sector (GoS ≤ {formatPercent(state.targetGos)})
              </span>
            ) : (
              `At GoS ≤ ${formatPercent(state.targetGos)}`
            )}
          </div>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <ShieldAlert size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Blocking Probability (Erlang B)</span>
        </div>
        <div className={`text-2xl font-bold ${metrics.blockingProbB > state.targetGos ? 'text-rose-600' : 'text-emerald-600'}`}>
          {formatPercent(metrics.blockingProbB)}
        </div>
        <div className="text-[10px] text-slate-500 font-medium mt-1.5 leading-tight italic">
          {sectoringMode && sectoringMode !== 'omni' ? (
            <span className="text-indigo-600 font-medium not-italic">
              Recalculated for {sectoringMode === '120' ? 3 : 6} sectors with {Math.max(1, Math.floor(state.numChannels / (sectoringMode === '120' ? 3 : 6)))} channels/sector
            </span>
          ) : (
            "Probability that calls are blocked during congestion"
          )}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <Timer size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Delay Probability (Erlang C)</span>
        </div>
        <div className="text-2xl font-bold text-slate-900">{formatPercent(metrics.delayProbC)}</div>
        <div className="text-[10px] text-slate-500 font-medium mt-1.5 leading-tight italic">
          {sectoringMode && sectoringMode !== 'omni' ? (
            <span className="text-indigo-600 font-medium not-italic">
              Recalculated per sector with divided channels
            </span>
          ) : (
            "Probability that blocked calls are delayed"
          )}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <PhoneCall size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Carried Traffic</span>
        </div>
        <div className="text-2xl font-bold text-slate-900">{formatErlang(metrics.carriedTraffic)}</div>
        <div className="text-xs text-slate-400 mt-1">
          {sectoringMode && sectoringMode !== 'omni' ? (
            <span className="text-indigo-600 font-medium">
              {formatErlang(metrics.carriedTraffic / (sectoringMode === '120' ? 3 : 6))} per sector
            </span>
          ) : (
            "Formula: Ac = A × (1 - B)"
          )}
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-2 text-slate-500 mb-1">
          <Gauge size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider">Channel Utilization</span>
        </div>
        <div className="text-2xl font-bold text-slate-900">{formatPercent(metrics.utilization)}</div>
        <div className="text-[10px] text-slate-500 font-medium mt-1.5 leading-tight italic">
          {sectoringMode && sectoringMode !== 'omni' ? (
            <span className="text-indigo-600 font-medium not-italic">
              Sectored utilization (per trunked group)
            </span>
          ) : (
            "Efficient spectrum usage during peak load"
          )}
        </div>
      </motion.div>

      {state.mode === 'compute-channels' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 shadow-sm"
        >
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Radio size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Required Channels</span>
          </div>
          <div className="text-2xl font-bold text-indigo-900">{metrics.requiredChannels}</div>
          <div className="text-xs text-indigo-400 mt-1">
            {sectoringMode && sectoringMode !== 'omni' ? (
              <span className="text-indigo-600 font-medium">
                {Math.ceil(metrics.requiredChannels / (sectoringMode === '120' ? 3 : 6))} channels / sector
              </span>
            ) : (
              `To meet GoS ≤ ${formatPercent(state.targetGos)}`
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const BusyHourAnalysis: React.FC<{ 
  metrics: TrunkingMetrics; 
  state: TrunkingState;
  onUpdateState: (newState: Partial<TrunkingState>) => void;
}> = ({ metrics, state, onUpdateState }) => {
  const [isEditing, setIsEditing] = React.useState(false);

  const dailyProfile = React.useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return hours.map(h => {
      let traffic: number;
      
      if (state.useManualTraffic) {
        traffic = state.hourlyTraffic[h];
      } else {
        // Typical daily traffic profile with a peak between 16:00 and 18:00
        // We'll scale it so the peak matches the current offered traffic
        let factor = 0.1; // Baseline
        if (h >= 8 && h <= 11) factor = 0.7; // Morning peak
        if (h >= 16 && h <= 18) factor = 1.0; // Evening peak (Busy Hour)
        if (h > 18 && h <= 20) factor = 0.8; 
        if (h >= 12 && h <= 15) factor = 0.5; // Mid-day
        if (h >= 21 || h <= 7) factor = 0.1; // Night
        
        traffic = metrics.totalOfferedTraffic * factor;
      }
      
      const blocking = calculateErlangB(state.numChannels, traffic) * 100;
      
      return {
        hour: `${h}:00`,
        traffic: parseFloat(traffic.toFixed(2)),
        blocking: parseFloat(blocking.toFixed(2)),
        isBusyHour: h === state.busyHour,
      };
    });
  }, [metrics.totalOfferedTraffic, state.numChannels, state.useManualTraffic, state.hourlyTraffic, state.busyHour]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Simple CSV parsing: assume one value per line or comma-separated
      const values = text.split(/[\n,]/)
        .map(v => parseFloat(v.trim()))
        .filter(v => !isNaN(v))
        .slice(0, 24);
      
      if (values.length === 24) {
        onUpdateState({ 
          hourlyTraffic: values,
          useManualTraffic: true
        });
      } else {
        alert("Invalid file format. Please provide exactly 24 numerical values.");
      }
    };
    reader.readAsText(file);
  };

  const updateHourlyTraffic = (hour: number, value: string) => {
    const newVal = parseFloat(value) || 0;
    const newTraffic = [...state.hourlyTraffic];
    newTraffic[hour] = newVal;
    onUpdateState({ hourlyTraffic: newTraffic });
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-indigo-500" />
            Daily Traffic Profile & Busy Hour Analysis
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Analyze traffic variations and identify the peak load period.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
            <AlertCircle size={14} className="text-amber-600" />
            <span className="text-[10px] font-bold text-amber-700 uppercase">Busy Hour: {state.busyHour}:00</span>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase transition-all ${
              isEditing 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            <Settings2 size={14} />
            {isEditing ? 'Close Editor' : 'Edit Profile'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mode & Presets */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Traffic Input Mode</label>
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => onUpdateState({ useManualTraffic: false })}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${!state.useManualTraffic ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Auto-Generated
                      </button>
                      <button
                        onClick={() => onUpdateState({ useManualTraffic: true })}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${state.useManualTraffic ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Manual/Custom
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <LayoutGrid size={14} />
                      Preset Profiles
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {TRAFFIC_PRESETS.map(preset => (
                        <button
                          key={preset.name}
                          onClick={() => onUpdateState({ 
                            hourlyTraffic: preset.data.map(v => v * metrics.totalOfferedTraffic),
                            useManualTraffic: true 
                          })}
                          className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all text-center"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Upload size={14} />
                      Upload Data (CSV)
                    </label>
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".csv,.txt" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex items-center justify-center gap-2 w-full py-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
                        <FileUp size={18} />
                        <span className="text-xs font-medium">Click to upload 24-hour traffic data</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Timer size={14} />
                        Busy Hour Selection
                      </label>
                      <button 
                        onClick={() => {
                          const maxTraffic = Math.max(...state.hourlyTraffic);
                          const peakHour = state.hourlyTraffic.indexOf(maxTraffic);
                          onUpdateState({ busyHour: peakHour });
                        }}
                        className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter"
                      >
                        Auto-detect Peak
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="23" 
                        value={state.busyHour}
                        onChange={(e) => onUpdateState({ busyHour: parseInt(e.target.value) })}
                        className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="w-16 text-center bg-indigo-50 text-indigo-700 font-bold py-1 rounded-lg border border-indigo-100 text-xs">
                        {state.busyHour}:00
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hourly Grid */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Table size={14} />
                    Hourly Traffic Values (Erlang)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                    {state.hourlyTraffic.map((val, h) => (
                      <div key={h} className="space-y-1">
                        <div className="text-[9px] font-bold text-slate-400 text-center">{h}:00</div>
                        <input 
                          type="number"
                          step="0.1"
                          min="0"
                          value={val}
                          onChange={(e) => updateHourlyTraffic(h, e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyProfile}>
            <defs>
              <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" label={{ value: 'Traffic (Erlang)', angle: -90, position: 'insideLeft', fontSize: 10 }} tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Blocking (%)', angle: 90, position: 'insideRight', fontSize: 10 }} tick={{ fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend verticalAlign="top" height={36}/>
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="traffic" 
              name="Offered Traffic (Erlang)" 
              stroke="#6366f1" 
              fillOpacity={1} 
              fill="url(#colorTraffic)" 
            />
            <ReferenceArea yAxisId="left" x1="16:00" x2="18:00" fill="#f59e0b" fillOpacity={0.15} label={{ position: 'insideTop', value: 'BUSY HOUR', fill: '#d97706', fontSize: 12, fontWeight: 'bold' }} />
            <ReferenceLine yAxisId="left" x={`${state.busyHour}:00`} stroke="#f59e0b" strokeDasharray="3 3" />
            <ReferenceLine yAxisId="left" y={metrics.totalOfferedTraffic} stroke="none" label={{ position: 'top', value: 'Highest Channel Occupancy', fill: '#6366f1', fontSize: 9, fontWeight: 'bold' }} />
            <ReferenceLine yAxisId="right" x="17:00" stroke="none" label={{ position: 'insideTopLeft', value: 'GoS Degradation', fill: '#f43f5e', fontSize: 9, fontWeight: 'bold', offset: 15 }} />
            <ReferenceLine yAxisId="left" x="16:00" stroke="none" label={{ position: 'insideBottomLeft', value: 'Peak traffic causes higher blocking probability', fill: '#d97706', fontSize: 9, fontWeight: '500', offset: 10 }} />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="blocking" 
              name="Blocking Prob (%)" 
              stroke="#f43f5e" 
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (payload.isBusyHour) {
                  return (
                    <circle key={cx} cx={cx} cy={cy} r={6} fill="#f43f5e" stroke="white" strokeWidth={2} />
                  );
                }
                return null;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-600 leading-relaxed mb-4 md:mb-0">
              <span className="font-bold text-slate-900">Statistical Multiplexing:</span> The system is designed for the <span className="font-bold text-indigo-600">Busy Hour ({state.busyHour}:00)</span>. 
              While the average traffic is low, the peak hour determines the required number of channels to maintain the target Grade of Service. 
              Currently, at peak load ({metrics.totalOfferedTraffic.toFixed(2)} Erlang), the blocking probability is <span className={`font-bold ${metrics.blockingProbB > state.targetGos ? 'text-rose-600' : 'text-emerald-600'}`}>{(metrics.blockingProbB * 100).toFixed(2)}%</span>.
            </p>
          </div>
          <div className="flex-1 bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
            <p className="font-bold mb-1">Busy Hour Notes:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="font-semibold">Highest network demand period</span></li>
              <li><span className="font-semibold">Limited channels increase blocking probability during peak traffic</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TrunkingCharts: React.FC<{ metrics: TrunkingMetrics; state: TrunkingState }> = ({ metrics, state }) => {
  // Data for Blocking Prob vs Traffic Load
  const trafficData = React.useMemo(() => {
    const data = [];
    const baseA = metrics.totalOfferedTraffic;
    const range = Math.max(10, baseA * 0.5);
    const start = Math.max(0.1, baseA - range);
    const end = baseA + range;
    const step = (end - start) / 20;

    for (let a = start; a <= end; a += step) {
      data.push({
        traffic: parseFloat(a.toFixed(2)),
        probB: calculateErlangB(state.numChannels, a) * 100,
        probC: calculateErlangC(state.numChannels, a) * 100,
      });
    }
    return data;
  }, [metrics.totalOfferedTraffic, state.numChannels]);

  // Data for GoS vs Number of Channels
  const channelData = React.useMemo(() => {
    const data = [];
    const baseC = state.numChannels;
    const start = Math.max(1, baseC - 10);
    const end = baseC + 10;

    for (let c = start; c <= end; c++) {
      data.push({
        channels: c,
        probB: calculateErlangB(c, metrics.totalOfferedTraffic) * 100,
        target: state.targetGos * 100,
      });
    }
    return data;
  }, [state.numChannels, metrics.totalOfferedTraffic, state.targetGos]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-500" />
          Blocking Probability vs. Traffic Load
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trafficData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="traffic" 
                label={{ value: 'Offered Traffic (Erlang)', position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line 
                type="monotone" 
                dataKey="probB" 
                name="Erlang B (%)" 
                stroke="#6366f1" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="probC" 
                name="Erlang C (%)" 
                stroke="#f43f5e" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-indigo-500" />
          Grade of Service vs. Number of Channels
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="channels" 
                label={{ value: 'Number of Channels (C)', position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                label={{ value: 'Blocking Prob (%)', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Area 
                type="monotone" 
                dataKey="probB" 
                name="Blocking Prob (%)" 
                stroke="#6366f1" 
                fill="#6366f1" 
                fillOpacity={0.1}
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                name="Target GoS (%)" 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
      
      {/* Educational Box and Example */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
        <div className="md:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-400" />
            Why Trunking is Necessary
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Cellular trunking allows many mobile users to share a limited number of radio channels. Since users make calls randomly and intermittently, the system can support far more users than available channels using statistical multiplexing.
          </p>
        </div>
        <div className="md:col-span-1 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Activity size={14} className="text-emerald-400" />
            Practical Example
          </h4>
          <ul className="text-xs text-slate-300 space-y-2 mb-4 font-mono">
            <li>• 1000 users</li>
            <li>• 50 available channels</li>
            <li>• Average traffic = 100 Erlang</li>
            <li className="text-slate-400 italic mt-2 text-[10px] leading-tight font-sans">
              During busy hour, not all users call simultaneously. Trunking allows channel sharing among active users only.
            </li>
          </ul>
          <div className="pt-3 border-t border-slate-700">
            <p className="text-[11px] font-bold text-emerald-400 leading-relaxed">
              Result: A limited spectrum resource efficiently supports a large cellular population with acceptable Grade of Service (GoS).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
