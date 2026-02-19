
import React, { useState, useRef } from 'react';
import { X, Wand2, RotateCcw, Image as ImageIcon, Download, Loader2, Save } from 'lucide-react';
import { generateTextToImage } from '../services/apiService';
import { useAuth } from "@clerk/clerk-react";

interface TextToImageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TextToImageOverlay: React.FC<TextToImageOverlayProps> = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserImage(event.target?.result as string);
        setResultImage(null); // Clear previous result
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!userImage) {
        setError("Please upload an image first.");
        return;
    }
    if (!prompt) {
        setError("Please enter a description.");
        return;
    }

    setIsGenerating(true);
    setError(null);

    try {
        const token = await getToken();
        if (!token) throw new Error("Please login first.");

        const result = await generateTextToImage(
            userImage,
            prompt,
            token
        );
        
        setResultImage(result);

    } catch (err: any) {
        setError(err.message || "Failed to generate image.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!resultImage) return;
    
    try {
        const response = await fetch(resultImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tex2img-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        console.error("Download failed:", e);
        // Fallback for cross-origin
        window.open(resultImage, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-white animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#050505]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Tex 2 Img <span className="text-zinc-500 font-normal text-sm ml-2">bytedance/seedream-4.5</span></h1>
        </div>
        
        <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white" onClick={onClose}>
            <X className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Sidebar - Settings */}
        <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/5 bg-[#080808] p-6 space-y-8 h-auto lg:h-full overflow-y-auto">
            
            {/* Prompt Input */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <Wand2 className="w-4 h-4" />
                  <h3>Description</h3>
               </div>
               <textarea
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 placeholder="Describe the changes or the target image..."
                 className="w-full h-32 bg-[#111] border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 resize-none"
               />
            </div>

            <div className="space-y-2 text-xs text-zinc-500">
                <p>• Model: bytedance/seedream-4.5</p>
                <p>• Settings: 4K Resolution, Match Input Image</p>
                <p>• Cost: 0.5 Credits</p>
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button
                onClick={handleGenerate}
                disabled={isGenerating || !userImage || !prompt}
                className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isGenerating || !userImage || !prompt
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
                {isGenerating ? (
                    <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                    </>
                ) : (
                    <>
                    <Wand2 className="w-4 h-4" />
                    Generate Image
                    </>
                )}
            </button>
        </div>

        {/* Right Area - Image Upload & Result */}
        <div className="flex-1 bg-[#050505] p-6 lg:p-10 flex flex-col items-center justify-center overflow-y-auto">
             <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
                
                {/* Upload Area */}
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-full lg:w-[45%] aspect-[3/4] lg:aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group overflow-hidden ${userImage ? 'border-zinc-800 bg-black' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/20'}`}
                >
                    {userImage ? (
                        <>
                            <img src={userImage} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" alt="Upload" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black/50 px-4 py-2 rounded-lg text-white text-sm font-medium backdrop-blur-sm">Change Image</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-center p-6">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400 group-hover:text-white transition-colors">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                            <p className="font-bold text-zinc-300">Upload Reference Image</p>
                            <p className="text-xs text-zinc-500 mt-1">Click to browse</p>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        accept="image/*" 
                    />
                </div>

                {/* Arrow */}
                <div className="text-zinc-700 rotate-90 lg:rotate-0">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>

                {/* Result Area */}
                <div className="relative w-full lg:w-[45%] aspect-[3/4] lg:aspect-square rounded-2xl border border-zinc-800 bg-[#080808] flex flex-col items-center justify-center overflow-hidden shadow-2xl">
                    {resultImage ? (
                        <div className="relative w-full h-full group">
                             {/* Glassy Effect Container */}
                             <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 pointer-events-none z-10 border border-white/10 rounded-2xl" />
                             
                             <img src={resultImage} className="w-full h-full object-cover" alt="Result" />
                             
                             {/* Save As Button (Overlay) */}
                             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button 
                                    onClick={handleSave}
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-6 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-xl transition-all hover:scale-105"
                                >
                                    <Save className="w-4 h-4" />
                                    Save As
                                </button>
                             </div>
                        </div>
                    ) : (
                        <div className="text-zinc-600 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full border border-zinc-800 flex items-center justify-center mb-4">
                                <Wand2 className="w-6 h-6 opacity-20" />
                            </div>
                            <p className="text-sm">Result will appear here</p>
                        </div>
                    )}
                </div>

             </div>
        </div>

      </div>
    </div>
  );
};
