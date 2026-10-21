import * as THREE from 'three';
import { VisualShape, VisualParameters } from '../types';

export interface AudioFactors {
  f_bass: number;
  f_mid: number;
  f_treble: number;
  f_avg: number;
}

/**
/**
 * Evaluates the 2D Ernst Chladni standing wave eigenfunction on a vibrating plate.
 * - Square Plate (Lord Rayleigh / Ritz variational method):
 *     W(x, z) = cos(alpha) * [cos(n*u)*cos(m*v) + cos(m*u)*cos(n*v)] + sin(alpha) * [cos(n*u)*cos(m*v) - cos(m*u)*cos(n*v)]
 *     Modal mixing alpha transforms between closed concentric rings, rounded diamonds, rosettes, crosses and lattices.
 * - Circular Plate (Lord Rayleigh & Mary Waller):
 *     W(r, theta) = J_m(k * r) * cos(m * theta) (concentric circular nodes and radial nodal spokes)
 * - Hexagonal Plate (Hans Jenny Cymatics / Sacred Geometry):
 *     3-plane wave interference at 120° (hexagonal honeycomb and Flower of Life lattices)
 */
export function evaluateChladniWave(
  x: number,
  z: number,
  n: number = 3,
  m: number = 4,
  plateShape: 'SQUARE' | 'CIRCULAR' | 'HEXAGONAL' = 'SQUARE',
  size: number = 50,
  modalMixing: number = 0.25
): number {
  if (plateShape === 'CIRCULAR') {
    const r = Math.sqrt(x * x + z * z);
    const maxR = size * 0.5;
    if (r > maxR) return 0;
    const rNorm = r / maxR;
    const theta = Math.atan2(z, x);

    // Lord Rayleigh & Mary Waller Circular Plate Eigenmodes (Bessel J_m approximation)
    const k = (n * Math.PI) + (m * 0.5);
    const jm = Math.cos(k * rNorm - (m * 0.5 + 0.25) * Math.PI) / Math.sqrt(Math.max(0.12, rNorm * Math.PI * 0.5));
    const smoothCenter = Math.min(1.0, rNorm * 3.5);
    const radial = smoothCenter * jm + (1.0 - smoothCenter) * (m === 0 ? 1.0 : 0.0);
    return radial * Math.cos(m * theta);
  }

  if (plateShape === 'HEXAGONAL') {
    // Hans Jenny / Cymatics 3-plane wave interference at 120° (Flower of Life / Hexagonal Lattice)
    const scale = (Math.PI * 2.0 / size) * (n * 0.5 + 0.5);
    const w1 = Math.cos(scale * x);
    const w2 = Math.cos(scale * (-0.5 * x + 0.866025 * z));
    const w3 = Math.cos(scale * (-0.5 * x - 0.866025 * z));
    const harmonicR = Math.cos((m * 0.5 + 0.5) * scale * 1.5 * Math.sqrt(x * x + z * z));
    return (w1 + w2 + w3) / 3.0 - harmonicR * 0.35;
  }

  // Square plate with free boundary conditions (Lord Rayleigh / Ritz variational method)
  const half = size * 0.5;
  const u = (x / half) * (Math.PI * 0.5);
  const v = (z / half) * (Math.PI * 0.5);

  // Ritz modal combination of degenerate eigenmodes
  // Symmetric component: produces closed concentric rings, rounded diamonds, rosettes, and mandalas:
  const sym = Math.cos(n * u) * Math.cos(m * v) + Math.cos(m * u) * Math.cos(n * v);
  // Anti-symmetric component: produces intersecting hyperbolic branches and diagonal crosses:
  const antisym = Math.cos(n * u) * Math.cos(m * v) - Math.cos(m * u) * Math.cos(n * v);

  // modalMixing angle: 0.0 = pure closed concentric shapes, 0.5 = balanced hybrid, 1.0 = diagonal cross
  const angle = Math.min(1.0, Math.max(0.0, modalMixing)) * (Math.PI * 0.5);
  return Math.cos(angle) * sym + Math.sin(angle) * antisym;
}

/**
 * Calculates the exact acoustic radiation drift vector pushing sand/particles toward the nearest nodal curve (W = 0).
 * Uses multi-iteration Newton-Raphson gradient descent to form crisp Chladni patterns,
 * combined with authentic physical acoustic levitation, antinode bouncing, and musical wave dancing.
 */
