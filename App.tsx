import React, { useState, useRef, Suspense, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Vignette, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { CloudPoints } from './components/CloudPoints';
import { SurfaceMesh } from './components/SurfaceMesh';
import { Overlay } from './components/Overlay';
import { ExportModal } from './components/ExportModal';
import { FramingGuide } from './components/FramingGuide';
import { CountdownOverlay } from './components/CountdownOverlay';
import { AudioController, analyzeFrequencies } from './services/audioService';
import { VideoRecorderService } from './services/videoRecorderService';
import { encodeMP3 } from './services/audioExportService';
import { 
  LogEntry, 
  SystemMode, 
  VisualShape, 
  VisualEffect, 
  VideoFormat, 
  RecordingQuality, 
  RecordingState, 
  RecordedVideo,
  VisualParameters
} from './types';

// Data Logger Component
const DataLogger = ({ isPlaying, analyzer, setExperimentLog }: any) => {
  const lastLogTime = useRef(0);
  const dataArray = useRef(new Uint8Array(0));
  const timeArray = useRef(new Uint8Array(0));
  
  useFrame((state) => {
    if (!isPlaying || !analyzer) return;
    if (state.clock.elapsedTime - lastLogTime.current > 1.0) {
      lastLogTime.current = state.clock.elapsedTime;
      if (dataArray.current.length !== analyzer.frequencyBinCount) {
        dataArray.current = new Uint8Array(analyzer.frequencyBinCount);
        timeArray.current = new Uint8Array(analyzer.frequencyBinCount);
      }
      const analysis = analyzeFrequencies(analyzer, dataArray.current, timeArray.current, analyzer.context.sampleRate);
      setExperimentLog((prev: any) => [...prev, {
        timestampFormatted: `${Math.floor(state.clock.elapsedTime / 60)}:${Math.floor(state.clock.elapsedTime % 60).toString().padStart(2, '0')}`,
        elapsedTime: state.clock.elapsedTime,
        note: analysis.note || "--",
        frequencyHz: analysis.dominantFrequency || 0,
        amplitude: Math.max(analysis.bass, analysis.mid, analysis.treble) / 255.0,
        physicsMode: "LOGGING",
        bassLevel: analysis.bass, 
        midLevel: analysis.mid, 
        trebleLevel: analysis.treble
      }]);
    }
  });
  return null;
};

// Canvas Ref Grabber to ensure we capture the active WebGL canvas element
const CanvasReferenceTracker = ({ onCanvasReady }: { onCanvasReady: (canvas: HTMLCanvasElement) => void }) => {
  useFrame(({ gl }) => {
    if (gl.domElement) {
      onCanvasReady(gl.domElement);
    }
  });
  return null;
};

const App: React.FC = () => {
  const [audioController] = useState(() => new AudioController());
  const [videoRecorderService] = useState(() => new VideoRecorderService());
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSynthDemoRunning, setIsSynthDemoRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [systemMode, setSystemMode] = useState<SystemMode>('EDU_LAB');
  const [experimentLog, setExperimentLog] = useState<LogEntry[]>([]);

  // Visual Topology & Effect State
  const [currentShape, setCurrentShape] = useState<VisualShape>('ORB');
  const [currentEffect, setCurrentEffect] = useState<VisualEffect>('FLOW');

  // Visual Parameters (Color Themes, Particles, Glow, Speed, Surface & Deformations)
  const [visualParams, setVisualParams] = useState<VisualParameters>({
    colorTheme: 'CYBER_CYAN',
    customColorBase: '#001133',
    customColorAccent: '#00f0ff',
    customColorPeak: '#ffffff',
    particleSize: 0.16,
    audioReactivity: 1.0,
    particleSpeed: 0.10,
    bloomIntensity: 2.2,
    autoRotateSpeed: 0.6,

    // 3D Surface & Mesh Controls
    surfaceRenderMode: 'HYBRID',
    surfaceOpacity: 0.35,
    wireframeOpacity: 0.65,
    showWireframe: true,

    // Geometric & Morphological Deformation Controls
    deformTwist: 0.0,
    deformTaper: 0.0,
    deformBend: 0.0,
    deformInflate: 0.0,
    deformFacet: 0.0,
    deformSuperformula: 0.0,

    // Physics & Wave Resonance Distortion Controls
    deformSpacetimeWarp: 0.0,
    deformSphericalHarmonics: 0.0,
    deformChladniResonance: 0.0,
    deformMagneticDipole: 0.0,
    deformVortexCore: 0.0,
    deformRipple: 0.0,
    deformNoiseWarp: 0.0,

    // Dedicated Acoustic Chladni & Cymatics Controls
    chladniModeN: 3,
    chladniModeM: 4,
    chladniAutoHarmonic: true,
    chladniParticleDispersion: 0.85,
    chladniPlateShape: 'SQUARE'
  });

  const handleUpdateVisualParams = (newParams: Partial<VisualParameters>) => {
    setVisualParams(prev => ({ ...prev, ...newParams }));
  };

  // Video Recording & Export State (Default to WhatsApp & Stories Super Leve < 10MB)
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('DESKTOP_16_9');
  const [recordingQuality, setRecordingQuality] = useState<RecordingQuality>('whatsapp_lite');
  const [recordingDuration, setRecordingDuration] = useState<number>(15); // Default 15s for high-impact social clips
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE');
  const [recordedSeconds, setRecordedSeconds] = useState<number>(0);
  const [countdownNumber, setCountdownNumber] = useState<number>(0);
  const [exportedVideo, setExportedVideo] = useState<RecordedVideo | null>(null);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasElementRef.current = canvas;
  }, []);

  const handleFileUpload = async (file: File) => {
    setLoading(true); 
    audioController.stop(); 
    setIsPlaying(false);
    setIsSynthDemoRunning(false);
    try {
      await audioController.loadFile(file);
      setAnalyzer(audioController.getAnalyser());
      setHasAudio(true);
      audioController.play(() => setIsPlaying(false));
      setIsPlaying(true);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  // Microphone Support
  const handleMicrophone = async () => {
    setLoading(true); 
    audioController.stop(); 
    setIsPlaying(false);
    setIsSynthDemoRunning(false);
    try {
      await audioController.startMicrophone();
      setAnalyzer(audioController.getAnalyser());
      setHasAudio(true);
      setIsPlaying(true);
    } catch (e) { 
      console.error(e); 
      alert("Microphone access denied or not available. Please allow permissions in browser.");
    } finally { 
      setLoading(false); 
    }
  };

  // Built-in Synth Demo Generator for immediate visualizer reactivity
  const handleSynthDemo = async () => {
    if (isSynthDemoRunning) {
      audioController.stopDemo();
      setIsSynthDemoRunning(false);
      setIsPlaying(false);
    } else {
      setLoading(true);
      audioController.stop();
      try {
        await audioController.startDemoAudio();
        setAnalyzer(audioController.getAnalyser());
        setIsSynthDemoRunning(true);
        setHasAudio(true);
        setIsPlaying(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const togglePlay = () => {
    if (isSynthDemoRunning) {
      handleSynthDemo();
      return;
    }
    if (isPlaying) {
      audioController.stop(); 
      setIsPlaying(false);
    } else {
      audioController.play(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  // Start Video Recording with 3s Countdown
  const startRecordingPipeline = () => {
    const canvas = canvasElementRef.current || document.querySelector('canvas');
    if (!canvas) {
      alert('Canvas is initializing. Please wait a moment.');
      return;
    }

    // Auto-start synth demo if user has no audio active, so video is dynamic!
    if (!isPlaying && !isSynthDemoRunning && !hasAudio) {
      handleSynthDemo();
    }

    setRecordingState('COUNTDOWN');
    setCountdownNumber(3);

    let currentCount = 3;
    const interval = setInterval(() => {
      currentCount--;
      if (currentCount > 0) {
        setCountdownNumber(currentCount);
      } else {
        clearInterval(interval);
        setCountdownNumber(0);
        setRecordingState('RECORDING');
        setRecordedSeconds(0);

        const audioTracks = audioController.getAudioTracks();
        const audioBuffer = audioController.getAudioBuffer();

        videoRecorderService.startRecording({
          canvas,
          audioTracks,
          audioBuffer,
          format: videoFormat,
          quality: recordingQuality,
          durationSeconds: recordingDuration,
          onProgress: (elapsed) => {
            setRecordedSeconds(elapsed);
          },
          onComplete: (video) => {
            setRecordingState('COMPLETED');
            setExportedVideo(video);
          },
          onError: (errMsg) => {
            setRecordingState('IDLE');
            alert(`Recording failed: ${errMsg}`);
          }
        });
      }
    }, 1000);
  };

  // Stop Recording Manually
  const stopRecordingPipeline = () => {
    videoRecorderService.stopRecording();
  };

  // 4K PNG Snapshot Export
  const handleTakeSnapshot = () => {
    const canvas = canvasElementRef.current || document.querySelector('canvas');
    if (!canvas) return;
    const { url, filename } = VideoRecorderService.takeSnapshot(canvas, videoFormat);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Direct MP3 Audio Export
  const handleExportAudioDirect = async () => {
    try {
      let buffer = audioController.getAudioBuffer();
      if (!buffer) {
        if (isSynthDemoRunning || !hasAudio) {
          // Render synth demo loop offline
          buffer = await audioController.renderSynthDemoAudioBuffer(24);
        }
      }

      if (!buffer) {
        alert('Carregue uma música ou ative o sintetizador demo para baixar o arquivo de áudio MP3.');
        return;
      }

      const mp3Blob = encodeMP3(buffer, 192);
      const url = URL.createObjectURL(mp3Blob);
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `flux-audio-${dateStr}.mp3`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      console.error('Error exporting MP3:', e);
      alert('Erro ao exportar áudio MP3: ' + (e?.message || 'Erro desconhecido'));
    }
  };

  // Close Export Modal
  const handleCloseExport = () => {
    setExportedVideo(null);
    setRecordingState('IDLE');
  };

  // Re-record take
  const handleRecordAgain = () => {
    setExportedVideo(null);
    setRecordingState('IDLE');
    setTimeout(() => {
      startRecordingPipeline();
    }, 300);
  };

  // Calculate Responsive Container Style for Selected Format
  const getContainerStyle = () => {
    switch (videoFormat) {
      case 'MOBILE_9_16':
        return 'h-full max-h-[100vh] aspect-[9/16] mx-auto shadow-[0_0_60px_rgba(0,0,0,0.9)]';
      case 'DESKTOP_16_9':
        return 'w-full max-w-[1920px] aspect-video mx-auto shadow-[0_0_60px_rgba(0,0,0,0.9)]';
      case 'SQUARE_1_1':
        return 'h-full max-h-[92vh] aspect-square mx-auto shadow-[0_0_60px_rgba(0,0,0,0.9)]';
      case 'FULL_SCREEN':
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div className="w-full h-screen bg-[#030305] relative overflow-hidden flex items-center justify-center">
      
      {/* UI OVERLAY CONTROLS (Includes Left Parameters Drawer and Right Recording Studio) */}
      <Overlay 
        onFileUpload={handleFileUpload} 
        hasAudio={hasAudio} 
        isPlaying={isPlaying} 
        togglePlay={togglePlay}
        onDownloadStudent={() => {}} 
        onDownloadResearch={() => {}} 
        hasLog={experimentLog.length > 0}
        systemMode={systemMode} 
        setSystemMode={setSystemMode} 
        analyzer={analyzer}
        onMicrophone={handleMicrophone}
        onSynthDemo={handleSynthDemo}
        isSynthDemoRunning={isSynthDemoRunning}
        currentShape={currentShape} 
        setShape={setCurrentShape}
        currentEffect={currentEffect} 
        setEffect={setCurrentEffect}
        visualParams={visualParams}
        onUpdateVisualParams={handleUpdateVisualParams}
        videoFormat={videoFormat}
        setVideoFormat={setVideoFormat}
        recordingQuality={recordingQuality}
        setRecordingQuality={setRecordingQuality}
        recordingDuration={recordingDuration}
        setRecordingDuration={setRecordingDuration}
        recordingState={recordingState}
        recordedSeconds={recordedSeconds}
        onStartRecording={startRecordingPipeline}
        onStopRecording={stopRecordingPipeline}
        onTakeSnapshot={handleTakeSnapshot}
        onExportAudioMp3={handleExportAudioDirect}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
      />
      
      {/* 3-SECOND COUNTDOWN OVERLAY */}
      <CountdownOverlay count={countdownNumber} format={videoFormat} />

      {/* FRAMING RETICLES AND SAFE AREA GUIDE */}
      <FramingGuide 
        format={videoFormat} 
        isRecording={recordingState === 'RECORDING'} 
        showGuides={showGuides} 
      />

      {/* EXPORT / DOWNLOAD MODAL */}
      <ExportModal 
        video={exportedVideo} 
        onClose={handleCloseExport} 
        onRecordAgain={handleRecordAgain} 
      />

      {/* INITIALIZATION LOADER */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/90 text-cyan-400 font-mono text-xl animate-pulse tracking-widest">
          INITIALIZING AUDIO & GRAPHICS PIPELINE...
        </div>
      )}

      {/* CANVAS CONTAINER (RESPONSIVE TO DESKTOP 16:9, MOBILE 9:16, SQUARE 1:1, OR FULLSCREEN) */}
      <div className={`relative transition-all duration-500 ease-in-out ${getContainerStyle()}`}>
        <Canvas 
          dpr={[1, 2]} 
          camera={{ position: [0, 0, 45], fov: 60 }} 
          gl={{ 
            antialias: true, 
            preserveDrawingBuffer: true, // Crucial for clean captureStream & snapshots
            toneMapping: THREE.ACESFilmicToneMapping, 
            toneMappingExposure: 1.25 
          }}
          className="w-full h-full block"
        >
          <color attach="background" args={['#050505']} />
          <Stars radius={100} depth={50} count={2500} factor={4} saturation={0} fade speed={1.2} />
          
          {/* Dynamic Scene Lighting for 3D Specular Surface Facets */}
          <ambientLight intensity={0.9} />
          <directionalLight position={[35, 45, 30]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-35, -25, -25]} intensity={1.2} color="#00f0ff" />
          <pointLight position={[30, -30, 20]} intensity={0.8} color="#ff007f" />

          {/* 3D Geometric Surface Mesh with Faceted Faces & Wireframe */}
          <SurfaceMesh
            analyzer={analyzer}
            isPlaying={isPlaying}
            systemMode={systemMode}
            shape={currentShape}
            effect={currentEffect}
            visualParams={visualParams}
          />

          {/* 3D Particle Cloud Representation */}
          <CloudPoints 
            analyzer={analyzer} 
            isPlaying={isPlaying} 
            systemMode={systemMode}
            shape={currentShape}
            effect={currentEffect}
            visualParams={visualParams}
          />
          
          <DataLogger isPlaying={isPlaying} analyzer={analyzer} setExperimentLog={setExperimentLog} />
          <CanvasReferenceTracker onCanvasReady={handleCanvasReady} />

          <OrbitControls 
            enableZoom={true} 
            autoRotate={recordingState !== 'RECORDING' && visualParams.autoRotateSpeed > 0} 
            autoRotateSpeed={visualParams.autoRotateSpeed} 
            rotateSpeed={0.5} 
            maxDistance={150} 
            minDistance={5} 
          />

          <Suspense fallback={null}>
            <EffectComposer enableNormalPass={false} multisampling={0}>
              <Vignette eskil={false} offset={0.1} darkness={1.15} />
              <Bloom 
                luminanceThreshold={0.15} 
                luminanceSmoothing={0.85} 
                intensity={visualParams.bloomIntensity} 
                radius={0.65} 
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

    </div>
  );
};

export default App;
