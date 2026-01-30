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
