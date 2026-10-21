import React, { useState } from 'react';
import { 
  SystemMode, 
  UploadProps, 
  VisualShape, 
  VisualEffect, 
  VideoFormat, 
  RecordingQuality,
  RecordingState,
  VisualParameters
} from '../types';
import { PhysicsPanel } from './PhysicsPanel';
import { VIDEO_FORMAT_CONFIGS } from '../services/videoRecorderService';
import { VisualParametersDrawer, TOPOLOGY_LIST, PHYSICS_EFFECTS_LIST } from './VisualParametersDrawer';
import { 
  Video, 
  Square, 
  Monitor, 
  Smartphone, 
  Maximize2, 
  Mic, 
  Upload, 
  Play, 
  Pause, 
  Camera, 
  Clock, 
  Sliders, 
  Eye, 
  EyeOff,
  Music,
  FileAudio,
  StopCircle,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Film,
  Sparkles,
  Palette,
  Layers,
  Waves,
  Boxes,
  X,
  Radio
} from 'lucide-react';

interface OverlayProps extends UploadProps {
  hasAudio: boolean;
  isPlaying: boolean;
  togglePlay: () => void;
  onDownloadStudent: () => void; 
  onDownloadResearch: () => void;
  hasLog: boolean;
  systemMode: SystemMode;
  setSystemMode: (m: SystemMode) => void;
  analyzer: AnalyserNode | null; 
  onMicrophone?: () => void;
  onSynthDemo?: () => void;
  isSynthDemoRunning?: boolean;
  
  // Visual Controls
  currentShape: VisualShape;
  setShape: (s: VisualShape) => void;
  currentEffect: VisualEffect;
  setEffect: (e: VisualEffect) => void;

  // Parameters & Color Customization
  visualParams: VisualParameters;
  onUpdateVisualParams: (params: Partial<VisualParameters>) => void;

  // Video Recording Controls
  videoFormat: VideoFormat;
  setVideoFormat: (f: VideoFormat) => void;
  recordingQuality: RecordingQuality;
  setRecordingQuality: (q: RecordingQuality) => void;
  recordingDuration: number;
  setRecordingDuration: (d: number) => void;
  recordingState: RecordingState;
  recordedSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTakeSnapshot: () => void;
  onExportAudioMp3?: () => void;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
}

