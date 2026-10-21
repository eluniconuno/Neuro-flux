import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleSystemProps, AudioAnalysis, ColorTheme } from '../types';
import { analyzeFrequencies } from '../services/audioService';
import { 
  createBaseGeometryForShape, 
  applyGeometricDeformation, 
  evaluateChladniWave,
  evaluate3DCymaticsWave,
  AudioFactors 
} from '../services/deformationService';

const THEME_PALETTES: Record<ColorTheme, { base: string; accent: string; peak: string }> = {
  CYBER_CYAN: { base: '#001133', accent: '#00f0ff', peak: '#ffffff' },
  NEON_MAGENTA: { base: '#2b0033', accent: '#ff007f', peak: '#ffe6f7' },
  SOLAR_GOLD: { base: '#331600', accent: '#ff9900', peak: '#fff5db' },
  EMERALD_MATRIX: { base: '#002611', accent: '#00ff66', peak: '#e6fff0' },
  VAPORWAVE: { base: '#1a0033', accent: '#00f5d4', peak: '#ff70a6' },
  INFERNO: { base: '#330000', accent: '#ff2600', peak: '#ffff66' },
  AESTHETIC_WHITE: { base: '#141419', accent: '#9bbcd4', peak: '#ffffff' },
  CUSTOM: { base: '#001133', accent: '#00f0ff', peak: '#ffffff' }
};

