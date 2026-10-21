import React, { useState, useEffect } from 'react';
import { VisualShape, ColorTheme, VisualParameters, VisualEffect, SurfaceRenderMode } from '../types';
import { analyzeFrequencies } from '../services/audioService';
import { 
  Palette, 
  Sparkles, 
  Sliders, 
  RotateCw, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Waves,
  Boxes,
  Layers,
  SlidersHorizontal,
  Compass,
  Grid,
  Activity,
  Triangle,
  Hexagon,
  RefreshCcw,
  Atom,
  Magnet,
  Orbit,
  Wind,
  Zap,
  Music
} from 'lucide-react';

interface VisualParametersDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  visualParams: VisualParameters;
  onUpdateParams: (params: Partial<VisualParameters>) => void;
  currentShape: VisualShape;
  setShape: (shape: VisualShape) => void;
  currentEffect: VisualEffect;
  setEffect: (effect: VisualEffect) => void;
  analyzer?: AnalyserNode | null;
  isPlaying?: boolean;
}

const COLOR_PRESETS: { id: ColorTheme; label: string; sub: string; preview: string[] }[] = [
  { 
    id: 'CYBER_CYAN', 
    label: 'Cyber Cyan', 
    sub: 'Electric Blue & White', 
    preview: ['#001133', '#00f0ff', '#ffffff'] 
  },
  { 
    id: 'NEON_MAGENTA', 
    label: 'Neon Magenta', 
    sub: 'Synthwave & Hot Pink', 
    preview: ['#2b0033', '#ff007f', '#ffe6f7'] 
  },
  { 
    id: 'SOLAR_GOLD', 
    label: 'Solar Flare', 
    sub: 'Amber Gold & Flame', 
    preview: ['#331600', '#ff9900', '#fff5db'] 
  },
  { 
    id: 'EMERALD_MATRIX', 
    label: 'Emerald Matrix', 
    sub: 'Cyberpunk Toxic Green', 
    preview: ['#002611', '#00ff66', '#e6fff0'] 
  },
  { 
    id: 'VAPORWAVE', 
    label: 'Vaporwave', 
    sub: 'Pastel Aqua & Coral', 
    preview: ['#1a0033', '#00f5d4', '#ff70a6'] 
  },
  { 
    id: 'INFERNO', 
    label: 'Inferno', 
    sub: 'Molten Crimson & Yellow', 
    preview: ['#330000', '#ff2600', '#ffff66'] 
  },
  { 
    id: 'AESTHETIC_WHITE', 
    label: 'Diamond White', 
    sub: 'Monochrome & Platinum', 
    preview: ['#141419', '#9bbcd4', '#ffffff'] 
  },
  { 
    id: 'CUSTOM', 
    label: 'Custom Palette', 
    sub: 'User-Defined Hex Tones', 
    preview: ['#001133', '#00f0ff', '#ffffff'] 
  }
];

export const TOPOLOGY_LIST: { id: VisualShape; name: string; category: string; desc: string; faces: string }[] = [
  // 0. ACOUSTIC CYMATICS (Placa de Chladni Físico-Acústica)
  { id: 'CHLADNI_PLATE', name: 'Placa Chladni', category: 'Cymatics', desc: 'Placa acústica real: partículas convergem nas linhas nodais', faces: 'Placa Ressonante' },

  // 1. PLATONIC & FACETED (Faces Planas e Geometrias com Superfície)
  { id: 'ICOSAHEDRON', name: 'Icosahedron', category: 'Platonic', desc: 'Platonic solid with 20 triangular planar faces', faces: '20 Faces' },
  { id: 'DODECAHEDRON', name: 'Dodecahedron', category: 'Platonic', desc: 'Sacred polyhedron with 12 pentagonal faces', faces: '12 Faces' },
  { id: 'OCTAHEDRON', name: 'Octahedron', category: 'Platonic', desc: 'Double-pyramid diamond crystal structure', faces: '8 Faces' },
  { id: 'TETRAHEDRON', name: 'Tetrahedron', category: 'Platonic', desc: 'Fundamental pyramid simplex with 4 faces', faces: '4 Faces' },
  { id: 'HEXAGONAL_PRISM', name: 'Hex Prism', category: 'Prism', desc: 'Basalt column with 6 side faces & 2 caps', faces: '8 Faces' },

  // 2. TOPOLOGICAL & MINIMAL SURFACES
  { id: 'MOBIUS_STRIP', name: 'Möbius Strip', category: 'Topology', desc: 'Continuous single-sided non-orientable surface', faces: 'Single Surface' },
  { id: 'KLEIN_BOTTLE', name: 'Klein Bottle', category: 'Topology', desc: '4D self-intersecting closed surface', faces: '4D Manifold' },
  { id: 'GEODESIC_DOME', name: 'Geodesic Dome', category: 'Geodesic', desc: 'Fuller spherical triangular facet lattice', faces: 'Triangular Grid' },
  { id: 'SUPERELLIPSOID', name: 'Superellipsoid', category: 'Surface', desc: 'Faceted superquadric morphological crystal', faces: 'Quadric Facets' },
  { id: 'GYROID', name: 'Gyroid Minimal', category: 'Minimal', desc: 'Triply periodic minimal surface sheet', faces: 'Minimal Sheet' },

  // 3. HARMONIC & COSMIC
  { id: 'ORB', name: 'Fibonacci Orb', category: 'Spherical', desc: 'Golden ratio particle sphere', faces: 'Spherical' },
  { id: 'TORUS', name: 'Toroid Ring', category: 'Curvature', desc: 'Looped mathematical torus donut', faces: 'Torus Mesh' },
  { id: 'PLANE', name: 'Wave Plane', category: 'Grid', desc: 'Harmonic surface mesh matrix', faces: 'Planar Grid' },
  { id: 'GALAXY', name: 'Spiral Galaxy', category: 'Cosmic', desc: 'Logarithmic twin spiral arms', faces: 'Cosmic Disc' },
  { id: 'LISSAJOUS', name: 'Lissajous Knot', category: 'Harmonic', desc: 'Tri-harmonic 3D wave knot', faces: 'Harmonic Tube' },

  // 4. LATTICE & VORTEX
  { id: 'TREFOIL_KNOT', name: 'Trefoil Knot', category: 'Topology', desc: '3D non-trivial continuous knot', faces: 'Knotted Tube' },
  { id: 'CYBER_CUBE', name: 'Cyber Matrix', category: 'Lattice', desc: '3D spatial voxel cube lattice', faces: '6 Voxel Faces' },
  { id: 'DNA', name: 'Double Helix', category: 'Biotech', desc: 'Intertwined genetic strands', faces: 'Helical Tube' },
  { id: 'WORMHOLE', name: 'Wormhole', category: 'Singularity', desc: 'Flared gravitational throat', faces: 'Throat Surface' },
  { id: 'HYPER_TUNNEL', name: 'Hyper Tunnel', category: 'Vortex', desc: 'Cylindrical vortex corridor', faces: 'Cylinder Wall' }
];

