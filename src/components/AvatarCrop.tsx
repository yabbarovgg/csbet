import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface AvatarCropProps {
  imageSrc: string;
  isDark: boolean;
  onCrop?: (dataUrl: string) => void;
  onCancel: () => void;
}

const AvatarCrop: React.FC<AvatarCropProps> = ({ imageSrc, isDark, onCrop, onCancel }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, offX: 0, offY: 0 });

  const V = 260;
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // 🔹 Безопасный расчёт диапазонов
  const minScale = natW > 0 ? V / Math.min(natW, natH) : 1;
  const maxScale = natW > 0 ? V / Math.min(natW, natH) * 4 : 5;
  const range = maxScale - minScale;

  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgElRef.current = img;
      const w = img.width;
      const h = img.height;
      setNatW(w);
      setNatH(h);
      
      // 🔹 Устанавливаем начальный масштаб ровно под круг (cover)
      const initialScale = V / Math.min(w, h);
      setScale(initialScale);
      setTx(0); setTy(0);
      
      requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const clamp = useCallback((x: number, y: number, s: number) => {
    if (natW === 0 || natH === 0) return { x: 0, y: 0 };
    const vw = natW * s, vh = natH * s;
    const mx = Math.max(0, (vw - V) / 2), my = Math.max(0, (vh - V) / 2);
    return { x: Math.max(-mx, Math.min(mx, x)), y: Math.max(-my, Math.min(my, y)) };
  }, [natW, natH]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const r = previewRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left - V / 2, y: cy - r.top - V / 2 };
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ready) return; e.preventDefault(); e.stopPropagation();
    const p = getPos(e);
    dragRef.current = { startX: p.x, startY: p.y, offX: tx, offY: ty };
    setDragging(true);
  };

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging || !ready) return; e.preventDefault(); e.stopPropagation();
    const p = getPos(e); const d = dragRef.current;
    const c = clamp(d.offX + (p.x - d.startX), d.offY + (p.y - d.startY), scale);
    setTx(c.x); setTy(c.y);
  };

  const onUp = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(false); };
  
  const applyScale = (s: number) => {
    const ns = Math.max(minScale, Math.min(maxScale, s));
    const c = clamp(tx, ty, ns);
    setScale(ns); setTx(c.x); setTy(c.y);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!ready) return; e.preventDefault(); e.stopPropagation();
    applyScale(scale * (e.deltaY < 0 ? 1.05 : 0.95));
  };

  const doCrop = () => {
    const img = imgElRef.current;
    if (!img || natW === 0 || !onCrop) return;
    const OUT = 256; const canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.beginPath(); ctx.arc(OUT/2, OUT/2, OUT/2, 0, Math.PI*2); ctx.clip();
    const r = OUT/V; const dw = natW*scale*r; const dh = natH*scale*r;
    ctx.drawImage(img, OUT/2 - dw/2 + tx*r, OUT/2 - dh/2 + ty*r, dw, dh);
    onCrop(canvas.toDataURL('image/png'));
  };

  if (natW === 0) return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"><div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full"/></div>, document.body);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" style={{ touchAction: 'none' }}>
      <div className={`${isDark ? 'bg-[#141414] text-white' : 'bg-white text-gray-900'} rounded-3xl border ${isDark ? 'border-white/10' : 'border-gray-200'} p-6 max-w-sm w-full`}>
        <h3 className="font-bold text-center mb-1">Аватарка</h3>
        <p className={`text-xs text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Перемещайте и масштабируйте</p>
        
        <div ref={previewRef} className="relative overflow-hidden" style={{ width: V, height: V, maxWidth: '80vw', maxHeight: '60vw', borderRadius: '50%', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} onWheel={onWheel}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: natW, height: natH, transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`, pointerEvents: 'none', userSelect: 'none' }}>
            <img src={imageSrc} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
          <div className="absolute inset-0 pointer-events-none rounded-full" style={{ border: '2px solid rgba(251,191,36,0.5)' }} />
        </div>

        <div className="flex items-center gap-3 mb-5 px-1 mt-4">
          <button onClick={() => applyScale(scale * 0.9)} className={`w-10 h-10 rounded-lg border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-100 border-gray-200 hover:bg-gray-200'}`}>−</button>
          <input 
            type="range" min="0" max="1" step="0.005" 
            value={range > 0 ? Math.max(0, Math.min(1, (scale - minScale) / range)) : 0} 
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              applyScale(minScale + t * range);
            }} 
            className="w-full accent-amber-400" 
          />
          <button onClick={() => applyScale(scale * 1.1)} className={`w-10 h-10 rounded-lg border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-100 border-gray-200 hover:bg-gray-200'}`}>+</button>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setScale(minScale); setTx(0); setTy(0); }} className={`py-3 px-4 rounded-xl text-xs font-medium border ${isDark ? 'text-gray-400 border-white/5 hover:bg-white/5' : 'text-gray-500 border-gray-200 hover:bg-gray-100'}`}>Сброс</button>
          <button onClick={onCancel} className={`flex-1 py-3 rounded-xl text-sm font-medium border ${isDark ? 'text-gray-400 border-white/5 hover:bg-white/5' : 'text-gray-500 border-gray-200 hover:bg-gray-100'}`}>Отмена</button>
          <button onClick={doCrop} className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-400 to-yellow-400 text-black hover:opacity-90">Сохранить</button>
        </div>
      </div>
    </div>, document.body);
};

export default AvatarCrop;