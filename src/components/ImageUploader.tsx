import React, { useRef } from 'react';
import { ImageData } from '../types';

interface UploaderProps {
  label: string;
  description: string;
  currentImage?: string;
  currentUrl?: string;
  onImageSelected: (data: ImageData) => void;
}

export const ImageUploader: React.FC<UploaderProps> = ({ label, description, currentImage, currentUrl, onImageSelected }) => {
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
    <div className="space-y-4">
      <h3 className="text-xl font-bold">{label}</h3>
      <div 
        onClick={() => fileInput.current?.click()} 
        className="border-2 border-dashed border-zinc-800 rounded-3xl aspect-[3/4] flex flex-col items-center justify-center cursor-pointer hover:border-zinc-600 hover:bg-zinc-900/50 transition-all relative overflow-hidden group"
      >
        {displayImage ? (
          <>
            <img src={displayImage} className="w-full h-full object-cover" alt="Uploaded" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white font-bold">تغيير الصورة</span>
            </div>
          </>
        ) : (
          <div className="text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white">اضغط للرفع</p>
              <p className="text-sm text-zinc-500 mt-2">{description}</p>
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
    </div>
  );
};
