
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { analyzeImageForVoxel } from './geminiService';
import { VoxelDesignResponse, ProcessingState } from './types';
import VoxelScene from './VoxelScene';

/* ─── Reusable icon-button class builder ───────────────────────────────────
   All nav icon buttons are w-10 h-10 rounded-xl — same shape, same padding.
   Only color and state vary. */
function iconBtn(theme: 'dark' | 'light', variant: 'default' | 'active' | 'danger' = 'default') {
  const base = 'btn w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0';
  if (variant === 'active')
    return `${base} bg-emerald-500 border-emerald-400 text-white ring-pulse`;
  if (variant === 'danger')
    return theme === 'dark'
      ? `${base} bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-red-950/60 hover:border-red-600/50 hover:text-red-400`
      : `${base} bg-white border-slate-200 text-slate-500 shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500`;
  return theme === 'dark'
    ? `${base} bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-emerald-500/50 hover:text-emerald-300`
    : `${base} bg-white border-slate-200 text-slate-600 shadow-sm hover:border-emerald-400/70 hover:text-emerald-600`;
}

/* ─── Small label chip ────────────────────────────────────────────────────── */
function Chip({ label, active, theme }: { label: string; active: boolean; theme: 'dark' | 'light' }) {
  return (
    <div className={`px-2.5 py-1 text-[9px] mono font-bold rounded-lg border transition-colors ${
      active
        ? theme === 'dark'
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
        : theme === 'dark'
          ? 'bg-slate-800/60 text-slate-500 border-slate-700'
          : 'bg-slate-50 text-slate-400 border-slate-200'
    }`}>
      {label.toUpperCase()}
    </div>
  );
}

