export class AudioController {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioNode | null = null;
  private buffer: AudioBuffer | null = null;
  private gainNode: GainNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private demoInterval: any = null;
  private isDemoRunning = false;
  private isMicActive = false;

  constructor() {
    // Lazy initialization
  }

  async init() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096; 
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.9;
      
      this.streamDestination = this.audioContext.createMediaStreamDestination();
      
      // Connect gain to speakers and to media stream recording destination
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.connect(this.streamDestination);
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadFile(file: File): Promise<void> {
    this.stopDemo();
    await this.init();
    if (!this.audioContext) return;

    if (this.source) {
      try {
        (this.source as any).stop?.();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.isMicActive = false;

    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
  }

  // Microphone Input
  async startMicrophone(): Promise<void> {
    this.stopDemo();
    await this.init();
    if (!this.audioContext || !this.analyser || !this.streamDestination) return;
    
    if (this.source) {
      try { (this.source as any).stop?.(); } catch(e){}
      this.source.disconnect();
      this.source = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    // Connect mic to stream destination for recording, but NOT to main destination (to avoid acoustic feedback)
    this.source.connect(this.streamDestination);
    this.isMicActive = true;
  }

  // Built-in Synth Demo Generator for instant music/sound visualizer testing
  async startDemoAudio(onStep?: (note: string) => void): Promise<void> {
    await this.init();
    if (!this.audioContext || !this.analyser || !this.gainNode) return;
    this.stop();
    this.isDemoRunning = true;
    this.isMicActive = false;

    const ctx = this.audioContext;
    const bpm = 124;
    const stepDuration = 60 / bpm / 2; // 16th notes
    let step = 0;

    // Progression: Cyberpunk / Synthwave in D minor
    const bassNotes = [73.42, 73.42, 65.41, 65.41, 55.00, 55.00, 82.41, 73.42]; // D2, C2, A1, E2
    const arpNotes = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 587.33, 659.25]; // D4, F4, A4, C5, A4, F4, D5, E5

    const playStep = () => {
      if (!this.isDemoRunning || !this.audioContext) return;
      const now = ctx.currentTime;

      // 1. Kick / Sub Bass on beat
      if (step % 4 === 0) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12);

        kickGain.gain.setValueAtTime(1.0, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        kickOsc.connect(kickGain);
        kickGain.connect(this.analyser!);
        kickGain.connect(this.gainNode!);

        kickOsc.start(now);
        kickOsc.stop(now + 0.3);
      }

      // 2. Bassline synth
      if (step % 2 === 0) {
        const bassFreq = bassNotes[Math.floor(step / 4) % bassNotes.length];
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350 + Math.sin(now) * 200, now);
        filter.Q.value = 4;

        bassGain.gain.setValueAtTime(0.6, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration * 1.8);

        bassOsc.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(this.analyser!);
        bassGain.connect(this.gainNode!);

        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 2);
      }

      // 3. Arpeggio / High lead
      const arpFreq = arpNotes[step % arpNotes.length];
      const arpOsc = ctx.createOscillator();
      const arpGain = ctx.createGain();
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpFreq, now);

      arpGain.gain.setValueAtTime(0.3, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);

      arpOsc.connect(arpGain);
      arpGain.connect(this.analyser!);
      arpGain.connect(this.gainNode!);

      arpOsc.start(now);
      arpOsc.stop(now + stepDuration);

      // 4. Hi-Hat noise on offbeat
      if (step % 2 === 1) {
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 7000;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.analyser!);
        noiseGain.connect(this.gainNode!);

