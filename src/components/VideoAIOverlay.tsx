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
  const [selectedModel, setSelectedModel] = useState('bytedance/seedance-2.0');
  const [aspectRatio, setAspectRatio] = useState('Match Input Image');
  // دقة الفيديو
  const [resolution, setResolution] = useState('720p');
  const [seed, setSeed] = useState(99);
  const [processingTime, setProcessingTime] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<{ id: string, url: string, timestamp: number }[]>([]);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<{ base64: string, name: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState('Processing Video');
  const [showLipSync, setShowLipSync] = useState(false);
  const [lipSyncAudio, setLipSyncAudio] = useState<{ base64: string, name: string } | null>(null);
  const [videoInput, setVideoInput] = useState<{ base64: string, name: string } | null>(null);
  const [referenceImages, setReferenceImages] = useState<{ base64: string, name: string } | null>(null);
  const [referenceAudios, setReferenceAudios] = useState<{ base64: string, name: string } | null>(null);
  const [characterOrientation, setCharacterOrientation] = useState<'video' | 'image'>('video');
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<'imageToVideo' | 'textToVideo'>('imageToVideo');

  const { userId } = useAuth();

  const pollStatus = async (currentId: string) => {
    try {
      const statusRes = await fetch(`/api/video-generate?id=${currentId}`);
      const statusData = await statusRes.json();

      if (statusData.status === 'succeeded') {
        setVideoUrl(statusData.output);
        setIsConverting(false);
        setPendingVideoId(null);
        setStatusMessage('Processing Video');
        if (userId) {
            localStorage.removeItem(`pendingVideo_${userId}`);
        }
        
        // Add to generated videos list
        const newVideo = {
          id: currentId,
          url: statusData.output,
          timestamp: Date.now()
        };
        
        setGeneratedVideos(prev => {
          // Check if already exists to prevent duplicates
          if (prev.some(v => v.id === currentId)) return prev;
          const updated = [newVideo, ...prev];
          if (userId) {
            localStorage.setItem(`generatedVideos_${userId}`, JSON.stringify(updated));
          }
          return updated;
        });
      } else if (statusData.status === 'failed') {
        setError(statusData.error || 'Video generation failed');
        setIsConverting(false);
        setPendingVideoId(null);
        if (userId) {
            localStorage.removeItem(`pendingVideo_${userId}`);
        }
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

  useEffect(() => {
    if (!userId) {
        setGeneratedVideos([]);
        setPendingVideoId(null);
        return;
    }
    const storageKey = `generatedVideos_${userId}`;
    const pendingKey = `pendingVideo_${userId}`;

    // Load pending video
    try {
      const savedPending = localStorage.getItem(pendingKey);
      if (savedPending) {
        const { id, timestamp, imageBase64, modelName } = JSON.parse(savedPending);
        // If less than 15 minutes old, resume polling
        if (Date.now() - timestamp < 15 * 60 * 1000) {
          setPendingVideoId(id);
          setIsConverting(true);
          if (imageBase64) {
             setImages([{ base64: imageBase64, url: '', mimeType: 'image/jpeg' }, null]);
          }
          if (modelName) {
             setSelectedModel(modelName);
          }
          // Calculate elapsed time
          setProcessingTime(Math.floor((Date.now() - timestamp) / 1000));
          pollStatus(id);
        } else {
          localStorage.removeItem(pendingKey);
        }
      }
    } catch (e) {
      console.error("Failed to parse pending video", e);
    }

    // Load generated videos from local storage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          // Filter out videos older than 5 minutes
          const valid = parsed.filter((v: any) => now - v.timestamp < 300000);
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
        const valid = prev.filter(v => now - v.timestamp < 300000);
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

  const wasOpen = useRef(isOpen);
  useEffect(() => {
    if (wasOpen.current && !isOpen) {
      if (!pendingVideoId && !videoUrl && !isConverting) {
        setImages([null, null]);
        setDescription('');
        setVideoUrl(null);
        setError(null);
        setIsConverting(false);
        setDuration(8);
        setSelectedModel('bytedance/seedance-2.0');
        setSeed(99);
        setGenerationMode('imageToVideo');
        setStatusMessage('Processing Video');
        setShowLipSync(false);
        setLipSyncAudio(null);
      }
    }
    wasOpen.current = isOpen;
  }, [isOpen, pendingVideoId, videoUrl, isConverting]);

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

  const handleReferenceImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Reference image is too large. Max 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImages({
          base64: reader.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReferenceAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Reference audio is too large. Max 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceAudios({
          base64: reader.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  const handleConvert = async () => {
    // If we're in imageToVideo mode, we MUST have at least one image
    if (generationMode === 'imageToVideo') {
      const primaryImage = images.find(img => img !== null);
      if (!primaryImage) return;
    }
    
    // If textToVideo mode, we MUST have a description
    if (generationMode === 'textToVideo' && !description.trim()) {
        setError('Please enter a description for the video');
        return;
    }
    
    setIsConverting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Please sign in to continue');
      }

      // 1. Resize Image
      const processImage = async (input: string | undefined | null) => {
        if (!input) return null;
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

      const primaryImage = images.find(img => img !== null);
      const processedImage = generationMode === 'imageToVideo' && primaryImage ? await processImage(primaryImage.base64) : null;
      const processedImage2 = generationMode === 'imageToVideo' && images[1] ? await processImage(images[1].base64) : null;

      // 2. Call API to deduct credits and start generation
      const response = await fetch('/api/video-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: processedImage,
          image2: processedImage2,
          description,
          cameraEffect,
          aiFilter,
          duration: duration,
          aspectRatio,
          resolution,
          seed,
          model: selectedModel,
          audioFile: audioFile?.base64,
          videoInput: videoInput?.base64,
          characterOrientation,
          reference_images: referenceImages?.base64,
          reference_audios: referenceAudios?.base64
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start video generation');
      }

      const data = await response.json();
      
      if (userId) {
            localStorage.setItem(`pendingVideo_${userId}`, JSON.stringify({
                id: data.id,
                timestamp: Date.now(),
                imageBase64: videoUrl,
                modelName: 'pixverse/lipsync'
            }));
        }
        setPendingVideoId(data.id);

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

        if (userId) {
            localStorage.setItem(`pendingVideo_${userId}`, JSON.stringify({
                id: data.id,
                timestamp: Date.now(),
                imageBase64: processedImage,
                modelName: selectedModel
            }));
        }
        setPendingVideoId(data.id);

        pollStatus(data.id);

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
                    {Math.max(0, Math.ceil((300000 - (Date.now() - video.timestamp)) / 60000))}m left
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
                      {videoUrl ? 'Generated Video' : (generationMode === 'textToVideo' ? 'Text to Video' : 'Upload Image')}
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
                    <div className="space-y-4">
                      {/* Generation Mode Toggle (Only for Seedance 2.0) */}
                      {selectedModel === 'bytedance/seedance-2.0' && (
                        <div className="flex bg-black rounded-xl p-1 border border-zinc-800">
                          <button
                            onClick={() => setGenerationMode('imageToVideo')}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                              generationMode === 'imageToVideo'
                                ? 'bg-zinc-900 text-white shadow-md'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Image to Video
                          </button>
                          <button
                            onClick={() => {
                              setGenerationMode('textToVideo');
                              // Reset aspect ratio to a default for text-to-video if it was "Match Input Image"
                              if (aspectRatio === 'Match Input Image') {
                                setAspectRatio('16:9');
                              }
                            }}
                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border border-transparent ${
                              generationMode === 'textToVideo'
                                ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
                            }`}
                          >
                            Text to Video
                          </button>
                        </div>
                      )}

                      {generationMode === 'imageToVideo' ? (
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
                      ) : (
                        <div className="w-full aspect-video bg-zinc-950/50 border border-red-500/20 rounded-xl flex flex-col items-center justify-center p-8 text-center space-y-4 relative overflow-hidden group">
                           {/* Background Pattern */}
                           <div className="absolute inset-0" 
                               style={{ 
                                   backgroundImage: 'radial-gradient(circle, rgba(239,68,68,0.05) 1px, transparent 1px)', 
                                   backgroundSize: '20px 20px',
                               }} 
                           />
                           
                           <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 group-hover:bg-red-500/20 transition-all duration-500 z-10">
                               <Languages className="w-8 h-8 text-red-500" />
                           </div>
                           
                           <div className="z-10 space-y-2">
                               <h3 className="text-lg font-bold text-red-400">Text to Video Mode</h3>
                               <p className="text-xs text-zinc-400 max-w-sm">
                                   Describe what you want to see in the "Video Description" box below. The AI will generate a video entirely from your text prompt.
                               </p>
                           </div>
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
                                    if (e.target.value !== 'bytedance/seedance-2.0') {
                                        setGenerationMode('imageToVideo');
                                    }
                                  }}
                                  className={`bg-black border rounded-lg px-3 py-2 text-xs focus:outline-none transition-all duration-300 ${
                                      selectedModel 
                                          ? 'text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)] ring-1 ring-green-500/20' 
                                          : 'text-zinc-400 border-zinc-800 focus:ring-1 focus:ring-white/20'
                                  }`}
                              >
                                  <option value="bytedance/seedance-2.0" className="text-purple-500 font-bold">Seedance 2.0</option>
                                  <option value="bytedance/seedance-1.5-pro">Seedance 1.5 Pro</option>
                                  <option value="minimax/hailuo-2.3" className="text-blue-500 font-bold">Minimax Hailuo 2.3</option>
                              </select>
                          </div>

                      </div>
                  </div>
              </div>

                    <div className="space-y-2">
                  {(selectedModel === 'bytedance/seedance-2.0' || selectedModel === 'bytedance/seedance-1.5-pro') && generationMode === 'imageToVideo' && (
                      <div className="flex justify-end gap-3 mt-1 mb-2">
                          {selectedModel === 'bytedance/seedance-2.0' ? (
                              <>
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
                                          <span className="text-green-500 font-bold">5</span> seconds (<span className="text-green-500 font-bold">3</span> points deduction)
                                      </span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer group">
                                      <input 
                                          type="radio" 
                                          name="duration" 
                                          value={8} 
                                          checked={duration === 8} 
                                          onChange={() => setDuration(8)}
                                          className="accent-green-500 w-3 h-3"
                                      />
                                      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                                          <span className="text-green-500 font-bold">8</span> seconds (<span className="text-green-500 font-bold">5</span> points deduction)
                                      </span>
                                  </label>
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
                                          <span className="text-green-500 font-bold">10</span> seconds (<span className="text-green-500 font-bold">7</span> points deduction)
                                      </span>
                                  </label>
                              </>
                          ) : (
                              <>
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
                              </>
                          )}
                      </div>
                  )}



                  <textarea  
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the motion and scene (e.g. 'A futuristic city with flying cars')..."
                      className="w-full h-24 bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                  />
              </div>

              {/* خيارات الدقة ونسبة العرض إلى الارتفاع */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Resolution</label>
                    <select
                      value={resolution}
                      onChange={e => setResolution(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-2 text-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all duration-300"
                    >
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                      <option value="480p">480p</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Aspect Ratio</label>
                    <select
                      value={aspectRatio}
                      onChange={e => setAspectRatio(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl p-2 text-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all duration-300"
                    >
                      <option value="9:16">9:16</option>
                      <option value="16:9">16:9</option>
                      <option value="1:1">1:1</option>
                      <option value="4:5">4:5</option>
                      {generationMode !== 'textToVideo' && (
                        <option value="Match Input Image">Match Input Image</option>
                      )}
                    </select>
                  </div>
                </div>
                {selectedModel === 'bytedance/seedance-2.0' && (
                  <>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Seed (Integer)</label>
                        <input
                          type="number"
                          value={seed}
                          onChange={e => setSeed(parseInt(e.target.value) || 0)}
                          className="w-full bg-black border border-zinc-800 rounded-xl p-2 text-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 focus:shadow-[0_0_15px_rgba(34,197,94,0.15)] transition-all duration-300"
                          placeholder="e.g. 99"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Reference Image (Optional)</label>
                        <div className="relative group mt-1">
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleReferenceImageUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-green-500/50 text-zinc-400 hover:text-green-400 py-2.5 rounded-xl transition-all">
                                <Upload className="w-4 h-4" />
                                <span className="text-xs font-medium">{referenceImages ? referenceImages.name : 'Upload Reference Image'}</span>
                            </button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Reference Audio (Optional)</label>
                        <div className="relative group mt-1">
                            <input
                                type="file"
                                accept="audio/mp3,audio/wav"
                                onChange={handleReferenceAudioUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <button className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-blue-500/50 text-zinc-400 hover:text-blue-400 py-2.5 rounded-xl transition-all">
                                <Upload className="w-4 h-4" />
                                <span className="text-xs font-medium">{referenceAudios ? referenceAudios.name : 'Upload Reference Audio'}</span>
                            </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
                  disabled={(generationMode === 'imageToVideo' && activeImageCount === 0) || isConverting || (generationMode === 'textToVideo' && !description.trim())}
                  isLoading={isConverting}
                  className={`w-full font-bold py-4 rounded-xl transition-all duration-300 ${
                    isConverting 
                      ? 'bg-zinc-900 border border-green-500/50 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.2)]' 
                      : generationMode === 'textToVideo'
                        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20 border border-red-500/50'
                        : 'bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 text-white shadow-lg shadow-white/5'
                  }`}
              >
                  {isConverting
                    ? 'Generating Video...'
                    : generationMode === 'textToVideo'
                      ? 'Generate Video from Text (4 Credits)'
                      : selectedModel === 'bytedance/seedance-2.0'
                        ? `Generate Video (${duration === 5 ? 5 : 7} Credits)`
                        : `Generate Video (${duration === 5 ? 2 : 4} Credits)`}
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