export const PHYSICS_EFFECTS_LIST: { id: VisualEffect; label: string; tag: string; desc: string }[] = [
  { id: 'FLOW', label: 'Wave Flow', tag: 'Acoustic', desc: 'Harmonic sine wave audio ripples' },
  { id: 'PULSE', label: 'Beat Pulse', tag: 'Percussive', desc: 'Explosive radial expansion on low-frequency kicks' },
  { id: 'NOISE', label: 'Chaos Noise', tag: 'Stochastic', desc: 'High-frequency treble agitation and dispersion' },
  { id: 'VORTEX', label: 'Vortex Lift', tag: 'Rotational', desc: 'Spiral vortex rotation driven by midrange' },
  { id: 'CURL_NOISE', label: 'Curl Turbulence', tag: 'Fluid Flow', desc: 'Bridson divergence-free fluid vortices' },
  { id: 'AIZAWA_CHAOS', label: 'Aizawa Attractor', tag: 'Chaos Orbit', desc: 'Nonlinear strange attractor differential orbits' },
  { id: 'BLACK_HOLE', label: 'Black Hole Shock', tag: 'Relativity', desc: 'Gravitational singularity collapse & blast' },
  { id: 'CHLADNI_3D', label: 'Chladni 3D Nodal', tag: 'Cymatics', desc: 'Convergência nodal acústica real e geometria harmônica por nota' },
  { id: 'LORENTZ_FORCE', label: 'Lorentz Plasma', tag: 'Plasma', desc: 'Cyclotron spirals along magnetic field lines' },
  { id: 'BROWNIAN_HEAT', label: 'Thermal Entropy', tag: 'Thermodynamics', desc: 'Langevin molecular heat diffusion' }
];