        noise.start(now);
        noise.stop(now + 0.05);
      }

      step++;
    };

    this.demoInterval = setInterval(playStep, stepDuration * 1000);
  }

  stopDemo() {
    this.isDemoRunning = false;
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
  }

  play(onEnded?: () => void) {
    this.stopDemo();
    if (!this.audioContext || !this.buffer || !this.analyser || !this.gainNode) return;

    if (this.source) {
      try {
        (this.source as AudioBufferSourceNode).stop();
      } catch (e) {}
      this.source.disconnect();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true; // Loop audio for visualizer continuous recording

    if (onEnded) {
      source.onended = onEnded;
    }

    source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    source.start(0);
    this.source = source;
  }

  stop() {
    this.stopDemo();
    if (this.source) {
      try {
        (this.source as AudioBufferSourceNode).stop?.();
      } catch (e) {}
      if (!this.isMicActive) {
        this.source.disconnect();
        this.source = null;
      }
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.buffer;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
  
  getSampleRate(): number {
    return this.audioContext ? this.audioContext.sampleRate : 44100;
  }

  getAudioTracks(): MediaStreamTrack[] {
    if (this.streamDestination) {
      return this.streamDestination.stream.getAudioTracks();
    }
    return [];
  }

  isDemoPlaying(): boolean {
    return this.isDemoRunning;
  }

  /**
   * Renders the synth demo into an AudioBuffer using OfflineAudioContext for instant MP3/WAV export
   */
  async renderSynthDemoAudioBuffer(durationSec: number = 24): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offline = new OfflineCtx(2, Math.floor(sampleRate * durationSec), sampleRate);

    const bpm = 124;
    const stepDuration = 60 / bpm / 2; // 16th notes
    const totalSteps = Math.floor(durationSec / stepDuration);

    const bassNotes = [73.42, 73.42, 65.41, 65.41, 55.00, 55.00, 82.41, 73.42];
    const arpNotes = [293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 587.33, 659.25];

    // Master bus
    const masterGain = offline.createGain();
    masterGain.gain.value = 0.85;
    masterGain.connect(offline.destination);

    for (let step = 0; step < totalSteps; step++) {
      const now = step * stepDuration;

      // 1. Kick / Sub Bass
      if (step % 4 === 0) {
        const kickOsc = offline.createOscillator();
        const kickGain = offline.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, now);
        kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.12);
        kickGain.gain.setValueAtTime(1.0, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        kickOsc.connect(kickGain);
        kickGain.connect(masterGain);
        kickOsc.start(now);
        kickOsc.stop(now + 0.3);
      }

      // 2. Bassline synth
      if (step % 2 === 0) {
        const bassFreq = bassNotes[Math.floor(step / 4) % bassNotes.length];
        const bassOsc = offline.createOscillator();
        const bassGain = offline.createGain();
        const filter = offline.createBiquadFilter();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350 + Math.sin(now) * 200, now);
        filter.Q.value = 4;

        bassGain.gain.setValueAtTime(0.6, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + stepDuration * 1.8);

        bassOsc.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(masterGain);

        bassOsc.start(now);
        bassOsc.stop(now + stepDuration * 2);
      }

      // 3. Arpeggio / High lead
      const arpFreq = arpNotes[step % arpNotes.length];
      const arpOsc = offline.createOscillator();
      const arpGain = offline.createGain();
      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpFreq, now);
      arpGain.gain.setValueAtTime(0.3, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 0.9);
      arpOsc.connect(arpGain);
      arpGain.connect(masterGain);
      arpOsc.start(now);
      arpOsc.stop(now + stepDuration);

      // 4. Hi-Hat noise
      if (step % 2 === 1) {
        const bufferSize = Math.floor(sampleRate * 0.05);
        const buffer = offline.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = offline.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = offline.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 7000;

        const noiseGain = offline.createGain();
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(now);
        noise.stop(now + 0.05);
      }
    }

    return await offline.startRendering();
  }
}

export const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Harmonic mode base dictionary according to chromatic scale and historical Waller-Chladni archetypes
// Each musical pitch corresponds to an acoustic eigenmode with an intrinsic modal mixing angle alpha
const CHROMATIC_BASE_MODES: Record<string, { n: number; m: number; alpha: number }> = {
  "C":  { n: 2, m: 2, alpha: 0.15 }, // 4-leaf clover / concentric diamond
  "C#": { n: 3, m: 1, alpha: 0.10 }, // Triple concentric ring
  "D":  { n: 3, m: 2, alpha: 0.25 }, // Mandala hourglass & concentric rings
  "D#": { n: 4, m: 1, alpha: 0.18 }, // 4-ring radial petal
  "E":  { n: 4, m: 2, alpha: 0.35 }, // Hexagram rosette
  "F":  { n: 4, m: 3, alpha: 0.40 }, // 8-petal sacred lotus
  "F#": { n: 5, m: 2, alpha: 0.28 }, // 10-point stellar star
  "G":  { n: 5, m: 3, alpha: 0.45 }, // Sacred Flower of Life
  "G#": { n: 6, m: 2, alpha: 0.32 }, // 12-fold wheel
  "A":  { n: 6, m: 4, alpha: 0.50 }, // Resonance labyrinth
  "A#": { n: 7, m: 3, alpha: 0.38 }, // Hyper-acoustic diamond web
  "B":  { n: 7, m: 5, alpha: 0.55 }  // Crystalline matrix
};

