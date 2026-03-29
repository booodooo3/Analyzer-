
import React, { useState, useRef, useEffect } from 'react';
import { X, Wand2, RotateCcw, Image as ImageIcon, Download, Loader2, Save, Trash2, Clock } from 'lucide-react';
import { generateTextToImage } from '../services/apiService';
import { useAuth } from "@clerk/clerk-react";

interface TextToImageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GeneratedImage {
    id: string;
    url: string;
    expiresAt: number;
}

export const TextToImageOverlay: React.FC<TextToImageOverlayProps> = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const [userImages, setUserImages] = useState<(string | null)[]>([null, null]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generations, setGenerations] = useState<GeneratedImage[]>([]);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // Timer to clean up expired images and trigger re-render
  useEffect(() => {
    const interval = setInterval(() => {
        const now = Date.now();
        setGenerations(prev => prev.filter(img => img.expiresAt > now));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserImages(prev => {
          const newImages = [...prev];
          newImages[index] = event.target?.result as string;
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    // Only require at least one image
    if (!userImages[0] && !userImages[1]) {
        setError("Please upload at least one image.");
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
            userImages.filter(Boolean) as string[], // Pass array of images
            prompt,
            token
        );
        
        // Add to generations list
        const newImage: GeneratedImage = {
            id: Date.now().toString(),
            url: result,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes from now
        };
        setGenerations(prev => [newImage, ...prev]);

    } catch (err: any) {
        setError(err.message || "Failed to generate image.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSave = async (imageUrl: string) => {
    try {
        const response = await fetch(imageUrl);
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
        window.open(imageUrl, '_blank');
    }
  };

  const handleReset = () => {
      setUserImages([null, null]);
      setPrompt('');
      setError(null);
  };

  const getBorderColor = (expiresAt: number) => {
    const timeLeft = expiresAt - Date.now();
    const minutesLeft = timeLeft / 1000 / 60;

    if (minutesLeft > 3) return 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]';
    if (minutesLeft > 1) return 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]';
    return 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse';
  };

  const formatTimeLeft = (expiresAt: number) => {
      const timeLeft = Math.max(0, expiresAt - Date.now());
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
        
        <div className="flex items-center gap-4">
             <button
                onClick={handleReset}
                className="bg-zinc-900 border border-zinc-700 hover:border-white text-white text-xs px-3 py-1.5 rounded-lg transition-all uppercase tracking-wider font-bold flex items-center gap-2"
             >
                <RotateCcw className="w-3 h-3" />
                Try Again
             </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white" onClick={onClose}>
                <X className="w-4 h-4" />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* Left Sidebar - Settings */}
        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col border-r border-white/5 bg-[#080808] p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
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
                disabled={isGenerating || (!userImages[0] && !userImages[1]) || !prompt}
                className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isGenerating || (!userImages[0] && !userImages[1]) || !prompt
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

        {/* Center Area - Upload & Preview */}
        <div className="flex-1 bg-[#050505] p-6 flex flex-col items-center justify-center overflow-y-auto">
             <div className="w-full max-w-3xl flex flex-col items-center gap-8">
                
                {/* Upload Areas Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Upload Area 1 */}
                    <div 
                        onClick={() => fileInputRef1.current?.click()}
                        className={`relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group overflow-hidden ${userImages[0] ? 'border-zinc-800 bg-black' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/20'}`}
                    >
                        {userImages[0] ? (
                            <>
                                <img src={userImages[0]} className="w-full h-full object-contain" alt="Upload 1" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                    <span className="bg-black/80 px-4 py-2 rounded-lg text-white text-sm font-medium backdrop-blur-sm border border-white/10">Change Image 1</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400 group-hover:text-white transition-colors">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-zinc-300">Upload Reference Image 1</p>
                                <p className="text-xs text-zinc-500 mt-1">Click to browse</p>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef1} 
                            onChange={handleImageUpload(0)} 
                            className="hidden" 
                            accept="image/*" 
                        />
                    </div>

                    {/* Upload Area 2 */}
                    <div 
                        onClick={() => fileInputRef2.current?.click()}
                        className={`relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group overflow-hidden ${userImages[1] ? 'border-zinc-800 bg-black' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/20'}`}
                    >
                        {userImages[1] ? (
                            <>
                                <img src={userImages[1]} className="w-full h-full object-contain" alt="Upload 2" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                    <span className="bg-black/80 px-4 py-2 rounded-lg text-white text-sm font-medium backdrop-blur-sm border border-white/10">Change Image 2</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-6">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400 group-hover:text-white transition-colors">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                                <p className="font-bold text-zinc-300">Upload Reference Image 2 (Optional)</p>
                                <p className="text-xs text-zinc-500 mt-1">Click to browse</p>
                            </div>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef2} 
                            onChange={handleImageUpload(1)} 
                            className="hidden" 
                            accept="image/*" 
                        />
                    </div>
                </div>
             </div>
        </div>

        {/* Right Sidebar - Generated List */}
        <div className="w-full lg:w-[350px] bg-[#080808] border-l border-white/5 flex flex-col">
            <div className="p-4 border-b border-white/5">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    Recent Generations
                </h3>
                <p className="text-[10px] text-zinc-500 mt-1">Images auto-delete after 5 minutes</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {generations.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <ImageIcon className="w-8 h-8 opacity-20" />
                        <p className="text-xs">No active generations</p>
                    </div>
                ) : (
                    generations.map((gen) => (
                        <div key={gen.id} className="animate-in slide-in-from-right-4 duration-500">
                             <div className={`relative rounded-xl overflow-hidden border-2 transition-all ${getBorderColor(gen.expiresAt)} group`}>
                                 <img src={gen.url} className="w-full h-auto object-cover" alt="Generated" />
                                 
                                 {/* Timer Badge */}
                                 <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono border border-white/10 flex items-center gap-1">
                                     <Clock className="w-3 h-3" />
                                     {formatTimeLeft(gen.expiresAt)}
                                 </div>
                             </div>

                             {/* Download Button */}
                             <button
                                onClick={() => handleSave(gen.url)}
                                className="w-full mt-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                             >
                                 <Download className="w-3 h-3" />
                                 Download
                             </button>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>
    </div>
  );
};
