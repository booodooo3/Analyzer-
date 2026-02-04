import React, { useRef } from 'react';
import { ImageData } from '../types';

interface UploaderProps {
  description: string;
  currentImage?: string;
  currentUrl?: string;
  onImageSelected: (data: ImageData) => void;
  className?: string;
  objectFit?: 'cover' | 'contain';
}

export const ImageUploader: React.FC<UploaderProps> = ({ description, currentImage, currentUrl, onImageSelected, className, objectFit = 'cover' }) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageSelected({
          base64: reader.result as string,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const displayImage = currentUrl || currentImage;

  return (
    <div 
      onClick={() => fileInput.current?.click()} 
      className={`border-2 border-dashed border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/50 transition-all relative overflow-hidden group ${className || 'aspect-[3/2] max-h-64'}`}
    >
      {displayImage ? (
        <>
          <img src={displayImage} className={`w-full h-full ${objectFit === 'contain' ? 'object-contain p-2' : 'object-cover'}`} alt="Uploaded" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white font-bold text-sm">Change Image</span>
          </div>
        </>
      ) : (
        <div className="text-center p-4">
          <div className="w-10 h-10 rounded-full bg-zinc-900/80 flex items-center justify-center mx-auto mb-3 border border-zinc-800">
            <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Click to Upload</p>
            {description && <p className="text-[10px] text-zinc-600 mt-1">{description}</p>}
          </div>
        </div>
      )}
      <input 
        type="file" 
        ref={fileInput} 
        onChange={handleFile}
        className="hidden" 
        accept="image/*" 
      />
    </div>
  );
};
