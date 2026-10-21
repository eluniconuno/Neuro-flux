import React, { useEffect, useRef } from 'react';
import { SystemMode } from '../types';
import { analyzeFrequencies } from '../services/audioService';

interface PhysicsPanelProps {
  analyzer: AnalyserNode | null;
  isPlaying: boolean;
  systemMode: SystemMode;
}

export const PhysicsPanel: React.FC<PhysicsPanelProps> = ({ analyzer, isPlaying }) => {
  const typeRef = useRef<HTMLSpanElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationId: number;
    const dataArray = new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0);
    const timeArray = new Uint8Array(analyzer ? analyzer.frequencyBinCount : 0);

    const update = () => {
      if (!typeRef.current || !dataRef.current) return;

      if (!analyzer || !isPlaying) {
         typeRef.current.innerText = "STANDBY";
         dataRef.current.innerHTML = `<div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span><span class="text-[9px] text-gray-500">NO SIGNAL</span></div>`;
         
         if (canvasRef.current) {
             const ctx = canvasRef.current.getContext('2d');
             if(ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
         }
         
         animationId = requestAnimationFrame(update);
         return;
      }

      const sampleRate = analyzer.context.sampleRate;
      const audioData = analyzeFrequencies(analyzer, dataArray, timeArray, sampleRate);
      const { note, average } = audioData;

      // Update Text Info
      typeRef.current.innerText = 'CHLADNI';

      const chladniTag = audioData.chladniModes && audioData.chladniModes.confidence > 0
        ? `(${audioData.chladniModes.n}, ${audioData.chladniModes.m})`
        : '';

      const htmlContent = `
        <div class="flex items-center gap-2">
            <div class="flex flex-col items-center min-w-[34px]">
              <div class="text-cyan-400 font-extrabold text-xs text-center leading-none">${note}</div>
              ${chladniTag ? `<span class="text-[7.5px] text-indigo-300 font-mono tracking-tighter mt-0.5">${chladniTag}</span>` : ''}
            </div>
            <div class="hidden md:flex flex-col gap-0.5 w-24">
                <div class="h-1 bg-gray-800 rounded overflow-hidden"><div class="h-full bg-cyan-500 transition-all duration-75" style="width: ${(average/255)*100}%"></div></div>
                <div class="text-[8px] text-gray-500 uppercase flex justify-between font-mono"><span>${audioData.dominantFrequency?.toFixed(0)}Hz</span><span class="text-indigo-400 font-bold">${chladniTag || 'STANDBY'}</span></div>
            </div>
        </div>
      `;
      dataRef.current.innerHTML = htmlContent;

      // Canvas Mini-Visualizer
      if (canvasRef.current) {
          const cvs = canvasRef.current;
          const ctx = cvs.getContext('2d');
          if (ctx) {
              const w = cvs.width;
              const h = cvs.height;
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, w, h);
              
              const barWidth = w / 20;
              const step = Math.floor(dataArray.length / 20);
              
              for(let i=0; i<20; i++) {
                  const val = dataArray[i * step];
                  const percent = val / 255;
                  const barH = h * percent;
                  ctx.fillStyle = percent > 0.8 ? '#ffffff' : '#06b6d4';
                  ctx.fillRect(i * barWidth, h - barH, barWidth - 1, barH);
              }
          }
      }

      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, [analyzer, isPlaying]);

  return (
    <div className="flex items-center gap-4 px-4 border-l border-r border-white/10 h-8 md:h-10 mx-2 bg-black/20 md:bg-transparent rounded md:rounded-none">
      <div className="flex flex-col justify-center">
        <span ref={typeRef} className="text-[8px] font-bold tracking-[0.1em] text-gray-500 uppercase leading-none mb-0.5">STANDBY</span>
        <div className="flex gap-1">
            <span className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={`w-1 h-1 rounded-full ${isPlaying ? 'bg-green-500 animate-ping' : 'bg-gray-800'}`}></span>
        </div>
      </div>
      <div ref={dataRef} className="flex-1 min-w-[80px]"></div>
      <canvas ref={canvasRef} width={60} height={20} className="hidden md:block opacity-70" />
    </div>
  );
};