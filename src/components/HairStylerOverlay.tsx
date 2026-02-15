import React, { useState, useRef, useMemo } from 'react';
import { X, Scissors, RefreshCw, Wand2, Monitor, RotateCcw, Maximize2, Check, Upload, Loader2, Download, Image as ImageIcon } from 'lucide-react';
import { HAIR_COLORS, MENS_STYLES, WOMENS_STYLES, REMOVAL_OPTIONS } from '../constants';
import { Button } from './Button';
import { generateHairStyle } from '../services/apiService';
import { useAuth } from "@clerk/clerk-react";
import { generateHairSwatch } from '../utils/hairTextureGenerator';

interface HairStylerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HairStylerOverlay: React.FC<HairStylerOverlayProps> = ({ isOpen, onClose }) => {
  const [selectedColor, setSelectedColor] = useState<string>('c-1');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [keepCurrentStyle, setKeepCurrentStyle] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate textures on mount to avoid re-generating every render
  const hairTextures = useMemo(() => {
    const textures: Record<string, string> = {};
    HAIR_COLORS.forEach(c => {
      // If image exists, use it. Otherwise, generate it.
      if ((c as any).image) {
        textures[c.id] = (c as any).image;
      } else {
        textures[c.id] = generateHairSwatch(c.value);
      }
    });
    return textures;
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserImage(event.target?.result as string);
        setResultImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!userImage) {
        setError("Please upload an image first.");
        return;
    }
    if (!selectedStyle && !keepCurrentStyle && !selectedColor) {
        setError("Please select a style or color.");
        return;
    }

    setIsGenerating(true);
    setError(null);

    try {
        const token = await getToken();
        if (!token) throw new Error("Please login first.");

        // Find labels
        const colorObj = HAIR_COLORS.find(c => c.id === selectedColor);
        const styleObj = [...MENS_STYLES, ...WOMENS_STYLES, ...REMOVAL_OPTIONS].find(s => s.id === selectedStyle);

        const result = await generateHairStyle(
            userImage,
            styleObj?.label || '',
            colorObj?.label || '',
            keepCurrentStyle,
            token,
            'google/nano-banana'
        );
        
        setResultImage(result);

    } catch (err: any) {
        setError(err.message || "Failed to generate hair style.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setResultImage(null);
    // Optional: Keep user image or clear it? Usually "Try Another" implies new generation or new image.
    // If it's "Try Another Style", we keep image. If it's "Start Over", we clear image.
    // Let's assume reset result but keep image for easy retry.
    // If they want new image, they can click upload again.
  };

  const handleFullReset = () => {
    setUserImage(null);
    setResultImage(null);
    setSelectedColor('c-1');
    setSelectedStyle('');
    setKeepCurrentStyle(false);
    setError(null);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-white animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#050505]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">AI Hair Styler <span className="text-zinc-500 font-normal text-sm ml-2">0.1</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-zinc-500 text-sm">
             <span>Analyzer-a</span>
           </div>
           <div className="flex items-center gap-3 border-l border-zinc-800 pl-4">
               <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                  <button
                    onClick={() => {}}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.3)] font-bold cursor-default`}
                  >
                    Nano Banana Pro
                  </button>
                   <button
                     onClick={() => {
                         setResultImage(null);
                         setError(null);
                     }}
                     className="ml-2 bg-zinc-900 border border-zinc-700 hover:border-white text-white text-[10px] px-3 rounded-lg transition-all uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 h-[26px]"
                     title="Try Again"
                   >
                     <RotateCcw className="w-3 h-3" />
                     Try Again
                   </button>
                </div>
              <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white" onClick={onClose}>
                 <X className="w-4 h-4" />
              </button>
           </div>

        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Sidebar - Settings */}
        <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/5 bg-[#080808] lg:overflow-y-auto custom-scrollbar order-2 lg:order-1 h-auto lg:h-full">
          <div className="p-6 space-y-8">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-bold">Settings</h2>
               <button 
                onClick={handleReset}
                className="text-xs text-[#5f63f2] flex items-center gap-1 hover:underline"
               >
                 <RefreshCw className="w-3 h-3" />
                 Try Another
               </button>
            </div>

            {/* Hair Color Section */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-pink-400 font-medium">
                  <Wand2 className="w-4 h-4" />
                  <h3>Select Hair Color</h3>
               </div>
               
               <div className="grid grid-cols-4 gap-2">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setSelectedColor(color.id)}
                      className={`group relative flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all ${selectedColor === color.id ? 'bg-white/5 ring-1 ring-[#5f63f2]' : 'hover:bg-white/5'}`}
                    >
                      <div 
                        className="w-12 h-12 rounded-lg shadow-sm relative flex items-center justify-center overflow-hidden"
                      >
                        {/* Render Image (from URL or Generated) */}
                        {hairTextures[color.id] ? (
                           <img 
                             src={hairTextures[color.id]} 
                             alt={color.label} 
                             className="w-full h-full object-cover"
                           />
                        ) : (
                           <div 
                             className="w-full h-full"
                             style={{ background: color.value }} 
                           />
                        )}
                        
                        {selectedColor === color.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                             <div className="bg-white/20 backdrop-blur-md rounded-full p-1 shadow-lg">
                                <Check className={`w-3 h-3 text-white`} />
                             </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-400 text-center leading-tight h-6 flex items-center justify-center w-full px-1">
                        {color.label}
                      </span>
                    </button>
                  ))}
               </div>
            </div>

            {/* Current Style Section */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-purple-400 font-medium">
                  <Scissors className="w-4 h-4" />
                  <h3>Current Style (Color Only)</h3>
               </div>
               <button 
                 onClick={() => {
                   setKeepCurrentStyle(!keepCurrentStyle);
                   setSelectedStyle('');
                 }}
                 className={`w-full py-3 px-4 rounded-xl border text-sm font-medium transition-all ${keepCurrentStyle ? 'bg-[#5f63f2] border-[#5f63f2] text-white shadow-[0_0_15px_rgba(95,99,242,0.4)]' : 'bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
               >
                 Keep Current Style
               </button>
            </div>

            {/* Men's Styles */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <span className="text-lg">♂</span>
                  <h3>Men's Styles</h3>
               </div>
               <div className="grid grid-cols-3 gap-2">
                 {MENS_STYLES.map((style) => (
                   <button
                     key={style.id}
                     onClick={() => {
                       setSelectedStyle(style.id);
                       setKeepCurrentStyle(false);
                     }}
                     className={`py-3 px-2 rounded-xl border text-[10px] font-medium transition-all h-full flex items-center justify-center text-center ${selectedStyle === style.id ? 'bg-[#5f63f2] border-[#5f63f2] text-white shadow-[0_0_15px_rgba(95,99,242,0.4)]' : 'bg-[#111] border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'}`}
                   >
                     {style.label}
                   </button>
                 ))}
               </div>
            </div>

            {/* Women's Styles */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-pink-400 font-medium">
                  <span className="text-lg">♀</span>
                  <h3>Women's Styles</h3>
               </div>
               <div className="grid grid-cols-3 gap-2">
                 {WOMENS_STYLES.map((style) => (
                   <button
                     key={style.id}
                     onClick={() => {
                       setSelectedStyle(style.id);
                       setKeepCurrentStyle(false);
                     }}
                     className={`py-3 px-2 rounded-xl border text-[10px] font-medium transition-all h-full flex items-center justify-center text-center ${selectedStyle === style.id ? 'bg-[#5f63f2] border-[#5f63f2] text-white shadow-[0_0_15px_rgba(95,99,242,0.4)]' : 'bg-[#111] border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'}`}
                   >
                     {style.label}
                   </button>
                 ))}
               </div>
            </div>

            {/* Removal Options */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-green-400 font-medium">
                  <Maximize2 className="w-4 h-4" />
                  <h3>Remove Headwear/Glasses</h3>
               </div>
               <div className="grid grid-cols-3 gap-2">
                 {REMOVAL_OPTIONS.map((option) => (
                   <button
                     key={option.id}
                     onClick={() => {
                       setSelectedStyle(option.id);
                       setKeepCurrentStyle(false);
                     }}
                     className={`py-3 px-2 rounded-xl border text-[10px] font-medium transition-all h-full flex items-center justify-center text-center ${selectedStyle === option.id ? 'bg-[#5f63f2] border-[#5f63f2] text-white shadow-[0_0_15px_rgba(95,99,242,0.4)]' : 'bg-[#111] border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'}`}
                   >
                     {option.label}
                   </button>
                 ))}
               </div>
            </div>

            <div className="pt-4 pb-12">
               {error && <p className="text-red-500 text-xs mb-2 text-center">{error}</p>}
               <p className="text-[10px] text-zinc-500 text-center mb-2">
                  0.5 Credit per generation
               </p>
               <button 
                onClick={handleGenerate}
                disabled={isGenerating || !userImage}
                className={`w-full py-4 rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_30px_rgba(192,38,211,0.6)] transition-all flex items-center justify-center gap-2 ${isGenerating ? 'bg-zinc-800 cursor-not-allowed text-zinc-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'}`}
               >
                  {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                  ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate Look
                      </>
                  )}
               </button>
            </div>
          </div>
        </div>

        {/* Right Preview Area */}
        <div className="w-full lg:flex-1 bg-[#050505] p-4 lg:p-8 flex items-center justify-center relative overflow-hidden order-1 lg:order-2 shrink-0 lg:shrink lg:h-full">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="bg-[#0e0e0e] border border-white/5 p-4 lg:p-6 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col lg:flex-row gap-4 lg:gap-8 items-center justify-center relative z-10 lg:aspect-[16/9]">
             
             {/* Original Image / Uploader */}
             <div 
                className={`relative w-full lg:w-[45%] aspect-[3/4] lg:aspect-square rounded-2xl overflow-hidden border border-zinc-800 group transition-all ${!userImage ? 'hover:border-zinc-600 cursor-pointer bg-[#111]' : ''}`}
                onClick={() => !userImage && fileInputRef.current?.click()}
             >
                {userImage ? (
                    <>
                        <img src={userImage} className="w-full h-full object-cover" alt="Original" />
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                           <span className="text-xs font-medium text-white">Original</span>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                            }}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                             <span className="flex items-center gap-2 text-white font-bold bg-black/50 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                                <Upload className="w-4 h-4" />
                                Change Image
                             </span>
                        </button>
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-500 group-hover:text-zinc-300">
                        <div className="w-16 h-16 rounded-full bg-zinc-900/80 flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                           <ImageIcon className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-sm uppercase tracking-wider mb-1">Upload Photo</p>
                            <p className="text-xs text-zinc-600">Click to browse</p>
                        </div>
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
             <div className="text-zinc-600 rotate-90 lg:rotate-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </div>

             {/* Result Area */}
             <div className="relative w-full lg:w-[45%] aspect-[3/4] lg:aspect-square rounded-2xl border-2 border-dashed border-zinc-800 bg-[#080808] flex flex-col items-center justify-center gap-4 group hover:border-zinc-700 transition-colors overflow-hidden">
                {resultImage ? (
                    <>
                        <img src={resultImage} className="w-full h-full object-cover" alt="Result" />
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1 rounded-full shadow-lg shadow-purple-500/20">
                           <span className="text-xs font-bold text-white flex items-center gap-1">
                                <Wand2 className="w-3 h-3" />
                                AI Result
                           </span>
                        </div>
                        {/* Actions */}
                        <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                             <a 
                                href={resultImage} 
                                download="hair-styler-result.jpg"
                                className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors shadow-lg"
                                target="_blank"
                                rel="noopener noreferrer"
                             >
                                <Download className="w-4 h-4" />
                                Download
                             </a>
                             <button 
                                onClick={handleReset}
                                className="px-4 bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-xl hover:bg-black transition-colors"
                             >
                                <RotateCcw className="w-4 h-4" />
                             </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                           {isGenerating ? <Loader2 className="w-6 h-6 animate-spin text-[#5f63f2]" /> : <Wand2 className="w-5 h-5" />}
                        </div>
                        <span className="text-zinc-500 text-sm font-medium">
                            {isGenerating ? "Generating new look..." : "Result will appear here"}
                        </span>
                    </>
                )}
             </div>

          </div>
        </div>
      </div>
    </div>
  );
};