export function calculateChladniNodalOffset(
  x: number,
  z: number,
  n: number = 3,
  m: number = 4,
  plateShape: 'SQUARE' | 'CIRCULAR' | 'HEXAGONAL' = 'SQUARE',
  tightness: number = 0.85,
  audioFactors: { f_bass: number; f_mid: number; f_treble: number } = { f_bass: 0.5, f_mid: 0.5, f_treble: 0.5 },
  time: number = 0,
  modalMixing: number = 0.25,
  multiHarmonic: boolean = true,
  harmonicData?: { bassMode?: { n: number; m: number }; trebleMode?: { n: number; m: number } }
): { dx: number; dy: number; dz: number; nodalCloseness: number } {
  const eps = 0.04;
  let curX = x;
  let curZ = z;

  // Composite multi-harmonic acoustic potential evaluator
  const evalW = (px: number, pz: number): number => {
    // Dynamic mixing modulated by musical frequency balance (shifts smoothly with musical phrases)
    const dynamicMix = Math.min(1.0, Math.max(0.0, modalMixing + (audioFactors.f_mid - audioFactors.f_bass) * 0.25));
    let w = evaluateChladniWave(px, pz, n, m, plateShape, 50, dynamicMix);

    if (multiHarmonic) {
      if (harmonicData?.bassMode && audioFactors.f_bass > 0.15) {
        const wBass = evaluateChladniWave(px, pz, harmonicData.bassMode.n, harmonicData.bassMode.m, plateShape, 50, 0.1);
        w = w * 0.75 + wBass * (audioFactors.f_bass * 0.25);
      }
      if (harmonicData?.trebleMode && audioFactors.f_treble > 0.20) {
        const wTreble = evaluateChladniWave(px, pz, harmonicData.trebleMode.n, harmonicData.trebleMode.m, plateShape, 50, 0.4);
        w += wTreble * (audioFactors.f_treble * 0.20);
      }
    }
    return w;
  };

  // 3 Newton-Raphson projection steps to bring particle onto the exact mathematical nodal line W = 0
  const iterations = 3;
  for (let it = 0; it < iterations; it++) {
    const w = evalW(curX, curZ);
    const wDx = evalW(curX + eps, curZ) - evalW(curX - eps, curZ);
    const wDz = evalW(curX, curZ + eps) - evalW(curX, curZ - eps);
    const gradX = wDx / (2 * eps);
    const gradZ = wDz / (2 * eps);
    const gradSq = gradX * gradX + gradZ * gradZ + 0.0001;

    const step = (w / gradSq) * tightness * 0.95;
    // Step clamp per iteration to prevent jumping across plate
    const maxSubStep = 7.0;
    curX -= Math.max(-maxSubStep, Math.min(maxSubStep, gradX * step));
    curZ -= Math.max(-maxSubStep, Math.min(maxSubStep, gradZ * step));
  }

  // Displacement from starting point to nodal line
  const projDx = curX - x;
  const projDz = curZ - z;

  // Evaluate wave value at original coordinate to determine antinode vs node
  const origW = evalW(x, z);
  const nodalCloseness = Math.max(0, 1.0 - Math.min(1.0, Math.abs(origW) * 1.5));

  // Tangent direction along the nodal contour for smooth sand dispersion
  const wDx = evalW(curX + eps, curZ) - evalW(curX - eps, curZ);
  const wDz = evalW(curX, curZ + eps) - evalW(curX, curZ - eps);
  const gradLen = Math.sqrt(wDx * wDx + wDz * wDz) + 0.001;
  const tangX = -wDz / gradLen;
  const tangZ = wDx / gradLen;

  // 1. VERTICAL ACOUSTIC LEVITATION & BOUNCING:
  // Antinodes oscillate violently with bass and mids; nodal lines remain at dy = 0!
  const antinodeEnergy = (1.0 - nodalCloseness);
  const bounceFreq = 16.0;
  const bounceAmp = (audioFactors.f_bass * 7.5 + audioFactors.f_mid * 4.5 + 1.0);
  const dy = origW * Math.sin(time * bounceFreq + (x + z) * 0.15) * bounceAmp;

  // 2. HORIZONTAL ACOUSTIC SHIMMER & TRAVELING WAVES:
  // Along nodal lines, particles ripple with music tempo and frequencies
  const shimmer = Math.sin(time * 7.0 + (x * 0.2 + z * 0.2)) * (audioFactors.f_mid * 1.8 + audioFactors.f_treble * 1.4 + 0.4);
  const nodalDanceX = tangX * shimmer * nodalCloseness;
  const nodalDanceZ = tangZ * shimmer * nodalCloseness;

  // 3. ANTINODE ACOUSTIC AGITATION:
  // Loose particles at antinodes jitter and kick away towards nodal lines
  const agitationX = (Math.sin(time * 30.0 + x * 0.8) * 1.2) * antinodeEnergy * (audioFactors.f_bass * 1.5 + 0.4);
  const agitationZ = (Math.cos(time * 30.0 + z * 0.8) * 1.2) * antinodeEnergy * (audioFactors.f_bass * 1.5 + 0.4);

  // 4. BEAT PULSE ON HEAVY KICKS:
  const beatKick = (audioFactors.f_bass * audioFactors.f_bass * 1.8) * Math.sin(time * 12.0) * antinodeEnergy;

  return {
    dx: projDx + nodalDanceX + agitationX + (tangX * beatKick),
    dy: dy,
    dz: projDz + nodalDanceZ + agitationZ + (tangZ * beatKick),
    nodalCloseness
  };
}

