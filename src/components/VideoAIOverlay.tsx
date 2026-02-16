import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Languages, Download, RotateCcw, Mic, Trash2, Lock, Star } from 'lucide-react';
import { useAuth } from "@clerk/clerk-react";
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
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [processingTime, setProcessingTime] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<{ id: string, url: string, timestamp: number }[]>([]);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<{ base64: string, name: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('Processing Video');
  const [showLipSync, setShowLipSync] = useState(false);
  const [lipSyncAudio, setLipSyncAudio] = useState<{ base64: string, name: string } | null>(null);
  const [videoInput, setVideoInput] = useState<{ base64: string, name: string } | null>(null);
  const [characterOrientation, setCharacterOrientation] = useState<'video' | 'image'>('video');

  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) {
        setGeneratedVideos([]);
        return;
    }
    const storageKey = `generatedVideos_${userId}`;

    // Load generated videos from local storage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          // Filter out videos older than 5 minutes
          const valid = parsed.filter((v: any) => now - v.timestamp < 5 * 60 * 1000);
          setGeneratedVideos(valid);
          
          if (valid.length !== parsed.length) {
            localStorage.setItem(storageKey, JSON.stringify(valid));
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse generated videos from local storage", e);
      // Optional: Clear invalid data
      localStorage.removeItem(storageKey);
    }

    // Set up interval to clean up old videos
    const cleanupInterval = setInterval(() => {
      setGeneratedVideos(prev => {
        const now = Date.now();
        const valid = prev.filter(v => now - v.timestamp < 5 * 60 * 1000);
        if (valid.length !== prev.length) {
          localStorage.setItem(storageKey, JSON.stringify(valid));
        }
        return valid;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(cleanupInterval);
  }, [userId]);

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
      setStatusMessage('Processing Video');
      setShowLipSync(false);
      setLipSyncAudio(null);
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

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError("Audio file is too large. Max 10MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAudioFile({
          base64: reader.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit to avoid payload issues
        setError("Video file is too large. Max 10MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setVideoInput({
          base64: reader.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

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
          image2: images[1] ? await processImage(images[1].base64) : null,
          description,
          cameraEffect,
          aiFilter,
          duration: duration,
          aspectRatio,
          model: selectedModel,
          audioFile: audioFile?.base64,
          videoInput: videoInput?.base64,
          characterOrientation
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start video generation');
      }

      const data = await response.json();
      
      // Poll for status
      const pollStatus = async (currentId: string) => {
        try {
          const statusRes = await fetch(`/api/video-generate?id=${currentId}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'succeeded') {
            setVideoUrl(statusData.output);
            setIsConverting(false);
            setStatusMessage('Processing Video');
            
            // Add to generated videos list
            const newVideo = {
              id: currentId,
              url: statusData.output,
              timestamp: Date.now()
            };
            
            setGeneratedVideos(prev => {
              const updated = [newVideo, ...prev];
              if (userId) {
                localStorage.setItem(`generatedVideos_${userId}`, JSON.stringify(updated));
              }
              return updated;
            });
          } else if (statusData.status === 'failed') {
            setError(statusData.error || 'Video generation failed');
            setIsConverting(false);
          } else {
            // Still processing, poll again
            setTimeout(() => pollStatus(currentId), 3000);
          }
        } catch (e) {
          console.error("Poll error:", e);
          // If polling fails (e.g. network), try again
          setTimeout(() => pollStatus(currentId), 5000);
        }
      };

      pollStatus(data.id);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred');
      setIsConverting(false);
    }
  };

  const handleLipSyncUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) {
            alert("File size too large. Please upload a file smaller than 10MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setLipSyncAudio({
                base64: reader.result as string,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
    }
  };

  const handleStartLipSync = async () => {
    if (!lipSyncAudio || !videoUrl) return;

    try {
        setIsConverting(true);
        setError(null);
        setStatusMessage('Starting Lip Sync...');
        
        const token = await getToken();
        if (!token) {
            throw new Error("Authentication failed");
        }

        const response = await fetch('/api/video-generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                image: videoUrl, // Use video URL for lipsync
                audioFile: lipSyncAudio.base64,
                model: 'pixverse/lipsync',
                description: 'Lip Sync' // Placeholder
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to start lip sync');
        }

        const data = await response.json();

        // Reuse pollStatus logic but modified for this context?
        // Actually we can just call pollStatus with the new ID
        // But we need to make sure pollStatus handles the success correctly
        
        // Define a polling function for this specific task or reuse the main one
        // The main pollStatus updates videoUrl and generatedVideos, which is what we want.
        // It also clears isConverting.
        
        const pollLipSync = async (currentId: string) => {
            try {
                const statusRes = await fetch(`/api/video-generate?id=${currentId}`);
                const statusData = await statusRes.json();

                if (statusData.status === 'succeeded') {
                    setVideoUrl(statusData.output);
                    setIsConverting(false);
                    setStatusMessage('Processing Video');
                    setShowLipSync(false); // Close the lip sync UI
                    
                    const newVideo = {
                        id: currentId,
                        url: statusData.output,
                        timestamp: Date.now()
                    };
                    
                    setGeneratedVideos(prev => {
                        const updated = [newVideo, ...prev];
                        if (userId) {
                            localStorage.setItem(`generatedVideos_${userId}`, JSON.stringify(updated));
                        }
                        return updated;
                    });
                } else if (statusData.status === 'failed') {
                    setError(statusData.error || 'Lip sync failed');
                    setIsConverting(false);
                } else {
                    setTimeout(() => pollLipSync(currentId), 3000);
                }
            } catch (e) {
                console.error("Poll error:", e);
                setTimeout(() => pollLipSync(currentId), 5000);
            }
        };

        pollLipSync(data.id);

    } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred during lip sync');
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
          setIsDownloading(video.id);
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
              console.error("Download failed", e);
              // Fallback to direct opening using anchor tag
              const a = document.createElement('a');
              a.href = video.url;
              a.download = `generated-${video.id}.mp4`;
              a.target = '_blank';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
          } finally {
            setIsDownloading(null);
          }
        }}
        disabled={isDownloading === video.id}
        className="mt-2 w-full bg-zinc-900 border border-zinc-700 hover:border-white text-white text-[10px] py-1.5 rounded-lg transition-all uppercase tracking-wider font-bold flex items-center justify-center gap-2"
      >
        {isDownloading === video.id ? (
          <>
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="w-3 h-3" />
            Download
          </>
        )}
      </button>

      <button
        onClick={() => {
            setVideoUrl(null);
        }}
          className="mt-2 w-full bg-zinc-900 border border-zinc-700 hover:border-white text-white text-[10px] py-1.5 rounded-lg transition-all uppercase tracking-wider font-bold flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-3 h-3" />
          Try Again
        </button>
    </div>
  ));

  const supportsTwoImages = (selectedModel.includes('seedance') && !selectedModel.includes('fast')) || selectedModel.includes('kling');

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
                      <span className="w-2 h-2 rounded-full bg-yellow-100 animate-pulse shadow-[0_0_8px_rgba(254,240,138,0.8)]" />
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
                      {videoUrl ? 'Generated Video' : 'Upload Image'}
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
                        {selectedModel.includes('kling') && !selectedModel.includes('motion-control') && (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                                {!lipSyncAudio ? (
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="audio/mp3,audio/wav"
                                            onChange={handleLipSyncUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <button className="w-full flex items-center justify-center gap-2 bg-yellow-500/5 hover:bg-yellow-500/10 border border-dashed border-yellow-500/30 hover:border-yellow-500/50 text-yellow-500 hover:text-yellow-400 py-4 rounded-xl transition-all">
                                            <Upload className="w-4 h-4" />
                                            <span className="text-xs font-medium">Upload Audio (MP3/WAV)</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 px-3 py-4 rounded-xl">
                                            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
                                                <Mic className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-yellow-400 truncate">{lipSyncAudio.name}</p>
                                            </div>
                                            <button 
                                                onClick={() => setLipSyncAudio(null)}
                                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[10px] text-yellow-500/50 uppercase tracking-wider font-bold">Model: PixVerse LipSync</span>
                                        </div>
                                        <Button 
                                            onClick={handleStartLipSync}
                                            isLoading={isConverting}
                                            disabled={isConverting}
                                            className="w-full bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-bold py-4 rounded-xl transition-all shadow-none"
                                        >
                                            {isConverting ? 'Processing...' : 'Start (2 Credits)'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
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
                                    <span className="text-zinc-400 text-xs font-mono tracking-widest uppercase">{statusMessage}</span>
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

                                <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                                    <div className="flex items-center gap-4">
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
                                    <p className="text-[10px] text-red-500 font-bold animate-pulse flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                                        Note: May take up to 8-9 mins due to high server load
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${supportsTwoImages ? 'grid-cols-2 relative' : 'grid-cols-1'}`}>
                        {supportsTwoImages && (
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border border-white/10 shadow-xl">
                                <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                             </div>
                        )}
                        <div className="space-y-2">
                            {supportsTwoImages && (
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    Start Frame (Image 1)
                                </label>
                            )}
                            <ImageUploader 
                                description=""
                                currentImage={images[0]?.base64}
                                onImageSelected={(data) => updateImage(0, data)}
                                className={`aspect-video w-full bg-zinc-950/50 ${supportsTwoImages ? 'border-green-500/20' : ''}`}
                                objectFit="contain"
                            />
                        </div>

                        {supportsTwoImages && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    Last Frame (Target)
                                </label>
                                <ImageUploader 
                                    description="Optional target frame"
                                    currentImage={images[1]?.base64}
                                    onImageSelected={(data) => updateImage(1, data)}
                                    className="aspect-video w-full bg-zinc-950/50 border-blue-500/20"
                                    objectFit="contain"
                                />
                            </div>
                        )}
                    </div>
                  )}



              </div>

              <div className="space-y-2">
                  <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-1">Video Description</label>
                      <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-white font-bold uppercase tracking-wider">Ai Model</span>
                          <div className="flex items-center gap-2">
                              {supportsTwoImages && (
                                <span className="text-[9px] text-white font-bold uppercase tracking-wider animate-in fade-in slide-in-from-right-4">Supports 2 Images</span>
                              )}
                              {selectedModel === 'minimax/hailuo-2.3' && (
                                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                              )}
                              <select 
                                  value={selectedModel}
                                  onChange={(e) => {
                                    setSelectedModel(e.target.value);
                                    if (e.target.value === 'minimax/hailuo-2.3') {
                                        setDuration(10);
                                    }
                                  }}
                                  className={`bg-black border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all duration-300 ${
                                      selectedModel 
                                          ? 'text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)] ring-1 ring-green-500/20' 
                                          : 'text-zinc-400 border-zinc-800 focus:ring-1 focus:ring-white/20'
                                  }`}
                              >
                                  <option value="bytedance/seedance-1.5-pro">Seedance 1.5 Pro</option>
                                  <option value="bytedance/seedance-1-pro-fast" className="text-green-500 font-bold">Seedance 1 Pro Fast</option>
                                  <option value="minimax/hailuo-2.3" className="text-blue-500 font-bold">Minimax Hailuo 2.3</option>
                                  <option value="kwaivgi/kling-v2.5-turbo-pro" className="text-orange-500 font-bold">Kling 2.5 Turbo Pro</option>
                              </select>
                          </div>
                          {(selectedModel === 'kwaivgi/kling-v2.5-turbo-pro' || selectedModel === 'kwaivgi/kling-v2.6-motion-control') && (
                          <button
                            onClick={() => setSelectedModel('kwaivgi/kling-v2.6-motion-control')}
                            className={`mt-2 w-full bg-black border rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                              selectedModel === 'kwaivgi/kling-v2.6-motion-control'
                                ? 'text-yellow-400 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)] ring-1 ring-yellow-500/20'
                                : 'text-yellow-500/70 border-yellow-500/30 hover:text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/5'
                            }`}
                          >
                            Motion Control
                          </button>
                          )}
                      </div>
                  </div>
              </div>

                  {selectedModel === 'kwaivgi/kling-v2.6-motion-control' ? (
                    <div className="space-y-6 mt-4 animate-in fade-in slide-in-from-top-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Video Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                    Add video of character actions
                                </label>
                                <div className="relative group aspect-square bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-600 transition-all overflow-hidden">
                                    {videoInput ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 mb-2">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-xs text-zinc-400 text-center truncate w-full px-2">{videoInput.name}</p>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setVideoInput(null);
                                                }}
                                                className="mt-2 text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                accept="video/mp4,video/mov,video/quicktime"
                                                onChange={handleVideoUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 group-hover:text-zinc-400">
                                                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-center px-4">Upload Video</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer group mt-2">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${characterOrientation === 'video' ? 'border-yellow-500 bg-yellow-500' : 'border-zinc-700 bg-transparent'}`}>
                                        {characterOrientation === 'video' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                    </div>
                                    <input 
                                        type="radio" 
                                        name="orientation" 
                                        value="video"
                                        checked={characterOrientation === 'video'} 
                                        onChange={() => setCharacterOrientation('video')}
                                        className="hidden"
                                    />
                                    <span className={`text-[10px] font-bold transition-colors ${characterOrientation === 'video' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                                        Character Orientation Matches Video
                                    </span>
                                </label>
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1">
                                    Add character image
                                </label>
                                <div className="aspect-square bg-zinc-950/50 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-600 transition-all overflow-hidden relative">
                                    <ImageUploader 
                                        description=""
                                        currentImage={images[0]?.base64}
                                        onImageSelected={(data) => updateImage(0, data)}
                                        className="w-full h-full"
                                        objectFit="cover"
                                    />
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer group mt-2">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${characterOrientation === 'image' ? 'border-yellow-500 bg-yellow-500' : 'border-zinc-700 bg-transparent'}`}>
                                        {characterOrientation === 'image' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                    </div>
                                    <input 
                                        type="radio" 
                                        name="orientation" 
                                        value="image"
                                        checked={characterOrientation === 'image'} 
                                        onChange={() => setCharacterOrientation('image')}
                                        className="hidden"
                                    />
                                    <span className={`text-[10px] font-bold transition-colors ${characterOrientation === 'image' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                                        Character Orientation Matches Image
                                    </span>
                                </label>
                            </div>
                        </div>

                        <Button 
                            onClick={handleConvert}
                            disabled={!images[0] || !videoInput || isConverting}
                            isLoading={isConverting}
                            className={`w-full font-bold py-4 rounded-xl transition-all duration-300 ${
                                isConverting 
                                ? 'bg-zinc-900 border border-yellow-500/50 text-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.2)]' 
                                : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-lg shadow-yellow-500/20'
                            }`}
                        >
                            {isConverting ? 'Generating Video...' : 'Generate Video (3 Credits)'}
                        </Button>
                    </div>
                  ) : (
                    <>
                    <div className="space-y-2">
                  {(selectedModel === 'bytedance/seedance-1.5-pro' || selectedModel === 'bytedance/seedance-1-pro-fast' || selectedModel === 'kwaivgi/kling-v2.5-turbo-pro') && (
                      <div className="flex justify-end gap-3 mt-1 mb-2">
                          <label className="flex items-center gap-1.5 cursor-pointer group">
                              <input 
                                  type="radio" 
                                  name="duration" 
                                  value={10} 
                                  checked={duration === 10} 
                                  onChange={() => setDuration(10)}
                                  className="accent-green-500 w-3 h-3"
                              />
                              <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                                  <span className="text-green-500 font-bold">10</span> seconds (<span className="text-green-500 font-bold">4</span> points deduction)
                              </span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer group">
                              <input 
                                  type="radio" 
                                  name="duration" 
                                  value={5} 
                                  checked={duration === 5} 
                                  onChange={() => setDuration(5)}
                                  className="accent-green-500 w-3 h-3"
                              />
                              <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                                  <span className="text-green-500 font-bold">5</span> seconds (<span className="text-green-500 font-bold">2</span> points deduction)
                              </span>
                          </label>
                      </div>
                  )}



                  <textarea  
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the motion and scene (e.g. 'A futuristic city with flying cars')..."
                      className="w-full h-24 bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                  />
              </div>

              <div className="grid grid-cols-1 gap-4">
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
                          className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all duration-300"
                      >
                          {CAMERA_EFFECTS.map(effect => (
                              <option key={effect} value={effect} className="text-green-500 bg-zinc-900">{effect}</option>
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
                  {isConverting ? 'Generating Video...' : `Generate Video (${duration === 5 ? 2 : 4} Credits)`}
              </Button>
              </>
            )}

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
