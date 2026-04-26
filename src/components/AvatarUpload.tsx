import React, { useRef, useState } from 'react';

interface AvatarUploadProps {
  avatar: string | null;
  onAvatarChange: (dataUrl: string) => void;
  size?: number;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ avatar, onAvatarChange, size = 44 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onAvatarChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="relative group" style={{ width: size, height: size }}>
      <div
        onClick={() => inputRef.current?.click()}
        className={`overflow-hidden rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${
          avatar
            ? ''
            : isDragging
              ? 'bg-amber-400/20 border-2 border-dashed border-amber-400'
              : 'bg-gradient-to-br from-amber-400 to-yellow-400 shadow-lg shadow-amber-400/20'
        }`}
        style={{ width: size, height: size }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {avatar ? (
          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-black font-black" style={{ fontSize: size * 0.32 }}>
            {size > 40 ? 'CS' : 'C'}
          </span>
        )}
      </div>

      {/* Hover overlay */}
      {avatar && (
        <div
          className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          style={{ width: size, height: size }}
          onClick={() => inputRef.current?.click()}
        >
          <svg width={size * 0.36} height={size * 0.36} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) processFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default AvatarUpload;