/**
 * 3D Cymatics Standing Wave Eigenfunction for Volumetric / Spherical geometries
 */
export function evaluate3DCymaticsWave(
  x: number,
  y: number,
  z: number,
  n: number = 3,
  m: number = 4,
  scale: number = 0.08
): number {
  const k = scale;
  const p = (n + m) * 0.5;
  return (
    Math.cos(n * x * k) * Math.cos(m * y * k) * Math.cos(p * z * k) -
    Math.cos(m * x * k) * Math.cos(n * z * k)
  );
}

export function calculate3DCymaticsNodalOffset(
  x: number,
  y: number,
  z: number,
  n: number = 3,
  m: number = 4,
  tightness: number = 0.75,
  audioFactors: { f_bass: number; f_mid: number; f_treble: number } = { f_bass: 0.5, f_mid: 0.5, f_treble: 0.5 },
  time: number = 0
): { dx: number; dy: number; dz: number; nodalCloseness: number } {
  const eps = 0.08;
  let curX = x;
  let curY = y;
  let curZ = z;

  // 2 Newton-Raphson projection steps onto 3D nodal manifold W = 0
  for (let it = 0; it < 2; it++) {
    const w = evaluate3DCymaticsWave(curX, curY, curZ, n, m);
    const wDx = evaluate3DCymaticsWave(curX + eps, curY, curZ, n, m) - evaluate3DCymaticsWave(curX - eps, curY, curZ, n, m);
    const wDy = evaluate3DCymaticsWave(curX, curY + eps, curZ, n, m) - evaluate3DCymaticsWave(curX, curY - eps, curZ, n, m);
    const wDz = evaluate3DCymaticsWave(curX, curY, curZ + eps, n, m) - evaluate3DCymaticsWave(curX, curY, curZ - eps, n, m);

    const gradX = wDx / (2 * eps);
    const gradY = wDy / (2 * eps);
    const gradZ = wDz / (2 * eps);

    const gradSq = gradX * gradX + gradY * gradY + gradZ * gradZ + 0.0001;
    const step = (w / gradSq) * tightness * 0.85;

    const maxStep = 6.0;
    curX -= Math.max(-maxStep, Math.min(maxStep, gradX * step));
    curY -= Math.max(-maxStep, Math.min(maxStep, gradY * step));
    curZ -= Math.max(-maxStep, Math.min(maxStep, gradZ * step));
  }

  const origW = evaluate3DCymaticsWave(x, y, z, n, m);
  const nodalCloseness = Math.max(0, 1.0 - Math.min(1.0, Math.abs(origW) * 1.2));
  const antinodeEnergy = 1.0 - nodalCloseness;

  // 3D acoustic breathing and wave pulse on antinodes
  const rDist = Math.sqrt(x * x + y * y + z * z) + 0.001;
  const pulseAmp = origW * Math.sin(time * 12.0 + rDist * 0.1) * (audioFactors.f_bass * 4.5 + audioFactors.f_mid * 2.5 + 0.8);
  const normX = x / rDist;
  const normY = y / rDist;
  const normZ = z / rDist;

  // Micro vibration on antinodes
  const chatter = Math.sin(time * 26.0 + x * 0.4) * antinodeEnergy * (audioFactors.f_treble * 1.5 + 0.4);

  return {
    dx: (curX - x) + normX * pulseAmp + chatter,
    dy: (curY - y) + normY * pulseAmp + chatter,
    dz: (curZ - z) + normZ * pulseAmp + chatter,
    nodalCloseness
  };
}

/**
 * High-performance 3D geometric deformation engine.
 * Mutates coordinates (x, y, z) according to physical & morphological parameters.
 */