export const Overlay: React.FC<OverlayProps> = ({ 
  onFileUpload, 
  hasAudio, 
  isPlaying, 
  togglePlay, 
  systemMode, 
  analyzer, 
  onMicrophone,
  onSynthDemo,
  isSynthDemoRunning = false,
  currentShape, 
  setShape, 
  currentEffect, 
  setEffect,
  visualParams,
  onUpdateVisualParams,
  videoFormat,
  setVideoFormat,
  recordingQuality,
  setRecordingQuality,
  recordingDuration,
  setRecordingDuration,
  recordingState,
  recordedSeconds,
  onStartRecording,
  onStopRecording,
  onTakeSnapshot,
  onExportAudioMp3,
  showGuides,
  setShowGuides
}) => {
  // Lateral side-menus state (Visual Parameters Drawer on Left, Record Studio on Right)
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);

  // Retractable Bottom Menu for Topology & Physics
  const [isBottomDrawerOpen, setIsBottomDrawerOpen] = useState(false);
  const [bottomFilter, setBottomFilter] = useState<'ALL' | 'TOPOLOGY' | 'PHYSICS'>('ALL');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onFileUpload(e.target.files[0]);
  };

  const formats: { id: VideoFormat; icon: React.ReactNode; label: string; sub: string; desc: string }[] = [
    { id: 'DESKTOP_16_9', icon: <Monitor className="w-4 h-4" />, label: '16:9 Desktop', sub: 'Widescreen', desc: 'YouTube & Desktop' },
    { id: 'MOBILE_9_16', icon: <Smartphone className="w-4 h-4" />, label: '9:16 Mobile', sub: 'Vertical', desc: 'TikTok / Reels / Shorts' },
    { id: 'SQUARE_1_1', icon: <Square className="w-4 h-4" />, label: '1:1 Square', sub: 'Instagram', desc: 'Feed & Covers' },
    { id: 'FULL_SCREEN', icon: <Maximize2 className="w-4 h-4" />, label: 'Fullscreen', sub: 'Native', desc: 'Viewport Scale' }
  ];

  const durationOptions = [
    { value: 0, label: 'Manual (Continuous)' },
    { value: 15, label: '15s (Shorts / Stories)' },
    { value: 30, label: '30s (Reels / Social)' },
    { value: 60, label: '60s (Full Clip)' }
  ];

  const qualityOptions: { 
    value: RecordingQuality; 
    label: string; 
    sub: string; 
    tag: string;
    isWhatsAppSafe: boolean;
  }[] = [
    { 
      value: 'whatsapp_lite', 
      label: 'WhatsApp & Stories', 
      sub: '720p 30 FPS • Super Leve (~3.5 MB)', 
      tag: '< 10 MB',
      isWhatsAppSafe: true 
    },
    { 
      value: 'social_hd', 
      label: 'Instagram Reels & TikTok HD', 
      sub: '1080p 30 FPS • Alta Nitidez (~6.8 MB)', 
      tag: 'RECOMENDADO',
      isWhatsAppSafe: true 
    },
    { 
      value: 'full_hd_60', 
      label: 'Full HD 60 FPS', 
      sub: '1080p 60 FPS • Fluidez Máxima (~14 MB)', 
      tag: 'YOUTUBE / PC',
      isWhatsAppSafe: true 
    },
    { 
      value: 'cinema_4k', 
      label: 'Cinema Master 4K', 
      sub: '4K 60 FPS • Ultra Resolução (~30 MB)', 
      tag: 'PRO',
      isWhatsAppSafe: false 
    }
  ];

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const isRecording = recordingState === 'RECORDING';

  const activeTopologyObj = TOPOLOGY_LIST.find(t => t.id === currentShape) || TOPOLOGY_LIST[0];
  const activePhysicsObj = PHYSICS_EFFECTS_LIST.find(p => p.id === currentEffect) || PHYSICS_EFFECTS_LIST[0];

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between text-white overflow-hidden font-rajdhani select-none">
      
      {/* HEADER BAR */}
      <header className={`pointer-events-auto bg-black/85 backdrop-blur-md border-b border-cyan-900/40 w-full transition-all duration-300 ${
        !isHudVisible ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}>
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 md:gap-4">
          
          {/* TITLE & LIVE BADGE */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-widest text-cyan-400 font-mono" style={{ textShadow: '0 0 12px rgba(6,182,212,0.6)' }}>
                FLUX ENGINE
              </h1>
            </div>
            
            <span className="hidden sm:inline-block text-[10px] tracking-wider px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-mono">
              3D AUDIO VISUALIZER
            </span>
          </div>

          {/* REALTIME PHYSICS & FREQUENCY DISPLAY */}
          <div className="hidden lg:flex flex-1 justify-center max-w-md">
            <PhysicsPanel analyzer={analyzer} isPlaying={isPlaying} systemMode={systemMode} />
          </div>

          {/* TOP CONTROLS & SIDEBAR TOGGLE BUTTONS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* FILE UPLOAD */}
            <label className="cursor-pointer bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all text-cyan-300 hover:text-cyan-200">
              <Upload className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold tracking-wider">LOAD AUDIO</span>
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
            </label>

            {/* MIC INPUT */}
            {onMicrophone && (
              <button 
                onClick={onMicrophone} 
                className="bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 hover:text-red-200 px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all"
                title="Use Microphone as Audio Source"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>MIC</span>
              </button>
            )}

            {/* SYNTH DEMO BEAT */}
            {onSynthDemo && (
              <button 
                onClick={onSynthDemo} 
                className={`border px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all ${
                  isSynthDemoRunning 
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                    : 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
                title="Play built-in rhythmic electronic track"
              >
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span>SYNTH DEMO</span>
              </button>
            )}

            {/* DIRECT MP3 EXPORT BUTTON */}
            {(hasAudio || isSynthDemoRunning) && onExportAudioMp3 && (
              <button 
                onClick={onExportAudioMp3} 
                className="bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/60 hover:border-amber-400 text-amber-300 hover:text-amber-100 px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                title="Exportar Faixa de Áudio em MP3 Universal (192 kbps)"
              >
                <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                <span>BAIXAR MP3</span>
              </button>
            )}

            {/* PLAY / PAUSE BUTTON */}
            {(hasAudio || isSynthDemoRunning) && (
              <button 
                onClick={togglePlay} 
                className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${
                  isPlaying 
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-950/60 shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                    : 'border-zinc-600 text-zinc-400 hover:border-cyan-500 hover:text-cyan-400'
                }`}
                title={isPlaying ? 'Pause Audio' : 'Play Audio'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
            )}

            {/* 4K SNAPSHOT */}
            <button
              onClick={onTakeSnapshot}
              className="bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all"
              title="Capture 4K HD Frame Snapshot (PNG)"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">SNAPSHOT</span>
            </button>

            {/* TOGGLE TOPOLOGY & PHYSICS MENU BUTTON */}
            <button
              onClick={() => setIsBottomDrawerOpen(!isBottomDrawerOpen)}
              className={`border px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all ${
                isBottomDrawerOpen
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
              title="Open / Close Topology & Physics Matrix"
            >
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              <span>PHYSICS & SHAPES</span>
            </button>

            {/* TOGGLE VISUAL LAB / PARAMETERS MENU BUTTON */}
            <button
              onClick={() => setIsParamsOpen(!isParamsOpen)}
              className={`border px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all ${
                isParamsOpen
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
              title="Open / Close Visual Parameters & Color Menu"
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>VISUAL LAB</span>
            </button>

            {/* TOGGLE RECORDING SIDEBAR BUTTON */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`border px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider flex items-center gap-1.5 transition-all ${
                isSidebarOpen
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
              title="Open / Close Video Recording Studio"
            >
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>RECORD STUDIO</span>
            </button>

          </div>

        </div>
      </header>

      {/* TOP-RIGHT FLOATING STATUS PILL WHEN RECORDING */}
      {isRecording && (
        <div className="pointer-events-auto absolute top-14 right-4 z-30 flex items-center gap-3 bg-red-950/90 border border-red-500/70 rounded-full px-4 py-1.5 shadow-[0_0_25px_rgba(239,68,68,0.5)] backdrop-blur-md animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono font-bold text-red-300 text-xs tracking-wider">
              REC {formatTimer(recordedSeconds)}
              {recordingDuration > 0 && ` / ${recordingDuration}s`}
            </span>
          </div>
          <button
            onClick={onStopRecording}
            className="py-0.5 px-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
          >
            <StopCircle className="w-3 h-3" />
            STOP
          </button>
        </div>
      )}

      {/* 1. LEFT LATERAL DRAWER: VISUAL PARAMETERS & COLOR CHANGER */}
      <VisualParametersDrawer
        isOpen={isParamsOpen}
        onToggle={() => setIsParamsOpen(!isParamsOpen)}
        visualParams={visualParams}
        onUpdateParams={onUpdateVisualParams}
        currentShape={currentShape}
        setShape={setShape}
        currentEffect={currentEffect}
        setEffect={setEffect}
        analyzer={analyzer}
        isPlaying={isPlaying}
      />

      {/* 2. RIGHT LATERAL DRAWER: RECORDING STUDIO */}
      <div 
        className={`pointer-events-auto absolute top-14 bottom-16 right-3 sm:right-4 z-30 w-72 sm:w-80 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen 
            ? 'translate-x-0 opacity-100 pointer-events-auto' 
            : 'translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 bg-zinc-950/90 backdrop-blur-xl border border-cyan-900/60 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-white font-rajdhani">
          
          {/* SIDEBAR HEADER */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-cyan-900/40 bg-black/60">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
                  VIDEO RECORDER
                </h3>
                <span className="text-[9px] text-zinc-400 font-mono block">
                  Studio Export Panel
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* SIDEBAR SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            
            {/* 1. FORMAT SELECTOR */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Film className="w-3 h-3" />
                  Aspect Ratio & Platform
                </span>
                <span className="text-[9px] font-mono text-zinc-400">
                  {VIDEO_FORMAT_CONFIGS[videoFormat].label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {formats.map(f => {
                  const isSelected = videoFormat === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setVideoFormat(f.id)}
                      className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={isSelected ? 'text-cyan-400' : 'text-zinc-400'}>
                          {f.icon}
                        </span>
                        <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                          isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {f.sub}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold leading-tight block">
                        {f.label}
                      </span>
                      <span className="text-[9px] text-zinc-500 leading-tight block mt-0.5">
                        {f.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. DURATION PRESETS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Target Duration
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {durationOptions.map(opt => {
                  const isSelected = recordingDuration === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setRecordingDuration(opt.value)}
                      className={`px-2 py-1.5 rounded border text-[10px] font-bold text-center transition-all ${
                        isSelected
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. QUALITY & BITRATE SETTINGS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Sliders className="w-3 h-3" />
                  Render Quality & FPS
                </span>
              </div>

              <div className="space-y-1.5">
                {qualityOptions.map(q => {
                  const isSelected = recordingQuality === q.value || 
                    (q.value === 'whatsapp_lite' && recordingQuality === '720p_30fps') ||
                    (q.value === 'full_hd_60' && recordingQuality === '1080p_60fps') ||
                    (q.value === 'cinema_4k' && recordingQuality === '4k_60fps');
                  return (
                    <button
                      key={q.value}
                      onClick={() => setRecordingQuality(q.value)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[11px] font-bold block ${isSelected ? 'text-cyan-300' : 'text-zinc-200'}`}>
                            {q.label}
                          </span>
                          <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded ${
                            q.isWhatsAppSafe 
                              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40' 
                              : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {q.tag}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-400 block leading-tight">
                          {q.sub}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. FRAMING & SAFE GUIDES TOGGLE */}
            <div className="p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-200 block">
                  Safe Area Framing Guides
                </span>
                <span className="text-[9px] text-zinc-500 block">
                  Show composition reticles and 9:16 safe zone
                </span>
              </div>

              <button
                onClick={() => setShowGuides(!showGuides)}
                className={`p-1.5 rounded border transition-all ${
                  showGuides
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
                title="Toggle visual framing guides"
              >
                {showGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>

          </div>

          {/* SIDEBAR FOOTER: PRIMARY ACTION BUTTONS */}
          <div className="p-3 border-t border-cyan-900/40 bg-black/80 space-y-2">
            
            {isRecording ? (
              <button
                onClick={onStopRecording}
                className="w-full py-2.5 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.6)] transition-all uppercase animate-pulse"
              >
                <StopCircle className="w-4 h-4" />
                <span>FINISH & EXPORT VIDEO</span>
              </button>
            ) : (
              <button
                onClick={onStartRecording}
                className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] transition-all uppercase"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <span>START RECORDING</span>
              </button>
            )}

            <button
              onClick={onTakeSnapshot}
              className="w-full py-1.5 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-bold text-[10px] tracking-wider flex items-center justify-center gap-1.5 transition-all"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>CAPTURE 4K PNG SNAPSHOT</span>
            </button>

            {onExportAudioMp3 && (
              <button
                onClick={onExportAudioMp3}
                className="w-full py-1.5 px-3 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-amber-200 font-bold text-[10px] tracking-wider flex items-center justify-center gap-1.5 transition-all"
                title="Exportar áudio como MP3 compatível"
              >
                <FileAudio className="w-3.5 h-3.5 text-amber-400" />
                <span>BAIXAR ÁUDIO COMPATÍVEL (.MP3)</span>
              </button>
            )}

          </div>

        </div>
      </div>

      {/* COLLAPSED FLOATING STUDIO TAB (ON THE RIGHT) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="pointer-events-auto absolute top-20 right-0 z-30 bg-zinc-950/90 hover:bg-black border-l-2 border-y border-cyan-500/70 text-cyan-400 py-2.5 px-2 rounded-l-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] flex flex-col items-center gap-1.5 transition-all hover:translate-x-[-4px]"
          title="Open Video Recording Studio"
        >
          <ChevronLeft className="w-4 h-4" />
          <Video className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold tracking-widest [writing-mode:vertical-lr] uppercase text-zinc-300">
            RECORD STUDIO
          </span>
        </button>
      )}

      {/* ============================================================ */}
      {/* RETRACTABLE BOTTOM DRAWER FOR TOPOLOGY & PHYSICS            */}
      {/* ============================================================ */}

      {/* 1. COLLAPSED FLOATING TRIGGER PILL AT BOTTOM CENTER */}
      {!isBottomDrawerOpen && (
        <div className="pointer-events-auto absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
          <button
            onClick={() => setIsBottomDrawerOpen(true)}
            className="bg-black/90 hover:bg-black border border-cyan-500/60 hover:border-cyan-400 text-white py-1.5 px-3.5 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-xl flex items-center gap-3 transition-all hover:scale-105 group"
            title="Open Topology & Physics Drawer"
          >
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-mono font-bold">
              <Layers className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>{activeTopologyObj.name}</span>
            </div>

            <span className="text-zinc-600 font-mono">/</span>

            <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-mono font-bold">
              <Waves className="w-3.5 h-3.5 text-indigo-400" />
              <span>{activePhysicsObj.label}</span>
            </div>

            <div className="flex items-center gap-1 pl-1 border-l border-zinc-800 text-[10px] text-zinc-400 group-hover:text-cyan-300 font-mono">
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-y-0.5 transition-transform" />
              <span>MATRIX</span>
            </div>
          </button>
        </div>
      )}

      {/* 2. EXPANDED SLIDE-UP BOTTOM DRAWER */}
      <div 
        className={`pointer-events-auto absolute bottom-0 left-0 right-0 z-30 flex justify-center transition-all duration-300 ease-out ${
          isBottomDrawerOpen 
            ? 'translate-y-0 opacity-100 pointer-events-auto' 
            : 'translate-y-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full max-w-5xl bg-zinc-950/95 backdrop-blur-2xl border-t border-x border-cyan-900/60 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.9)] flex flex-col max-h-[70vh] sm:max-h-[62vh] overflow-hidden text-white font-rajdhani">
          
          {/* DRAWER HEADER BAR */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-cyan-900/40 bg-black/70">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400 uppercase font-mono">
                  TOPOLOGY & PHYSICS MATRIX
                </h3>
              </div>

              {/* ACTIVE PREVIEW BADGES */}
              <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                  SHAPE: {activeTopologyObj.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/30 text-indigo-300">
                  FORCE: {activePhysicsObj.label}
                </span>
              </div>
            </div>

            {/* TAB FILTER (ALL / TOPOLOGY / PHYSICS) & CLOSE BUTTON */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-black/60 border border-zinc-800 rounded-lg p-0.5 text-[10px] font-mono">
                <button
                  onClick={() => setBottomFilter('ALL')}
                  className={`px-2 py-1 rounded transition-all ${
                    bottomFilter === 'ALL' 
                      ? 'bg-zinc-800 text-white font-bold' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ALL MATRIX
                </button>
                <button
                  onClick={() => setBottomFilter('TOPOLOGY')}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                    bottomFilter === 'TOPOLOGY' 
                      ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold' 
                      : 'text-zinc-400 hover:text-cyan-300'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>TOPOLOGY (20)</span>
                </button>
                <button
                  onClick={() => setBottomFilter('PHYSICS')}
                  className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
                    bottomFilter === 'PHYSICS' 
                      ? 'bg-indigo-950 border border-indigo-500/50 text-indigo-300 font-bold' 
                      : 'text-zinc-400 hover:text-indigo-300'
                  }`}
                >
                  <Waves className="w-3 h-3" />
                  <span>PHYSICS (10)</span>
                </button>
              </div>

              {/* COLLAPSE / MINIMIZE BUTTON */}
              <button
                onClick={() => setIsBottomDrawerOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border border-transparent hover:border-zinc-700"
                title="Retract / Close Drawer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SCROLLABLE SECTIONS */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* SECTION 1: TOPOLOGIES */}
            {(bottomFilter === 'ALL' || bottomFilter === 'TOPOLOGY') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    3D Particle Geometry Topologies
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400">
                    Selected: <strong className="text-cyan-300">{activeTopologyObj.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {TOPOLOGY_LIST.map(top => {
                    const isSelected = currentShape === top.id;
                    return (
                      <button
                        key={top.id}
                        onClick={() => setShape(top.id)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-400 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-[1.02]'
                            : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/90 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[11px] font-bold font-mono truncate block">
                            {top.name}
                          </span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {top.category}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-500 block line-clamp-2 leading-tight">
                          {top.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: QUANTUM & GENERATIVE PHYSICS */}
            {(bottomFilter === 'ALL' || bottomFilter === 'PHYSICS') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-indigo-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5" />
                    Quantum Physics & Vector Field Simulators
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400">
                    Selected: <strong className="text-indigo-300">{activePhysicsObj.label}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {PHYSICS_EFFECTS_LIST.map(eff => {
                    const isSelected = currentEffect === eff.id;
                    return (
                      <button
                        key={eff.id}
                        onClick={() => setEffect(eff.id)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-950/80 border-indigo-400 text-indigo-100 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-[1.02]'
                            : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/90 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[11px] font-bold font-mono truncate block">
                            {eff.label}
                          </span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {eff.tag}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-500 block line-clamp-2 leading-tight">
                          {eff.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* DRAWER FOOTER BAR */}
          <div className="px-4 py-2 border-t border-cyan-900/40 bg-black/80 flex items-center justify-between text-[10px] font-mono">
            <span className="text-zinc-500">
              10 TOPOLOGIES & 10 PHYSICS FORCES LOADED
            </span>
            <button
              onClick={() => setIsBottomDrawerOpen(false)}
              className="py-1 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-400 hover:text-cyan-200 flex items-center gap-1.5 transition-all uppercase font-bold"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>COLLAPSE DRAWER</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
