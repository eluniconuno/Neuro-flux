import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleSystemProps, AudioAnalysis } from '../types';
import { analyzeFrequencies } from '../services/audioService';

// NEW RESEARCH LINE: TOROIDAL TOPOLOGY
// This component serves as a sandbox for the new research direction.
export const ExperimentalGrid: React.FC<ParticleSystemProps> = ({ analyzer, isPlaying }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const TUBULAR_SEGMENTS = 150; // The large ring
  const RADIAL_SEGMENTS = 100;  // The tube thickness
  const PARTICLE_COUNT = TUBULAR_SEGMENTS * RADIAL_SEGMENTS;
  
  const frequencyArray = useMemo(() => new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0), [analyzer]);
  const timeDomainArray = useMemo(() => new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0), [analyzer]);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const baseCoords = new Float32Array(PARTICLE_COUNT * 3);
    // Stores: [u (tube angle), v (ring angle), R (main radius), r (tube radius)]
    const physicsData = new Float32Array(PARTICLE_COUNT * 4); 

    const colorObj = new THREE.Color();
    const R_MAIN = 25; // Radius of the entire donut
    const r_TUBE = 8;  // Radius of the tube itself

    let i = 0;
    for (let uStep = 0; uStep < TUBULAR_SEGMENTS; uStep++) {
        const u = (uStep / TUBULAR_SEGMENTS) * Math.PI * 2; // Angle around the main ring

        for (let vStep = 0; vStep < RADIAL_SEGMENTS; vStep++) {
            const v = (vStep / RADIAL_SEGMENTS) * Math.PI * 2; // Angle inside the tube

            // Torus parametric equation
            const x = (R_MAIN + r_TUBE * Math.cos(v)) * Math.cos(u);
            const z = (R_MAIN + r_TUBE * Math.cos(v)) * Math.sin(u);
            const y = r_TUBE * Math.sin(v);

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            baseCoords[i * 3] = x;
            baseCoords[i * 3 + 1] = y;
            baseCoords[i * 3 + 2] = z;

            // Store topology data for physics engine
            physicsData[i * 4]     = u; 
            physicsData[i * 4 + 1] = v;
            physicsData[i * 4 + 2] = R_MAIN;
            physicsData[i * 4 + 3] = r_TUBE;

            // Base color (Experimental Gold/Orange Scheme)
            colorObj.setHex(0x332200);
            colors[i * 3] = colorObj.r;
            colors[i * 3 + 1] = colorObj.g;
            colors[i * 3 + 2] = colorObj.b;

            i++;
        }
    }

    return { positions, colors, baseCoords, physicsData };
  }, []);

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

    const amp_bass = audioData.bass / 255.0;
    const amp_mid = audioData.mid / 255.0;
    const amp_treble = audioData.treble / 255.0;

    const colorTemp = new THREE.Color();
    const colorNode = new THREE.Color(0x221100);     // Dark Orange/Brown
    const colorAntinode = new THREE.Color(0xffaa00); // Bright Gold
    const colorClip = new THREE.Color(0xffffff);     // White

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      
      const u = particles.physicsData[i4];     // Main Ring Angle
      const v = particles.physicsData[i4 + 1]; // Tube Angle
      const R = particles.physicsData[i4 + 2];
      const r = particles.physicsData[i4 + 3];

      // --- NEW RESEARCH PHYSICS: TOROIDAL FLUX ---
      
      // 1. TORSION (Twisting the tube based on Bass)
      const torsion = Math.sin(u * 5.0 + time) * (amp_bass * 5.0);
      
      // 2. COMPRESSION (Squeezing the tube based on Mids)
      const compression = Math.cos(v * 10.0 + time * 3.0) * (amp_mid * 2.0);

      // 3. SPARKLE (High freq jitter on surface)
      const jitter = Math.sin(u * 50.0) * Math.cos(v * 50.0 + time * 10.0) * (amp_treble * 1.5);

      const totalDisplacement = torsion + compression + jitter;

      // Apply to the Tube Radius (r), effectively changing the thickness of the donut
      const current_r = r + totalDisplacement;
      const current_R = R; // Keep main radius constant for now

      // Recalculate Position based on new r
      positions[i3]     = (current_R + current_r * Math.cos(v)) * Math.cos(u);
      positions[i3 + 2] = (current_R + current_r * Math.cos(v)) * Math.sin(u); // Z maps to Y in standard torus usually, keeping consistent
      positions[i3 + 1] = current_r * Math.sin(v); // Y acts as Up

      // Visuals
      const intensity = Math.abs(totalDisplacement);
      if (intensity < 3.0) {
          colorTemp.lerpColors(colorNode, colorAntinode, intensity / 3.0);
      } else {
          colorTemp.lerpColors(colorAntinode, colorClip, (intensity - 3.0) / 3.0);
      }

      colors[i3]     = colorTemp.r;
      colors[i3 + 1] = colorTemp.g;
      colors[i3 + 2] = colorTemp.b;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.attributes.color.needsUpdate = true;
  });

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
        size={0.18} 
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};
