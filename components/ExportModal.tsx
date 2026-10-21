import React, { useRef, useState } from 'react';
import { RecordedVideo } from '../types';
import { 
  Download, RefreshCw, Play, Pause, Volume2, VolumeX, Check, 
  Video, Music, Share2, Sparkles, X, FileAudio, Disc, AlertCircle, Loader2 
} from 'lucide-react';
import { VIDEO_FORMAT_CONFIGS } from '../services/videoRecorderService';
import { encodeMP3, encodeWAV, extractAudioFromBlob } from '../services/audioExportService';

interface ExportModalProps {
  video: RecordedVideo | null;
  onClose: () => void;
  onRecordAgain: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ video, onClose, onRecordAgain }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  
  // Download states
  const [videoDownloaded, setVideoDownloaded] = useState<string | null>(null);
  const [isEncodingMp3, setIsEncodingMp3] = useState(false);
  const [isEncodingWav, setIsEncodingWav] = useState(false);
  const [mp3Downloaded, setMp3Downloaded] = useState(false);
  const [wavDownloaded, setWavDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  if (!video) return null;

  const formatConfig = VIDEO_FORMAT_CONFIGS[video.format];
  const sizeMB = (video.sizeBytes / (1024 * 1024)).toFixed(2);
  const durationFormatted = `${Math.floor(video.durationSec / 60)}:${Math.floor(video.durationSec % 60).toString().padStart(2, '0')}.${Math.floor((video.durationSec % 1) * 10)}`;

  const isNativeMp4 = video.mimeType.includes('mp4') || video.filename.endsWith('.mp4');

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // 1. Download Video in MP4 (Compatible) or WebM
  const handleDownloadVideo = (targetExt: 'mp4' | 'webm') => {
    let finalFilename = video.filename;
    if (targetExt === 'mp4') {
      finalFilename = finalFilename.replace(/\.webm$/, '.mp4');
      if (!finalFilename.endsWith('.mp4')) finalFilename += '.mp4';
    } else {
      finalFilename = finalFilename.replace(/\.mp4$/, '.webm');
      if (!finalFilename.endsWith('.webm')) finalFilename += '.webm';
    }

    const a = document.createElement('a');
    a.href = video.url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setVideoDownloaded(targetExt);
    setTimeout(() => setVideoDownloaded(null), 3000);
  };

  // 2. Resolve AudioBuffer from video or audioBlob
  const resolveAudioBuffer = async (): Promise<AudioBuffer | null> => {
    if (video.audioBuffer) return video.audioBuffer;
    
    // Try auxiliary audio blob first
    if (video.audioBlob) {
      const buf = await extractAudioFromBlob(video.audioBlob);
      if (buf) return buf;
    }

    // Try video blob
    if (video.blob) {
      const buf = await extractAudioFromBlob(video.blob);
      if (buf) return buf;
    }

    return null;
  };

  // 3. Download Audio in Standard MP3 Format (Universal compatibility)
  const handleDownloadMp3 = async () => {
    setAudioError(null);
    setIsEncodingMp3(true);

    try {
      const buffer = await resolveAudioBuffer();
      if (!buffer) {
        setAudioError('Nenhuma faixa de áudio detectada na gravação para exportação MP3.');
        setIsEncodingMp3(false);
        return;
      }

      const mp3Blob = encodeMP3(buffer, 192);
      const mp3Url = URL.createObjectURL(mp3Blob);
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `flux-audio-${dateStr}.mp3`;

      const a = document.createElement('a');
      a.href = mp3Url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setMp3Downloaded(true);
      setTimeout(() => setMp3Downloaded(false), 3500);
    } catch (err: any) {
      console.error('Error generating MP3:', err);
      setAudioError(err?.message || 'Erro ao gerar arquivo MP3');
    } finally {
      setIsEncodingMp3(false);
    }
  };

  // 4. Download Audio in Lossless WAV Format (Master Studio)
  const handleDownloadWav = async () => {
    setAudioError(null);
    setIsEncodingWav(true);

    try {
      const buffer = await resolveAudioBuffer();
      if (!buffer) {
        setAudioError('Nenhuma faixa de áudio detectada na gravação para exportação WAV.');
        setIsEncodingWav(false);
        return;
      }

      const wavBlob = encodeWAV(buffer);
      const wavUrl = URL.createObjectURL(wavBlob);
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `flux-audio-master-${dateStr}.wav`;

      const a = document.createElement('a');
      a.href = wavUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setWavDownloaded(true);
      setTimeout(() => setWavDownloaded(false), 3500);
    } catch (err: any) {
      console.error('Error generating WAV:', err);
      setAudioError(err?.message || 'Erro ao gerar arquivo WAV');
    } finally {
      setIsEncodingWav(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(video.filename);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[94vh] bg-zinc-950 border border-cyan-500/40 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden text-white font-rajdhani">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cyan-900/40 bg-black/60">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-wider text-cyan-400 uppercase">
                  Central de Exportação de Mídia
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  {formatConfig.label}
                </span>
                {isNativeMp4 ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                    MP4 UNIVERSAL
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-950/80 border border-amber-500/40 text-amber-400">
                    WEBM / MP4
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {video.filename}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT: TWO COLUMN ON DESKTOP */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* VIDEO PREVIEW PLAYER (Left / Top) */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center bg-black/70 rounded-lg border border-zinc-800 p-2 sm:p-4 min-h-[280px]">
            <div className={`relative w-full flex items-center justify-center overflow-hidden rounded bg-black ${
              video.format === 'MOBILE_9_16' ? 'max-w-[230px] aspect-[9/16]' : video.format === 'SQUARE_1_1' ? 'max-w-[320px] aspect-square' : 'aspect-video'
            }`}>
              <video
                ref={videoRef}
                src={video.url}
                className="w-full h-full object-contain"
                autoPlay
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* OVERLAY CONTROLS */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1.5 rounded bg-black/70 backdrop-blur border border-white/10 text-xs">
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span className="font-mono">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-zinc-400">{durationFormatted}s</span>
                  {video.hasAudio && (
                    <button
                      onClick={toggleMute}
                      className="text-zinc-300 hover:text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TECHNICAL SPECS BELOW PLAYER */}
            <div className="w-full mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded p-2">
                <span className="text-[10px] text-zinc-500 block uppercase">Resolução & Proporção</span>
                <span className="text-zinc-200 font-bold">{video.width} × {video.height}</span>
                <span className="text-[10px] text-zinc-400 block">{formatConfig.label}</span>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded p-2">
                <span className="text-[10px] text-zinc-500 block uppercase">Duração & Tamanho</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold text-sm">{sizeMB} MB</span>
                  {video.sizeBytes <= 16 * 1024 * 1024 ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 font-bold">
                      WHATSAPP OK
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/40 font-bold">
                      &gt;16MB
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-emerald-400 block">{durationFormatted}s</span>
              </div>
            </div>
          </div>

          {/* EXPORT OPTIONS (Right / Bottom) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            
            {/* NOTICE / FORMAT COMPATIBILITY BADGE */}
            <div className={`border rounded-lg p-3 text-xs ${
              video.sizeBytes <= 16 * 1024 * 1024
                ? 'bg-emerald-950/25 border-emerald-800/40'
                : 'bg-amber-950/25 border-amber-800/40'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 shrink-0 ${video.sizeBytes <= 16 * 1024 * 1024 ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className={`font-bold ${video.sizeBytes <= 16 * 1024 * 1024 ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {video.sizeBytes <= 16 * 1024 * 1024 
                      ? 'Arquivo Otimizado para WhatsApp & Redes Sociais' 
                      : 'Aviso de Tamanho para WhatsApp'}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-zinc-300">
                  {sizeMB} MB
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                {video.sizeBytes <= 16 * 1024 * 1024 ? (
                  <>Este arquivo está <strong className="text-emerald-300">abaixo de 16MB</strong>, garantindo download e reprodução automática imediata no celular e no WhatsApp sem travar!</>
                ) : (
                  <>Este vídeo tem {sizeMB} MB. Como ultrapassa o limite de 16MB do WhatsApp para envio direto em conversa, recomendamos gravar usando o perfil <strong className="text-white">WhatsApp & Stories</strong> ou baixar o <strong className="text-amber-400">Áudio MP3</strong>.</>
                )}
              </p>
            </div>

            {/* ERROR ALERT IF OCCURRED */}
            {audioError && (
              <div className="bg-red-950/60 border border-red-800/60 rounded-lg p-2.5 text-xs text-red-300 flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{audioError}</span>
              </div>
            )}

            {/* 1. SEÇÃO DE VÍDEO COMPATÍVEL (MP4 / WEBM) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-cyan-400 uppercase font-mono flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  Exportação de Vídeo
                </span>
                <span className="text-[9px] font-mono text-zinc-400">
                  Compatível com PC, Mac, Celulares e WhatsApp
                </span>
              </div>

              {/* Primary Video Button (MP4) */}
              <button
                onClick={() => handleDownloadVideo('mp4')}
                className={`w-full py-3 px-4 rounded-lg font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  videoDownloaded === 'mp4'
                    ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)]'
                }`}
              >
                {videoDownloaded === 'mp4' ? (
                  <>
                    <Check className="w-5 h-5" />
                    VÍDEO MP4 BAIXADO COM SUCESSO!
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    BAIXAR VÍDEO COMPATÍVEL WHATSAPP / REDES (.MP4)
                  </>
                )}
              </button>

              {/* Secondary WebM Video Button */}
              <button
                onClick={() => handleDownloadVideo('webm')}
                className="w-full py-2 px-3 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Baixar Alternativo em Formato Web (.webm)</span>
              </button>
            </div>

            {/* 2. SEÇÃO DE ÁUDIO COMPATÍVEL (MP3 / WAV) */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase font-mono flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  Exportação de Áudio (MP3 / WAV)
                </span>
                <span className="text-[9px] font-mono text-zinc-400">
                  LAME 192 kbps Stereo
                </span>
              </div>

              {/* Primary MP3 Audio Button */}
              <button
                onClick={handleDownloadMp3}
                disabled={isEncodingMp3}
                className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                  mp3Downloaded
                    ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                    : isEncodingMp3
                    ? 'bg-amber-600/80 text-white cursor-wait'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                }`}
              >
                {isEncodingMp3 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    CODIFICANDO ARQUIVO MP3...
                  </>
                ) : mp3Downloaded ? (
                  <>
                    <Check className="w-5 h-5" />
                    ÁUDIO MP3 BAIXADO COM SUCESSO!
                  </>
                ) : (
                  <>
                    <FileAudio className="w-5 h-5" />
                    BAIXAR ARQUIVO DE ÁUDIO (.MP3)
                  </>
                )}
              </button>

              {/* Lossless WAV Audio Button */}
              <button
                onClick={handleDownloadWav}
                disabled={isEncodingWav}
                className="w-full py-2 px-3 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-amber-900/40 text-amber-300 hover:text-amber-200 text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
              >
                {isEncodingWav ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : wavDownloaded ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Disc className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Baixar Áudio de Estúdio Sem Perdas (.WAV Master 16-bit)</span>
              </button>
            </div>

            {/* MODAL FOOTER ACTIONS */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={onRecordAgain}
                className="py-2 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                GRAVAR NOVO TAKE
              </button>

              <button
                onClick={handleCopyLink}
                className="py-2 px-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? 'NOME COPIADO!' : 'COPIAR INFORMAÇÕES'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
