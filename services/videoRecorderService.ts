import { VideoFormat, RecordingQuality, RecordedVideo, VideoFormatConfig } from '../types';
import { extractAudioFromBlob } from './audioExportService';

export const VIDEO_FORMAT_CONFIGS: Record<VideoFormat, VideoFormatConfig> = {
  DESKTOP_16_9: {
    id: 'DESKTOP_16_9',
    label: 'Desktop (16:9)',
    sublabel: 'YouTube / Widescreen HD',
    aspectRatio: '16/9',
    aspectValue: 16 / 9,
    standardWidth: 1920,
    standardHeight: 1080,
    iconName: 'Monitor'
  },
  MOBILE_9_16: {
    id: 'MOBILE_9_16',
    label: 'Mobile (9:16)',
    sublabel: 'Reels / TikTok / Shorts',
    aspectRatio: '9/16',
    aspectValue: 9 / 16,
    standardWidth: 1080,
    standardHeight: 1920,
    iconName: 'Smartphone'
  },
  SQUARE_1_1: {
    id: 'SQUARE_1_1',
    label: 'Square (1:1)',
    sublabel: 'Instagram Feed / Cover',
    aspectRatio: '1/1',
    aspectValue: 1,
    standardWidth: 1080,
    standardHeight: 1080,
    iconName: 'Square'
  },
  FULL_SCREEN: {
    id: 'FULL_SCREEN',
    label: 'Full Viewport',
    sublabel: 'Native Screen Scale',
    aspectRatio: 'auto',
    aspectValue: 0,
    standardWidth: 1920,
    standardHeight: 1080,
    iconName: 'Maximize2'
  }
};

