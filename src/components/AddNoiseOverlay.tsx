import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface AddNoiseOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const sizePresets = [
  { label: 'Original Size', width: null, height: null },
  { label: 'Auto Resolution...', width: null, height: null },
  { label: '960 x 640 px 144 ppi', width: 960, height: 640 },
  { label: '1024 x 768 px 72 ppi', width: 1024, height: 768 },
  { label: '1136 x 640 px 144 ppi', width: 1136, height: 640 },
  { label: '1366 x 768 px 72 ppi', width: 1366, height: 768 },
  { label: 'A4 210 x 297 mm 300 dpi', width: 2480, height: 3508 },
  { label: 'A6 105 x 148 mm 300 dpi', width: 1240, height: 1748 },
  { label: 'Legal 8.5 x 14 in 300 dpi', width: 2550, height: 4200 },
  { label: 'Letter 8.5 x 11 in 300 dpi', width: 2550, height: 3300 },
  { label: '4 x 6 in 300 dpi', width: 1200, height: 1800 },
  { label: '5 x 7 in 300 dpi', width: 1500, height: 2100 },
  { label: '8 x 10 in 300 dpi', width: 2400, height: 3000 },
  { label: '11 x 14 in 300 dpi', width: 3300, height: 4200 },
  { label: 'Load Preset...', width: null, height: null },
  { label: 'Save Preset...', width: null, height: null },
  { label: 'Delete Preset...', width: null, height: null },
  { label: 'Custom', width: null, height: null },
];