export function getChladniModesFromFrequency(frequency: number, centroid: number = 0): {
  n: number;
  m: number;
  noteName: string;
  octave: number;
  frequency: number;
  confidence: number;
  alpha: number;
  bassMode: { n: number; m: number };
  trebleMode: { n: number; m: number };
} {
  if (!isFinite(frequency) || frequency < 30) {
    return { 
      n: 3, m: 4, noteName: "--", octave: 4, frequency: 0, confidence: 0, alpha: 0.25,
      bassMode: { n: 2, m: 1 }, trebleMode: { n: 6, m: 5 }
    };
  }

  const noteNum = 12 * (Math.log2(frequency / 440)) + 69;
  const roundedNote = Math.round(noteNum);
  const octave = Math.floor(roundedNote / 12) - 1;
  const noteIndex = ((roundedNote % 12) + 12) % 12;
  const notePitch = NOTE_STRINGS[noteIndex] || "A";
  const noteName = `${notePitch}${Math.max(1, Math.min(8, octave))}`;

  // Rich modal mapping by frequency bands following Ernst Chladni and Mary Waller experiments
  let n = 3, m = 4, alpha = 0.25;

  if (frequency < 80) {
    n = 2; m = 1; alpha = 0.05; // Fundamental cruciform
  } else if (frequency < 130) {
    n = 2; m = 2; alpha = 0.12; // 4-leaf clover / concentric diamond
  } else if (frequency < 200) {
    n = 3; m = 1; alpha = 0.18; // Triple concentric rings
  } else if (frequency < 300) {
    n = 3; m = 2; alpha = 0.25; // Hourglass oval mandala
  } else if (frequency < 420) {
    n = 3; m = 3; alpha = 0.35; // 9-cell resonant grid
  } else if (frequency < 580) {
    n = 4; m = 2; alpha = 0.30; // Hexagram 6-fold rosette
  } else if (frequency < 780) {
    n = 4; m = 3; alpha = 0.42; // 8-petal Sacred Lotus
  } else if (frequency < 1050) {
    n = 5; m = 2; alpha = 0.22; // 10-point stellar star
  } else if (frequency < 1400) {
    n = 5; m = 3; alpha = 0.45; // Sacred Flower of Life
  } else if (frequency < 1850) {
    n = 5; m = 4; alpha = 0.32; // 12-lobed sacred mandala
  } else if (frequency < 2400) {
    n = 6; m = 3; alpha = 0.48; // Acoustic resonator labyrinth
  } else if (frequency < 3200) {
    n = 6; m = 4; alpha = 0.52; // Crystalline diamond matrix
  } else if (frequency < 4200) {
    n = 7; m = 3; alpha = 0.38; // Cymatic honeycomb
  } else {
    n = 7; m = 5; alpha = 0.55; // Transcendent cymatic web
  }

  // Modulate alpha dynamically with tonal brightness
  if (centroid > 0) {
    const centroidShift = ((centroid - 600) / 2000) * 0.15;
    alpha = Math.min(0.85, Math.max(0.08, alpha + centroidShift));
  }

  // Multi-harmonic companions derived from audio spectrum
  const bassN = Math.max(1, Math.min(4, Math.floor(n * 0.6) || 1));
  const bassM = Math.max(1, Math.min(4, Math.floor(m * 0.6) || 1));
  const trebleN = Math.min(10, Math.max(5, n + 2));
  const trebleM = Math.min(10, Math.max(4, m + 2));

  return {
    n,
    m,
    noteName,
    octave,
    frequency: Math.round(frequency),
    confidence: 1.0,
    alpha,
    bassMode: { n: bassN, m: bassM },
    trebleMode: { n: trebleN, m: trebleM }
  };
}