export function applyGeometricDeformation(
  x: number,
  y: number,
  z: number,
  params: VisualParameters | undefined,
  audio: AudioFactors,
  time: number
): { x: number; y: number; z: number } {
  if (!params) return { x, y, z };

  let {
    deformTwist = 0,
    deformTaper = 0,
    deformBend = 0,
    deformInflate = 0,
    deformRipple = 0,
    deformNoiseWarp = 0,
    deformFacet = 0,
    deformSuperformula = 0,
    deformSpacetimeWarp = 0,
    deformSphericalHarmonics = 0,
    deformChladniResonance = 0,
    deformMagneticDipole = 0,
    deformVortexCore = 0
  } = params;

  let px = x;
  let py = y;
  let pz = z;

  // 1. AXIAL TWIST (Around Y axis)
  if (Math.abs(deformTwist) > 0.001) {
    const twistAngle = py * (deformTwist * 0.05);
    const cosT = Math.cos(twistAngle);
    const sinT = Math.sin(twistAngle);
    const rx = px * cosT - pz * sinT;
    const rz = px * sinT + pz * cosT;
    px = rx;
    pz = rz;
  }

  // 2. CONICAL TAPER (Scales X and Z as a function of Y)
  if (Math.abs(deformTaper) > 0.001) {
    const normY = py / 26; // Normalized height roughly in [-1, 1]
    const taperScale = Math.max(0.04, 1.0 + normY * deformTaper);
    px *= taperScale;
    pz *= taperScale;
  }

  // 3. ARC BEND (Curvature along X/Y plane)
  if (Math.abs(deformBend) > 0.001) {
    const bendAngle = (py / 30) * deformBend;
    px += Math.sin(bendAngle) * 9 * deformBend;
    py = py * Math.cos(bendAngle * 0.45);
  }

  // 4. SPHERICAL INFLATE / PINCH (Bulge or constriction)
  const dist = Math.sqrt(px * px + py * py + pz * pz) + 0.0001;
  if (Math.abs(deformInflate) > 0.001) {
    const distNorm = Math.min(1.0, dist / 40);
    const inflateFactor = 1.0 + deformInflate * 0.45 * (1.0 - distNorm);
    px *= inflateFactor;
    py *= inflateFactor;
    pz *= inflateFactor;
  }

  // 5. GIELIS SUPERFORMULA (Natural Morphogenesis & m-fold rotational symmetry)
  if (Math.abs(deformSuperformula) > 0.005) {
    const phi = Math.atan2(pz, px);
    const m = 5; // 5-fold pentagonal / starfish / floral symmetry
    const a = 1.0, b = 1.0;
    const n1 = 0.45, n2 = 1.3, n3 = 1.3;
    const t1 = Math.pow(Math.abs(Math.cos(m * phi / 4) / a), n2);
    const t2 = Math.pow(Math.abs(Math.sin(m * phi / 4) / b), n3);
    const rSuper = Math.pow(t1 + t2, -1 / n1);
    const factor = 1.0 + (rSuper - 1.0) * (deformSuperformula * 0.42 * (1.0 + audio.f_bass * 0.4));
    px *= factor;
    pz *= factor;
  }

  // 6. GENERAL RELATIVITY: SCHWARZSCHILD GRAVITATIONAL LENSING & KERR FRAME-DRAGGING
  if (Math.abs(deformSpacetimeWarp) > 0.005) {
    const r2 = px * px + py * py + pz * pz;
    const r = Math.sqrt(r2) + 0.001;
    const warpMagnitude = (deformSpacetimeWarp * 16.0 * (1.0 + audio.f_bass * 1.2)) / (r + 8.0);
    const radialFactor = Math.max(0.15, 1.0 - (warpMagnitude / (r + 5.0)));
    
    // Kerr metric gravitomagnetic frame dragging (spacetime rotation around mass axis)
    const dragAngle = (deformSpacetimeWarp * 18.0) / (r2 * 0.04 + 10.0);
    const cosD = Math.cos(dragAngle);
    const sinD = Math.sin(dragAngle);
    const rx = (px * cosD - pz * sinD) * radialFactor;
    const rz = (px * sinD + pz * cosD) * radialFactor;
    px = rx;
    pz = rz;
    py *= radialFactor;
  }

  // 7. QUANTUM ATOMIC ORBITAL SPHERICAL HARMONICS (Y_l^m Wavefunctions)
  if (deformSphericalHarmonics > 0.005) {
    const r = Math.sqrt(px * px + py * py + pz * pz) + 0.001;
    const cosTheta = Math.max(-1, Math.min(1, py / r));
    const sinTheta = Math.sqrt(Math.max(0, 1.0 - cosTheta * cosTheta));
    const phi = Math.atan2(pz, px);

    // Y_3^2 cloverleaf d/f-orbital: sin^2(theta) * cos(theta) * cos(2*phi)
    const y32 = sinTheta * sinTheta * cosTheta * Math.cos(2 * phi);
    // Y_3^3 hex-lobed orbital: sin^3(theta) * cos(3*phi)
    const y33 = Math.pow(sinTheta, 3) * Math.cos(3 * phi + time * 0.7);
    
    const orbitalLobe = 1.0 + deformSphericalHarmonics * (y32 * 1.25 + y33 * 0.65) * (1.0 + audio.f_mid * 0.7);
    px *= orbitalLobe;
    py *= orbitalLobe;
    pz *= orbitalLobe;
  }

  // 8. 3D CHLADNI ACOUSTIC CYMATICS RESONANCE (Standing Wave Eigenmodes)
  if (deformChladniResonance > 0.005) {
    const n = params.chladniModeN ?? 3;
    const m = params.chladniModeM ?? 4;
    const offset = calculate3DCymaticsNodalOffset(
      px, py, pz, 
      n, m, 
      deformChladniResonance * 0.85, 
      audio, 
      time
    );
    px += offset.dx;
    py += offset.dy;
    pz += offset.dz;
  }

  // 9. DIPOLAR MAGNETIC FIELD & TOKAMAK PLASMA PINCH
  if (Math.abs(deformMagneticDipole) > 0.005) {
    const r = Math.sqrt(px * px + py * py + pz * pz) + 0.001;
    const cosTheta = Math.max(-1, Math.min(1, py / r));
    const sin2Theta = 1.0 - cosTheta * cosTheta; // equatorial field max
    
    // Equatorial pinch / expansion
    const pinch = 1.0 + deformMagneticDipole * 0.62 * (sin2Theta - 0.5);
    // Polar magnetic bottle flaring / jet
    const polarJet = 1.0 + deformMagneticDipole * 0.52 * (cosTheta * cosTheta);
    
    px *= Math.max(0.12, pinch);
    pz *= Math.max(0.12, pinch);
    py *= Math.max(0.12, polarJet);
  }

  // 10. HYDRODYNAMIC LAMB-OSEEN VORTEX & ACCRETION DRAFT
  if (Math.abs(deformVortexCore) > 0.005) {
    const rxz = Math.sqrt(px * px + pz * pz) + 0.001;
    const coreRadius = 7.5;
    const circulation = (1.0 - Math.exp(-(rxz * rxz) / (coreRadius * coreRadius)));
    const vortexAngle = (deformVortexCore * 15.0 * circulation) / (rxz + 2.5);
    
    const cosV = Math.cos(vortexAngle);
    const sinV = Math.sin(vortexAngle);
    const vx = px * cosV - pz * sinV;
    const vz = px * sinV + pz * cosV;
    px = vx;
    pz = vz;
    
    const draft = Math.sin(rxz * 0.25 - time * 2.2) * (deformVortexCore * 3.4 * circulation);
    py += draft * (1.0 + audio.f_mid * 1.1);
  }

  // 11. SURFACE RIPPLE WAVES (Audio-boosted harmonic concentric rings)
  if (deformRipple > 0.005) {
    const rippleFreq = 0.32;
    const rippleAmp = deformRipple * (2.8 + audio.f_bass * 5.0);
    const rippleWave = Math.sin(dist * rippleFreq - time * 3.2) * rippleAmp;
    const nx = px / dist;
    const ny = py / dist;
    const nz = pz / dist;
    px += nx * rippleWave;
    py += ny * rippleWave;
    pz += nz * rippleWave;
  }

  // 12. 3D NOISE WARP (Turbulent organic vector displacement)
  if (deformNoiseWarp > 0.005) {
    const nScale = 0.11;
    const warpAmp = deformNoiseWarp * (3.0 + audio.f_mid * 4.5);
    const wx = Math.sin(py * nScale + time * 1.5) * Math.cos(pz * nScale);
    const wy = Math.sin(pz * nScale + time * 1.5) * Math.cos(px * nScale);
    const wz = Math.sin(px * nScale + time * 1.5) * Math.cos(py * nScale);
    px += wx * warpAmp;
    py += wy * warpAmp;
    pz += wz * warpAmp;
  }

  // 13. FACET MORPH (Planar Crystalline Snapping)
  if (deformFacet > 0.005) {
    const step = 4.2 * (1.0 - deformFacet * 0.45);
    const fx = Math.round(px / step) * step;
    const fy = Math.round(py / step) * step;
    const fz = Math.round(pz / step) * step;
    const blend = deformFacet * 0.65;
    px = px * (1 - blend) + fx * blend;
    py = py * (1 - blend) + fy * blend;
    pz = pz * (1 - blend) + fz * blend;
  }

  return { x: px, y: py, z: pz };
}

