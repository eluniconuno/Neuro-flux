import React from 'react';
import { VideoFormat } from '../types';
import { VIDEO_FORMAT_CONFIGS } from '../services/videoRecorderService';

interface CountdownOverlayProps {
  count: number;
  format: VideoFormat;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count, format }) => {
  if (count <= 0) return null;

  const formatConfig = VIDEO_FORMAT_CONFIGS[format];

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none font-rajdhani animate-fadeIn select-none">
      <div className="relative flex flex-col items-center">
        
        {/* PULSING CYBER CIRCLE */}
        <div className="w-36 h-36 rounded-full border-2 border-red-500/50 flex items-center justify-center relative animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute -top-1 w-3 h-3 rounded-full bg-red-400 shadow-[0_0_15px_rgba(239,68,68,1)]" />
        </div>

        {/* CENTER NUMBER */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-7xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-ping" style={{ animationDuration: '1s' }}>
            {count}
          </span>
        </div>

        <div className="mt-8 text-center">
          <span className="text-xs font-bold tracking-[0.3em] text-red-400 uppercase font-mono block">
            PREPARING RENDER STREAM
          </span>
          <span className="text-sm font-semibold text-zinc-300">
            Recording format: {formatConfig.label}
          </span>
        </div>

      </div>
    </div>
  );
};
