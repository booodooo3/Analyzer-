import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Languages, Download, RotateCcw, Mic, Trash2, Lock } from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { Button } from './Button';
import { ImageData } from '../types';
import HelpModal from './HelpModal';

interface VideoAIOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  getToken: () => Promise<string | null>;
}

export const VideoAIOverlay: React.FC<VideoAIOverlayProps> = ({ isOpen, onClose, getToken }) => {
  const [images, setImages] = useState<(ImageData | null)[]>([null, null]);
  const [description, setDescription] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cameraEffect, setCameraEffect] = useState('Static');
  const [aiFilter, setAiFilter] = useState('No Filter');
  const [helpCategory, setHelpCategory] = useState<'camera' | 'style' | null>(null);
  const [selectedModel, setSelectedModel] = useState<'kling' | 'seedance'>('seedance');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(10);

  useEffect(() => {
    if (!isOpen) {
      setImages([null, null]);
      setDescription('');
      setVideoUrl(null);
      setError(null);
      setIsConverting(false);
      setSelectedModel('seedance');
      setAudioFile(null);
      setDuration(10);
    }
  }, [isOpen]);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
      } else {
        setError('Please upload a valid audio file');
      }
    }
  };

  const updateImage = (index: number, data: ImageData) => {
    setImages(prev => {
      const newImages = [...prev];
      newImages[index] = data;
      return newImages;
    });
  };

  const activeImageCount = images.filter(img => img !== null).length;

  const CAMERA_EFFECTS = [
    'Static', 'Zoom In', 'Zoom Out', 'Pan Left', 'Pan Right', 'Pan Up', 'Pan Down',
    'Slow Motion', 'Hyperlapse / Timelapse', 'Freeze Frame', 'Reverse', 'Roll',
    'Dolly / Tracking', 'Orbit / Arc', 'Crane / Boom / Pedestal', 'Handheld / Shake',
    'Rack Focus', 'Dolly Zoom'
  ];

  const AI_FILTERS = [
    'No Filter', 'Claymation', 'Pixel Art', '3D Cartoon (Pixar Style)', 'Anime',
    'Cinematic', 'Cyberpunk', 'Oil Painting', 'Pencil Sketch', 'Origami',
    'Arabic Heritage', 'Modern Saudi'
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (isOpen && (e.key === 'h' || e.key === 'H')) {
        setHelpCategory(prev => prev ? null : 'camera');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConvert = async () => {
    const primaryImage = images.find(img => img !== null);
    if (!primaryImage) return;
    
    setIsConverting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Please sign in to continue');
      }

      // 1. Resize Image
      const processImage = async (input: string) => {
        return new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.src = input;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxWidth = 1024;

            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
              resolve(input);
            }
          };
          img.onerror = reject;
        });
      };

      const processedImage = await processImage(primaryImage.base64);

      let audioBase64 = null;
      if (audioFile && selectedModel === 'kling') {
        const reader = new FileReader();
        audioBase64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result);
          reader.readAsDataURL(audioFile);
        });
      }

      // 2. Call API to deduct credits and start generation
      const response = await fetch('/api/video-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: processedImage,
          description,
          cameraEffect,
          aiFilter,
          model: selectedModel,
          audio: audioBase64,
          duration: duration
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start video generation');
      }

      const data = await response.json();
      const predictionId = data.id;

      // Poll for status
      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`/api/video-generate?id=${predictionId}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'succeeded') {
            setVideoUrl(statusData.output);
            setIsConverting(false);
          } else if (statusData.status === 'failed') {
            setError(statusData.error || 'Video generation failed');
            setIsConverting(false);
          } else {
            // Still processing, poll again
            setTimeout(pollStatus, 3000);
          }
        } catch (e) {
          setError('Failed to check status');
          setIsConverting(false);
        }
      };

      pollStatus();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred');
      setIsConverting(false);
    }
  };

  return (
    <>
      <HelpModal 
        isOpen={!!helpCategory} 
        onClose={() => setHelpCategory(null)} 
        category={helpCategory || 'camera'} 
      />
      
      <div className="fixed inset-0 z-[50] flex items-center justify-center p-6 animate-in fade-in duration-300">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
        
        {/* Panel */}
        <div className="relative glass-effect w-full max-w-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-8 overflow-hidden animate-in zoom-in-95 duration-500 bg-zinc-900/50">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-white flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Analyzer Ai
                  </div>
                  <span className="text-xs font-normal text-zinc-400 ml-4">Image To Video</span>
              </h2>
              <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
          </div>

          <div className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                      {videoUrl ? 'Generated Video' : 'Upload Images'}
                    </label>
                    {/* Model Selection */}
                    <div className="flex bg-zinc-900/80 p-1 rounded-lg border border-zinc-700/50">
                        <button
                            onClick={() => setSelectedModel('seedance')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all duration-300 ${
                                selectedModel === 'seedance'
                                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-600'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            Seedance 1.5
                        </button>
                        <button
                            onClick={() => setSelectedModel('kling')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all duration-300 ${
                                selectedModel === 'kling'
                                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-600'
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            Kling v2.1
                        </button>
                    </div>
                  </div>
                  
                  {videoUrl ? (
                    <div className="flex gap-4 items-start">
                        <div className="flex-1">
                            <video 
                                src={videoUrl} 
                                controls 
                                className="w-full rounded-xl aspect-video bg-black shadow-lg"
                                autoPlay
                                loop
                            />
                        </div>
                        <div className="flex flex-col gap-2 min-w-[120px]">
                            <Button 
                                onClick={async () => {
                                    if (!videoUrl) return;
                                    try {
                                        const response = await fetch(videoUrl);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'generated-video.mp4';
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                    } catch (e) {
                                        console.error('Download failed:', e);
                                        // Fallback to direct link if fetch fails
                                        const a = document.createElement('a');
                                        a.href = videoUrl;
                                        a.download = 'generated-video.mp4';
                                        a.target = '_blank';
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                    }
                                }}
                                className="w-full bg-white hover:bg-zinc-200 text-black text-xs py-1.5 h-auto gap-2 transition-all duration-300 font-bold shadow-lg"
                            >
                                <Download size={14} />
                                Download
                            </Button>
                            <Button 
                                onClick={() => setVideoUrl(null)}
                                className="w-full bg-white hover:bg-zinc-200 text-black text-xs py-1.5 h-auto gap-2 transition-all duration-300 font-bold shadow-lg"
                            >
                                <RotateCcw size={14} />
                                Try Again
                            </Button>
                        </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {[0, 1].map((index) => (
                            <ImageUploader 
                                key={index}
                                description={`Image ${index + 1}`}
                                currentImage={images[index]?.base64}
                                onImageSelected={(data) => updateImage(index, data)}
                                className="aspect-video w-full h-24"
                                objectFit="contain"
                            />
                        ))}
                    </div>
                  )}
              </div>

              <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Video Description</label>
                  <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the motion and scene (e.g. 'A futuristic city with flying cars')..."
                      className="w-full h-24 bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                  />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Camera Effect</label>
                      </div>
                      <select 
                          value={cameraEffect}
                          onChange={(e) => setCameraEffect(e.target.value)}
                          className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white focus:border-white focus:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all duration-300"
                      >
                          {CAMERA_EFFECTS.map(effect => (
                              <option key={effect} value={effect}>{effect}</option>
                          ))}
                      </select>
                  </div>

                {/* Audio Uploader - Only for Kling */}
                {selectedModel === 'kling' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            Audio Source
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/30">KLING ONLY</span>
                        </label>
                        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl transition-all hover:border-zinc-700 group">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${audioFile ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700'}`}>
                                <Mic size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                {audioFile ? (
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-white truncate">{audioFile.name}</span>
                                        <span className="text-xs text-zinc-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300">Upload Audio</span>
                                        <span className="text-xs text-zinc-600">MP3, WAV (Optional)</span>
                                    </div>
                                )}
                            </div>
                            {audioFile ? (
                                <button 
                                    onClick={() => setAudioFile(null)}
                                    className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            ) : (
                                <label className="cursor-pointer p-2 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-colors">
                                    <Upload size={16} />
                                    <input 
                                        type="file" 
                                        accept="audio/*" 
                                        className="hidden" 
                                        onChange={handleAudioUpload}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                )}

                {/* AI Style Filter */}
                  {selectedModel === 'seedance' ? (
                      <div className="space-y-2 relative group cursor-not-allowed">
                          <div className="flex justify-between items-end">
                            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                AI Style Filter
                            </label>
                          </div>
                          <div className="relative bg-black/50 border border-zinc-800/50 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-zinc-600 font-medium">Locked (Seedance)</span>
                            <Lock size={16} className="text-zinc-600" />
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-2 animate-in fade-in duration-300">
                          <div className="flex justify-between items-end">
                              <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                  AI Style Filter
                                  <button 
                                      onClick={() => setHelpCategory(helpCategory === 'style' ? null : 'style')}
                                      className="text-[10px] text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                  >
                                      For Help
                                  </button>
                              </label>
                          </div>
                          <div className="relative group">
                              <select 
                                  value={aiFilter}
                                  onChange={(e) => setAiFilter(e.target.value)}
                                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-zinc-400 appearance-none focus:outline-none focus:ring-1 focus:ring-white focus:border-white focus:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer"
                              >
                                  {AI_FILTERS.map(filter => (
                                      <option key={filter} value={filter}>{filter}</option>
                                  ))}
                              </select>
                              {/* Custom Arrow for Select */}
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              <Button 
                  onClick={handleConvert}
                  disabled={activeImageCount === 0 || isConverting}
                  isLoading={isConverting}
                  className="w-full bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-white/5 transition-all duration-300"
              >
                  {isConverting ? 'Generating Video...' : 'Generate Video (5 Credits)'}
              </Button>
          </div>
        </div>
      </div>
    </>
  );
};
