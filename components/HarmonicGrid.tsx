import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ParticleSystemProps, AudioAnalysis } from '../types';
import { analyzeFrequencies } from '../services/audioService';

// --- GLSL MATH LIBRARY (Noise, Rotation, Logic) ---
const GLSL_CHUNKS = `
  // Simplex 3D Noise 
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute( 
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

const VJ_VERTEX_SHADER = `
  ${GLSL_CHUNKS}

  uniform float uTime;
  uniform sampler2D tAudio; 
  uniform float uBass;
  uniform float uMid;
  uniform float uTreble;
  
  attribute vec3 aInitialPos; 
  
  varying vec3 vColor;
  varying vec2 vUv;
  varying float vDisplacement; 
  varying float vAudioLevel;

  void main() {
    vUv = uv;
    vec3 pos = position; 
    
    float audioFreqVal = texture2D(tAudio, vec2(vUv.y, 0.0)).r; 
    audioFreqVal = pow(audioFreqVal, 1.4) * 3.0;

    // Simple reactive movement since VJ modes are removed
    float noise = snoise(pos * 0.1 + uTime * 0.5);
    float displacement = audioFreqVal * 2.0 + noise * uBass;
    
    pos += normal * displacement;

    vDisplacement = displacement;
    vAudioLevel = abs(audioFreqVal);
    vColor = color; 

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 0.2 * (300.0 / -mvPosition.z);
    gl_PointSize *= (1.0 + uBass);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const VJ_FRAGMENT_SHADER = `
  uniform float uTime;
  varying vec3 vColor;
  varying float vAudioLevel;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;

    vec3 finalColor = vColor;
    finalColor += vec3(vAudioLevel * 0.5); // Add brightness on volume

    gl_FragColor = vec4(finalColor, 0.9);
  }
`;

export const HarmonicGrid: React.FC<ParticleSystemProps> = ({ analyzer, isPlaying }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const ROWS = 100; 
  const COLS = 100;  
  const PARTICLE_COUNT = ROWS * COLS;

  const [audioTexture] = useState(() => {
      const size = 512; 
      const data = new Uint8Array(size); 
      const tex = new THREE.DataTexture(data, size, 1, THREE.RedFormat, THREE.UnsignedByteType);
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      return tex;
  });

  const bufferLength = analyzer ? analyzer.frequencyBinCount : 0;
  const frequencyArray = useMemo(() => new Uint8Array(bufferLength), [bufferLength]);
  const timeDomainArray = useMemo(() => new Uint8Array(bufferLength), [bufferLength]);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    tAudio: { value: audioTexture },
  }), [audioTexture]);

  const { positions, colors, uvs } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const uvData = new Float32Array(PARTICLE_COUNT * 2); 

    let i = 0;
    for (let ix = 0; ix < ROWS; ix++) {
        const u = ix / ROWS; 
        for (let iy = 0; iy < COLS; iy++) {
            const v = iy / COLS; 
            const theta = u * Math.PI * 2;
            const phi = v * Math.PI;
            const r = 25;
            pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i*3+1] = r * Math.cos(phi);
            pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);

            uvData[i*2] = u;
            uvData[i*2+1] = 1.0 - v; 

            col[i*3] = 0.0; col[i*3+1] = 0.5; col[i*3+2] = 1.0; // Default blueish
            i++;
        }
    }
    return { positions: pos, colors: col, uvs: uvData };
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !meshRef.current.material) return;
    const material = meshRef.current.material as THREE.ShaderMaterial;
    
    const time = state.clock.getElapsedTime();
    let audioData: AudioAnalysis = { bass: 0, mid: 0, treble: 0, average: 0, frequencyArray, timeDomainArray };
    
    if (analyzer && isPlaying && analyzer.frequencyBinCount > 0) {
      audioData = analyzeFrequencies(analyzer, frequencyArray, timeDomainArray, analyzer.context.sampleRate);
      
      const data = audioTexture.image.data;
      const step = Math.max(1, Math.floor(frequencyArray.length / data.length));
      for(let i = 0; i < data.length; i++) {
          data[i] = frequencyArray[i * step] || 0;
      }
      audioTexture.needsUpdate = true;
    }
    
    material.uniforms.uTime.value = time;
    material.uniforms.uBass.value = audioData.bass / 255.0;
    material.uniforms.uMid.value = audioData.mid / 255.0;
    material.uniforms.uTreble.value = audioData.treble / 255.0;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length/3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length/3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-uv" count={uvs.length/2} array={uvs} itemSize={2} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={VJ_VERTEX_SHADER}
        fragmentShader={VJ_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  );
};