export class VideoRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private timerInterval: any = null;
  private durationTimeout: any = null;
  private activeStream: MediaStream | null = null;

  public isRecording: boolean = false;

  private getBestMimeType(): { mimeType: string; extension: string } {
    const candidateTypes = [
      // 1. Prioritize MP4 (H.264 / AVC1) for universal compatibility with Windows, Mac, iOS, Android, and WhatsApp
      { type: 'video/mp4;codecs=avc1', ext: 'mp4' },
      { type: 'video/mp4;codecs=avc1.42001e', ext: 'mp4' },
      { type: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
      { type: 'video/mp4;codecs=h264', ext: 'mp4' },
      { type: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: 'mp4' },
      { type: 'video/mp4;codecs=h264,aac', ext: 'mp4' },
      { type: 'video/mp4', ext: 'mp4' },
      // 2. WebM fallback for browsers without native MP4 recording (e.g. Firefox)
      { type: 'video/webm;codecs=vp8,opus', ext: 'webm' },
      { type: 'video/webm;codecs=vp9,opus', ext: 'webm' },
      { type: 'video/webm', ext: 'webm' },
    ];

    for (const candidate of candidateTypes) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate.type)) {
        return { mimeType: candidate.type, extension: candidate.ext };
      }
    }

    return { mimeType: 'video/webm', extension: 'webm' };
  }

  startRecording(params: {
    canvas: HTMLCanvasElement;
    audioTracks: MediaStreamTrack[];
    audioBuffer?: AudioBuffer | null;
    format: VideoFormat;
    quality: RecordingQuality;
    durationSeconds: number; // 0 = manual
    onProgress: (elapsedSec: number) => void;
    onComplete: (video: RecordedVideo) => void;
    onError: (error: string) => void;
  }) {
    const { canvas, audioTracks, audioBuffer, format, quality, durationSeconds, onProgress, onComplete, onError } = params;

    try {
      this.recordedChunks = [];
      this.audioChunks = [];

      // Bitrate & FPS calculations tailored specifically for mobile and social media (<16MB for WhatsApp)
      let fps = 30;
      let videoBitsPerSecond = 1800000; // 1.8 Mbps default for WhatsApp & Stories (< 10MB)
      let audioBitsPerSecond = 96000;   // 96 kbps stereo audio

      switch (quality) {
        case 'whatsapp_lite':
        case '720p_30fps':
          fps = 30;
          videoBitsPerSecond = 1800000; // ~1.8 Mbps -> 15s ≈ 3.5 MB, 30s ≈ 7.1 MB (Direct WhatsApp auto-download)
          audioBitsPerSecond = 96000;
          break;
        case 'social_hd':
          fps = 30;
          videoBitsPerSecond = 3500000; // ~3.5 Mbps -> 15s ≈ 6.8 MB, 30s ≈ 13.6 MB (Reels & TikTok HD)
          audioBitsPerSecond = 128000;
          break;
        case 'full_hd_60':
        case '1080p_60fps':
          fps = 60;
          videoBitsPerSecond = 7500000; // ~7.5 Mbps -> 15s ≈ 14.5 MB (Full HD 60fps)
          audioBitsPerSecond = 160000;
          break;
        case 'cinema_4k':
        case '4k_60fps':
          fps = 60;
          videoBitsPerSecond = 15000000; // ~15 Mbps (Cinema 4K)
          audioBitsPerSecond = 192000;
          break;
        default:
          fps = 30;
          videoBitsPerSecond = 2200000;
          audioBitsPerSecond = 128000;
      }

      // 1. Capture WebGL canvas stream
      const canvasStream = canvas.captureStream(fps);
      const videoTracks = canvasStream.getVideoTracks();

      if (videoTracks.length === 0) {
        throw new Error('Canvas video track could not be captured.');
      }

      // 2. Combine with audio if available
      const combinedTracks: MediaStreamTrack[] = [...videoTracks];
      const hasAudio = audioTracks && audioTracks.length > 0;
      if (hasAudio) {
        audioTracks.forEach(track => combinedTracks.push(track));

        // Auxiliary dedicated audio stream recorder
        try {
          const audioStream = new MediaStream(audioTracks);
          const audioMime = MediaRecorder.isTypeSupported('audio/webm') 
            ? 'audio/webm' 
            : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
          
          this.audioRecorder = new MediaRecorder(audioStream, audioMime ? { mimeType: audioMime } : undefined);
          this.audioRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };
          this.audioRecorder.start(1000);
        } catch (e) {
          console.warn('Auxiliary audio recorder not started:', e);
        }
      }

      this.activeStream = new MediaStream(combinedTracks);

      const { mimeType, extension } = this.getBestMimeType();

      const options: MediaRecorderOptions = {
        mimeType: mimeType || undefined,
        videoBitsPerSecond,
        audioBitsPerSecond
      };

      this.mediaRecorder = new MediaRecorder(this.activeStream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        clearInterval(this.timerInterval);
        clearTimeout(this.durationTimeout);
        this.isRecording = false;

        const durationSec = Math.max(0.5, (performance.now() - this.startTime) / 1000);
        const finalBlob = new Blob(this.recordedChunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(finalBlob);

        const formatConfig = VIDEO_FORMAT_CONFIGS[format];
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const formatSuffix = format.toLowerCase().replace('_', '-');
        const filename = `flux-visualizer-${formatSuffix}-${dateStr}.${extension}`;

        let resolvedAudioBuffer = audioBuffer || null;
        let finalAudioBlob: Blob | undefined = undefined;

        if (this.audioChunks.length > 0) {
          finalAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        }

        // If no explicit buffer was provided, attempt to decode audio from blob
        if (!resolvedAudioBuffer && hasAudio) {
          resolvedAudioBuffer = await extractAudioFromBlob(finalAudioBlob || finalBlob);
        }

        const recordedVideo: RecordedVideo = {
          blob: finalBlob,
          url: videoUrl,
          durationSec,
          format,
          width: canvas.width || formatConfig.standardWidth,
          height: canvas.height || formatConfig.standardHeight,
          sizeBytes: finalBlob.size,
          mimeType,
          timestamp: new Date().toLocaleTimeString(),
          hasAudio,
          filename,
          audioBlob: finalAudioBlob,
          audioBuffer: resolvedAudioBuffer,
          isWhatsAppSafe: finalBlob.size <= 16 * 1024 * 1024
        };

        // Stop stream tracks
        if (this.activeStream) {
          this.activeStream.getTracks().forEach(t => t.stop());
        }

        onComplete(recordedVideo);
      };

      this.mediaRecorder.onerror = (e: any) => {
        clearInterval(this.timerInterval);
        clearTimeout(this.durationTimeout);
        this.isRecording = false;
        onError(e?.message || 'Recording error occurred.');
      };

      // Request data every 1000ms
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.startTime = performance.now();

      // Progress interval
      this.timerInterval = setInterval(() => {
        if (!this.isRecording) return;
        const elapsed = (performance.now() - this.startTime) / 1000;
        onProgress(elapsed);
      }, 100);

      // Auto stop on target duration if specified
      if (durationSeconds > 0) {
        this.durationTimeout = setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording();
          }
        }, durationSeconds * 1000);
      }

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      this.isRecording = false;
      onError(err?.message || 'Could not start recording.');
    }
  }

  stopRecording() {
    if (this.audioRecorder && this.audioRecorder.state !== 'inactive') {
      try {
        this.audioRecorder.stop();
      } catch (e) {
        console.error('Error stopping audio recorder:', e);
      }
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.error('Error stopping media recorder:', e);
      }
    }
  }

  // Ultra-HD Snapshot function
  static takeSnapshot(canvas: HTMLCanvasElement, format: VideoFormat): { url: string; filename: string } {
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const formatSuffix = format.toLowerCase().replace('_', '-');
    const filename = `flux-frame-${formatSuffix}-${dateStr}.png`;
    return { url: dataUrl, filename };
  }
}
