
import React, { useRef } from 'react';
import { ImageData } from '../types';

interface ImageUploaderProps {
  label: string;
  description: string;
  onImageSelected: (data: ImageData) => void;
  currentImage?: string;
  currentUrl?: string; // New prop for URL-based images
  icon?: React.ReactNode;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  description,
  onImageSelected,
  currentImage,
  currentUrl,
  icon
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const previewSrc = currentImage || currentUrl;

  return (
    <div 
      className="glass-effect rounded-2xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-white/20 transition-all group relative overflow-hidden h-64 w-full"
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileChange}
      />
      
      {previewSrc ? (
        <>
          <img 
            src={previewSrc} 
            alt="Preview" 
            className="absolute inset-0 w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
            <p className="text-white font-medium">Change Image</p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center px-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            {icon || (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </div>
          <h3 className="text-lg font-semibold text-white">{label}</h3>
          <p className="text-sm text-zinc-400 mt-1">{description}</p>
        </div>
      )}
    </div>
  );
};