export const SurfaceMesh: React.FC<ParticleSystemProps> = ({
  analyzer,
  isPlaying,
  shape,
  effect,
  visualParams
}) => {
  // If user only wants particles, don't render surface mesh
  if (visualParams?.surfaceRenderMode === 'PARTICLES_ONLY') {
    return null;
  }

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const solidMeshRef = useRef<THREE.Mesh>(null);
  const wireMeshRef = useRef<THREE.Mesh>(null);
  const smoothModalRef = useRef<{ n: number; m: number }>({ n: 3, m: 4 });

  const frequencyArray = useMemo(() => new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0), [analyzer]);
  const timeDomainArray = useMemo(() => new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0), [analyzer]);

  // Generate base geometry whenever shape changes
  const baseGeometry = useMemo(() => {
    return createBaseGeometryForShape(shape);
  }, [shape]);

  // Clone geometry and store original un-deformed vertex positions
  const { liveGeometry, originalPositions } = useMemo(() => {
    const geom = baseGeometry.clone();
    const posAttr = geom.attributes.position;
    const orig = new Float32Array(posAttr.array.length);
    orig.set(posAttr.array as Float32Array);
    return { liveGeometry: geom, originalPositions: orig };
  }, [baseGeometry]);

  // Theme colors
  const theme = visualParams?.colorTheme || 'CYBER_CYAN';
  let baseHex = THEME_PALETTES[theme]?.base || '#001133';
  let accentHex = THEME_PALETTES[theme]?.accent || '#00f0ff';
  let peakHex = THEME_PALETTES[theme]?.peak || '#ffffff';

  if (theme === 'CUSTOM' && visualParams) {
    if (visualParams.customColorBase) baseHex = visualParams.customColorBase;
    if (visualParams.customColorAccent) accentHex = visualParams.customColorAccent;
    if (visualParams.customColorPeak) peakHex = visualParams.customColorPeak;
  }

  const baseColor = useMemo(() => new THREE.Color(baseHex), [baseHex]);
  const accentColor = useMemo(() => new THREE.Color(accentHex), [accentHex]);
  const peakColor = useMemo(() => new THREE.Color(peakHex), [peakHex]);

  useFrame((state) => {
    if (!liveGeometry) return;

    const time = state.clock.getElapsedTime();
    const posAttr = liveGeometry.attributes.position;
    const currentPositions = posAttr.array as Float32Array;

    let audioData: AudioAnalysis = {
      bass: 0, mid: 0, treble: 0, average: 0,
      frequencyArray, timeDomainArray, dominantFrequency: 0
    };

    if (analyzer && isPlaying) {
      audioData = analyzeFrequencies(analyzer, frequencyArray, timeDomainArray, analyzer.context.sampleRate);
    }

    const reactivity = visualParams?.audioReactivity ?? 1.0;
    const audioFactors: AudioFactors = {
      f_bass: Math.min(2.5, ((audioData.bass || 0) / 255.0) * reactivity),
      f_mid: Math.min(2.5, ((audioData.mid || 0) / 255.0) * reactivity),
      f_treble: Math.min(2.5, ((audioData.treble || 0) / 255.0) * reactivity),
      f_avg: Math.min(2.5, ((audioData.average || 0) / 255.0) * reactivity)
    };

    // Harmonic mode resolution
    let targetN = 3;
    let targetM = 4;
    const isAutoHarmonic = visualParams?.chladniAutoHarmonic !== false;

    if (isAutoHarmonic && audioData.chladniModes && audioData.chladniModes.confidence > 0) {
      targetN = audioData.chladniModes.n;
      targetM = audioData.chladniModes.m;
    } else if (visualParams?.chladniModeN && visualParams?.chladniModeM) {
      targetN = visualParams.chladniModeN;
      targetM = visualParams.chladniModeM;
    }

    smoothModalRef.current.n += (targetN - smoothModalRef.current.n) * 0.12;
    smoothModalRef.current.m += (targetM - smoothModalRef.current.m) * 0.12;
    const currentN = smoothModalRef.current.n;
    const currentM = smoothModalRef.current.m;
    const plateShape = visualParams?.chladniPlateShape ?? 'SQUARE';
    const modalMixing = visualParams?.chladniModalMixing ?? 0.25;

    const vertexCount = posAttr.count;

    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;
      const ox = originalPositions[i3];
      const oy = originalPositions[i3 + 1];
      const oz = originalPositions[i3 + 2];

      // Apply complete geometric deformations
      const deformed = applyGeometricDeformation(ox, oy, oz, visualParams, audioFactors, time);

      // Audio effect displacement on surface vertices
      let dx = 0, dy = 0, dz = 0;
      if (effect === 'FLOW') {
        const wave = Math.sin(oy * 0.15 + time * 2) * audioFactors.f_mid * 2.2;
        dy = wave;
      } else if (effect === 'PULSE') {
        const beat = audioFactors.f_bass * audioFactors.f_bass * 4;
        dx = deformed.x * 0.04 * beat;
        dy = deformed.y * 0.04 * beat;
        dz = deformed.z * 0.04 * beat;
      } else if (effect === 'VORTEX') {
        const rot = audioFactors.f_mid * 0.4;
        dx = (deformed.x * Math.cos(rot) - deformed.z * Math.sin(rot)) - deformed.x;
        dz = (deformed.x * Math.sin(rot) + deformed.z * Math.cos(rot)) - deformed.z;
      } else if (effect === 'CHLADNI_3D' || shape === 'CHLADNI_PLATE') {
        if (shape === 'CHLADNI_PLATE' || shape === 'PLANE') {
          const w = evaluateChladniWave(deformed.x, deformed.z, currentN, currentM, plateShape, 50, modalMixing);
          // Standing wave oscillation: nodal lines stay at 0, antinodes oscillate harmonically with bass & mids!
          dy = w * Math.sin(time * 14) * (audioFactors.f_bass * 5.0 + audioFactors.f_mid * 3.5 + audioFactors.f_treble * 1.5 + 0.8);
        } else {
          const w = evaluate3DCymaticsWave(deformed.x, deformed.y, deformed.z, currentN, currentM);
          const normDist = Math.sqrt(deformed.x * deformed.x + deformed.y * deformed.y + deformed.z * deformed.z) + 0.001;
          const waveDisp = w * Math.sin(time * 14) * (audioFactors.f_bass * 4.0 + audioFactors.f_mid * 2.8 + audioFactors.f_treble * 1.5 + 0.8);
          dx = (deformed.x / normDist) * waveDisp;
          dy = (deformed.y / normDist) * waveDisp;
          dz = (deformed.z / normDist) * waveDisp;
        }
      }

      currentPositions[i3] = deformed.x + dx;
      currentPositions[i3 + 1] = deformed.y + dy;
      currentPositions[i3 + 2] = deformed.z + dz;
    }

    posAttr.needsUpdate = true;
    liveGeometry.computeVertexNormals();
  });

  const renderMode = visualParams?.surfaceRenderMode || 'HYBRID';
  const showFaces = renderMode === 'HYBRID' || renderMode === 'SURFACE_ONLY';
  const showWire = (renderMode === 'HYBRID' || renderMode === 'WIREFRAME') && 
                   (visualParams?.showWireframe ?? true) && 
                   (visualParams?.wireframeOpacity ?? 0.65) > 0.01;

  const surfaceOpacity = visualParams?.surfaceOpacity ?? 0.35;
  const wireOpacity = visualParams?.wireframeOpacity ?? 0.65;

  return (
    <group>
      {/* 1. SOLID / TRANSLUCENT FACETED SURFACE MESH */}
      {showFaces && (
        <mesh ref={solidMeshRef} geometry={liveGeometry}>
          <meshStandardMaterial
            color={accentColor}
            emissive={baseColor}
            emissiveIntensity={0.65}
            roughness={0.25}
            metalness={0.8}
            transparent={true}
            opacity={surfaceOpacity}
            flatShading={true}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 2. GLOWING FACET WIREFRAME EDGES */}
      {showWire && (
        <mesh ref={wireMeshRef} geometry={liveGeometry}>
          <meshBasicMaterial
            wireframe={true}
            color={peakColor}
            transparent={true}
            opacity={wireOpacity}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};
