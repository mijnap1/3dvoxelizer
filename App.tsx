
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { analyzeImageForVoxel } from './geminiService';
import { VoxelDesignResponse, ProcessingState } from './types';
import VoxelScene from './VoxelScene';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [design, setDesign] = useState<VoxelDesignResponse | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle', message: '' });
  const [autoRotate, setAutoRotate] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voxelSceneRef = useRef<{ exportScene: () => void } | null>(null);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setDesign(null);
        setProcessing({ status: 'idle', message: '' });
      };
      reader.readAsDataURL(file);
    }
  };

  const startProcessing = async () => {
    if (!image) return;
    setProcessing({ status: 'analyzing', message: 'Analyzing scene components...' });
    try {
      const base64 = image.split(',')[1];
      const result = await analyzeImageForVoxel(base64);
      setDesign(result);
      setProcessing({ status: 'complete', message: 'Voxelized!' });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Voxel matrix failure.';
      setProcessing({ status: 'error', message });
    }
  };

  const totalVoxelEstimate = useMemo(() => {
    if (!design) return 0;
    return design.clusters.reduce((acc, c) => acc + (c.w * c.h * c.d), 0);
  }, [design]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const downloadModel = () => {
    if (voxelSceneRef.current) {
      voxelSceneRef.current.exportScene();
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col font-['Space_Grotesk'] overflow-hidden ${theme === 'dark' ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Background Ambience */}
      <div className={`fixed inset-0 -z-10 transition-opacity duration-1000 ${theme === 'dark' ? 'bg-gradient-to-br from-indigo-900/20 via-slate-950 to-emerald-900/10' : 'bg-gradient-to-br from-indigo-50 via-slate-100 to-emerald-50'}`}></div>

      {/* Top Bar */}
      <nav className="p-4 md:p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 pixel-corners flex items-center justify-center shadow-[4px_4px_0px_#1e1b4b] animate-float">
             <div className="w-4 h-4 bg-white/30 rounded-full"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter mono">VOXELIZER.AI</h1>
            <p className={`text-[10px] mono tracking-widest uppercase opacity-80 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Interactive Voxel Sandbox</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
             onClick={toggleTheme}
             className={`p-2 rounded-full transition-all border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-yellow-400' : 'bg-white border-slate-200 text-indigo-600 shadow-sm'}`}
             title="Toggle Theme"
          >
             {theme === 'dark' ? (
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
             ) : (
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
             )}
          </button>

          {design && (
            <div className="flex items-center gap-2">
               <button 
                  onClick={downloadModel}
                  className={`p-2 rounded-full transition-all border ${theme === 'dark' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-emerald-500 border-emerald-400 text-white shadow-md'} hover:scale-110`}
                  title="Download .GLB Model"
               >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               </button>
               <button 
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`p-2 rounded-full transition-all border ${autoRotate ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' : (theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400 shadow-sm')}`}
                  title="Toggle Auto-Rotate"
               >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
               </button>
               <button 
                  onClick={() => { setImage(null); setDesign(null); setProcessing({status: 'idle', message: ''}); }}
                  className={`px-4 py-2 border rounded-full text-xs font-bold mono tracking-widest transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm'}`}
               >
                  RESET
               </button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-grow flex flex-col relative">
        {!design && (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
            {!image ? (
              <div className="animate-in fade-in zoom-in duration-700">
                <div className={`mb-8 p-12 glass rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group ${theme === 'dark' ? 'border-indigo-500/30 hover:bg-slate-800/40' : 'border-indigo-200 hover:bg-white/60'}`} onClick={() => fileInputRef.current?.click()}>
                   <div className="w-20 h-20 bg-indigo-600 rounded-2xl mb-6 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                     <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   </div>
                   <h2 className="text-3xl font-bold mb-2">Build your diorama.</h2>
                   <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Upload a photo to see it reimagined as a 3D toy.</p>
                   <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                <div className="w-64 h-64 mx-auto rounded-3xl overflow-hidden border-4 border-indigo-500 shadow-2xl rotate-3">
                  <img src={image} className="w-full h-full object-cover" alt="Preview" />
                </div>
                <div className="space-y-4">
                  {processing.status === 'idle' ? (
                    <button 
                      onClick={startProcessing}
                      className="px-12 py-5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-xl shadow-[0_8px_0_#312e81] active:translate-y-2 active:shadow-none transition-all uppercase tracking-tight"
                    >
                      Process in 3D
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex gap-2">
                        <div className="w-4 h-4 bg-indigo-500 animate-bounce"></div>
                        <div className="w-4 h-4 bg-emerald-500 animate-bounce delay-75"></div>
                        <div className="w-4 h-4 bg-amber-500 animate-bounce delay-150"></div>
                      </div>
                      <p className={`mono animate-pulse ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{processing.message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {design && (
          <div className="absolute inset-0 flex flex-col pointer-events-none">
            {/* 3D Canvas Area */}
            <div className="flex-grow pointer-events-auto">
              <VoxelScene ref={voxelSceneRef} design={design} autoRotate={autoRotate} theme={theme} />
            </div>

            {/* Game UI Overlay */}
            <div className="p-6 md:p-10 flex flex-col md:flex-row gap-6 justify-between items-end pointer-events-none">
              
              {/* Left HUD: Stats */}
              <div className="flex flex-col gap-4 pointer-events-auto w-full md:w-auto animate-in slide-in-from-left-8 duration-500">
                <div className="glass p-5 rounded-3xl shadow-2xl flex flex-col gap-1 min-w-[220px]">
                  <h2 className="text-3xl font-black tracking-tighter mb-2">{design.name}</h2>
                  
                  <div className={`grid grid-cols-2 gap-4 mt-2 pt-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex flex-col">
                       <span className={`text-[9px] mono uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Blocks</span>
                       <span className="text-xl font-bold">{totalVoxelEstimate.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className={`text-[9px] mono uppercase ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Volume</span>
                       <span className="text-xl font-bold">{design.dimensions.width}x{design.dimensions.height}</span>
                    </div>
                  </div>
                </div>

                <div className="glass p-5 rounded-3xl shadow-2xl max-w-xs">
                  <p className={`text-sm italic leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>"{design.description}"</p>
                </div>
              </div>

              {/* Right HUD: Palette */}
              <div className="flex flex-col gap-4 items-end pointer-events-auto w-full md:w-auto animate-in slide-in-from-right-8 duration-500">
                <div className="glass p-5 rounded-3xl shadow-2xl w-full">
                  <h3 className={`text-[10px] mono uppercase tracking-widest font-bold mb-4 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Voxel Palette</h3>
                  <div className="flex flex-wrap gap-2">
                    {design.palette.map((p, i) => (
                      <div key={i} className="group relative">
                        <div 
                          className={`w-8 h-8 rounded-lg shadow-inner cursor-help border transition-transform group-hover:scale-110 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`} 
                          style={{ backgroundColor: p.hex }}
                        ></div>
                        <div className={`absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap px-2 py-1 rounded text-[10px] mono z-50 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-800 shadow-lg'}`}>
                          {p.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                   <div className={`px-3 py-1 text-[10px] mono font-bold rounded-full border ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                     RENDER: HQ
                   </div>
                   <div className={`px-3 py-1 text-[10px] mono font-bold rounded-full border ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200'}`}>
                     VOXEL: ACTIVE
                   </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Background Decor */}
      {!design && (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] -z-20 ${theme === 'dark' ? 'bg-indigo-500/5' : 'bg-indigo-200/20'}`}></div>
      )}
    </div>
  );
};

export default App;
