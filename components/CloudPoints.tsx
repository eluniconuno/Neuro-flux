import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleSystemProps, AudioAnalysis, VisualShape, ColorTheme, VisualParameters } from '../types';
import { analyzeFrequencies } from '../services/audioService';
import { 
  applyGeometricDeformation, 
  sampleShapeSurfacePoint,
  calculateChladniNodalOffset,
  calculate3DCymaticsNodalOffset
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

export const CloudPoints: React.FC<ParticleSystemProps> = ({ 
  analyzer, 
  isPlaying, 
  shape, 
  effect, 
  visualParams 
}) => {
  const meshRef = useRef<THREE.Points>(null);
  const smoothModalRef = useRef<{ n: number; m: number }>({ n: 3, m: 4 });
  
  // 12,000 particles provides an exceptional balance between density and 60fps performance
  const PARTICLE_COUNT = 12000;
  
  const frequencyArray = useMemo(() => new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0), [analyzer]);
  const timeDomainArray = useMemo(() => new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0), [analyzer]);
  
  // Initialize particles buffers
  const particles = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const indices = new Float32Array(PARTICLE_COUNT);

    const c = new THREE.Color();
    c.setHSL(0.5, 1.0, 0.5);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      indices[i] = i;
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    return { positions, colors, indices };
  }, []);

  // Helper to lerp values safely
  const lerp = (start: number, end: number, t: number) => {
    if (isNaN(start)) start = 0;
    if (isNaN(end)) end = 0;
    return start * (1 - t) + end * t;
  };

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const colors = meshRef.current.geometry.attributes.color.array as Float32Array;
    
    let audioData: AudioAnalysis = { 
      bass: 0, mid: 0, treble: 0, average: 0, 
      frequencyArray, timeDomainArray, dominantFrequency: 0
    };

    if (analyzer && isPlaying) {
      audioData = analyzeFrequencies(analyzer, frequencyArray, timeDomainArray, analyzer.context.sampleRate);
    }

    // Audio Reactivity Multiplier from parameters (default 1.0)
    const reactivity = visualParams?.audioReactivity ?? 1.0;

    // Audio Factors (Normalized 0.0 - 1.0)
    const f_bass = Math.min(2.5, ((audioData.bass || 0) / 255.0) * reactivity);
    const f_mid = Math.min(2.5, ((audioData.mid || 0) / 255.0) * reactivity);
    const f_treble = Math.min(2.5, ((audioData.treble || 0) / 255.0) * reactivity);
    const f_avg = Math.min(2.5, ((audioData.average || 0) / 255.0) * reactivity);

    // Color Theme Resolution
    const theme = visualParams?.colorTheme || 'CYBER_CYAN';
    let baseHex = THEME_PALETTES[theme]?.base || '#001133';
    let accentHex = THEME_PALETTES[theme]?.accent || '#00f0ff';
    let peakHex = THEME_PALETTES[theme]?.peak || '#ffffff';

    if (theme === 'CUSTOM' && visualParams) {
      if (visualParams.customColorBase) baseHex = visualParams.customColorBase;
      if (visualParams.customColorAccent) accentHex = visualParams.customColorAccent;
      if (visualParams.customColorPeak) peakHex = visualParams.customColorPeak;
    }

    const colorBase = new THREE.Color(baseHex);
    const colorHigh = new THREE.Color(accentHex);
    const colorPeak = new THREE.Color(peakHex);

    // Lerp factor for smooth movement (inertia)
    const baseSpeed = visualParams?.particleSpeed ?? 0.1;
    const lerpFactor = shape === 'CHLADNI_PLATE' || effect === 'CHLADNI_3D'
      ? Math.min(0.85, Math.max(0.20, baseSpeed * 2.5))
      : baseSpeed;
    const freqArrayLen = audioData.frequencyArray.length;

    // Target Chladni harmonic modes from musical audio pitch
    let targetN = 3;
    let targetM = 4;
    let targetAlpha = 0.25;
    const isAutoHarmonic = visualParams?.chladniAutoHarmonic !== false;

    if (isAutoHarmonic) {
      if (audioData.chladniModes && audioData.chladniModes.confidence > 0) {
        targetN = audioData.chladniModes.n;
        targetM = audioData.chladniModes.m;
        if (audioData.chladniModes.alpha !== undefined) {
          targetAlpha = audioData.chladniModes.alpha;
        }
      }
    } else {
      if (visualParams?.chladniModeN) targetN = visualParams.chladniModeN;
      if (visualParams?.chladniModeM) targetM = visualParams.chladniModeM;
      if (visualParams?.chladniModalMixing !== undefined) targetAlpha = visualParams.chladniModalMixing;
    }

    // Smooth harmonic mode transition (avoids harsh jump when notes change)
    smoothModalRef.current.n += (targetN - smoothModalRef.current.n) * 0.16;
    smoothModalRef.current.m += (targetM - smoothModalRef.current.m) * 0.16;
    const currentN = smoothModalRef.current.n;
    const currentM = smoothModalRef.current.m;
    const chladniTightness = visualParams?.chladniParticleDispersion ?? 0.85;
    const plateShape = visualParams?.chladniPlateShape ?? 'SQUARE';
    const modalMixing = visualParams?.chladniModalMixing !== undefined ? visualParams.chladniModalMixing : targetAlpha;
    const multiHarmonic = visualParams?.chladniMultiHarmonic !== false;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      
      // Calculate Target Position based on Topology Shape
      let tx = 0, ty = 0, tz = 0;
      const idxNorm = i / PARTICLE_COUNT; // 0.0 to 1.0

      // ================= TOPOLOGY MATH ENGINE =================
      if (shape === 'ORB') {
        // Fibonacci Golden Ratio Sphere Distribution
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const theta = 2 * Math.PI * i / goldenRatio;
        const phiInput = 1 - 2 * (i + 0.5) / PARTICLE_COUNT;
        const phi = Math.acos(Math.max(-1, Math.min(1, phiInput)));
        const r = 20;

        tx = r * Math.sin(phi) * Math.cos(theta);
        ty = r * Math.cos(phi);
        tz = r * Math.sin(phi) * Math.sin(theta);

      } else if (shape === 'TORUS') {
        // Toroidal ring coordinates
        const u = idxNorm * Math.PI * 2 * 20; // 20 loops
        const v = idxNorm * Math.PI * 2;
        const R = 20; // Main radius
        const r = 6;  // Tube radius

        tx = (R + r * Math.cos(v)) * Math.cos(u);
        tz = (R + r * Math.cos(v)) * Math.sin(u);
        ty = r * Math.sin(v);

      } else if (shape === 'PLANE') {
        // Grid Wave Plane
        const size = 60;
        const side = Math.sqrt(PARTICLE_COUNT);
        const x = (i % side) / side; // 0 to 1
        const z = Math.floor(i / side) / side; // 0 to 1
        
        tx = (x - 0.5) * size;
        ty = 0;
        tz = (z - 0.5) * size;
      
      } else if (shape === 'DNA') {
        // Double Helix
        const h = 60;
        const turns = 5;
        const y = (idxNorm - 0.5) * h;
        const angle = idxNorm * Math.PI * 2 * turns;
        const r = 10;
        const offset = i % 2 === 0 ? 0 : Math.PI;
        
        tx = Math.cos(angle + offset) * r;
        ty = y;
        tz = Math.sin(angle + offset) * r;

      } else if (shape === 'GALAXY') {
        // Double Arm Logarithmic Spiral Galaxy with central cosmic bulge
        const arm = i % 2;
        const armOffset = arm * Math.PI;
        const dist = Math.pow(idxNorm, 0.55) * 32 + 1.5; 
        const spiralAngle = dist * 0.35 + armOffset;
        const dispersion = (Math.sin(i * 99) * 0.5 + 0.5);
        const zSpread = (Math.sin(i * 13) * 12) / (dist * 0.25 + 1);

        tx = Math.cos(spiralAngle) * dist + (Math.cos(i) * dispersion * 2);
        tz = Math.sin(spiralAngle) * dist + (Math.sin(i) * dispersion * 2);
        ty = zSpread;

      } else if (shape === 'TREFOIL_KNOT') {
        // 3D Mathematical Trefoil Knot
        const t = idxNorm * Math.PI * 2;
        const scale = 7;
        const knotX = (Math.sin(t) + 2 * Math.sin(2 * t)) * scale;
        const knotY = (Math.cos(t) - 2 * Math.cos(2 * t)) * scale;
        const knotZ = (-Math.sin(3 * t)) * scale;

        const tubeAngle = idxNorm * Math.PI * 2 * 60;
        const tubeRadius = 2.8;

        tx = knotX + Math.cos(tubeAngle) * tubeRadius;
        ty = knotY + Math.sin(tubeAngle) * tubeRadius;
        tz = knotZ + Math.sin(tubeAngle * 2) * 1.5;

      } else if (shape === 'CYBER_CUBE') {
        // 3D Holographic Lattice Cube
        const sideCount = Math.round(Math.cbrt(PARTICLE_COUNT));
        const xi = (i % sideCount) / sideCount - 0.5;
        const yi = (Math.floor(i / sideCount) % sideCount) / sideCount - 0.5;
        const zi = (Math.floor(i / (sideCount * sideCount)) % sideCount) / sideCount - 0.5;
        const cubeSize = 34;

        tx = xi * cubeSize;
        ty = yi * cubeSize;
        tz = zi * cubeSize;

      } else if (shape === 'WORMHOLE') {
        // Gravitational Singularity / Flared Hyperbolic Throat
        const u = (idxNorm - 0.5) * 44; 
        const theta = idxNorm * Math.PI * 2 * 32; 
        const r = 3.5 + Math.pow(u / 22, 2) * 20; 

        tx = Math.cos(theta) * r;
        tz = Math.sin(theta) * r;
        ty = u;

      } else if (shape === 'LISSAJOUS') {
        // 3D Harmonic Lissajous Knot / 3D Frequency Wave Knot
        const t = idxNorm * Math.PI * 2;
        const a = 3, b = 4, c = 5;
        const R = 22;

        tx = R * Math.sin(a * t);
        ty = R * Math.sin(b * t);
        tz = R * Math.cos(c * t);

      } else if (shape === 'HYPER_TUNNEL') {
        // Vortex Warp Cylinder Tunnel
        const z = (idxNorm - 0.5) * 64;
        const angle = idxNorm * Math.PI * 2 * 28;
        const radius = 14 + Math.sin(z * 0.12) * 4;

        tx = Math.cos(angle) * radius;
        ty = Math.sin(angle) * radius;
        tz = z;

      } else if (
        shape === 'CHLADNI_PLATE' ||
        shape === 'ICOSAHEDRON' ||
        shape === 'DODECAHEDRON' ||
        shape === 'OCTAHEDRON' ||
        shape === 'TETRAHEDRON' ||
        shape === 'HEXAGONAL_PRISM' ||
        shape === 'MOBIUS_STRIP' ||
        shape === 'KLEIN_BOTTLE' ||
        shape === 'GEODESIC_DOME' ||
        shape === 'SUPERELLIPSOID' ||
        shape === 'GYROID'
      ) {
        // Sample positions directly on the geometric polygonal faces and surfaces
        const pt = sampleShapeSurfacePoint(shape, i, PARTICLE_COUNT);
        tx = pt.x;
        ty = pt.y;
        tz = pt.z;
      }

      // Apply 7-parameter geometric deformation (twist, taper, bend, inflate, ripple, noise, facet)
      const audioFactors = { f_bass, f_mid, f_treble, f_avg };
      const deformed = applyGeometricDeformation(tx, ty, tz, visualParams, audioFactors, time);
      tx = deformed.x;
      ty = deformed.y;
      tz = deformed.z;

      // ================= PHYSICS & FREQUENCY DISPLACEMENT =================
      let dx = 0, dy = 0, dz = 0;
      let nodalClosenessScore = 0;

      // Extract normalized frequency energy for this particle bin
      let freqVal = 0;
      if (freqArrayLen > 0) {
        const freqIndex = Math.floor(idxNorm * (freqArrayLen * 0.5));
        const val = audioData.frequencyArray[freqIndex];
        if (val !== undefined) {
          freqVal = (val / 255.0) * reactivity;
        }
      }

      // Dedicated Acoustic Chladni Resonator Plate Physics
      if (shape === 'CHLADNI_PLATE') {
        // If circular or hexagonal plate, clip or conform initial particles to boundary
        if (plateShape === 'CIRCULAR' || plateShape === 'HEXAGONAL') {
          const r0 = Math.sqrt(tx * tx + tz * tz);
          if (r0 > 24.5) {
            tx = (tx / r0) * 24.5;
            tz = (tz / r0) * 24.5;
          }
        }

        const offset = calculateChladniNodalOffset(
          tx, tz, 
          currentN, currentM, 
          plateShape, 
          chladniTightness, 
          { f_bass, f_mid, f_treble }, 
          time,
          modalMixing,
          multiHarmonic,
          audioData.chladniModes
        );
        dx = offset.dx;
        dy = offset.dy;
        dz = offset.dz;
        nodalClosenessScore = offset.nodalCloseness;

        // If user has chosen a modulation effect with the plate, compose organically
        if (effect === 'FLOW') {
          dy += Math.sin(idxNorm * 20 + time * 3) * f_mid * 2.0;
        } else if (effect === 'PULSE') {
          const beat = f_bass * f_bass * 5.0;
          dy += Math.sin(time * 16) * beat;
        } else if (effect === 'NOISE') {
          dy += Math.sin(idxNorm * 80 + time * 6) * f_treble * 1.5;
        }
      } else if (effect === 'CHLADNI_3D') {
        // True Physical Chladni Standing Wave Resonance & Nodal Convergence
        if (shape === 'PLANE') {
          const offset = calculateChladniNodalOffset(
            tx, tz, 
            currentN, currentM, 
            plateShape, 
            chladniTightness, 
            { f_bass, f_mid, f_treble }, 
            time,
            modalMixing,
            multiHarmonic,
            audioData.chladniModes
          );
          dx = offset.dx;
          dy = offset.dy;
          dz = offset.dz;
          nodalClosenessScore = offset.nodalCloseness;
        } else {
          // 3D Cymatics Standing Wave on curved 3D geometries (Spheres, Rings, Polyhedra)
          const offset = calculate3DCymaticsNodalOffset(
            tx, ty, tz, 
            currentN, currentM, 
            chladniTightness, 
            { f_bass, f_mid, f_treble }, 
            time
          );
          dx = offset.dx;
          dy = offset.dy;
          dz = offset.dz;
          nodalClosenessScore = offset.nodalCloseness;
        }
      } else {
        if (effect === 'FLOW') {
          const wave = Math.sin(idxNorm * 20 + time * 2) * f_mid * 2.5;
          const noise = Math.sin(tx * 0.1 + time) * f_bass * 1.5;
          dx = tx * (freqVal * 0.5);
          dy = wave + noise;
          dz = tz * (freqVal * 0.5);

        } else if (effect === 'PULSE') {
          const beat = f_bass * f_bass * 10;
          dx = tx * 0.015 * beat;
          dy = ty * 0.015 * beat;
          dz = tz * 0.015 * beat;

        } else if (effect === 'NOISE') {
          dx = Math.sin(ty * 0.2 + time * 5) * f_treble * 2.5;
          dy = Math.cos(tx * 0.2 + time * 5) * f_treble * 2.5;
          dz = Math.sin(idxNorm * 100 + time) * f_mid * 2.5;

        } else if (effect === 'VORTEX') {
          dy = Math.sin(idxNorm * Math.PI * 4 + time * 3) * (f_bass * 6);
          const rotSpeed = f_mid * 0.8;
          dx = (tx * Math.cos(rotSpeed) - tz * Math.sin(rotSpeed)) - tx;
          dz = (tx * Math.sin(rotSpeed) + tz * Math.cos(rotSpeed)) - tz;

        } else if (effect === 'CURL_NOISE') {
          // Bridson Incompressible Curl-Noise Vector Field (Fluids & Vorticity)
          const scale = 0.08;
          const tScale = time * 0.8;
          const pX = tx * scale;
          const pY = ty * scale;
          const pZ = tz * scale;

          // Potential Field derivatives
          const dFydz = Math.cos(pZ + tScale) * 0.6;
          const dFzdy = Math.sin(pY * 1.2 - tScale) * 0.6;
          const dFzdx = Math.cos(pX * 0.9 + tScale) * 0.6;
          const dFxdz = Math.sin(pZ * 1.1 + tScale) * 0.6;
          const dFxdy = Math.cos(pY * 0.8 - tScale) * 0.6;
          const dFydx = Math.sin(pX * 1.3 + tScale) * 0.6;

          // Curl = (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)
          const curlX = (dFzdy - dFydz) * (15 + f_bass * 25);
          const curlY = (dFxdz - dFzdx) * (15 + f_mid * 20);
          const curlZ = (dFydx - dFxdy) * (15 + f_treble * 30);

          dx = curlX;
          dy = curlY;
          dz = curlZ;

        } else if (effect === 'AIZAWA_CHAOS') {
          // Aizawa Strange Attractor Chaotic Orbital Integration
          const a = 0.95 + f_bass * 0.3;
          const b = 0.7;
          const c = 0.6 + f_mid * 0.4;
          const d = 3.5;
          const e = 0.25;
          const f = 0.1;

          const px = (tx * 0.08);
          const py = (ty * 0.08);
          const pz = (tz * 0.08);

          const dpx = (pz - b) * px - d * py;
          const dpy = d * px + (pz - b) * py;
          const dpz = c + a * pz - (pz * pz * pz) / 3 - (px * px + py * py) * (1 + e * pz) + f * pz * (px * px * px);

          const chaosAmp = 12 + f_bass * 18;
          dx = dpx * chaosAmp;
          dy = dpy * chaosAmp;
          dz = dpz * chaosAmp;

        } else if (effect === 'BLACK_HOLE') {
          // Relativistic Singularity & Gravitational Shockwave
          const distSq = tx * tx + ty * ty + tz * tz + 1.0;
          const dist = Math.sqrt(distSq);
          
          // Gravitational inward pull
          const pull = Math.min(25, 450 / (distSq + 20)) * (1.0 + f_mid);
          const inwardX = - (tx / dist) * pull;
          const inwardY = - (ty / dist) * pull;
          const inwardZ = - (tz / dist) * pull;

          // Supernova blast wave on heavy bass kick
          const wavePhase = (dist * 0.35 - time * 6);
          const shock = Math.sin(wavePhase) * Math.exp(-dist * 0.04) * (f_bass * f_bass * 28);
          const blastX = (tx / dist) * shock;
          const blastY = (ty / dist) * shock;
          const blastZ = (tz / dist) * shock;

          dx = inwardX + blastX;
          dy = inwardY + blastY;
          dz = inwardZ + blastZ;

        } else if (effect === 'LORENTZ_FORCE') {
          // Electromagnetic Plasma Gyro-Motion & Lorentz Force (F = q * v x B)
          const gyroRadius = 8 + f_bass * 16;
          const gyroFreq = time * (3 + f_treble * 8);
          const helicalPitch = ty * 0.15;
          
          // Cyclotron orbit around magnetic flux lines
          const qx = Math.cos(gyroFreq + idxNorm * Math.PI * 6) * gyroRadius;
          const qz = Math.sin(gyroFreq + idxNorm * Math.PI * 6) * gyroRadius;
          const qy = Math.sin(idxNorm * 40 + time * 4) * (f_mid * 14);

          dx = qx + (Math.sin(ty * 0.2 + time * 3) * f_treble * 8);
          dy = qy + helicalPitch;
          dz = qz + (Math.cos(tx * 0.2 + time * 3) * f_treble * 8);

        } else if (effect === 'BROWNIAN_HEAT') {
          // Thermodynamic Langevin Molecular Diffusion & Energy Dissipation
          const temperature = 0.5 + f_avg * 2.5;
          const randX = (Math.sin(i * 12.9898 + time * 15) * 2 - 1) * temperature * 8;
          const randY = (Math.cos(i * 78.233 + time * 15) * 2 - 1) * temperature * 8;
          const randZ = (Math.sin(i * 45.164 + time * 15) * 2 - 1) * temperature * 8;

          const thermalDamping = 0.85;
          dx = randX * thermalDamping;
          dy = randY * thermalDamping + (f_bass * 6 * Math.sin(time * 4));
          dz = randZ * thermalDamping;
        }
      }

      // Apply target with lerp for organic fluidity
      positions[i3] = lerp(positions[i3], tx + dx, lerpFactor);
      positions[i3 + 1] = lerp(positions[i3 + 1], ty + dy, lerpFactor);
      positions[i3 + 2] = lerp(positions[i3 + 2], tz + dz, lerpFactor);

      // ================= COLORING & ENERGY GRADIENT =================
      const brightness = 0.2 + freqVal * 0.8 + (f_bass * 0.35);
      
      const cFinal = colorBase.clone();
      // Lerp towards Accent/High based on frequency and mids
      cFinal.lerp(colorHigh, Math.min(1.0, freqVal + f_mid * 0.6));

      // Chladni Nodal Radiance: Particles resting on geometric nodal lines glow with peak laser brilliance!
      if (nodalClosenessScore > 0.05) {
        cFinal.lerp(colorHigh, Math.min(1.0, nodalClosenessScore * 0.7));
        if (nodalClosenessScore > 0.45) {
          cFinal.lerp(colorPeak, (nodalClosenessScore - 0.45) * 2.1);
        }
      }
      
      // Lerp towards White/Peak on heavy energy beats
      if (brightness > 0.75) {
        cFinal.lerp(colorPeak, Math.min(1.0, (brightness - 0.75) * 2.2));
      }

      colors[i3] = cFinal.r;
      colors[i3 + 1] = cFinal.g;
      colors[i3 + 2] = cFinal.b;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.attributes.color.needsUpdate = true;
  });

  const pSize = visualParams?.particleSize ?? 0.16;

  if (visualParams?.surfaceRenderMode === 'SURFACE_ONLY') {
    return null;
  }

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.positions.length / 3}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particles.colors.length / 3}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={pSize} 
        vertexColors
        transparent
        opacity={0.92}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};
