// services/audioExportService.ts
// Utility for exporting audio to standard MP3 and lossless WAV formats

// lamejs is a CommonJS library
// @ts-ignore
import * as lamejsModule from 'lamejs';
const lamejs = (lamejsModule as any).default || lamejsModule;

/**
 * Encodes Float32Array stereo/mono PCM channel data to 16-bit PCM WAV Blob
 */
export function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let left = audioBuffer.getChannelData(0);
  let right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;

  const length = left.length * numChannels * (bitDepth / 8);
  const buffer = new ArrayBuffer(44 + length);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    // Left channel
    let sampleL = Math.max(-1, Math.min(1, left[i]));
    let intSampleL = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7FFF;
    view.setInt16(offset, intSampleL, true);
    offset += 2;

    if (numChannels > 1) {
      // Right channel
      let sampleR = Math.max(-1, Math.min(1, right[i]));
      let intSampleR = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7FFF;
      view.setInt16(offset, intSampleR, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Encodes an AudioBuffer to a standard MP3 Blob using LAME MP3 Encoder
 */
export function encodeMP3(audioBuffer: AudioBuffer, kbps: number = 192): Blob {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const left = audioBuffer.getChannelData(0);
  const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;

  // Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
  const leftInt16 = new Int16Array(left.length);
  const rightInt16 = new Int16Array(right.length);

  for (let i = 0; i < left.length; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;

    const sR = Math.max(-1, Math.min(1, right[i]));
    rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
  }

  // Create Mp3Encoder
  const Mp3Encoder = lamejs.Mp3Encoder || (lamejs as any).default?.Mp3Encoder;
  if (!Mp3Encoder) {
    console.warn('lamejs.Mp3Encoder not found, falling back to WAV');
    return encodeWAV(audioBuffer);
  }

  const mp3encoder = new Mp3Encoder(numChannels > 1 ? 2 : 1, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];
  const sampleBlockSize = 1152; // LAME standard block size

  for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array;

    if (numChannels > 1) {
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }

  return new Blob(mp3Data, { type: 'audio/mp3' });
}

/**
 * Extracts AudioBuffer from a recorded video WebM/MP4 blob or audio file
 */
export async function extractAudioFromBlob(blob: Blob): Promise<AudioBuffer | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn('Could not decode audio from blob directly:', err);
    return null;
  }
}
