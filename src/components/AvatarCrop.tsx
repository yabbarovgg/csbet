import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface AvatarCropProps {
  imageSrc: string;
  onCrop: (dataUrl: string) => void;
  onCancel: () => void;
}

const AvatarCrop: React.FC<AvatarCropProps> = ({ imageSrc, onCrop, onCancel }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef({ startX: 0, startY: 0, offX: 0, offY: 0 });

  // View dimensions
  const V = 260;

  // Natural image dimensions (set on load)
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);

  // Transform state
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);

  // minScale: COVER — image fills circle completely (no black bars)
  // maxScale: zoomed in further
  const minScale = natW > 0 ? V / Math.min(natW, natH) : 1;
  const maxScale = natW > 0 ? V / Math.min(natW, natH) * 4 : 5;

  // Reset everything on new image
  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgElRef.current = img;
      const s = V / Math.min(img.width, img.height); // cover — fills circle
      setNatW(img.width);
      setNatH(img.height);
      setScale(s);
      setTx(0);
      setTy(0);
      // Double rAF ensures DOM is painted before enabling interaction
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setReady(true));
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Clamp offset so image never leaves circle completely
  const clamp = useCallback((x: number, y: number, s: number) => {
    if (natW === 0 || natH === 0) return { x: 0, y: 0 };
    // Visible area of image at this scale
    const vw = natW * s;
    const vh = natH * s;
    // How far can we move before edge reaches circle edge?
    const mx = Math.max(0, (vw - V) / 2);
    const my = Math.max(0, (vh - V) / 2);
    return {
      x: Math.max(-mx, Math.min(mx, x)),
      y: Math.max(-my, Math.min(my, y)),
    };
  }, [natW, natH]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const r = previewRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left - V / 2, y: cy - r.top - V / 2 };
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!ready) return;
    e.preventDefault();
    e.stopPropagation();
    const p = getPos(e);
    dragRef.current = { startX: p.x, startY: p.y, offX: tx, offY: ty };
    setDragging(true);
  };

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging || !ready) return;
    e.preventDefault();
    e.stopPropagation();
    const p = getPos(e);
    const d = dragRef.current;
    const nx = d.offX + (p.x - d.startX);
    const ny = d.offY + (p.y - d.startY);
    const c = clamp(nx, ny, scale);
    setTx(c.x);
    setTy(c.y);
  };

  const onUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  // Slider: 0 = minScale (contain), 1 = maxScale (zoomed)
  const sliderVal = minScale < maxScale ? (scale - minScale) / (maxScale - minScale) : 0;

  const applyScale = (s: number) => {
    const ns = Math.max(minScale, Math.min(maxScale, s));
    const c = clamp(tx, ty, ns);
    setScale(ns);
    setTx(c.x);
    setTy(c.y);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!ready) return;
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    applyScale(scale * factor);
  };

  const doCrop = () => {
    const img = imgElRef.current;
    if (!img || natW === 0) return;
    const OUT = 256;
    const canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d')!;

    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();

    const r = OUT / V;
    const dw = natW * scale * r;
    const dh = natH * scale * r;
    const dx = OUT / 2 - dw / 2 + tx * r;
    const dy = OUT / 2 - dh / 2 + ty * r;
    ctx.drawImage(img, dx, dy, dw, dh);
    onCrop(canvas.toDataURL('image/png'));
  };

  if (natW === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        style={{ overflow: 'hidden' }}>
        <div className="bg-[#141414] rounded-3xl border border-white/10 p-12">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
        </div>
      </div>, document.body);
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      style={{ overflow: 'hidden', touchAction: 'none' }}>
      <div className="bg-[#141414] rounded-3xl border border-white/10 p-6 max-w-sm w-full">
        <h3 className="text-white font-bold text-center mb-1">Аватарка</h3>
        <p className="text-gray-500 text-xs text-center mb-4">Перемещайте и масштабируйте</p>

        {/* Preview */}
        <div
          ref={previewRef}
          className="relative overflow-hidden bg-transparent"
          style={{
            width: V,
            height: V,
            maxWidth: '80vw',
            maxHeight: '60vw',
            borderRadius: '50%',
            cursor: dragging ? 'grabbing' : ready ? 'grab' : 'default',
            touchAction: 'none',
          }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={(e) => { onUp(e); }}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
          onWheel={onWheel}
        >
          {/* Image — centered with translate(-50%, -50%), then offset and scaled */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: natW,
              height: natH,
              transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`,
              transformOrigin: 'center center',
              willChange: 'transform',
              pointerEvents: 'none',
              userSelect: 'none',
              transition: dragging ? 'none' : 'transform 0.08s ease-out',
            }}
          >
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
            />
          </div>

          {/* Gold circle border only */}
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{ border: '2px solid rgba(251,191,36,0.5)' }}
          />
        </div>

        {/* Slider */}
        <div className="flex items-center gap-3 mb-5 px-1">
          <button
            onClick={() => applyScale(scale * 0.9)}
            className="w-10 h-10 rounded-lg bg-white/5 text-white text-lg hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-center shrink-0 cursor-pointer"
          >
            −
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={Math.max(0, Math.min(1, sliderVal))}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              applyScale(minScale + t * (maxScale - minScale));
            }}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <button
            onClick={() => applyScale(scale * 1.1)}
            className="w-10 h-10 rounded-lg bg-white/5 text-white text-lg hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-center shrink-0 cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { setScale(minScale); setTx(0); setTy(0); }}
            className="py-3 px-4 rounded-xl text-xs font-medium text-gray-400 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
          >
            Сброс
          </button>
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-400 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer">
            Отмена
          </button>
          <button onClick={doCrop}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-400 to-yellow-400 text-black hover:opacity-90 transition-opacity cursor-pointer">
            Сохранить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AvatarCrop;
