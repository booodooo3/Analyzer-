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
  const [duration, setDuration] = useState(10);
  const [selectedModel, setSelectedModel] = useState('bytedance/seedance-1.5-pro');
  const [processingTime, setProcessingTime] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<{ id: string, url: string, timestamp: number }[]>([]);

  useEffect(() => {
    // Load generated videos from local storage
    const saved = localStorage.getItem('generatedVideos');
    if (saved) {
      const parsed = JSON.parse(saved);
      const now = Date.now();
      // Filter out videos older than 5 minutes
      const valid = parsed.filter((v: any) => now - v.timestamp < 5 * 60 * 1000);
      setGeneratedVideos(valid);
      
      if (valid.length !== parsed.length) {
        localStorage.setItem('generatedVideos', JSON.stringify(valid));
      }
    }

    // Set up interval to clean up old videos
    const cleanupInterval = setInterval(() => {
      setGeneratedVideos(prev => {
        const now = Date.now();
        const valid = prev.filter(v => now - v.timestamp < 5 * 60 * 1000);
        if (valid.length !== prev.length) {
          localStorage.setItem('generatedVideos', JSON.stringify(valid));
        }
        return valid;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConverting) {
      setProcessingTime(0);
      interval = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConverting]);

  useEffect(() => {
    if (!isOpen) {
      setImages([null, null]);
      setDescription('');
      setVideoUrl(null);
      setError(null);
      setIsConverting(false);
      setDuration(10);
    }
  }, [isOpen]);

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
    'Rack Focus', 'Dolly Zoom', 'The Camera Follows The Subject Moving'
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
          duration: duration,
          model: selectedModel
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
            
            // Add to generated videos list
            const newVideo = {
              id: predictionId,
              url: statusData.output,
              timestamp: Date.now()
            };
            
            setGeneratedVideos(prev => {
              const updated = [newVideo, ...prev];
              localStorage.setItem('generatedVideos', JSON.stringify(updated));
              return updated;
            });
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playlistContent = generatedVideos.map((video) => (
    <div key={video.id} className="relative group animate-in slide-in-from-right duration-500">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] relative">
        <video 
          src={video.url} 
          className="w-full h-full object-cover"
          muted
          loop
          onMouseOver={e => e.currentTarget.play()}
          onMouseOut={e => {
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0;
          }}
        />
        {/* Overlay Info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100">
            <div className="absolute bottom-2 left-2 right-2">
              <div className="flex justify-between items-end">
                  <span className="text-[10px] font-mono text-green-400">Generated</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {Math.ceil((300000 - (Date.now() - video.timestamp)) / 60000)}m left
                  </span>
              </div>
            </div>
        </div>
      </div>
      
      <button
        onClick={async () => {
          try {
              const response = await fetch(video.url);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `generated-${video.id}.mp4`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
          } catch (e) {
              window.open(video.url, '_blank');
          }
        }}
        className="mt-2 w-full bg-zinc-900 border border-zinc-700 hover:border-white text-white text-[10px] py-1.5 rounded-lg transition-all uppercase tracking-wider font-bold"
      >
        Download
      </button>
    </div>
  ));

  return (
    <>
      <HelpModal 
        isOpen={!!helpCategory} 
        onClose={() => setHelpCategory(null)} 
        category={helpCategory || 'camera'} 
      />
      
      <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start justify-center gap-6 w-full max-w-7xl my-auto">

        {/* Panel */}
        <div className="relative glass-effect w-full max-w-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-8 overflow-hidden animate-in zoom-in-95 duration-500 bg-zinc-900/50 order-1 lg:order-1">
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
                  </div>
                  
                  {videoUrl ? (
                    <div className="flex gap-4 items-start justify-center">
                        <div className="flex-1 flex justify-center bg-black/20 rounded-xl p-2">
                            <video 
                                src={videoUrl} 
                                controls 
                                className="max-w-full max-h-[500px] rounded-lg shadow-lg"
                                autoPlay
                                loop
                            />
                        </div>
                        <div className="flex flex-col gap-2 min-w-[140px]">
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
                                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white text-white text-[11px] py-2.5 h-auto gap-2 transition-all duration-200 font-bold tracking-widest uppercase rounded-lg active:border-green-500 active:text-green-500"
                            >
                                DOWNLOAD
                            </Button>
                            <Button 
                                onClick={() => setVideoUrl(null)}
                                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white text-white text-[11px] py-2.5 h-auto gap-2 transition-all duration-200 font-bold tracking-widest uppercase rounded-lg active:border-green-500 active:text-green-500"
                            >
                                TRY ON AGAIN
                            </Button>
                        </div>
                    </div>
                  ) : isConverting ? (
                    <div className="w-full rounded-xl aspect-video bg-zinc-950 relative overflow-hidden border border-white/5 group">
                        {/* Background Image (Input) */}
                        {images[0]?.base64 && (
                            <div 
                                className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm transition-opacity duration-1000"
                                style={{ backgroundImage: `url(${images[0].base64})` }}
                            />
                        )}
                        
                        {/* Dot Pattern Overlay */}
                        <div className="absolute inset-0" 
                             style={{ 
                                 backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', 
                                 backgroundSize: '20px 20px',
                                 maskImage: 'linear-gradient(to bottom, black, transparent)'
                             }} 
                        />

                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col justify-end p-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span className="text-zinc-400 text-xs font-mono tracking-widest uppercase">Processing Video</span>
                                </div>
                                
                                <div className="flex items-center gap-4 text-2xl font-bold tracking-tight">
                                    <span className="text-zinc-600">In the queue</span>
                                    <div className="flex gap-1">
                                        {[...Array(6)].map((_, i) => (
                                            <span key={i} className="text-zinc-700 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>›</span>
                                        ))}
                                    </div>
                                    <span className="text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">Generation</span>
                                    <div className="flex gap-1">
                                        {[...Array(6)].map((_, i) => (
                                            <span key={i} className="text-zinc-500 animate-pulse" style={{ animationDelay: `${i * 100 + 600}ms` }}>›</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 pt-2 border-t border-white/10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Time Elapsed</span>
                                        <span className="text-xl font-mono text-white/90">{formatTime(processingTime)}</span>
                                    </div>
                                    <div className="h-8 w-px bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Est. Time</span>
                                        <span className="text-sm font-mono text-zinc-400">~2-3 Mins</span>
                                    </div>
                                    <div className="flex-1 flex justify-end">
                                        <div className="flex flex-col items-end text-[10px] font-bold tracking-wider animate-pulse">
                                            <span className="text-green-500">PLAYLIST ONLY</span>
                                            <span className="text-green-500">5 MIN</span>
                                            <span className="text-green-500">BEFORE DELETION</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {[0, 1].map((index) => (
                            <ImageUploader 
                                key={index}
                                description=""
                                currentImage={images[index]?.base64}
                                onImageSelected={(data) => updateImage(index, data)}
                                className="aspect-video w-full bg-zinc-950/50"
                                objectFit="contain"
                            />
                        ))}
                    </div>
                  )}
              </div>

              <div className="space-y-2">
                  <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Video Description</label>
                      <select 
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="bg-black border border-zinc-800 rounded-lg px-3 py-1 text-xs text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
                      >
                          <option value="bytedance/seedance-1.5-pro">Seedance 1.5 Pro</option>
                          <option value="bytedance/seedance-1-pro-fast" className="text-green-500 font-bold">Seedance 1 Pro Fast</option>
                      </select>
                  </div>
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
                        <button
                          onClick={() => setHelpCategory('camera')}
                          className="text-[9px] px-2 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 border border-zinc-700/50 transition-colors tracking-wide uppercase"
                        >
                          This For Help
                        </button>
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

                {/* AI Style Filter */}
                      <div className="space-y-2">
                          <div className="flex justify-between items-end">
                            <label className="text-sm font-bold text-green-500 uppercase tracking-wider flex items-center gap-2">
                                AI Style Filter
                            </label>
                            <button
                                onClick={() => setHelpCategory('style')}
                                className="text-[9px] px-2 py-1 rounded-full bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-500/30 transition-colors tracking-wide uppercase"
                            >
                                Styles Info
                            </button>
                          </div>
                          <select 
                            value={aiFilter}
                            onChange={(e) => setAiFilter(e.target.value)}
                            className="w-full bg-black border border-green-500/50 rounded-xl p-3 text-green-400 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all duration-300"
                          >
                            {AI_FILTERS.map(filter => (
                                <option key={filter} value={filter} className="text-green-400 bg-zinc-900">{filter}</option>
                            ))}
                          </select>
                      </div>
              </div>

              <Button 
                  onClick={handleConvert}
                  disabled={activeImageCount === 0 || isConverting}
                  isLoading={isConverting}
                  className={`w-full font-bold py-4 rounded-xl transition-all duration-300 ${
                    isConverting 
                      ? 'bg-zinc-900 border border-green-500/50 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]' 
                      : 'bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 text-white shadow-lg shadow-white/5'
                  }`}
              >
                  {isConverting ? 'Generating Video...' : 'Generate Video (5 Credits)'}
              </Button>

              {/* Mobile Playlist */}
              {generatedVideos.length > 0 && (
                <div className="lg:hidden mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {playlistContent}
                </div>
              )}
          </div>
        </div>

        {/* Desktop Playlist Sidebar */}
        {generatedVideos.length > 0 && (
          <div className="hidden lg:flex flex-col gap-4 w-64 sticky top-4 order-2 h-fit">
            {playlistContent}
          </div>
        )}

      </div>
    </div>
    </>
  );
};