export const AddNoiseOverlay: React.FC<AddNoiseOverlayProps> = ({ isOpen, onClose }) => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(16.19);
  const [distribution, setDistribution] = useState<'uniform' | 'gaussian'>('uniform');
  const [monochromatic, setMonochromatic] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imgWidth, setImgWidth] = useState<number>(0);
  const [imgHeight, setImgHeight] = useState<number>(0);
  const [preset, setPreset] = useState<string>('Original Size');
  const [showJpegOptions, setShowJpegOptions] = useState<boolean>(false);
  const [jpegQuality, setJpegQuality] = useState<number>(6);
  const [jpegFormat, setJpegFormat] = useState<string>('progressive');
  const [jpegScans, setJpegScans] = useState<number>(3);
  const [estimatedSize, setEstimatedSize] = useState<string>('...');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (userImage) {
      const img = new Image();
      img.onload = () => {
        imageObjRef.current = img;
        setImgWidth(img.width);
        setImgHeight(img.height);
        applyNoise();
      };
      img.src = userImage;
    }
  }, [userImage]);

  useEffect(() => {
    if (imageObjRef.current) {
      applyNoise();
    }
  }, [amount, distribution, monochromatic, imgWidth, imgHeight]);

  const applyNoise = () => {
    if (!imageObjRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    
    // Use a timeout to allow UI to update (show processing state if it takes long)
    setTimeout(() => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = imageObjRef.current!;
      canvas.width = imgWidth || img.width;
      canvas.height = imgHeight || img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const noiseAmount = amount / 100 * 255;

      const randomGaussian = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) / 3.0;
      };

      for (let i = 0; i < data.length; i += 4) {
        let noiseR, noiseG, noiseB;

        if (monochromatic) {
          let noise = 0;
          if (distribution === 'uniform') {
            noise = (Math.random() - 0.5) * 2 * noiseAmount;
          } else {
            noise = randomGaussian() * noiseAmount;
          }
          noiseR = noiseG = noiseB = noise;
        } else {
          if (distribution === 'uniform') {
            noiseR = (Math.random() - 0.5) * 2 * noiseAmount;
            noiseG = (Math.random() - 0.5) * 2 * noiseAmount;
            noiseB = (Math.random() - 0.5) * 2 * noiseAmount;
          } else {
            noiseR = randomGaussian() * noiseAmount;
            noiseG = randomGaussian() * noiseAmount;
            noiseB = randomGaussian() * noiseAmount;
          }
        }

        data[i] = Math.max(0, Math.min(255, data[i] + noiseR));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noiseG));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noiseB));
      }

      ctx.putImageData(imageData, 0, 0);
      setResultImage(canvas.toDataURL('image/png'));
      setIsProcessing(false);
    }, 10);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateEstimatedSize = (q: number) => {
    if (!canvasRef.current) return;
    const qualityMap = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.98, 1.0];
    const mappedQuality = qualityMap[Math.max(0, Math.min(12, Math.round(q)))];
    
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', mappedQuality);
    const sizeKB = (dataUrl.length * 0.75) / 1024;
    setEstimatedSize(`${sizeKB.toFixed(1)}K`);
  };

  useEffect(() => {
    if (showJpegOptions) {
      updateEstimatedSize(jpegQuality);
    }
  }, [jpegQuality, showJpegOptions]);

  const handleSaveClick = () => {
    if (!resultImage || !canvasRef.current) return;
    updateEstimatedSize(jpegQuality);
    setShowJpegOptions(true);
  };

  const confirmSaveImage = () => {
    if (!canvasRef.current) return;
    
    const qualityMap = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.98, 1.0];
    const mappedQuality = qualityMap[Math.max(0, Math.min(12, Math.round(jpegQuality)))];
    
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', mappedQuality);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `error-500-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowJpegOptions(false);
  };

  const handleReset = () => {
    setUserImage(null);
    setResultImage(null);
    setAmount(16.19);
    setDistribution('uniform');
    setMonochromatic(true);
    setPreset('Original Size');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLabel = e.target.value;
    setPreset(selectedLabel);
    
    if (selectedLabel === 'Original Size' && imageObjRef.current) {
      setImgWidth(imageObjRef.current.width);
      setImgHeight(imageObjRef.current.height);
    } else {
      const presetData = sizePresets.find(p => p.label === selectedLabel);
      if (presetData && presetData.width && presetData.height) {
        setImgWidth(presetData.width);
        setImgHeight(presetData.height);
      }
    }
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImgWidth(parseInt(e.target.value) || 0);
    setPreset('Custom');
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImgHeight(parseInt(e.target.value) || 0);
    setPreset('Custom');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505] text-white animate-in fade-in duration-300">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#2d1414]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-[#d97777]" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-[#d97777]">Error 500</h1>
        </div>
        <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white" onClick={onClose}>
           <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {showJpegOptions && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#535353] border border-[#666] shadow-[0_4px_24px_rgba(0,0,0,0.5)] w-[420px] flex flex-col font-sans text-[13px] text-[#e0e0e0] select-none">
              <div className="px-3 py-1.5 flex justify-between items-center bg-[#535353] border-b border-[#444]">
                <span>JPEG Options</span>
                <button onClick={() => setShowJpegOptions(false)} className="text-zinc-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-3 flex gap-3">
                {/* Left Column */}
                <div className="flex-1 flex flex-col gap-4">
                  {/* Matte */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[#888]">Matte:</span>
                    <select disabled className="flex-1 bg-[#535353] border border-[#444] rounded-sm px-1 py-0.5 text-[#888] appearance-none">
                      <option>None</option>
                    </select>
                  </div>

                  {/* Image Options */}
                  <fieldset className="border border-[#444] rounded-sm px-3 pb-3 pt-4 relative">
                    <legend className="absolute -top-2.5 left-2 bg-[#535353] px-1 text-[#ccc]">Image Options</legend>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-[45px] text-right">Quality:</span>
                      <input 
                        type="number" 
                        min="0" 
                        max="12" 
                        value={jpegQuality}
                        onChange={(e) => setJpegQuality(parseInt(e.target.value) || 0)}
                        className="w-10 bg-[#333] border border-[#222] text-white text-center py-0.5 outline-none focus:border-blue-500"
                      />
                      <select 
                        value={jpegQuality <= 4 ? 'Low' : jpegQuality <= 7 ? 'Medium' : jpegQuality <= 9 ? 'High' : 'Maximum'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Low') setJpegQuality(3);
                          else if (val === 'Medium') setJpegQuality(6);
                          else if (val === 'High') setJpegQuality(8);
                          else if (val === 'Maximum') setJpegQuality(12);
                        }}
                        className="flex-1 bg-[#535353] border border-[#444] rounded-sm px-1 py-0.5 text-white"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Maximum">Maximum</option>
                      </select>
                    </div>
                    <div className="px-1 relative">
                      <div className="flex justify-between text-[11px] text-[#aaa] mb-1">
                        <span>small file</span>
                        <span>large file</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="12" 
                        value={jpegQuality}
                        onChange={(e) => setJpegQuality(parseInt(e.target.value))}
                        className="w-full accent-[#ccc] h-1 bg-[#333] rounded-full appearance-none outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#ddd] [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                      />
                    </div>
                  </fieldset>

                  {/* Format Options */}
                  <fieldset className="border border-[#444] rounded-sm px-3 pb-3 pt-4 relative">
                    <legend className="absolute -top-2.5 left-2 bg-[#535353] px-1 text-[#ccc]">Format Options</legend>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          value="baseline"
                          checked={jpegFormat === 'baseline'}
                          onChange={(e) => setJpegFormat(e.target.value)}
                          className="accent-[#ccc] bg-[#333] border-[#222]"
                        />
                        <span>Baseline ("Standard")</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          value="optimized"
                          checked={jpegFormat === 'optimized'}
                          onChange={(e) => setJpegFormat(e.target.value)}
                          className="accent-[#ccc] bg-[#333] border-[#222]"
                        />
                        <span>Baseline Optimized</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          value="progressive"
                          checked={jpegFormat === 'progressive'}
                          onChange={(e) => setJpegFormat(e.target.value)}
                          className="accent-[#ccc] bg-[#333] border-[#222]"
                        />
                        <span>Progressive</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2 pl-6 mt-2">
                      <span className={`${jpegFormat !== 'progressive' ? 'text-[#888]' : ''}`}>Scans:</span>
                      <select 
                        disabled={jpegFormat !== 'progressive'}
                        value={jpegScans}
                        onChange={(e) => setJpegScans(parseInt(e.target.value))}
                        className="bg-[#535353] border border-[#444] rounded-sm px-2 py-0.5 text-white disabled:text-[#888] disabled:border-[#444]"
                      >
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                    </div>
                  </fieldset>
                </div>

                {/* Right Column */}
                <div className="w-[100px] flex flex-col gap-2">
                  <button onClick={confirmSaveImage} className="w-full bg-[#666] hover:bg-[#777] border border-[#444] rounded-sm py-1 shadow-sm active:bg-[#555]">
                    OK
                  </button>
                  <button onClick={() => setShowJpegOptions(false)} className="w-full bg-[#666] hover:bg-[#777] border border-[#444] rounded-sm py-1 shadow-sm active:bg-[#555]">
                    Cancel
                  </button>

                  <div className="mt-4 flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="accent-[#ccc] bg-[#333] border-[#222]" />
                    <span>Preview</span>
                  </div>

                  <div className="mt-auto text-[11px] text-[#ccc] pt-4">
                    {estimatedSize}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col border-r border-white/5 bg-[#080808] p-6 space-y-6 overflow-y-auto order-2 lg:order-1 h-auto lg:h-full">
          <div className="space-y-4">
             <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Image Size</h2>
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <span className="text-sm text-zinc-400">Fit To:</span>
                 <select 
                   value={preset}
                   onChange={handlePresetChange}
                   className="w-[180px] bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-white text-sm focus:outline-none truncate"
                 >
                   {sizePresets.map((p, i) => (
                     <option key={i} value={p.label}>{p.label}</option>
                   ))}
                 </select>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-sm text-zinc-400">Width:</span>
                 <div className="flex items-center gap-2">
                   <input 
                     type="number" 
                     value={imgWidth || ''}
                     onChange={handleWidthChange}
                     className="w-20 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-white text-sm focus:outline-none"
                   />
                   <span className="text-xs text-zinc-500">px</span>
                 </div>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-sm text-zinc-400">Height:</span>
                 <div className="flex items-center gap-2">
                   <input 
                     type="number" 
                     value={imgHeight || ''}
                     onChange={handleHeightChange}
                     className="w-20 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1 text-white text-sm focus:outline-none"
                   />
                   <span className="text-xs text-zinc-500">px</span>
                 </div>
               </div>
             </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
             <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Amount</h2>
             <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="0.01"
                  value={amount} 
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  className="flex-1 accent-white"
                />
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-transparent text-white text-sm text-right focus:outline-none"
                    step="0.1"
                  />
                  <span className="text-zinc-500 text-sm">%</span>
                </div>
             </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
             <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Distribution</h2>
             <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="distribution" 
                    value="uniform"
                    checked={distribution === 'uniform'}
                    onChange={() => setDistribution('uniform')}
                    className="accent-white w-4 h-4"
                  />
                  <span className="text-sm">Uniform</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="radio" 
                    name="distribution" 
                    value="gaussian"
                    checked={distribution === 'gaussian'}
                    onChange={() => setDistribution('gaussian')}
                    className="accent-white w-4 h-4"
                  />
                  <span className="text-sm">Gaussian</span>
                </label>
             </div>
          </div>

          <div className="pt-4 border-t border-white/5">
             <label className="flex items-center gap-3 cursor-pointer">
               <input 
                 type="checkbox" 
                 checked={monochromatic}
                 onChange={(e) => setMonochromatic(e.target.checked)}
                 className="accent-white w-4 h-4 rounded"
               />
               <span className="text-sm">Monochromatic</span>
             </label>
          </div>

          <div className="pt-8 space-y-3 mt-auto">
             <Button 
                onClick={handleSaveClick}
                disabled={!resultImage}
                className="w-full font-bold flex items-center justify-center gap-2"
             >
                <Download className="w-4 h-4" />
                Save Image
             </Button>
             {userImage && (
               <Button 
                  variant="outline"
                  onClick={handleReset}
                  className="w-full"
               >
                  Try Another
               </Button>
             )}
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-[#111] p-8 flex flex-col items-center justify-center relative order-1 lg:order-2">
           <canvas ref={canvasRef} className="hidden" />
           
           <div className="w-full max-w-2xl aspect-square lg:aspect-auto lg:h-[80%] border border-zinc-800 rounded-lg overflow-hidden bg-black flex items-center justify-center relative shadow-2xl">
              {!userImage ? (
                  <div 
                    className="flex flex-col items-center gap-4 cursor-pointer p-8 rounded-xl hover:bg-white/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                     <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-zinc-500" />
                     </div>
                     <div className="text-center">
                        <p className="text-sm font-bold uppercase tracking-wider mb-1">Upload Image</p>
                        <p className="text-xs text-zinc-500">Click to browse</p>
                     </div>
                  </div>
              ) : (
                  <>
                     <img 
                       src={resultImage || userImage} 
                       alt="Preview" 
                       className="w-full h-full object-contain"
                     />
                     {isProcessing && (
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-white font-bold text-sm tracking-widest uppercase animate-pulse">Processing...</span>
                       </div>
                     )}
                     <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <span className="text-xs font-medium text-white">Preview</span>
                     </div>
                     <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="absolute top-4 right-4 bg-black/80 hover:bg-black text-white px-3 py-1.5 rounded-md border border-white/10 text-xs font-bold transition-colors flex items-center gap-2"
                     >
                        <Upload className="w-3 h-3" />
                        Change Image
                     </button>
                  </>
              )}
              <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
              />
           </div>
        </div>
      </div>
    </div>
  );
};
