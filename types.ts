import React from 'react';

export type SystemMode = 'EDU_LAB';

export type VisualShape = 
  | 'CHLADNI_PLATE'
  | 'ORB' 
  | 'TORUS' 
  | 'PLANE' 
  | 'DNA' 
  | 'GALAXY' 
  | 'TREFOIL_KNOT' 
  | 'CYBER_CUBE' 
  | 'WORMHOLE' 
  | 'LISSAJOUS' 
  | 'HYPER_TUNNEL'
  | 'ICOSAHEDRON'
  | 'DODECAHEDRON'
  | 'OCTAHEDRON'
  | 'TETRAHEDRON'
  | 'HEXAGONAL_PRISM'
  | 'MOBIUS_STRIP'
  | 'KLEIN_BOTTLE'
  | 'GEODESIC_DOME'
  | 'SUPERELLIPSOID'
  | 'GYROID';

export type ColorTheme = 
  | 'CYBER_CYAN' 
  | 'NEON_MAGENTA' 
  | 'SOLAR_GOLD' 
  | 'EMERALD_MATRIX' 
  | 'VAPORWAVE' 
  | 'INFERNO' 
  | 'AESTHETIC_WHITE'
  | 'CUSTOM';

export type SurfaceRenderMode = 'HYBRID' | 'SURFACE_ONLY' | 'WIREFRAME' | 'PARTICLES_ONLY';

export interface VisualParameters {
  colorTheme: ColorTheme;
  customColorBase: string;
  customColorAccent: string;
  customColorPeak: string;
  particleSize: number;
  audioReactivity: number;
  particleSpeed: number;
  bloomIntensity: number;
  autoRotateSpeed: number;

  // 3D Surface & Mesh Face Controls
  surfaceRenderMode: SurfaceRenderMode;
  surfaceOpacity: number;       // 0.0 to 1.0 (default 0.35)
  wireframeOpacity: number;     // 0.0 to 1.0 (default 0.65)
  showWireframe: boolean;       // default true

  // Surface & Geometry Deformation Parameters (Mathematical & Physical Modifiers)
  deformTwist: number;              // -2.0 to +2.0 (default 0.0) Axial Twist
  deformTaper: number;              // -1.0 to +1.0 (default 0.0) Conical Taper
  deformBend: number;               // -1.5 to +1.5 (default 0.0) Arc Curvature
  deformInflate: number;            // -1.5 to +1.5 (default 0.0) Radial Bulge / Pinch
  deformFacet: number;              // 0.0 to 1.0 (default 0.0) Crystalline Facet Quantization
  deformSuperformula: number;       // 0.0 to 2.0 (default 0.0) Johan Gielis Superformula Symmetry
  
  // Physics & Wave Deformation Parameters
  deformSpacetimeWarp: number;       // -2.0 to +2.0 (default 0.0) Schwarzschild Gravitational Lensing & Frame Dragging
  deformSphericalHarmonics: number;  // 0.0 to 2.0 (default 0.0) Quantum Atomic Orbital Wavefunction Lobes (Y_l^m)
  deformChladniResonance: number;    // 0.0 to 2.0 (default 0.0) 3D Acoustic Cymatic Nodal Surfaces
  deformMagneticDipole: number;      // -2.0 to +2.0 (default 0.0) Dipolar Magnetic Mirror Bottle & Plasma Pinch
  deformVortexCore: number;          // -2.0 to +2.0 (default 0.0) Hydrodynamic Lamb-Oseen Vortex & Accretion Shear
  deformRipple: number;             // 0.0 to 2.0 (default 0.0) Harmonic Concentric Waves
  deformNoiseWarp: number;          // 0.0 to 2.5 (default 0.0) 3D Turbulent Vector Displacement

  // Dedicated Acoustic Chladni & Cymatics Parameters
  chladniModeN?: number;             // Harmonic modal integer N (1 to 12, default 3)
  chladniModeM?: number;             // Harmonic modal integer M (1 to 12, default 4)
  chladniAutoHarmonic?: boolean;     // Automatically follow musical notes from audio (default true)
  chladniParticleDispersion?: number;// Tightness of particles on nodal lines (0.1 to 1.0, default 0.85)
  chladniPlateShape?: 'SQUARE' | 'CIRCULAR' | 'HEXAGONAL'; // Plate geometry (default 'SQUARE')
  chladniModalMixing?: number;       // Modal balance alpha (0.0 = closed rings/diamonds, 0.5 = hybrid, 1.0 = crosses, default 0.25)
  chladniMultiHarmonic?: boolean;    // Simultaneous multi-frequency superposition (default true)
}
export type VisualEffect = 
  | 'FLOW' 
  | 'PULSE' 
  | 'NOISE' 
  | 'VORTEX'
  | 'CURL_NOISE'
  | 'AIZAWA_CHAOS'
  | 'BLACK_HOLE'
  | 'CHLADNI_3D'
  | 'LORENTZ_FORCE'
  | 'BROWNIAN_HEAT';

export type VideoFormat = 'DESKTOP_16_9' | 'MOBILE_9_16' | 'SQUARE_1_1' | 'FULL_SCREEN';
export type RecordingQuality = 
  | 'whatsapp_lite' 
  | 'social_hd' 
  | 'full_hd_60' 
  | 'cinema_4k' 
  | '1080p_60fps' 
  | '4k_60fps' 
  | '720p_30fps';
export type RecordingState = 'IDLE' | 'COUNTDOWN' | 'RECORDING' | 'PAUSED' | 'PROCESSING' | 'COMPLETED';

export interface RecordedVideo {
  blob: Blob;
  url: string;
  durationSec: number;
  format: VideoFormat;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  timestamp: string;
  hasAudio: boolean;
  filename: string;
  audioBlob?: Blob;
  audioBuffer?: AudioBuffer | null;
  isWhatsAppSafe?: boolean;
}

export interface VideoFormatConfig {
  id: VideoFormat;
  label: string;
  sublabel: string;
  aspectRatio: string;
  aspectValue: number; // width / height
  standardWidth: number;
  standardHeight: number;
  iconName: string;
}

export interface ChladniHarmonicData {
  n: number;
  m: number;
  noteName: string;
  octave: number;
  frequency: number;
  confidence: number;
  alpha?: number;
  bassMode?: { n: number; m: number };
  trebleMode?: { n: number; m: number };
}

export interface AudioAnalysis {
  bass: number; 
  mid: number;  
  treble: number; 
  average: number; 
  frequencyArray: Uint8Array;
  timeDomainArray: Uint8Array;
  dominantFrequency?: number;
  note?: string;
  mood?: string; 
  beatDetected?: boolean; 
  chladniModes?: ChladniHarmonicData;
}

export interface ParticleSystemProps {
  analyzer: AnalyserNode | null;
  isPlaying: boolean;
  systemMode?: SystemMode;
  shape: VisualShape;
  effect: VisualEffect;
  visualParams?: VisualParameters;
}

export interface UploadProps {
  onFileUpload: (file: File) => void;
}

export interface LogEntry {
  timestampFormatted: string;
  elapsedTime: number; 
  note: string;
  frequencyHz: number; 
  amplitude: number; 
  physicsMode: string; 
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      lineSegments: any;
      lineBasicMaterial: any;
      group: any;
      color: any;
      mesh: any;
      ambientLight: any;
      directionalLight: any;
      shaderMaterial: any;
      [elemName: string]: any;
    }
  }
}