export function getNoteFromFrequency(frequency: number): string {
  if (!isFinite(frequency) || frequency === 0) return "--";
  const res = getChladniModesFromFrequency(frequency);
  return res.noteName;
}

// Memory cache for smooth note stabilization and multi-component frame deduplication
let lastStableFrequency = 0;
let lastStableNote = "--";
let lastStableModes = { 
  n: 3, m: 4, noteName: "--", octave: 4, frequency: 0, confidence: 0, alpha: 0.25,
  bassMode: { n: 2, m: 1 }, trebleMode: { n: 6, m: 5 }
};
let stableCounter = 0;
let lastAnalysisTimestamp = 0;
let lastCachedAnalysis: any = null;

export const analyzeFrequencies = (
  analyser: AnalyserNode, 
  frequencyArray: Uint8Array, 
  timeDomainArray: Uint8Array, 
  sampleRate: number
) => {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  // Frame cache: if called multiple times within 8ms for the same analyser, return cached results
  if (lastCachedAnalysis && (now - lastAnalysisTimestamp < 8) && lastCachedAnalysis._analyser === analyser) {
    if (frequencyArray !== lastCachedAnalysis.frequencyArray && frequencyArray.length === lastCachedAnalysis.frequencyArray.length) {
      frequencyArray.set(lastCachedAnalysis.frequencyArray);
    }
    if (timeDomainArray !== lastCachedAnalysis.timeDomainArray && timeDomainArray.length === lastCachedAnalysis.timeDomainArray.length) {
      timeDomainArray.set(lastCachedAnalysis.timeDomainArray);
    }
    return lastCachedAnalysis;
  }

  analyser.getByteFrequencyData(frequencyArray);
  analyser.getByteTimeDomainData(timeDomainArray);

  const bufferLength = analyser.frequencyBinCount;
  const nyquist = sampleRate / 2;
  
  const bassRange = Math.max(1, Math.floor(bufferLength * 0.05)); 
  const midRange = Math.max(bassRange + 1, Math.floor(bufferLength * 0.25));  
  
  let bassSum = 0;
  let midSum = 0;
  let trebleSum = 0;

  // 1. Bass band peak (35 Hz - 180 Hz)
  const minBassBin = Math.max(1, Math.floor((35 / nyquist) * bufferLength));
  const maxBassBin = Math.min(bufferLength - 1, Math.floor((180 / nyquist) * bufferLength));
  let bassPeakVal = -1;
  let bassPeakIndex = -1;

  // 2. Melodic band peak (180 Hz - 3500 Hz) with pink-noise tilt compensation
  const minMelodyBin = Math.max(1, Math.floor((180 / nyquist) * bufferLength));
  const maxMelodyBin = Math.min(bufferLength - 1, Math.floor((3500 / nyquist) * bufferLength));
  let melodyPeakWeighted = -1;
  let melodyPeakVal = -1;
  let melodyPeakIndex = -1;

  // 3. Treble overtone peak (3500 Hz - 9000 Hz)
  const minTrebleBin = Math.max(1, Math.floor((3500 / nyquist) * bufferLength));
  const maxTrebleBin = Math.min(bufferLength - 1, Math.floor((9000 / nyquist) * bufferLength));
  let treblePeakVal = -1;
  let treblePeakIndex = -1;

  // 4. Spectral Centroid computation (tracks overall tonal center of the audio track)
  let weightedFreqSum = 0;
  let totalMagnitudeSum = 0;

  for (let i = 0; i < bufferLength; i++) {
    const value = frequencyArray[i];

    if (value > 6) {
      const binFreq = (i / bufferLength) * nyquist;
      weightedFreqSum += binFreq * value;
      totalMagnitudeSum += value;
    }

    // Bass peak
    if (i >= minBassBin && i <= maxBassBin && value > bassPeakVal) {
      bassPeakVal = value;
      bassPeakIndex = i;
    }

    // Melodic pitch peak with high-frequency equal-loudness weighting
    if (i >= minMelodyBin && i <= maxMelodyBin) {
      const weight = 1.0 + (i / maxMelodyBin) * 2.5;
      const weightedVal = value * weight;
      if (weightedVal > melodyPeakWeighted) {
        melodyPeakWeighted = weightedVal;
        melodyPeakVal = value;
        melodyPeakIndex = i;
      }
    }

    // Treble peak
    if (i >= minTrebleBin && i <= maxTrebleBin && value > treblePeakVal) {
      treblePeakVal = value;
      treblePeakIndex = i;
    }

    if (i < bassRange) {
      bassSum += value;
    } else if (i < midRange) {
      midSum += value;
    } else {
      trebleSum += value;
    }
  }

  const bass = bassSum / bassRange;
  const mid = midSum / Math.max(1, (midRange - bassRange));
  const treble = trebleSum / Math.max(1, (bufferLength - midRange));
  const average = (bass + mid + treble) / 3;

  const spectralCentroid = totalMagnitudeSum > 0 ? (weightedFreqSum / totalMagnitudeSum) : 0;

  // Primary dominant frequency extraction
  let dominantFrequency = 0;
  if (melodyPeakIndex > minMelodyBin && melodyPeakIndex < maxMelodyBin && melodyPeakVal > 14) {
    const alpha = frequencyArray[melodyPeakIndex - 1];
    const beta = frequencyArray[melodyPeakIndex];
    const gamma = frequencyArray[melodyPeakIndex + 1];
    const denom = alpha - 2 * beta + gamma;
    const delta = denom !== 0 ? 0.5 * (alpha - gamma) / denom : 0;
    dominantFrequency = ((melodyPeakIndex + delta) / bufferLength) * nyquist;
  } else if (spectralCentroid > 50 && average > 8) {
    dominantFrequency = spectralCentroid;
  } else if (bassPeakIndex > minBassBin && bassPeakIndex < maxBassBin && bassPeakVal > 30) {
    dominantFrequency = (bassPeakIndex / bufferLength) * nyquist;
  }

  // Multi-harmonic companions derived from audio spectrum
  const dynBassN = Math.max(1, Math.min(4, 1 + Math.floor((bass / 255) * 3)));
  const dynBassM = Math.max(1, Math.min(4, 1 + Math.floor((bassPeakVal > 0 ? (bassPeakVal / 255) : (bass / 255)) * 3)));
  const dynTrebleN = Math.min(10, Math.max(5, 4 + Math.floor((treble / 255) * 6)));
  const dynTrebleM = Math.min(10, Math.max(4, 3 + Math.floor((treble / 255) * 6)));

  // Dynamic Chladni modes with responsive hysteresis (~90ms)
  let note = "--";
  let chladniModes = { 
    n: 3, m: 4, noteName: "--", octave: 4, frequency: 0, confidence: 0, alpha: 0.25,
    bassMode: { n: dynBassN, m: dynBassM },
    trebleMode: { n: dynTrebleN, m: dynTrebleM }
  };

  if (dominantFrequency > 40 && average > 5) {
    const rawModes = getChladniModesFromFrequency(dominantFrequency, spectralCentroid);
    chladniModes = {
      ...rawModes,
      bassMode: { n: dynBassN, m: dynBassM },
      trebleMode: { n: dynTrebleN, m: dynTrebleM }
    };
    note = chladniModes.noteName;
    lastStableFrequency = dominantFrequency;
    lastStableNote = note;
    lastStableModes = chladniModes;
    stableCounter = 6; // Quick 90ms hold for rapid musical responsiveness
  } else if (stableCounter > 0) {
    stableCounter--;
    dominantFrequency = lastStableFrequency;
    note = lastStableNote;
    chladniModes = { 
      ...lastStableModes, 
      confidence: Math.max(0.4, stableCounter / 6),
      bassMode: { n: dynBassN, m: dynBassM },
      trebleMode: { n: dynTrebleN, m: dynTrebleM }
    };
  }

  let mood = "Neutral";
  if (bass > mid * 1.4) mood = "Deep / Heavy";
  if (mid > bass && mid > treble) mood = "Harmonic / Core";
  if (treble > mid * 1.2) mood = "High / Ethereal";
  if (average > 160) mood = "Intense / Overdrive";

  const result = { 
    bass, 
    mid, 
    treble, 
    average, 
    frequencyArray, 
    timeDomainArray, 
    dominantFrequency, 
    note, 
    mood,
    chladniModes,
    _analyser: analyser
  };

  lastAnalysisTimestamp = now;
  lastCachedAnalysis = result;

  return result;
};