/**
 * Creates a parametric single-sided Möbius strip geometry with actual triangular faces.
 */
function createMobiusStripGeometry(radius = 18, width = 7.5, uSegments = 64, vSegments = 12): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= uSegments; i++) {
    const u = (i / uSegments) * Math.PI * 2;
    for (let j = 0; j <= vSegments; j++) {
      const v = ((j / vSegments) - 0.5) * width;
      const x = (radius + v * Math.cos(u / 2)) * Math.cos(u);
      const y = (radius + v * Math.cos(u / 2)) * Math.sin(u);
      const z = v * Math.sin(u / 2);
      positions.push(x, y, z);
    }
  }

  const vCount = vSegments + 1;
  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < vSegments; j++) {
      const a = i * vCount + j;
      const b = (i + 1) * vCount + j;
      const c = (i + 1) * vCount + (j + 1);
      const d = i * vCount + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a parametric immersion of the 4D Klein Bottle in 3D space with faces.
 */
function createKleinBottleGeometry(uSegments = 48, vSegments = 24): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= uSegments; i++) {
    const u = (i / uSegments) * Math.PI;
    const cosU = Math.cos(u);
    const sinU = Math.sin(u);

    for (let j = 0; j <= vSegments; j++) {
      const v = (j / vSegments) * Math.PI * 2;
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);

      const r = 4 * (1 - cosU / 2);
      let x = 0, y = 0, z = 0;

      if (u < Math.PI / 2) {
        x = 6 * cosU * (1 + sinU) + r * cosU * cosV;
        y = 16 * sinU + r * sinU * cosV;
      } else {
        x = 6 * cosU * (1 + sinU) + r * Math.cos(v + Math.PI);
        y = 16 * sinU;
      }
      z = r * sinV;

      // Center and scale to scene proportions
      positions.push(x * 0.9, (y - 8) * 1.1, z * 1.2);
    }
  }

  const vCount = vSegments + 1;
  for (let i = 0; i < uSegments; i++) {
    for (let j = 0; j < vSegments; j++) {
      const a = i * vCount + j;
      const b = (i + 1) * vCount + j;
      const c = (i + 1) * vCount + (j + 1);
      const d = i * vCount + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a Superellipsoid surface geometry with tunable sharpness exponents.
 */
function createSuperellipsoidGeometry(e1 = 0.5, e2 = 0.5, radius = 20, uSeg = 36, vSeg = 36): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];

  const signedPow = (val: number, p: number) => {
    return Math.sign(val) * Math.pow(Math.abs(val), p);
  };

  for (let i = 0; i <= uSeg; i++) {
    const u = ((i / uSeg) - 0.5) * Math.PI; // -pi/2 to pi/2
    const cu = Math.cos(u);
    const su = Math.sin(u);

    for (let j = 0; j <= vSeg; j++) {
      const v = (j / vSeg) * Math.PI * 2 - Math.PI; // -pi to pi
      const cv = Math.cos(v);
      const sv = Math.sin(v);

      const x = radius * signedPow(cu, e1) * signedPow(cv, e2);
      const y = radius * signedPow(su, e1);
      const z = radius * signedPow(cu, e1) * signedPow(sv, e2);

      positions.push(x, y, z);
    }
  }

  const vCount = vSeg + 1;
  for (let i = 0; i < uSeg; i++) {
    for (let j = 0; j < vSeg; j++) {
      const a = i * vCount + j;
      const b = (i + 1) * vCount + j;
      const c = (i + 1) * vCount + (j + 1);
      const d = i * vCount + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Creates a Gyroid triply-periodic minimal surface sheet geometry.
 */
function createGyroidGeometry(size = 38, segments = 32): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const half = size / 2;

  for (let i = 0; i <= segments; i++) {
    const u = (i / segments) * size - half;
    for (let j = 0; j <= segments; j++) {
      const v = (j / segments) * size - half;

      // Gyroid surface approximation function: z = f(x, y)
      const scale = 0.22;
      const su = Math.sin(u * scale);
      const cu = Math.cos(u * scale);
      const sv = Math.sin(v * scale);
      const cv = Math.cos(v * scale);

      const z = (Math.sin(u * scale * 1.5) * cv + Math.cos(v * scale * 1.5) * su) * 8;

      positions.push(u, z, v);
    }
  }

  const vCount = segments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * vCount + j;
      const b = (i + 1) * vCount + j;
      const c = (i + 1) * vCount + (j + 1);
      const d = i * vCount + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Factory for creating high-precision Three.js base geometries
 * with faceted polygonal surfaces for all 20 shapes.
 */
export function createBaseGeometryForShape(shape: VisualShape): THREE.BufferGeometry {
  switch (shape) {
    // 1. PLATONIC & FACETED POLYHEDRA
    case 'ICOSAHEDRON':
      // 20 triangular planar faces, pure Platonic solid
      return new THREE.IcosahedronGeometry(21, 0);

    case 'DODECAHEDRON':
      // 12 pentagonal faces subdivided into facets
      return new THREE.DodecahedronGeometry(20, 0);

    case 'OCTAHEDRON':
      // 8 diamond faces with double-pyramid facets
      return new THREE.OctahedronGeometry(22, 0);

    case 'TETRAHEDRON':
      // 4 large triangular faces
      return new THREE.TetrahedronGeometry(24, 0);

    case 'HEXAGONAL_PRISM':
      // 6 side rectangular faces + 2 hexagonal planar end caps
      return new THREE.CylinderGeometry(18, 18, 34, 6, 8);

    // 2. TOPOLOGICAL & MINIMAL SURFACES
    case 'MOBIUS_STRIP':
      return createMobiusStripGeometry(18, 8, 72, 14);

    case 'KLEIN_BOTTLE':
      return createKleinBottleGeometry(48, 24);

    case 'GEODESIC_DOME':
      // Buckminster Fuller triangular geodesic facet dome
      return new THREE.IcosahedronGeometry(21, 2);

    case 'SUPERELLIPSOID':
      // Faceted superquadric gem
      return createSuperellipsoidGeometry(0.5, 0.5, 20, 32, 32);

    case 'GYROID':
      return createGyroidGeometry(40, 32);

    // 3. CLASSIC HARMONIC & COSMIC GEOMETRIES
    case 'CHLADNI_PLATE':
      // A precision acoustic Chladni resonator plate with 48x48 subdivisions
      return new THREE.PlaneGeometry(50, 50, 48, 48);

    case 'ORB':
      return new THREE.IcosahedronGeometry(20, 3);

    case 'TORUS':
      return new THREE.TorusGeometry(18, 5.5, 24, 48);

    case 'PLANE':
      return new THREE.PlaneGeometry(52, 52, 28, 28);

    case 'DNA':
      // Cylinder representing double-helix scaffold
      return new THREE.CylinderGeometry(10, 10, 56, 24, 32, true);

    case 'GALAXY':
      return new THREE.CylinderGeometry(30, 30, 2.5, 36, 6);

    case 'TREFOIL_KNOT':
      return new THREE.TorusKnotGeometry(15, 3.2, 84, 16, 2, 3);

    case 'CYBER_CUBE':
      return new THREE.BoxGeometry(28, 28, 28, 10, 10, 10);

    case 'WORMHOLE':
      return new THREE.CylinderGeometry(24, 4.5, 46, 32, 20, true);

    case 'LISSAJOUS':
      return new THREE.TorusKnotGeometry(16, 2.6, 96, 14, 3, 4);

    case 'HYPER_TUNNEL':
      return new THREE.CylinderGeometry(14, 14, 64, 30, 20, true);

    default:
      return new THREE.IcosahedronGeometry(20, 1);
  }
}

// -------------------------------------------------------------
// POLYHEDRAL FACE TABLES & UNIFORM SURFACE SAMPLER
// -------------------------------------------------------------

// Golden ratio
const PHI = (1 + Math.sqrt(5)) / 2;

// Icosahedron 12 vertices
const ICOSA_VERTS: [number, number, number][] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
];

// Icosahedron 20 triangular faces
const ICOSA_FACES: [number, number, number][] = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
];

// Octahedron 6 vertices
const OCTA_VERTS: [number, number, number][] = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
];
// Octahedron 8 faces
const OCTA_FACES: [number, number, number][] = [
  [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
  [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]
];

// Tetrahedron 4 vertices
const TETRA_VERTS: [number, number, number][] = [
  [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
];
// Tetrahedron 4 faces
const TETRA_FACES: [number, number, number][] = [
  [0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]
];

// Pseudorandom hash from integer
function pseudoHash(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Samples a 3D position lying directly on the surface/face of the given geometry.
 */
export function sampleShapeSurfacePoint(
  shape: VisualShape,
  i: number,
  totalCount: number
): { x: number; y: number; z: number } {
  const norm = i / totalCount;
  const r1 = Math.sqrt(pseudoHash(i * 3 + 1));
  const r2 = pseudoHash(i * 3 + 2);
  const uBary = 1 - r1;
  const vBary = r1 * (1 - r2);
  const wBary = r1 * r2;

  switch (shape) {
    case 'CHLADNI_PLATE': {
      // Uniform planar distribution of sand / quartz particles on the plate surface
      const size = 50;
      const px = (pseudoHash(i * 3 + 1) - 0.5) * size;
      const pz = (pseudoHash(i * 7 + 2) - 0.5) * size;
      return { x: px, y: 0, z: pz };
    }

    case 'ICOSAHEDRON': {
      const faceIndex = i % ICOSA_FACES.length;
      const face = ICOSA_FACES[faceIndex];
      const va = ICOSA_VERTS[face[0]];
      const vb = ICOSA_VERTS[face[1]];
      const vc = ICOSA_VERTS[face[2]];
      const scale = 11.5;
      return {
        x: (uBary * va[0] + vBary * vb[0] + wBary * vc[0]) * scale,
        y: (uBary * va[1] + vBary * vb[1] + wBary * vc[1]) * scale,
        z: (uBary * va[2] + vBary * vb[2] + wBary * vc[2]) * scale
      };
    }

    case 'OCTAHEDRON': {
      const faceIndex = i % OCTA_FACES.length;
      const face = OCTA_FACES[faceIndex];
      const va = OCTA_VERTS[face[0]];
      const vb = OCTA_VERTS[face[1]];
      const vc = OCTA_VERTS[face[2]];
      const scale = 22.0;
      return {
        x: (uBary * va[0] + vBary * vb[0] + wBary * vc[0]) * scale,
        y: (uBary * va[1] + vBary * vb[1] + wBary * vc[1]) * scale,
        z: (uBary * va[2] + vBary * vb[2] + wBary * vc[2]) * scale
      };
    }

    case 'TETRAHEDRON': {
      const faceIndex = i % TETRA_FACES.length;
      const face = TETRA_FACES[faceIndex];
      const va = TETRA_VERTS[face[0]];
      const vb = TETRA_VERTS[face[1]];
      const vc = TETRA_VERTS[face[2]];
      const scale = 14.0;
      return {
        x: (uBary * va[0] + vBary * vb[0] + wBary * vc[0]) * scale,
        y: (uBary * va[1] + vBary * vb[1] + wBary * vc[1]) * scale,
        z: (uBary * va[2] + vBary * vb[2] + wBary * vc[2]) * scale
      };
    }

    case 'DODECAHEDRON': {
      // 12 pentagonal faces sampled via spherical golden distribution snapped to pentagonal facets
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const theta = 2 * Math.PI * i / goldenRatio;
      const phi = Math.acos(1 - 2 * (i + 0.5) / totalCount);
      const r = 20;
      let px = r * Math.sin(phi) * Math.cos(theta);
      let py = r * Math.cos(phi);
      let pz = r * Math.sin(phi) * Math.sin(theta);
      // Snap slightly towards planar pentagonal planes
      const step = 6.5;
      px = Math.round(px / step) * step * 0.4 + px * 0.6;
      py = Math.round(py / step) * step * 0.4 + py * 0.6;
      pz = Math.round(pz / step) * step * 0.4 + pz * 0.6;
      return { x: px, y: py, z: pz };
    }

    case 'HEXAGONAL_PRISM': {
      const side = (i % 6);
      const angle1 = (side / 6) * Math.PI * 2;
      const angle2 = ((side + 1) / 6) * Math.PI * 2;
      const tSide = pseudoHash(i * 5 + 3);
      const ang = angle1 + tSide * (angle2 - angle1);
      const r = 18;
      const h = (pseudoHash(i * 7 + 4) - 0.5) * 34;
      return {
        x: Math.cos(ang) * r,
        y: h,
        z: Math.sin(ang) * r
      };
    }

    case 'MOBIUS_STRIP': {
      const u = norm * Math.PI * 2;
      const v = (pseudoHash(i * 4 + 7) - 0.5) * 8.0;
      const r = 18;
      return {
        x: (r + v * Math.cos(u / 2)) * Math.cos(u),
        y: (r + v * Math.cos(u / 2)) * Math.sin(u),
        z: v * Math.sin(u / 2)
      };
    }

    case 'KLEIN_BOTTLE': {
      const u = norm * Math.PI;
      const v = pseudoHash(i * 9 + 2) * Math.PI * 2;
      const cosU = Math.cos(u);
      const sinU = Math.sin(u);
      const cosV = Math.cos(v);
      const sinV = Math.sin(v);
      const r = 4 * (1 - cosU / 2);
      let kx = 0, ky = 0, kz = 0;
      if (u < Math.PI / 2) {
        kx = 6 * cosU * (1 + sinU) + r * cosU * cosV;
        ky = 16 * sinU + r * sinU * cosV;
      } else {
        kx = 6 * cosU * (1 + sinU) + r * Math.cos(v + Math.PI);
        ky = 16 * sinU;
      }
      kz = r * sinV;
      return { x: kx * 0.9, y: (ky - 8) * 1.1, z: kz * 1.2 };
    }

    case 'GEODESIC_DOME': {
      // Upper hemisphere geodesic subdivision
      const phi = (pseudoHash(i * 3 + 1) * 0.5) * Math.PI;
      const theta = pseudoHash(i * 7 + 2) * Math.PI * 2;
      const r = 21;
      let gx = r * Math.sin(phi) * Math.cos(theta);
      let gy = r * Math.cos(phi) - 2;
      let gz = r * Math.sin(phi) * Math.sin(theta);
      // Snap to triangular facets
      const gStep = 4.5;
      gx = Math.round(gx / gStep) * gStep * 0.35 + gx * 0.65;
      gy = Math.round(gy / gStep) * gStep * 0.35 + gy * 0.65;
      gz = Math.round(gz / gStep) * gStep * 0.35 + gz * 0.65;
      return { x: gx, y: gy, z: gz };
    }

    case 'SUPERELLIPSOID': {
      const u = (pseudoHash(i * 4 + 1) - 0.5) * Math.PI;
      const v = pseudoHash(i * 6 + 3) * Math.PI * 2 - Math.PI;
      const e1 = 0.5, e2 = 0.5, r = 20;
      const sp = (val: number, p: number) => Math.sign(val) * Math.pow(Math.abs(val), p);
      return {
        x: r * sp(Math.cos(u), e1) * sp(Math.cos(v), e2),
        y: r * sp(Math.sin(u), e1),
        z: r * sp(Math.cos(u), e1) * sp(Math.sin(v), e2)
      };
    }

    case 'GYROID': {
      const size = 38;
      const u = pseudoHash(i * 3 + 1) * size - size / 2;
      const v = pseudoHash(i * 7 + 5) * size - size / 2;
      const scale = 0.22;
      const su = Math.sin(u * scale);
      const cv = Math.cos(v * scale);
      const z = (Math.sin(u * scale * 1.5) * cv + Math.cos(v * scale * 1.5) * su) * 8;
      return { x: u, y: z, z: v };
    }

    default:
      return { x: 0, y: 0, z: 0 };
  }
}

