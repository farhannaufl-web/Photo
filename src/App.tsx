/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { 
  Monitor, 
  Tv, 
  Upload, 
  Image as ImageIcon, 
  Film, 
  Download, 
  RefreshCw,
  Settings,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Palette,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DEFAULT_SHAPES, ASCIIOptions, getY2KFilter } from "./lib/constants";
import { renderShapesToCanvas } from "./lib/asciiProcessor";

type Mode = "ascii" | "y2k";

export default function App() {
  const [mode, setMode] = useState<Mode>("ascii");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [options, setOptions] = useState<ASCIIOptions>({
    width: 60,
    bg: "#000000",
    fg: "#a3e635",
    invert: false,
    rotation: 0,
    scaleMode: 'fixed',
    shapes: [...DEFAULT_SHAPES],
    shapeColors: Array(7).fill("#a3e635")
  });

  const [recentRenders, setRecentRenders] = useState<{name: string, type: string, mode: Mode}[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      
      setRecentRenders(prev => [
        { name: selectedFile.name, type: selectedFile.type, mode: mode },
        ...prev.slice(0, 4)
      ]);
    }
  };

  const handleShapeUpload = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "image/svg+xml");
      const path = doc.querySelector("path")?.getAttribute("d");
      if (path) {
        const newShapes = [...options.shapes];
        newShapes[index] = path;
        setOptions({ ...options, shapes: newShapes });
      }
    };
    reader.readAsText(file);
  };

  const processFrame = () => {
    if (!sourceCanvasRef.current || !displayCanvasRef.current || !file) return;

    const sCanvas = sourceCanvasRef.current;
    const dCanvas = displayCanvasRef.current;
    const sCtx = sCanvas.getContext("2d", { willReadFrequently: true });
    const dCtx = dCanvas.getContext("2d");

    if (!sCtx || !dCtx) return;

    const source = videoRef.current || document.getElementById("preview-img") as HTMLImageElement;
    if (!source) return;

    // Handle Aspect Ratio
    let sourceW = 0;
    let sourceH = 0;

    if (source instanceof HTMLVideoElement) {
      if (source.videoWidth === 0) return;
      sourceW = source.videoWidth;
      sourceH = source.videoHeight;
      setCurrentTime(source.currentTime);
      setDuration(source.duration);
    } else {
      sourceW = source.naturalWidth;
      sourceH = source.naturalHeight;
    }

    const aspect = sourceH / sourceW;
    
    // Set internal processing resolution
    sCanvas.width = options.width;
    sCanvas.height = Math.floor(options.width * aspect);

    // Set display resolution (High-res display)
    const displayW = 1200;
    dCanvas.width = displayW;
    dCanvas.height = displayW * aspect;

    sCtx.drawImage(source, 0, 0, sCanvas.width, sCanvas.height);
    
    if (mode === "ascii") {
      renderShapesToCanvas(
        sCtx, 
        dCtx, 
        sCanvas.width, 
        sCanvas.height, 
        options, 
        performance.now()
      );
    } else {
      // Y2K Rendering
      dCtx.filter = getY2KFilter(0.8);
      dCtx.drawImage(source, 0, 0, dCanvas.width, dCanvas.height);
    }

    if (file.type.startsWith("video/") && videoRef.current && !videoRef.current.paused) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  };

  useEffect(() => {
    if (previewUrl && (!file?.type.startsWith("video/") || videoRef.current?.paused)) {
      processFrame();
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [previewUrl, options, mode, file]);

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsProcessing(true);
      processFrame();
    } else {
      videoRef.current.pause();
      setIsProcessing(false);
    }
  };

  const handleScrub = (e: ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    processFrame();
  };

  const handleExport = () => {
    if (!displayCanvasRef.current) return;
    
    const stream = displayCanvasRef.current.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'render-export.webm';
      a.click();
    };

    // Record for 5 seconds or until user stops
    recorder.start();
    setIsProcessing(true);
    setTimeout(() => {
      recorder.stop();
      setIsProcessing(false);
    }, 5000); 
    
    alert("Recording 5 seconds of the current animation...");
  };

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-100 font-mono p-4 md:p-6 selection:bg-lime-400 selection:text-black">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-8 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 bg-lime-400 flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(163,230,53,0.4)]"
          >
            <Zap className="text-black" size={24} />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase whitespace-nowrap">
              RetroRender <span className="text-lime-400">PRO</span>
            </h1>
            <div className="text-[8px] text-zinc-600 tracking-[0.3em] uppercase">Vector Processing Unit</div>
          </div>
        </div>
        
        <nav className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800 backdrop-blur-xl">
          <button 
            onClick={() => setMode("ascii")}
            className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              mode === "ascii" ? "bg-lime-400 text-black shadow-[0_4px_20px_rgba(163,230,53,0.3)]" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Monitor size={14} /> ASCII
          </button>
          <button 
            onClick={() => setMode("y2k")}
            className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              mode === "y2k" ? "bg-purple-500 text-white shadow-[0_4px_20px_rgba(168,85,247,0.3)]" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Tv size={14} /> Y2K
          </button>
        </nav>

        <div className="flex gap-4 items-center">
          <button 
            className="bg-zinc-800 text-white px-6 py-3 rounded-lg font-bold uppercase text-xs hover:bg-zinc-700 transition-all border border-zinc-700 flex items-center gap-2"
            onClick={() => document.getElementById('main-upload')?.click()}
          >
            <Upload size={14} /> Import
          </button>
          <button 
            onClick={handleExport}
            className="bg-lime-400 text-zinc-950 px-6 py-3 rounded-lg font-bold uppercase text-xs hover:scale-105 transition-all shadow-lg flex items-center gap-2"
          >
            <Download size={14} /> Export
          </button>
          <input id="main-upload" type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-12 auto-rows-min gap-6">
        
        {/* Left Column: Shape Library & History */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shape Pipeline</h2>
              <Palette size={12} className="text-lime-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {options.shapes.slice(0, 7).map((path, i) => (
                <div key={i} className="group relative">
                  <div className="aspect-square bg-zinc-950 rounded-xl border border-zinc-800 p-2 flex items-center justify-center hover:border-lime-400/50 transition-all">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d={path} fill="none" stroke={options.shapeColors[i]} strokeWidth="4" />
                    </svg>
                    <label className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center bg-zinc-900/80 rounded-xl transition-opacity">
                      <Upload size={14} className="text-white" />
                      <input type="file" className="hidden" accept=".svg" onChange={(e) => handleShapeUpload(i, e)} />
                    </label>
                  </div>
                  <input 
                    type="color" 
                    value={options.shapeColors[i]} 
                    onChange={(e) => {
                      const newColors = [...options.shapeColors];
                      newColors[i] = e.target.value;
                      setOptions({...options, shapeColors: newColors});
                    }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-zinc-900 cursor-pointer bg-transparent"
                  />
                </div>
              ))}
              <div className="aspect-square bg-lime-400/5 border-2 border-dashed border-lime-400/20 rounded-xl flex items-center justify-center text-lime-400/20">
                <Maximize2 size={24} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>BG COLOR</span>
                <span className="uppercase text-zinc-100">{options.bg}</span>
              </div>
              <input 
                type="color" 
                value={options.bg}
                onChange={(e) => setOptions({...options, bg: e.target.value})}
                className="w-full h-10 rounded-xl border border-zinc-800 cursor-pointer p-0 bg-transparent"
              />
            </div>
          </div>

          <div className="bg-zinc-900/10 border border-zinc-800/50 rounded-3xl p-6">
             <h2 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">Rendering Logs</h2>
             <div className="space-y-3 font-mono text-[9px] text-zinc-700">
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span>RESOLVING ASPECT</span>
                  <span className="text-lime-900">OK</span>
                </div>
                <div className="flex justify-between border-b border-zinc-900 pb-1">
                  <span>VERTEX_INDEX</span>
                  <span className="text-lime-900">7_SLOTS_ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span>SHADING_MODEL</span>
                  <span className="text-lime-900">BILINEAR</span>
                </div>
             </div>
          </div>
        </div>

        {/* Center: The Core Display & Video Controls */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-4 flex flex-col relative overflow-hidden h-[600px] shadow-2xl">
            {/* Visuals Overlay */}
            {mode === 'y2k' && (
              <>
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden mix-blend-screen opacity-10">
                   <div className="absolute top-0 left-0 w-full h-[200%] animate-[slide_10s_linear_infinite]" style={{ background: 'repeating-linear-gradient(transparent, transparent 2px, rgba(255,255,255,0.1) 3px)' }}></div>
                </div>
                <div className="absolute inset-0 pointer-events-none z-20 opacity-30 mix-blend-overlay" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")', animation: 'noise 0.5s infinite steps(2)' }}></div>
                {isProcessing && (
                  <div className="absolute inset-0 pointer-events-none z-30 opacity-20 bg-red-500 mix-blend-color glitch-active"></div>
                )}
              </>
            )}

            <div className="flex-grow flex items-center justify-center relative bg-[#050505] rounded-[2rem] overflow-hidden">
               {!previewUrl ? (
                 <div className="text-zinc-800 flex flex-col items-center gap-6">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="w-32 h-32 border border-zinc-900 rounded-full flex items-center justify-center"
                    >
                      <Film className="w-12 h-12 opacity-20" />
                    </motion.div>
                    <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-zinc-900">No Stream Active</span>
                 </div>
               ) : (
                 <canvas 
                   ref={displayCanvasRef} 
                   className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                 />
               )}

               {/* Hidden Processing Sources */}
               <div className="hidden">
                 {file?.type.startsWith("image/") ? (
                   <img id="preview-img" src={previewUrl!} alt="Source" onLoad={processFrame} />
                 ) : (
                   <video ref={videoRef} src={previewUrl!} loop muted />
                 )}
               </div>
            </div>

            {/* Hardware Status Bar */}
            <div className="h-14 mt-4 flex items-center justify-between px-6 bg-zinc-900/30 rounded-2xl border border-zinc-800">
               <div className="flex gap-4 items-center">
                 <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-red-500 animate-pulse' : 'bg-zinc-800'}`}></div>
                 <span className="text-[9px] font-bold text-zinc-500 uppercase">Buffer: {isProcessing ? 'Active' : 'Standby'}</span>
               </div>
               <div className="flex gap-6">
                 <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{options.width} GRID UNITS</span>
                 <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest tabular-nums">T: {currentTime.toFixed(2)}s</span>
               </div>
            </div>
          </div>

          {/* Video Scrubber & Playback */}
          {file?.type.startsWith("video/") && (
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <button 
                  onClick={togglePlayback}
                  className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform shadow-[0_0_20px_rgba(163,230,53,0.3)]"
                >
                  {isProcessing ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
                </button>
                <div className="flex-grow space-y-2">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span>Frame Position</span>
                    <span className="text-lime-400 tabular-nums">{currentTime.toFixed(2)} / {duration.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={duration} 
                    step="0.01"
                    value={currentTime}
                    onChange={handleScrub}
                    className="w-full h-1.5 bg-zinc-950 rounded-full appearance-none cursor-pointer accent-lime-400 border border-zinc-800"
                  />
                </div>
                <button 
                  onClick={() => { if(videoRef.current) videoRef.current.currentTime = 0; }}
                  className="p-3 text-zinc-500 hover:text-white transition-colors"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Engine Dashboard */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-8">
              <Settings size={14} className="text-lime-400" />
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global Params</h2>
            </div>

            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                  <label>Grid Granularity</label>
                  <span className="text-lime-400">{options.width}U</span>
                </div>
                <input 
                  type="range" 
                  min="20" max="150" step="1"
                  value={options.width}
                  onChange={(e) => setOptions({ ...options, width: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-950 rounded-full appearance-none cursor-pointer accent-lime-400 border border-zinc-800"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                  <label>Pixel Rotation</label>
                  <span className="text-lime-400">{options.rotation}°</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="360" step="5"
                  value={options.rotation}
                  onChange={(e) => setOptions({ ...options, rotation: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-zinc-950 rounded-full appearance-none cursor-pointer accent-lime-400 border border-zinc-800"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800">
                 <button 
                  onClick={() => setOptions({ ...options, invert: !options.invert })}
                  className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-all text-[11px] font-bold uppercase tracking-wider ${
                    options.invert ? 'bg-lime-400/10 text-lime-400 border-lime-400/50' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span>Invert Signal</span>
                  <div className={`w-8 h-4 rounded-full p-1 transition-colors ${options.invert ? 'bg-lime-400' : 'bg-zinc-800'}`}>
                    <div className={`w-2 h-2 bg-black rounded-full transition-transform ${options.invert ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest pl-1">Scaling Engine</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setOptions({...options, scaleMode: 'fixed'})}
                      className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${options.scaleMode === 'fixed' ? 'border-lime-400 text-lime-400 bg-lime-400/5' : 'border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                    >
                      Flat
                    </button>
                    <button 
                      onClick={() => setOptions({...options, scaleMode: 'dynamic'})}
                      className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${options.scaleMode === 'dynamic' ? 'border-lime-400 text-lime-400 bg-lime-400/5' : 'border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                    >
                      Lum-Scale
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Performance Bento */}
          <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-950 border border-zinc-800 rounded-3xl p-6">
            <h3 className="text-[10px] font-bold uppercase mb-4 tracking-widest text-[#555]">Renderer Analysis</h3>
            <div className="space-y-4">
              {['V-Sync', 'Anti-Alias', 'Bloom'].map((stat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-600">
                    <span>{stat}</span>
                    <span>{90 + i * 2}%</span>
                  </div>
                  <div className="w-full h-[2px] bg-zinc-900 rounded-full">
                    <div className="h-full bg-zinc-700" style={{ width: `${90 + i * 2}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Hidden processing canvas */}
      <canvas ref={sourceCanvasRef} className="hidden" />

      <style>{`
        @keyframes slide {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        @keyframes noise {
          0% { background-position: 0 0; }
          100% { background-position: 100% 100%; }
        }
        .glitch-active {
          animation: glitch 0.2s infinite;
          filter: hue-rotate(90deg) contrast(150%);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