/* ─── Divider for nav ─────────────────────────────────────────────────────── */
function NavDivider({ theme }: { theme: 'dark' | 'light' }) {
  return <div className={`w-px h-6 mx-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />;
}

const App: React.FC = () => {
  const [image, setImage]       = useState<string | null>(null);
  const [design, setDesign]     = useState<VoxelDesignResponse | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ status: 'idle', message: '' });
  const [autoRotate, setAutoRotate] = useState(true);
  const [theme, setTheme]       = useState<'dark' | 'light'>('dark');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const voxelSceneRef  = useRef<{ exportScene: () => void } | null>(null);

  useEffect(() => { document.body.className = theme; }, [theme]);

  const loadImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setDesign(null);
      setProcessing({ status: 'idle', message: '' });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  }, [loadImage]);

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const startProcessing = async () => {
    if (!image) return;
    const steps = [
      { status: 'analyzing' as const, message: 'Studying your image…' },
      { status: 'generating' as const, message: 'Placing voxels…' },
      { status: 'generating' as const, message: 'Adding fine details…' },
    ];
    let idx = 0;
    setProcessing(steps[0]);
    const timer = setInterval(() => {
      idx = Math.min(idx + 1, steps.length - 1);
      setProcessing(steps[idx]);
    }, 12000);
    try {
      const [header, base64] = image.split(',');
      if (!base64) throw new Error('Invalid image payload.');
      const mimeMatch = header.match(/^data:(.*?);base64$/);
      const mimeType  = mimeMatch?.[1] || 'image/jpeg';
      const result    = await analyzeImageForVoxel(base64, mimeType);
      clearInterval(timer);
      setDesign(result);
      setProcessing({ status: 'complete', message: 'Complete!' });
    } catch (err) {
      clearInterval(timer);
      const message = err instanceof Error ? err.message : 'Voxel matrix failure.';
      setProcessing({ status: 'error', message });
    }
  };

  const totalVoxels = useMemo(() =>
    design ? design.clusters.reduce((acc, c) => acc + c.w * c.h * c.d, 0) : 0,
    [design]
  );

  const reset = () => { setImage(null); setDesign(null); setProcessing({ status: 'idle', message: '' }); };

  /* ─── Background gradient + grid ─────────────────────────────────────────── */
  const bgClass = theme === 'dark'
    ? 'bg-[#020617] text-slate-100 bg-gradient-to-br from-emerald-900/15 via-slate-950 to-green-950/10'
    : 'bg-slate-50 text-slate-900 bg-gradient-to-br from-emerald-50/70 via-white to-green-50/50';

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col font-['Plus_Jakarta_Sans'] overflow-hidden relative ${bgClass}`}>

      {/* Grid overlay */}
      <div className="bg-grid fixed inset-0 -z-10 pointer-events-none" />

      {/* Ambient glow orb (upload screen only) */}
      {!design && (
        <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[180px] -z-10 pointer-events-none transition-opacity duration-700 ${theme === 'dark' ? 'bg-emerald-600/7' : 'bg-emerald-300/25'}`} />
      )}

      {/* ──────────────────────────── NAV ──────────────────────────────── */}
      <nav className="px-5 py-4 md:px-8 md:py-5 flex justify-between items-center z-50">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 pixel-corners flex items-center justify-center shadow-[3px_3px_0_#065f46] animate-float flex-shrink-0">
            <div className="w-4 h-4 bg-white/30 rounded-full" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tighter mono leading-none">3D VOXELIZER</h1>
            <p className={`text-[9px] mono tracking-[0.2em] uppercase mt-0.5 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
              Scene Designer
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className={`btn btn-wiggle ${iconBtn(theme)}`}
            title="Toggle theme"
          >
            {theme === 'dark'
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            }
          </button>

          {design && (
            <>
              <NavDivider theme={theme} />

              {/* Download */}
              <button
                onClick={() => voxelSceneRef.current?.exportScene()}
                className={`btn btn-glow ${iconBtn(theme)}`}
                title="Download .GLB model"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>

              {/* Auto-rotate */}
              <button
                onClick={() => setAutoRotate(r => !r)}
                className={`btn btn-spin ${iconBtn(theme, autoRotate ? 'active' : 'default')}`}
                title={autoRotate ? 'Stop rotation' : 'Start rotation'}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Reset */}
              <button
                onClick={reset}
                className={`btn btn-wiggle ${iconBtn(theme, 'danger')}`}
                title="Start over"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ──────────────────────────── MAIN ─────────────────────────────────── */}
      <main className="flex-grow flex flex-col relative">

        {/* ── Upload / Prepare screens ── */}
        {!design && (
          <div className="flex-grow flex flex-col items-center justify-center p-6 md:p-10 w-full max-w-lg mx-auto">

            {/* ── NO IMAGE: upload card ── */}
            {!image && (
              <div className="w-full animate-in fade-in zoom-in duration-600">

                <div
                  className={`relative w-full p-10 md:p-12 rounded-3xl border-2 cursor-pointer select-none transition-all duration-200 group ${
                    isDragging
                      ? 'drag-active scale-[1.015] ' + (theme === 'dark' ? 'bg-emerald-500/10 border-emerald-400' : 'bg-emerald-50 border-emerald-400')
                      : theme === 'dark'
                        ? 'border-slate-700 bg-slate-900/70 hover:bg-slate-900/90 hover:border-emerald-500/50 shadow-[0_20px_60px_rgba(2,6,23,0.55)]'
                        : 'border-slate-200 bg-white hover:border-emerald-400/60 hover:bg-emerald-50/20 shadow-[0_10px_30px_rgba(15,23,42,0.07)]'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {/* Corner bracket accents */}
                  {(['tl','tr','bl','br'] as const).map(pos => (
                    <div key={pos} className={`absolute w-3.5 h-3.5 transition-colors duration-200 ${
                      pos === 'tl' ? 'top-3.5 left-3.5 border-t-2 border-l-2 rounded-tl' :
                      pos === 'tr' ? 'top-3.5 right-3.5 border-t-2 border-r-2 rounded-tr' :
                      pos === 'bl' ? 'bottom-3.5 left-3.5 border-b-2 border-l-2 rounded-bl' :
                                     'bottom-3.5 right-3.5 border-b-2 border-r-2 rounded-br'
                    } ${
                      isDragging ? 'border-emerald-400'
                        : theme === 'dark'
                          ? 'border-slate-600 group-hover:border-emerald-500/60'
                          : 'border-slate-300 group-hover:border-emerald-400/70'
                    }`} />
                  ))}

                  <div className="flex flex-col items-center text-center gap-5">

                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1.5 ${
                      isDragging
                        ? 'bg-emerald-500/20 scale-110'
                        : theme === 'dark' ? 'bg-slate-800' : 'bg-emerald-50'
                    }`}>
                      {isDragging
                        ? <svg className="w-8 h-8 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
                        : <svg className={`w-8 h-8 transition-colors duration-200 ${theme === 'dark' ? 'text-slate-500 group-hover:text-emerald-400' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      }
                    </div>

                    {/* Text */}
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight mb-2">
                        {isDragging ? 'Drop it!' : 'Build your world.'}
                      </h2>
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Drop any photo — portraits, landscapes, objects —<br />
                        and watch it become a cinematic voxel world.
                      </p>
                    </div>

                    {/* CTA */}
                    <button className={`btn btn-glow mt-1 px-7 py-2.5 rounded-xl text-sm font-semibold border ${
                      theme === 'dark'
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/80'
                        : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-400 shadow-md'
                    }`}>
                      Choose photo
                    </button>

                    <p className={`text-[10px] mono tracking-widest uppercase ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                      or drag &amp; drop
                    </p>
                  </div>

                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>

                {/* Format badges */}
                <div className="mt-5 flex items-center justify-center gap-2">
                  {['JPG', 'PNG', 'WEBP', 'HEIC', 'GIF'].map(fmt => (
                    <span key={fmt} className={`px-2 py-0.5 rounded text-[9px] mono tracking-widest border ${
                      theme === 'dark' ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
                    }`}>{fmt}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── IMAGE SELECTED: preview + action ── */}
            {image && (
              <div className="w-full flex flex-col items-center gap-8 animate-in slide-in-from-bottom-6 duration-600">

                {/* Image preview */}
                <div className="relative">
                  <div className="w-56 h-56 rounded-3xl overflow-hidden img-bob border-2 border-emerald-500/50 shadow-[0_0_45px_rgba(16,185,129,0.18)]">
                    <img src={image} className="w-full h-full object-cover" alt="Preview" />
                  </div>

                  {/* Change photo pill — only when idle */}
                  {processing.status === 'idle' && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`btn absolute -bottom-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] mono font-bold tracking-widest border whitespace-nowrap ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-700 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400'
                          : 'bg-white border-slate-200 text-slate-500 shadow-md hover:border-emerald-300 hover:text-emerald-600'
                      }`}
                    >
                      CHANGE
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept="image/*" className="hidden" />
                </div>

                {/* Action area */}
                <div className="flex flex-col items-center gap-4 w-full">

                  {/* IDLE — main CTA */}
                  {processing.status === 'idle' && (
                    <button
                      onClick={startProcessing}
                      className="btn btn-glow px-14 py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-xl shadow-[0_6px_0_#065f46] hover:shadow-[0_8px_0_#065f46] active:shadow-none active:translate-y-1.5 uppercase tracking-tight"
                    >
                      Voxelize →
                    </button>
                  )}

                  {/* PROCESSING */}
                  {(processing.status === 'analyzing' || processing.status === 'generating') && (
                    <div className="flex flex-col items-center gap-5">
                      {/* Wave dots */}
                      <div className="flex gap-1.5 items-end h-9">
                        {[0,1,2,3,4].map(i => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-sm bg-emerald-500"
                            style={{ animation: `dot-wave 1.3s ease-in-out ${i * 0.13}s infinite` }}
                          />
                        ))}
                      </div>
                      <p className="text-sm mono font-bold shimmer">{processing.message}</p>
                      <p className={`text-[10px] mono tracking-widest uppercase ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
                        This can take up to a minute
                      </p>
                    </div>
                  )}

                  {/* ERROR */}
                  {processing.status === 'error' && (
                    <div className={`flex flex-col items-center gap-3 p-5 rounded-2xl border w-full max-w-sm ${
                      theme === 'dark' ? 'bg-red-950/40 border-red-800/50 text-red-400' : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-xs mono text-center">{processing.message}</p>
                      <button
                        onClick={() => setProcessing({ status: 'idle', message: '' })}
                        className={`btn px-4 py-1.5 rounded-xl text-xs font-bold border ${
                          theme === 'dark' ? 'border-red-700/60 text-red-400 hover:bg-red-900/30' : 'border-red-300 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3D Scene + HUD ── */}
        {design && (
          <div className="absolute inset-0 flex flex-col pointer-events-none">

            {/* Canvas */}
            <div className="flex-grow pointer-events-auto">
              <VoxelScene ref={voxelSceneRef} design={design} autoRotate={autoRotate} theme={theme} />
            </div>

            {/* HUD overlay */}
            <div className="p-5 md:p-8 flex flex-col md:flex-row gap-4 justify-between items-end pointer-events-none">

              {/* ── Left HUD: name + stats + description ── */}
              <div className="flex flex-col gap-3 pointer-events-auto w-full md:w-auto animate-in slide-in-from-left-8 duration-500">

                <div className="glass p-5 rounded-2xl shadow-2xl min-w-[230px] max-w-xs">
                  <p className={`text-[8px] mono uppercase tracking-[0.2em] mb-1 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Scene
                  </p>
                  <h2 className="text-2xl font-black tracking-tight leading-tight mb-4">{design.name}</h2>

                  <div className={`grid grid-cols-3 gap-3 pt-3 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                    {[
                      { label: 'Clusters', value: design.clusters.length.toLocaleString() },
                      { label: 'Voxels',   value: `${(totalVoxels / 1000).toFixed(1)}k` },
                      { label: 'Size',     value: `${design.dimensions.width}×${design.dimensions.height}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className={`text-[8px] mono uppercase tracking-widest mb-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{label}</div>
                        <div className="text-base font-bold">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass p-4 rounded-2xl shadow-xl max-w-xs">
                  <p className={`text-xs italic leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    "{design.description}"
                  </p>
                </div>
              </div>

              {/* ── Right HUD: palette + status chips ── */}
              <div className="flex flex-col gap-3 items-end pointer-events-auto w-full md:w-auto animate-in slide-in-from-right-8 duration-500">

                <div className="glass p-4 rounded-2xl shadow-2xl w-full md:w-auto">
                  <p className={`text-[8px] mono uppercase tracking-[0.2em] font-bold mb-3 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    Color Palette
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {design.palette.map((p, i) => (
                      <div key={i} className="swatch-wrap relative">
                        {/* Tooltip */}
                        <div className={`swatch-tip absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 whitespace-nowrap px-2 py-1 rounded-lg text-[9px] mono z-50 shadow-lg ${
                          theme === 'dark' ? 'bg-slate-900 text-slate-200 border border-slate-700' : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                          {p.name}
                        </div>
                        {/* Swatch */}
                        <div
                          className="w-7 h-7 rounded-lg cursor-help border transition-all duration-200 hover:scale-[1.3] hover:-translate-y-0.5 hover:shadow-lg"
                          style={{ backgroundColor: p.hex, borderColor: `${p.hex}55` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status chips */}
                <div className="flex gap-1.5">
                  <Chip label="HQ Render" active theme={theme} />
                  <Chip label={autoRotate ? 'Rotating' : 'Static'} active={autoRotate} theme={theme} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className={`px-6 pb-6 text-center text-[11px] mono ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
        Designed with ♥ by{' '}
        <a
          href="https://jamieryus.com"
          target="_blank"
          rel="noreferrer"
          className={`underline underline-offset-4 transition-colors ${theme === 'dark' ? 'text-slate-500 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
        >
          Jamie Ryu
        </a>
      </footer>
    </div>
  );
};

export default App;
