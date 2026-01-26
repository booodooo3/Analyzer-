import React from 'react';
import { useUser } from "@clerk/clerk-react";

export default function CreditDisplay({ 
  isPlusMode, 
  onTogglePlus, 
  isBronzeMode, 
  onToggleBronze, 
  onCheckout 
}: { 
  isPlusMode?: boolean, 
  onTogglePlus?: () => void, 
  isBronzeMode?: boolean, 
  onToggleBronze?: () => void, 
  onCheckout?: () => void 
}) { 
  const { user, isLoaded } = useUser(); 
  
  if (!isLoaded || !user) return null; 
  
  const credits = (user.publicMetadata.credits as number) ?? 3; 
  
  return ( 
    <div className="flex items-center gap-3">
        {onTogglePlus && (
          <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 max-w-[80px] leading-tight text-right hidden sm:block">
                  Click for 3 different images & 3 credits off
              </span>
              
              {/* Plus Button */}
              <button
              onClick={onTogglePlus}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                  isPlusMode 
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-600 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
              title={isPlusMode ? "Plus Mode Active: Gemini 2.5 (Nano Banana) - 3 Images / 3 Credits" : "Switch to Plus Mode"}
              >
              <span className={`text-xs font-bold uppercase tracking-wider ${isPlusMode ? 'text-white' : ''}`}>
                  PLUS
              </span>
              <div className={`w-2 h-2 rounded-full ${isPlusMode ? 'bg-white animate-pulse' : 'bg-zinc-600'}`} />
              </button>

              {/* Bronze Button (Google Imagen 4) */}
              {onToggleBronze && (
                <button
                  onClick={onToggleBronze}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                    isBronzeMode
                      ? 'bg-gradient-to-br from-[#cd7f32] to-[#8b4513] border-[#cd7f32] text-white shadow-[0_0_15px_rgba(205,127,50,0.6)]'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-[#cd7f32] hover:text-[#cd7f32]'
                  }`}
                  title={isBronzeMode ? "Bronze Mode Active: Google Imagen 4" : "Switch to Bronze Mode (Imagen 4)"}
                >
                   <div className={`w-3 h-3 rounded-full ${isBronzeMode ? 'bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-zinc-600'}`} />
                </button>
              )}
          </div>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100">
          <span className="text-sm font-medium flex items-center gap-2"> 
            <span className="w-5 h-5 rounded-full border border-zinc-500 bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-500 text-[11px] font-bold text-zinc-800 flex items-center justify-center leading-none">
              $
            </span>
            {credits}
          </span> 
          <button
            className="w-6 h-6 rounded-full bg-white text-black text-sm font-bold flex items-center justify-center hover:bg-zinc-200 transition-colors"
            onClick={onCheckout}
            title="شراء نقاط"
          >
            +
          </button>
        </div> 
      </div>
  ); 
} 
