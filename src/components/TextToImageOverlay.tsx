
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
    const [userImages, setUserImages] = useState<string[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [imageDescriptions, setImageDescriptions] = useState<string[]>([]);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | 'Match Input Image'>('9:16');
    const [model, setModel] = useState<string>('bytedance/seedream-4.5');
    const [size, setSize] = useState<string>('4K');
    const [outputFormat, setOutputFormat] = useState<string>('jpeg');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generations, setGenerations] = useState<GeneratedImage[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer to clean up expired images and trigger re-render
  useEffect(() => {
    const interval = setInterval(() => {
        const now = Date.now();
        setGenerations(prev => prev.filter(img => img.expiresAt > now));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (model === 'bytedance/seedream-5-pro') {
        setSize('2K');
    } else {
        setSize('4K');
    }
  }, [model]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImagesPromises = Array.from(files).map((file) => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        resolve(event.target?.result as string);
                    };
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(newImagesPromises).then((base64Images) => {
                setUserImages(prev => {
                    const combined = [...prev, ...base64Images];
                    return combined.slice(0, 14); // Limit to 14 images
                });
                setImageDescriptions(prev => {
                    const newDesc = Array.from(files).map(() => '');
                    const combined = [...prev, ...newDesc];
                    return combined.slice(0, 14);
                });
            });
        }
        // Reset input so the same files can be selected again if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (indexToRemove: number) => {
        setUserImages(prev => prev.filter((_, index) => index !== indexToRemove));
        setImageDescriptions(prev => prev.filter((_, index) => index !== indexToRemove));
        if (selectedImageIndex === indexToRemove) {
            setSelectedImageIndex(null);
        } else if (selectedImageIndex !== null && selectedImageIndex > indexToRemove) {
            setSelectedImageIndex(selectedImageIndex - 1);
        }
    };

  const handleGenerate = async (overridePrompt?: string) => {
    const finalPrompt = overridePrompt || prompt;
    // Only require at least one image
    if (userImages.length === 0) {
        setError("Please upload at least one image.");
        return;
    }
    if (!finalPrompt) {
        setError("Please enter a description.");
        return;
    }

    setIsGenerating(true);
    setError(null);

    try {
        const token = await getToken();
        if (!token) throw new Error("Please login first.");

        // Pass aspectRatio to backend if needed in the future
        const result = await generateTextToImage(
            userImages, // Pass array of images directly
            finalPrompt,
            token,
            aspectRatio,
            model,
            size,
            outputFormat
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
      setUserImages([]);
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
          <h1 className="text-lg font-bold tracking-tight">Tex 2 Img <span className="text-zinc-500 font-normal text-sm ml-2">{model.split('/')[1]}</span></h1>
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
            
                        {/* Model Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Model</label>
                            </div>
                            <select 
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-white"
                            >
                                <option value="bytedance/seedream-4.5">Seedream 4.5</option>
                                <option value="bytedance/seedream-5-pro">Seedream 5 Pro</option>
                            </select>
                        </div>

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
                             {/* Aspect Ratio Options */}
                             <div className="flex gap-2 mt-2">
                                 {['9:16', '16:9', 'Match Input Image'].map((ratio) => (
                                     <button
                                         key={ratio}
                                         type="button"
                                         onClick={() => setAspectRatio(ratio as '9:16' | '16:9' | 'Match Input Image')}
                                         className={`px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider border-2 transition-all duration-200 ${
                                             aspectRatio === ratio
                                                 ? 'bg-green-600 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                                                 : 'bg-black text-green-500 border-green-700 hover:bg-green-900/30'
                                         }`}
                                     >
                                         {ratio}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Additional Settings */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Size</label>
                                <select 
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                                >
                                    {model === 'bytedance/seedream-5-pro' ? (
                                        <>
                                            <option value="1K">1K (~2 megapixels)</option>
                                            <option value="2K">2K (~4 megapixels)</option>
                                        </>
                                    ) : (
                                        <option value="4K">4K Resolution</option>
                                    )}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Format</label>
                                <select 
                                    value={outputFormat}
                                    onChange={(e) => setOutputFormat(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 text-white"
                                >
                                    <option value="jpeg">JPEG</option>
                                    <option value="png">PNG</option>
                                    <option value="webp">WEBP</option>
                                </select>
                            </div>
                        </div>

            <div className="space-y-2 text-xs text-zinc-500">
                <p>• Model: {model}</p>
                <p>• Settings: {size} Resolution, {aspectRatio}</p>
                <p>• Cost: 0.5 Credits</p>
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || userImages.length === 0 || !prompt}
                className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isGenerating || userImages.length === 0 || !prompt
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

            {/* Quick Virtual Try-On Options */}
            <div className="mt-4 pt-4 border-t border-white/10">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Quick Try-On Options</h3>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        'Shirt / T-Shirt',
                        'Long Dress',
                        'Short Dress',
                        'Long Skirt',
                        'Short Skirt',
                        'Pants',
                        'Jacket / Coat',
                        'Full Outfit (Plus)'
                    ].map((garment) => (
                        <button
                            key={garment}
                            disabled={isGenerating || userImages.length < 2}
                            onClick={() => {
                                const newPrompt = `Virtual try on, fitting the ${garment.toLowerCase()} (Image 2) onto the person (Image 1), highly detailed, realistic, 4k`;
                                setPrompt(newPrompt);
                                handleGenerate(newPrompt);
                            }}
                            className={`p-2 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center text-center h-12 ${
                                isGenerating || userImages.length < 2
                                ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
                                : 'bg-blue-600/10 border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-400'
                            }`}
                        >
                            {garment}
                        </button>
                    ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-3 text-center leading-relaxed">
                    Upload <strong>Image 1 (Model)</strong> and <strong>Image 2 (Garment)</strong>, then click a category to auto-generate.
                </p>
            </div>
        </div>

        {/* Center Area - Upload & Preview */}
        <div className="flex-1 bg-[#050505] p-6 flex flex-col items-center overflow-y-auto">
             <div className="w-full max-w-4xl flex flex-col items-center gap-6">
                
                {/* Header for Upload Section */}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Upload Reference Images</h2>
                    <p className="text-sm text-zinc-400">You can upload between 1 to 14 images to guide the generation.</p>
                </div>

                {/* Upload Area (Clickable) */}
                {userImages.length < 14 && (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative w-full max-w-2xl p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-4 group border-zinc-800 hover:border-zinc-600 bg-zinc-900/20`}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400 group-hover:text-white transition-colors">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                            <p className="font-bold text-zinc-300">Click to browse or drag & drop</p>
                            <p className="text-xs text-zinc-500 mt-1">Supports multiple selection ({userImages.length}/14 uploaded)</p>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            className="hidden" 
                            accept="image/*" 
                            multiple
                        />
                    </div>
                )}

                {/* Image Grid Preview */}
                                {userImages.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
                                        {userImages.map((img, index) => (
                                            <div
                                                key={index}
                                                className={`relative group aspect-square rounded-xl overflow-hidden border-2 bg-black transition-all border-zinc-800`}
                                                tabIndex={0}
                                                aria-label={`Select image ${index + 1}`}
                                            >
                                                <img src={img} className="w-full h-full object-cover" alt={`Upload ${index + 1}`} />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeImage(index);
                                                        }}
                                                        className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-lg backdrop-blur-sm transition-colors"
                                                        title="Remove Image"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                                <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white font-mono">
                                                    {index + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