export const VisualParametersDrawer: React.FC<VisualParametersDrawerProps> = ({
  isOpen,
  onToggle,
  visualParams,
  onUpdateParams,
  currentShape,
  setShape,
  currentEffect,
  setEffect,
  analyzer,
  isPlaying
}) => {
  const [shapeCategoryFilter, setShapeCategoryFilter] = useState<string>('ALL');
  const [deformFilter, setDeformFilter] = useState<'ALL' | 'PHYSICS' | 'GEOMETRY'>('ALL');

  // Live real-time audio note & mode detection for user feedback
  const [liveNote, setLiveNote] = useState<string>('--');
  const [liveFreq, setLiveFreq] = useState<number>(0);
  const [liveModes, setLiveModes] = useState<{ n: number; m: number }>({ n: 3, m: 4 });

  useEffect(() => {
    if (!analyzer || !isPlaying) return;
    let animId: number;
    const freqArr = new Uint8Array(analyzer.frequencyBinCount);
    const timeArr = new Uint8Array(analyzer.frequencyBinCount);

    const check = () => {
      const data = analyzeFrequencies(analyzer, freqArr, timeArr, analyzer.context.sampleRate);
      if (data.note) setLiveNote(data.note);
      if (data.dominantFrequency) setLiveFreq(Math.round(data.dominantFrequency));
      if (data.chladniModes) setLiveModes({ n: data.chladniModes.n, m: data.chladniModes.m });
      animId = requestAnimationFrame(check);
    };
    check();
    return () => cancelAnimationFrame(animId);
  }, [analyzer, isPlaying]);

  const filteredTopologies = TOPOLOGY_LIST.filter(t => {
    if (shapeCategoryFilter === 'ALL') return true;
    if (shapeCategoryFilter === 'PLATONIC') return t.category === 'Platonic' || t.category === 'Prism';
    if (shapeCategoryFilter === 'SURFACES') return t.category === 'Topology' || t.category === 'Geodesic' || t.category === 'Surface' || t.category === 'Minimal';
    if (shapeCategoryFilter === 'HARMONIC') return t.category === 'Spherical' || t.category === 'Curvature' || t.category === 'Grid' || t.category === 'Cosmic' || t.category === 'Harmonic';
    if (shapeCategoryFilter === 'VORTEX') return t.category === 'Lattice' || t.category === 'Biotech' || t.category === 'Singularity' || t.category === 'Vortex';
    return true;
  });

  const handleResetDefaults = () => {
    onUpdateParams({
      colorTheme: 'CYBER_CYAN',
      customColorBase: '#001133',
      customColorAccent: '#00f0ff',
      customColorPeak: '#ffffff',
      particleSize: 0.16,
      audioReactivity: 1.0,
      particleSpeed: 0.10,
      bloomIntensity: 2.2,
      autoRotateSpeed: 0.6,
      surfaceRenderMode: 'HYBRID',
      surfaceOpacity: 0.35,
      wireframeOpacity: 0.65,
      showWireframe: true,
      deformTwist: 0.0,
      deformTaper: 0.0,
      deformBend: 0.0,
      deformInflate: 0.0,
      deformFacet: 0.0,
      deformSuperformula: 0.0,
      deformSpacetimeWarp: 0.0,
      deformSphericalHarmonics: 0.0,
      deformChladniResonance: 0.0,
      deformMagneticDipole: 0.0,
      deformVortexCore: 0.0,
      deformRipple: 0.0,
      deformNoiseWarp: 0.0
    });
  };

  const handleResetDeformations = () => {
    onUpdateParams({
      deformTwist: 0.0,
      deformTaper: 0.0,
      deformBend: 0.0,
      deformInflate: 0.0,
      deformFacet: 0.0,
      deformSuperformula: 0.0,
      deformSpacetimeWarp: 0.0,
      deformSphericalHarmonics: 0.0,
      deformChladniResonance: 0.0,
      deformMagneticDipole: 0.0,
      deformVortexCore: 0.0,
      deformRipple: 0.0,
      deformNoiseWarp: 0.0
    });
  };

  return (
    <>
      {/* COLLAPSED FLOATING TRIGGER TAB (ON THE LEFT) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="pointer-events-auto absolute top-20 left-0 z-30 bg-zinc-950/90 hover:bg-black border-r-2 border-y border-cyan-500/70 text-cyan-400 py-2.5 px-2 rounded-r-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] flex flex-col items-center gap-1.5 transition-all hover:translate-x-1"
          title="Open Visual Parameters & Color Settings"
        >
          <ChevronRight className="w-4 h-4" />
          <Palette className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[9px] font-mono font-bold tracking-widest [writing-mode:vertical-lr] uppercase text-zinc-300">
            VISUAL LAB
          </span>
        </button>
      )}

      {/* DOCKED SIDEBAR DRAWER (ON THE LEFT) */}
      <div 
        className={`pointer-events-auto absolute top-14 bottom-16 left-3 sm:left-4 z-30 w-76 sm:w-88 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen 
            ? 'translate-x-0 opacity-100 pointer-events-auto' 
            : '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 bg-zinc-950/95 backdrop-blur-xl border border-cyan-900/60 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-white font-rajdhani">
          
          {/* DRAWER HEADER */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-cyan-900/40 bg-black/60">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono">
                  VISUAL & GEOMETRY LAB
                </h3>
                <span className="text-[9px] text-zinc-400 font-mono block">
                  Topologies, Surfaces, Deformations & Particles
                </span>
              </div>
            </div>

            <button
              onClick={onToggle}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Hide Menu"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* SCROLLABLE SETTINGS CONTENT */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">

            {/* 1. 3D SURFACE & MESH REPRESENTATION */}
            <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-cyan-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Surface Faces & Mesh Style
                </span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {visualParams.surfaceRenderMode}
                </span>
              </div>

              {/* RENDER MODE SWITCHER */}
              <div className="grid grid-cols-2 gap-1 font-mono text-[9px]">
                {[
                  { id: 'HYBRID', label: 'Hybrid Mesh', sub: 'Faces + Wire + Particles' },
                  { id: 'SURFACE_ONLY', label: 'Surface Solid', sub: 'Faceted 3D Surface' },
                  { id: 'WIREFRAME', label: 'Wireframe Cage', sub: 'Glowing Lattice' },
                  { id: 'PARTICLES_ONLY', label: 'Pure Particles', sub: 'Quantum Cloud' }
                ].map(mode => {
                  const isSel = visualParams.surfaceRenderMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => onUpdateParams({ surfaceRenderMode: mode.id as SurfaceRenderMode })}
                      className={`p-1.5 rounded-md border text-left transition-all ${
                        isSel 
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="font-bold block truncate">{mode.label}</span>
                      <span className="text-[7px] text-zinc-500 block truncate">{mode.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* OPACITY SLIDERS */}
              {visualParams.surfaceRenderMode !== 'PARTICLES_ONLY' && (
                <div className="space-y-2 pt-1 border-t border-zinc-800/80 font-mono text-[9px]">
                  {/* FACE OPACITY */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-400">SURFACE FACE OPACITY</span>
                      <span className="text-cyan-300 font-bold">{Math.round(visualParams.surfaceOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={visualParams.surfaceOpacity}
                      onChange={(e) => onUpdateParams({ surfaceOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>

                  {/* WIREFRAME OPACITY */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-400">WIREFRAME EDGE OPACITY</span>
                      <span className="text-cyan-300 font-bold">{Math.round(visualParams.wireframeOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={visualParams.wireframeOpacity}
                      onChange={(e) => onUpdateParams({ wireframeOpacity: parseFloat(e.target.value) })}
                      className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. GEOMETRIC & PHYSICAL DEFORMATION PARAMETERS (13 MATHEMATICAL MODIFIERS) */}
            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-indigo-900/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  Distorção Físico-Matemática (13 Modificadores)
                </span>
                <button
                  onClick={handleResetDeformations}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[8px] font-mono flex items-center gap-1 transition-all"
                  title="Zerar todas as distorções para valores neutros"
                >
                  <RefreshCcw className="w-2.5 h-2.5" />
                  <span>ZERAR</span>
                </button>
              </div>

              {/* 1-CLICK QUICK PRESETS OF PHYSICAL & MATHEMATICAL FORMS */}
              <div>
                <span className="text-[8px] font-mono text-zinc-400 tracking-wider uppercase mb-1 block">
                  Presets Rápidos de Formas Físicas:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => onUpdateParams({
                      deformSpacetimeWarp: 1.35,
                      deformVortexCore: 1.1,
                      deformInflate: -0.3,
                      deformTwist: 0.4,
                      deformSphericalHarmonics: 0.0,
                      deformChladniResonance: 0.0,
                      deformMagneticDipole: 0.0,
                      deformSuperformula: 0.0,
                      deformRipple: 0.2,
                      deformNoiseWarp: 0.0,
                      deformFacet: 0.0,
                      deformTaper: 0.0,
                      deformBend: 0.0
                    })}
                    className="p-1 rounded bg-zinc-950/80 hover:bg-indigo-950/70 border border-indigo-900/50 hover:border-indigo-400 text-left transition-all group"
                  >
                    <div className="text-[9px] font-bold text-indigo-300 group-hover:text-white flex items-center gap-1">
                      <span>🌀</span> Kerr Singularity
                    </div>
                    <div className="text-[7px] text-zinc-500 line-clamp-1">Espaço-tempo & Vórtice</div>
                  </button>

                  <button
                    onClick={() => onUpdateParams({
                      deformSphericalHarmonics: 1.5,
                      deformInflate: 0.35,
                      deformTwist: 0.3,
                      deformSpacetimeWarp: 0.0,
                      deformChladniResonance: 0.0,
                      deformMagneticDipole: 0.0,
                      deformSuperformula: 0.0,
                      deformVortexCore: 0.0,
                      deformRipple: 0.0,
                      deformNoiseWarp: 0.0,
                      deformFacet: 0.0,
                      deformTaper: 0.0,
                      deformBend: 0.0
                    })}
                    className="p-1 rounded bg-zinc-950/80 hover:bg-indigo-950/70 border border-indigo-900/50 hover:border-indigo-400 text-left transition-all group"
                  >
                    <div className="text-[9px] font-bold text-indigo-300 group-hover:text-white flex items-center gap-1">
                      <span>⚛️</span> Quantum Orbital
                    </div>
                    <div className="text-[7px] text-zinc-500 line-clamp-1">Harmônicos Y_l^m</div>
                  </button>

                  <button
                    onClick={() => {
                      setShape('CHLADNI_PLATE');
                      setEffect('CHLADNI_3D');
                      onUpdateParams({
                        deformChladniResonance: 1.3,
                        chladniAutoHarmonic: true,
                        chladniParticleDispersion: 0.88,
                        chladniPlateShape: 'SQUARE',
                        deformFacet: 0.0,
                        deformRipple: 0.0,
                        deformSphericalHarmonics: 0.0,
                        deformSpacetimeWarp: 0.0,
                        deformMagneticDipole: 0.0,
                        deformSuperformula: 0.0,
                        deformVortexCore: 0.0,
                        deformNoiseWarp: 0.0,
                        deformTwist: 0.0,
                        deformTaper: 0.0,
                        deformBend: 0.0,
                        deformInflate: 0.0
                      });
                    }}
                    className="p-1 rounded bg-zinc-950/80 hover:bg-indigo-950/70 border border-indigo-900/50 hover:border-cyan-400 text-left transition-all group"
                  >
                    <div className="text-[9px] font-bold text-cyan-300 group-hover:text-white flex items-center gap-1">
                      <span>🔔</span> Placa Chladni
                    </div>
                    <div className="text-[7px] text-zinc-500 line-clamp-1">Geometria Acústica Real</div>
                  </button>

                  <button
                    onClick={() => onUpdateParams({
                      deformMagneticDipole: 1.4,
                      deformTaper: 0.35,
                      deformTwist: 0.45,
                      deformSpacetimeWarp: 0.0,
                      deformSphericalHarmonics: 0.0,
                      deformChladniResonance: 0.0,
                      deformSuperformula: 0.0,
                      deformVortexCore: 0.0,
                      deformRipple: 0.0,
                      deformNoiseWarp: 0.0,
                      deformFacet: 0.0,
                      deformBend: 0.0,
                      deformInflate: 0.0
                    })}
                    className="p-1 rounded bg-zinc-950/80 hover:bg-indigo-950/70 border border-indigo-900/50 hover:border-indigo-400 text-left transition-all group"
                  >
                    <div className="text-[9px] font-bold text-indigo-300 group-hover:text-white flex items-center gap-1">
                      <span>🧲</span> Magnetic Bottle
                    </div>
                    <div className="text-[7px] text-zinc-500 line-clamp-1">Dipolo Tokamak</div>
                  </button>

                  <button
                    onClick={() => onUpdateParams({
                      deformSuperformula: 1.35,
                      deformBend: 0.35,
                      deformTwist: 0.4,
                      deformSpacetimeWarp: 0.0,
                      deformSphericalHarmonics: 0.0,
                      deformChladniResonance: 0.0,
                      deformMagneticDipole: 0.0,
                      deformVortexCore: 0.0,
                      deformRipple: 0.0,
                      deformNoiseWarp: 0.0,
                      deformFacet: 0.0,
                      deformTaper: 0.0,
                      deformInflate: 0.0
                    })}
                    className="p-1 rounded bg-zinc-950/80 hover:bg-indigo-950/70 border border-indigo-900/50 hover:border-indigo-400 text-left transition-all group"
                  >
                    <div className="text-[9px] font-bold text-indigo-300 group-hover:text-white flex items-center gap-1">
                      <span>🌸</span> Gielis Flower
                    </div>
                    <div className="text-[7px] text-zinc-500 line-clamp-1">Morfogênese 5-Fold</div>
                  </button>

                  <button
                    onClick={() => onUpdateParams({
                      deformVortexCore: 1.4,
                      deformTwist: 0.6,
                      deformRipple: 0.7,
                      deformSpacetimeWarp: 0.3,
                      deformSphericalHarmonics: 0.0,
                      deformChladniResonance: 0.0,
                      deformMagneticDipole: 0.0,
                      deformSuperformula: 0.0,
                      deformNoiseWarp: 0.2,
                      deformFacet: 0.0,
                      deformTaper: 0.0,
                      deformBend: 0.0,
                      deformInflate: 0.0
                    })}
                    className="p-1 rounded bg-zinc-950/80 hover:bg-indigo-950/70 border border-indigo-900/50 hover:border-indigo-400 text-left transition-all group"
                  >
                    <div className="text-[9px] font-bold text-indigo-300 group-hover:text-white flex items-center gap-1">
                      <span>🌪️</span> Kelvin Vortex
                    </div>
                    <div className="text-[7px] text-zinc-500 line-clamp-1">Circulação de Acreção</div>
                  </button>
                </div>
              </div>

              {/* CATEGORY FILTER TOGGLE */}
              <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-800 text-[8px] font-mono">
                <button
                  onClick={() => setDeformFilter('ALL')}
                  className={`flex-1 py-1 rounded text-center transition-all ${
                    deformFilter === 'ALL'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  TODOS (13)
                </button>
                <button
                  onClick={() => setDeformFilter('PHYSICS')}
                  className={`flex-1 py-1 rounded text-center transition-all flex items-center justify-center gap-1 ${
                    deformFilter === 'PHYSICS'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Atom className="w-2.5 h-2.5" />
                  <span>FÍSICA (7)</span>
                </button>
                <button
                  onClick={() => setDeformFilter('GEOMETRY')}
                  className={`flex-1 py-1 rounded text-center transition-all flex items-center justify-center gap-1 ${
                    deformFilter === 'GEOMETRY'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Boxes className="w-2.5 h-2.5" />
                  <span>GEOMETRIA (6)</span>
                </button>
              </div>

              {/* SLIDERS LIST */}
              <div className="space-y-2 font-mono text-[9px] max-h-72 overflow-y-auto pr-1">

                {/* ===== SECTION: PHYSICS & WAVES ===== */}
                {(deformFilter === 'ALL' || deformFilter === 'PHYSICS') && (
                  <>
                    <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest pt-1 border-t border-indigo-900/30 flex items-center gap-1">
                      <Atom className="w-3 h-3 text-indigo-400" />
                      Física de Campos & Ondas
                    </div>

                    {/* 1. SCHWARZSCHILD & KERR SPACETIME */}
                    <div className={`p-1.5 rounded transition-all ${Math.abs(visualParams.deformSpacetimeWarp) > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Orbit className="w-3 h-3 text-indigo-400" />
                          Lente Gravitacional (Einstein / Kerr)
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformSpacetimeWarp > 0 ? `+${visualParams.deformSpacetimeWarp.toFixed(2)}` : visualParams.deformSpacetimeWarp.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Curvatura de espaço-tempo e arrasto inercial de Schwarzschild/Kerr</div>
                      <input
                        type="range"
                        min="-2.0"
                        max="2.0"
                        step="0.05"
                        value={visualParams.deformSpacetimeWarp}
                        onChange={(e) => onUpdateParams({ deformSpacetimeWarp: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 2. QUANTUM SPHERICAL HARMONICS */}
                    <div className={`p-1.5 rounded transition-all ${visualParams.deformSphericalHarmonics > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Atom className="w-3 h-3 text-cyan-400" />
                          Orbitais Quânticos (Y_l^m)
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformSphericalHarmonics.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Funções de onda de Schrödinger com lóbulos atômicos d/f</div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.05"
                        value={visualParams.deformSphericalHarmonics}
                        onChange={(e) => onUpdateParams({ deformSphericalHarmonics: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 3. CHLADNI 3D ACOUSTIC CYMATICS & SACRED GEOMETRY LAB */}
                    <div className="p-2 rounded bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-zinc-200 font-bold flex items-center gap-1.5 text-[9.5px]">
                          <Waves className="w-3.5 h-3.5 text-cyan-400" />
                          Ressonância Chladni & Cymatics 3D
                        </span>
                        <span className="text-cyan-300 font-bold">{visualParams.deformChladniResonance.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-400 leading-tight">
                        Física acústica real: partículas migram e condensam nas linhas nodais (onde a vibração é nula), orientadas pelas notas musicais.
                      </div>

                      {/* Slider de Intensidade */}
                      <div>
                        <div className="flex justify-between text-[8px] text-zinc-400 mb-0.5">
                          <span>Intensidade de Ressonância</span>
                          <span className="text-indigo-300 font-bold">{visualParams.deformChladniResonance.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="2.0"
                          step="0.05"
                          value={visualParams.deformChladniResonance}
                          onChange={(e) => onUpdateParams({ deformChladniResonance: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                        />
                      </div>

                      {/* Auto-Harmonic Note Lock vs Manual Modes */}
                      <div className="bg-black/60 p-2 rounded-lg border border-indigo-900/50 space-y-2">
                        
                        {/* Live Audio Note & Mode Tracking Badge */}
                        <div className="bg-zinc-950/90 p-1.5 rounded border border-cyan-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-zinc-600'}`}></span>
                            <span className="text-[8px] font-mono font-bold text-zinc-300">
                              {isPlaying ? 'AUDIO LINK' : 'STANDBY'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[8px]">
                            <span className="text-cyan-400 font-extrabold text-[9px]">{liveNote}</span>
                            <span className="text-zinc-500">({liveFreq} Hz)</span>
                            <span className="px-1 py-0.5 rounded bg-indigo-900/60 text-indigo-300 font-bold">
                              Modos: ({liveModes.n}, {liveModes.m})
                            </span>
                          </div>
                        </div>

                        {/* Mode Switcher: Auto Note Track vs Manual Fixed Mode */}
                        <div className="grid grid-cols-2 gap-1 font-mono">
                          <button
                            onClick={() => onUpdateParams({ chladniAutoHarmonic: true })}
                            className={`py-1.5 px-2 rounded text-[8px] font-bold flex items-center justify-center gap-1 transition-all ${
                              (visualParams.chladniAutoHarmonic ?? true)
                                ? 'bg-cyan-500 text-black font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                          >
                            <Music className="w-3 h-3" />
                            <span>SEGUIR MÚSICA (AUTO)</span>
                          </button>

                          <button
                            onClick={() => onUpdateParams({ chladniAutoHarmonic: false })}
                            className={`py-1.5 px-2 rounded text-[8px] font-bold flex items-center justify-center gap-1 transition-all ${
                              !(visualParams.chladniAutoHarmonic ?? true)
                                ? 'bg-indigo-600 text-white font-extrabold shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                          >
                            <Sliders className="w-3 h-3" />
                            <span>MODO MANUAL FIXO</span>
                          </button>
                        </div>

                        {(visualParams.chladniAutoHarmonic ?? true) ? (
                          <div className="space-y-1.5">
                            <div className="text-[7.5px] text-cyan-200/90 bg-cyan-950/40 p-1.5 rounded border border-cyan-800/40 font-mono leading-relaxed">
                              🎵 <strong>Sincronia Harmônica Ativa:</strong> As notas da música sintetizam as geometrias acústicas em tempo real. Cada nota diferente altera as linhas nodais onde a areia se acomoda.
                            </div>

                            {/* Sensitivity slider */}
                            <div>
                              <div className="flex justify-between text-[7.5px] font-mono text-zinc-400 mb-0.5">
                                <span>REATIVIDADE / FORÇA DO SOM</span>
                                <span className="text-cyan-300 font-bold">{((visualParams.audioReactivity ?? 1.0) * 100).toFixed(0)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0.3"
                                max="2.5"
                                step="0.1"
                                value={visualParams.audioReactivity ?? 1.0}
                                onChange={(e) => onUpdateParams({ audioReactivity: parseFloat(e.target.value) })}
                                className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1 border-t border-zinc-800/80 font-mono">
                            <div className="flex items-center justify-between text-[7.5px] text-amber-300/90 bg-amber-950/30 p-1 rounded border border-amber-800/30">
                              <span>Modo Fixo: Partículas dançam nos modos N e M abaixo</span>
                              <button
                                onClick={() => onUpdateParams({ chladniAutoHarmonic: true })}
                                className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold underline"
                              >
                                Reativar Auto
                              </button>
                            </div>

                            <div>
                              <div className="flex justify-between text-[7.5px] text-zinc-400 mb-0.5">
                                <span>Modo Nodal N (Linhas X)</span>
                                <span className="text-cyan-300 font-bold">{visualParams.chladniModeN ?? 3}</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={visualParams.chladniModeN ?? 3}
                                onChange={(e) => onUpdateParams({ chladniModeN: parseInt(e.target.value, 10), chladniAutoHarmonic: false })}
                                className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-[7.5px] text-zinc-400 mb-0.5">
                                <span>Modo Nodal M (Linhas Y/Z)</span>
                                <span className="text-cyan-300 font-bold">{visualParams.chladniModeM ?? 4}</span>
                              </div>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={visualParams.chladniModeM ?? 4}
                                onChange={(e) => onUpdateParams({ chladniModeM: parseInt(e.target.value, 10), chladniAutoHarmonic: false })}
                                className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                              />
                            </div>

                            {/* Presets de Figuras Clássicas Históricas */}
                            <div className="pt-1">
                              <div className="text-[7px] text-zinc-400 uppercase tracking-wider mb-1 font-bold">
                                🏛️ Arquétipos Físico-Matemáticos de Chladni & Waller:
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 2, chladniModeM: 2, chladniModalMixing: 0.15, 
                                      chladniPlateShape: 'SQUARE', chladniAutoHarmonic: false, deformChladniResonance: 1.3 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Anéis concêntricos e trevo de 4 folhas (Modo 2,2)"
                                >
                                  Trevo / Anéis (2,2)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 3, chladniModeM: 2, chladniModalMixing: 0.25, 
                                      chladniPlateShape: 'SQUARE', chladniAutoHarmonic: false, deformChladniResonance: 1.3 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Mandala oval harmônica (Modo 3,2)"
                                >
                                  Mandala Oval (3,2)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 4, chladniModeM: 3, chladniModalMixing: 0.35, 
                                      chladniPlateShape: 'SQUARE', chladniAutoHarmonic: false, deformChladniResonance: 1.4 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Lótus de 8 pétalas sagradas (Modo 4,3)"
                                >
                                  Lótus 8 Pétalas (4,3)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 5, chladniModeM: 2, chladniModalMixing: 0.20, 
                                      chladniPlateShape: 'SQUARE', chladniAutoHarmonic: false, deformChladniResonance: 1.4 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Estrela decagonal acústica (Modo 5,2)"
                                >
                                  Estrela Sagrada (5,2)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 5, chladniModeM: 3, chladniModalMixing: 0.40, 
                                      chladniPlateShape: 'SQUARE', chladniAutoHarmonic: false, deformChladniResonance: 1.5 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Flor da Vida acústica de Mary Waller (Modo 5,3)"
                                >
                                  Flor da Vida (5,3)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 4, chladniModeM: 4, chladniModalMixing: 0.05, 
                                      chladniPlateShape: 'SQUARE', chladniAutoHarmonic: false, deformChladniResonance: 1.4 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Grade de diamante pura sem diagonais (Modo 4,4)"
                                >
                                  Grade Diamante (4,4)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 6, chladniModeM: 4, chladniModalMixing: 0.50, 
                                      chladniPlateShape: 'SQUARE', chladniAutoHarmonic: false, deformChladniResonance: 1.5 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Labirinto acústico de ressonância (Modo 6,4)"
                                >
                                  Labirinto (6,4)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 4, chladniModeM: 3, chladniModalMixing: 0.25, 
                                      chladniPlateShape: 'CIRCULAR', chladniAutoHarmonic: false, deformChladniResonance: 1.4 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Modo Bessel circular com anéis concêntricos e raios (Modo 4,3)"
                                >
                                  Bessel Circular (4,3)
                                </button>
                                <button
                                  onClick={() => {
                                    setShape('CHLADNI_PLATE');
                                    setEffect('CHLADNI_3D');
                                    onUpdateParams({ 
                                      chladniModeN: 5, chladniModeM: 3, chladniModalMixing: 0.30, 
                                      chladniPlateShape: 'HEXAGONAL', chladniAutoHarmonic: false, deformChladniResonance: 1.5 
                                    });
                                  }}
                                  className="p-1 rounded bg-zinc-900 hover:bg-cyan-950 text-[7px] text-zinc-300 hover:text-cyan-200 border border-zinc-800 hover:border-cyan-500 text-center transition-all"
                                  title="Cristal hexagonal com interferência a 120° (Hans Jenny)"
                                >
                                  Cymatics Hexagonal
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Equilíbrio Modal Alpha (Morfologia Ritz: Anéis vs Cruzes) */}
                        <div className="pt-1 font-mono">
                          <div className="flex justify-between text-[7.5px] text-zinc-400 mb-0.5">
                            <span>MORFOLOGIA RITZ / EQUILÍBRIO MODAL α</span>
                            <span className="text-cyan-300 font-bold">
                              {(visualParams.chladniModalMixing ?? 0.25).toFixed(2)} (
                              {(visualParams.chladniModalMixing ?? 0.25) < 0.2 ? 'Anéis Fechados' : (visualParams.chladniModalMixing ?? 0.25) > 0.7 ? 'Cruzes Diagonais' : 'Híbrido de Waller'}
                              )
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.05"
                            value={visualParams.chladniModalMixing ?? 0.25}
                            onChange={(e) => onUpdateParams({ chladniModalMixing: parseFloat(e.target.value) })}
                            className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                          />
                          <div className="flex justify-between text-[6.5px] text-zinc-500 mt-0.5">
                            <span>0.0 Anéis/Círculos</span>
                            <span>0.5 Misto Waller</span>
                            <span>1.0 Cruz Diagonal</span>
                          </div>
                        </div>

                        {/* Placa: Quadrada vs Circular vs Hexagonal */}
                        <div className="pt-1 flex items-center justify-between font-mono">
                          <span className="text-[7.5px] text-zinc-400">GEOMETRIA DA PLACA:</span>
                          <div className="flex gap-1 text-[7.5px]">
                            <button
                              onClick={() => onUpdateParams({ chladniPlateShape: 'SQUARE' })}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                (visualParams.chladniPlateShape ?? 'SQUARE') === 'SQUARE'
                                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
                              }`}
                            >
                              Quadrada
                            </button>
                            <button
                              onClick={() => onUpdateParams({ chladniPlateShape: 'CIRCULAR' })}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                visualParams.chladniPlateShape === 'CIRCULAR'
                                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
                              }`}
                            >
                              Circular (Bessel)
                            </button>
                            <button
                              onClick={() => onUpdateParams({ chladniPlateShape: 'HEXAGONAL' })}
                              className={`px-1.5 py-0.5 rounded transition-all ${
                                visualParams.chladniPlateShape === 'HEXAGONAL'
                                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
                              }`}
                            >
                              Hexagonal (Cymatics)
                            </button>
                          </div>
                        </div>

                        {/* Multi-Harmonic Superposition Toggle */}
                        <div className="pt-1 flex items-center justify-between font-mono border-t border-zinc-800/60">
                          <div className="text-[7.5px] text-zinc-300">
                            <span>SOBREPOSIÇÃO MULTI-HARMÔNICA:</span>
                            <div className="text-[6.5px] text-zinc-500">Graves, médios e agudos ressoam simultaneamente</div>
                          </div>
                          <button
                            onClick={() => onUpdateParams({ chladniMultiHarmonic: !(visualParams.chladniMultiHarmonic !== false) })}
                            className={`px-2 py-0.5 rounded text-[7.5px] font-bold transition-all ${
                              (visualParams.chladniMultiHarmonic !== false)
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                            }`}
                          >
                            {(visualParams.chladniMultiHarmonic !== false) ? 'ATIVO (ORQUESTRAL)' : 'MODO ÚNICO'}
                          </button>
                        </div>

                        {/* Nitidez Nodal (Areia) */}
                        <div className="font-mono pt-1">
                          <div className="flex justify-between text-[7.5px] text-zinc-400 mb-0.5">
                            <span>NITIDEZ / CONCENTRAÇÃO DAS LINHAS NODAIS</span>
                            <span className="text-cyan-300 font-bold">{((visualParams.chladniParticleDispersion ?? 0.85) * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="1.0"
                            step="0.05"
                            value={visualParams.chladniParticleDispersion ?? 0.85}
                            onChange={(e) => onUpdateParams({ chladniParticleDispersion: parseFloat(e.target.value) })}
                            className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded cursor-pointer"
                          />
                        </div>

                        {/* Botão de 1-toque para Carregar a Placa Chladni */}
                        {currentShape !== 'CHLADNI_PLATE' && (
                          <button
                            onClick={() => {
                              setShape('CHLADNI_PLATE');
                              setEffect('CHLADNI_3D');
                              onUpdateParams({ deformChladniResonance: 1.2, chladniAutoHarmonic: true });
                            }}
                            className="w-full py-1.5 mt-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-[8.5px] font-bold font-mono flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                          >
                            <Waves className="w-3 h-3 text-cyan-400 animate-pulse" />
                            <span>MUDAR PARA PLACA CHLADNI REAL</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4. DIPOLAR MAGNETIC FIELD */}
                    <div className={`p-1.5 rounded transition-all ${Math.abs(visualParams.deformMagneticDipole) > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Magnet className="w-3 h-3 text-red-400" />
                          Dipolo Magnético (Tokamak Mirror)
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformMagneticDipole > 0 ? `+${visualParams.deformMagneticDipole.toFixed(2)}` : visualParams.deformMagneticDipole.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Linhas de força dipolar com garrafa magnética e jato polar</div>
                      <input
                        type="range"
                        min="-2.0"
                        max="2.0"
                        step="0.05"
                        value={visualParams.deformMagneticDipole}
                        onChange={(e) => onUpdateParams({ deformMagneticDipole: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 5. KELVIN / LAMB-OSEEN VORTEX */}
                    <div className={`p-1.5 rounded transition-all ${Math.abs(visualParams.deformVortexCore) > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Wind className="w-3 h-3 text-cyan-400" />
                          Vórtice de Kelvin / Lamb-Oseen
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformVortexCore > 0 ? `+${visualParams.deformVortexCore.toFixed(2)}` : visualParams.deformVortexCore.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Circulação hidrodinâmica tangencial e arrasto de acreção</div>
                      <input
                        type="range"
                        min="-2.0"
                        max="2.0"
                        step="0.05"
                        value={visualParams.deformVortexCore}
                        onChange={(e) => onUpdateParams({ deformVortexCore: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 6. SURFACE RIPPLE WAVES */}
                    <div className={`p-1.5 rounded transition-all ${visualParams.deformRipple > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-indigo-400" />
                          Ondulações Harmônicas Radiais
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformRipple.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Ondas esféricas concêntricas impulsionadas pelo áudio</div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.05"
                        value={visualParams.deformRipple}
                        onChange={(e) => onUpdateParams({ deformRipple: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 7. 3D NOISE TURBULENCE */}
                    <div className={`p-1.5 rounded transition-all ${visualParams.deformNoiseWarp > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" />
                          Turbulência Vetorial 3D
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformNoiseWarp.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Campo vetorial divergente com perturbação tridimensional</div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.5"
                        step="0.05"
                        value={visualParams.deformNoiseWarp}
                        onChange={(e) => onUpdateParams({ deformNoiseWarp: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>
                  </>
                )}

                {/* ===== SECTION: GEOMETRY & MORPHOLOGY ===== */}
                {(deformFilter === 'ALL' || deformFilter === 'GEOMETRY') && (
                  <>
                    <div className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest pt-2 border-t border-cyan-900/30 flex items-center gap-1">
                      <Boxes className="w-3 h-3 text-cyan-400" />
                      Morfologia & Geometria Estrutural
                    </div>

                    {/* 8. GIELIS SUPERFORMULA */}
                    <div className={`p-1.5 rounded transition-all ${visualParams.deformSuperformula > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          Superfórmula de Johan Gielis
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformSuperformula.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Morfogênese natural com simetria 5-fold pentagonal</div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.05"
                        value={visualParams.deformSuperformula}
                        onChange={(e) => onUpdateParams({ deformSuperformula: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 9. AXIAL TWIST */}
                    <div className={`p-1.5 rounded transition-all ${Math.abs(visualParams.deformTwist) > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <RotateCw className="w-3 h-3 text-indigo-400" />
                          Torção Axial Helicoidal
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformTwist > 0 ? `+${visualParams.deformTwist.toFixed(2)}` : visualParams.deformTwist.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Rotação angular progressiva ao longo do eixo Y</div>
                      <input
                        type="range"
                        min="-2.0"
                        max="2.0"
                        step="0.05"
                        value={visualParams.deformTwist}
                        onChange={(e) => onUpdateParams({ deformTwist: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 10. CONICAL TAPER */}
                    <div className={`p-1.5 rounded transition-all ${Math.abs(visualParams.deformTaper) > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Triangle className="w-3 h-3 text-indigo-400" />
                          Afilamento Cônico
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformTaper > 0 ? `+${visualParams.deformTaper.toFixed(2)}` : visualParams.deformTaper.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Gradiente linear de raio entre base e topo</div>
                      <input
                        type="range"
                        min="-1.0"
                        max="1.0"
                        step="0.05"
                        value={visualParams.deformTaper}
                        onChange={(e) => onUpdateParams({ deformTaper: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 11. ARC BEND */}
                    <div className={`p-1.5 rounded transition-all ${Math.abs(visualParams.deformBend) > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Compass className="w-3 h-3 text-indigo-400" />
                          Curvatura em Arco
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformBend > 0 ? `+${visualParams.deformBend.toFixed(2)}` : visualParams.deformBend.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Deflexão angular senoidal no plano coordenado</div>
                      <input
                        type="range"
                        min="-1.5"
                        max="1.5"
                        step="0.05"
                        value={visualParams.deformBend}
                        onChange={(e) => onUpdateParams({ deformBend: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 12. INFLATE / PINCH */}
                    <div className={`p-1.5 rounded transition-all ${Math.abs(visualParams.deformInflate) > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-indigo-400" />
                          Inchaço / Constrição Radial
                        </span>
                        <span className="text-indigo-300 font-bold">{visualParams.deformInflate > 0 ? `+${visualParams.deformInflate.toFixed(2)}` : visualParams.deformInflate.toFixed(2)}</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Bulbo esférico volumétrico ou estrangulamento hiperbólico</div>
                      <input
                        type="range"
                        min="-1.5"
                        max="1.5"
                        step="0.05"
                        value={visualParams.deformInflate}
                        onChange={(e) => onUpdateParams({ deformInflate: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    {/* 13. FACET MORPH */}
                    <div className={`p-1.5 rounded transition-all ${visualParams.deformFacet > 0.01 ? 'bg-indigo-950/40 border border-indigo-500/30' : ''}`}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-zinc-300 flex items-center gap-1">
                          <Hexagon className="w-3 h-3 text-cyan-400" />
                          Facetamento Cristalino
                        </span>
                        <span className="text-indigo-300 font-bold">{(visualParams.deformFacet * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-[7.5px] text-zinc-500 mb-1">Quantização planar discreta de coordenadas 3D</div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={visualParams.deformFacet}
                        onChange={(e) => onUpdateParams({ deformFacet: parseFloat(e.target.value) })}
                        className="w-full accent-indigo-400 h-1 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. 3D GEOMETRY TOPOLOGIES (20 SHAPES INCLUDING SURFACE POLYHEDRA) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5" />
                  3D Geometry Topologies (20 Types)
                </span>
                <span className="text-[9px] font-mono text-zinc-400">
                  {TOPOLOGY_LIST.find(t => t.id === currentShape)?.faces}
                </span>
              </div>

              {/* CATEGORY FILTER TABS */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-1.5 text-[8px] font-mono scrollbar-none">
                {[
                  { id: 'ALL', label: 'All (20)' },
                  { id: 'PLATONIC', label: 'Platonic Faces' },
                  { id: 'SURFACES', label: 'Surfaces' },
                  { id: 'HARMONIC', label: 'Harmonic' },
                  { id: 'VORTEX', label: 'Lattice & Warp' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setShapeCategoryFilter(cat.id)}
                    className={`px-2 py-0.5 rounded-full border whitespace-nowrap transition-all ${
                      shapeCategoryFilter === cat.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredTopologies.map(top => {
                  const isSelected = currentShape === top.id;
                  return (
                    <button
                      key={top.id}
                      onClick={() => setShape(top.id)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold font-mono truncate block">
                          {top.name}
                        </span>
                        <span className={`text-[7px] font-mono px-1 rounded ${
                          isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {top.faces}
                        </span>
                      </div>
                      <span className="text-[8px] text-zinc-500 block truncate">
                        {top.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. COLOR THEMES */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Color Palettes
                </span>
                <span className="text-[9px] font-mono text-zinc-400">
                  {COLOR_PRESETS.find(c => c.id === visualParams.colorTheme)?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {COLOR_PRESETS.map(preset => {
                  const isSelected = visualParams.colorTheme === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onUpdateParams({ colorTheme: preset.id })}
                      className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[10px] font-bold truncate block">
                          {preset.label}
                        </span>
                        <div className="flex -space-x-1 shrink-0">
                          {preset.preview.map((color, idx) => (
                            <span 
                              key={idx} 
                              className="w-2.5 h-2.5 rounded-full border border-black/40 shadow" 
                              style={{ backgroundColor: color }} 
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[8px] text-zinc-500 block truncate">
                        {preset.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* CUSTOM COLOR PICKERS */}
              {visualParams.colorTheme === 'CUSTOM' && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <span className="text-[9px] font-bold font-mono text-cyan-400 uppercase block">
                    Custom Tone Generators
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-mono">
                    <div>
                      <span className="text-zinc-400 block mb-1">BASE TONE</span>
                      <input
                        type="color"
                        value={visualParams.customColorBase}
                        onChange={(e) => onUpdateParams({ customColorBase: e.target.value })}
                        className="w-full h-7 rounded cursor-pointer bg-transparent border border-zinc-700"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-1">ACCENT TONE</span>
                      <input
                        type="color"
                        value={visualParams.customColorAccent}
                        onChange={(e) => onUpdateParams({ customColorAccent: e.target.value })}
                        className="w-full h-7 rounded cursor-pointer bg-transparent border border-zinc-700"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-400 block mb-1">PEAK TONE</span>
                      <input
                        type="color"
                        value={visualParams.customColorPeak}
                        onChange={(e) => onUpdateParams({ customColorPeak: e.target.value })}
                        className="w-full h-7 rounded cursor-pointer bg-transparent border border-zinc-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. PHYSICS & VECTOR FIELD MODELS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5" />
                  Physics & Vector Fields (10 Modes)
                </span>
                <span className="text-[9px] font-mono text-indigo-300">
                  {PHYSICS_EFFECTS_LIST.find(e => e.id === currentEffect)?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {PHYSICS_EFFECTS_LIST.map(eff => {
                  const isSelected = currentEffect === eff.id;
                  return (
                    <button
                      key={eff.id}
                      onClick={() => setEffect(eff.id)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold font-mono truncate block">
                          {eff.label}
                        </span>
                        <span className={`text-[7px] font-mono px-1 rounded ${
                          isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {eff.tag}
                        </span>
                      </div>
                      <span className="text-[8px] text-zinc-500 block truncate">
                        {eff.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. PARTICLE & AUDIO REACTIVITY TUNING */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Particle Physics & Sensitivity
                </span>
              </div>

              <div className="space-y-3 bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-800 text-xs font-mono">
                {/* PARTICLE SIZE */}
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-zinc-400">PARTICLE SIZE</span>
                    <span className="text-cyan-300 font-bold">{visualParams.particleSize.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.35"
                    step="0.01"
                    value={visualParams.particleSize}
                    onChange={(e) => onUpdateParams({ particleSize: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* AUDIO REACTIVITY */}
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-zinc-400">AUDIO SENSITIVITY & DISPLACEMENT</span>
                    <span className="text-cyan-300 font-bold">{visualParams.audioReactivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.1"
                    value={visualParams.audioReactivity}
                    onChange={(e) => onUpdateParams({ audioReactivity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* MOTION INERTIA */}
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-zinc-400">MOTION FLUIDITY (INERTIA)</span>
                    <span className="text-cyan-300 font-bold">{visualParams.particleSpeed.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.03"
                    max="0.25"
                    step="0.01"
                    value={visualParams.particleSpeed}
                    onChange={(e) => onUpdateParams({ particleSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* BLOOM INTENSITY */}
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-zinc-400">NEON BLOOM GLOW</span>
                    <span className="text-cyan-300 font-bold">{visualParams.bloomIntensity.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="4.0"
                    step="0.2"
                    value={visualParams.bloomIntensity}
                    onChange={(e) => onUpdateParams({ bloomIntensity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* CAMERA AUTO-ROTATION SPEED */}
                <div>
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-zinc-400">CAMERA AUTO-ORBIT SPEED</span>
                    <span className="text-cyan-300 font-bold">{visualParams.autoRotateSpeed.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.1"
                    value={visualParams.autoRotateSpeed}
                    onChange={(e) => onUpdateParams({ autoRotateSpeed: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* DRAWER FOOTER */}
          <div className="p-3 border-t border-cyan-900/40 bg-black/80 flex items-center justify-between">
            <button
              onClick={handleResetDefaults}
              className="py-1.5 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold flex items-center gap-1.5 transition-all font-mono uppercase"
            >
              <RotateCw className="w-3 h-3" />
              <span>RESET DEFAULTS</span>
            </button>

            <span className="text-[9px] font-mono text-cyan-500 font-bold">
              GEOM SURFACE V3.0
            </span>
          </div>

        </div>
      </div>
    </>
  );
};
