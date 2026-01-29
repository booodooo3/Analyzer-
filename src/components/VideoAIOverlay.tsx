import React, { useState, useEffect } from 'react';
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
  const [images, setImages] = useState<(ImageData | null)[]>([null, null, null, null]);
  const [description, setDescription] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [cameraEffect, setCameraEffect] = useState('Static');
  const [aiFilter, setAiFilter] = useState('No Filter');
  const [helpCategory, setHelpCategory] = useState<'camera' | 'style' | null>(null);

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
          model: 'bytedance/seedance-1.5-pro',
          duration: 8 // Request 8 seconds video
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
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transition-all duration-300 ${
                        activeImageCount >= 2 
                        ? 'bg-yellow-500/10 border-yellow-400 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                    }`} title={activeImageCount >= 2 ? "Composition/Dubbing Mode Active" : "Upload 2+ images for Composition Mode"}>
                        D
                    </div>
                  </div>
                  
                  {videoUrl ? (
                    <video 
                      src={videoUrl} 
                      controls 
                      className="w-full rounded-xl aspect-video bg-black"
                      autoPlay
                      loop
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {[0, 1, 2, 3].map((index) => (
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
                          className="text-[10px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                          title="Press (H) for help"
                        >
                          <span className="font-bold text-blue-400">(H)</span>
                          <span>for help</span>
                        </button>
                      </div>
                      <select 
                          value={cameraEffect}
                          onChange={(e) => setCameraEffect(e.target.value)}
                          className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                          {CAMERA_EFFECTS.map(effect => (
                              <option key={effect} value={effect}>{effect}</option>
                          ))}
                      </select>
                  </div>

                  <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">AI Style Filter</label>
                        <button 
                          onClick={() => setHelpCategory('style')}
                          className="text-[10px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                          title="Click for help"
                        >
                          <span className="font-bold text-blue-400">(H)</span>
                          <span>for help</span>
                        </button>
                      </div>
                      <select 
                          value={aiFilter}
                          onChange={(e) => setAiFilter(e.target.value)}
                          className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                          {AI_FILTERS.map(filter => (
                              <option key={filter} value={filter}>{filter}</option>
                          ))}
                      </select>
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
