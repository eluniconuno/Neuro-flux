import React from 'react';
import { VideoFormat } from '../types';
import { VIDEO_FORMAT_CONFIGS } from '../services/videoRecorderService';

interface FramingGuideProps {
  format: VideoFormat;
  isRecording: boolean;
  showGuides: boolean;
}

export const FramingGuide: React.FC<FramingGuideProps> = ({ format, isRecording, showGuides }) => {
  if (format === 'FULL_SCREEN' && !isRecording) return null;
  if (!showGuides && !isRecording && format === 'FULL_SCREEN') return null;

  const config = VIDEO_FORMAT_CONFIGS[format];

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden">
      {/* ASPECT RATIO FRAMING BOX */}
      {format !== 'FULL_SCREEN' && (
        <div
          className={`relative border transition-all duration-300 ${
            isRecording
              ? 'border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
              : 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
          } ${
            format === 'MOBILE_9_16'
              ? 'h-[92vh] max-h-[850px] aspect-[9/16] rounded-2xl'
              : format === 'DESKTOP_16_9'
              ? 'w-[92vw] max-w-[1200px] aspect-video rounded-xl'
              : 'h-[85vh] max-h-[700px] aspect-square rounded-xl'
          }`}
        >
          {/* CORNER RETICLES */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

          {/* SAFE ZONE GRID OVERLAY */}
          {showGuides && (
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
              <div className="border-r border-b border-cyan-400" />
              <div className="border-r border-b border-cyan-400" />
              <div className="border-b border-cyan-400" />
              <div className="border-r border-b border-cyan-400" />
              <div className="border-r border-b border-cyan-400" />
              <div className="border-b border-cyan-400" />
              <div className="border-r border-cyan-400" />
              <div className="border-r border-cyan-400" />
              <div />
            </div>
          )}

          {/* FORMAT BADGE ON TOP OF FRAME */}
          <div className="absolute -top-6 left-3 px-2 py-0.5 rounded bg-black/80 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 font-bold uppercase flex items-center gap-1.5 backdrop-blur">
            <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-cyan-400'}`} />
            {config.label} — {config.aspectRatio}
          </div>

          {/* MOBILE SAFE ZONE BOUNDS (FOR TIKTOK / REELS) */}
          {format === 'MOBILE_9_16' && showGuides && (
            <div className="absolute inset-x-2 bottom-12 top-10 border border-dashed border-cyan-500/25 rounded-lg flex items-center justify-center">
              <span className="text-[8px] font-mono text-cyan-500/50 uppercase tracking-widest">
                Safe Area (TikTok / Reels / Shorts UI)
              </span>
            </div>
          )}
        </div>
      )}

      {/* RECORDING BORDER INDICATOR WHEN FULLSCREEN */}
      {format === 'FULL_SCREEN' && isRecording && (
        <div className="absolute inset-2 border-2 border-red-500/70 rounded-lg pointer-events-none shadow-[inset_0_0_30px_rgba(239,68,68,0.3)] animate-pulse" />
      )}
    </div>
  );
};
