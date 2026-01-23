import React, { useState } from 'react';
import { useUser } from "@clerk/clerk-react";
import PayPalPayment from './PayPalPayment';

export default function CreditDisplay({ isPlusMode, onTogglePlus }: { isPlusMode?: boolean, onTogglePlus?: () => void }) { 
  const { user, isLoaded } = useUser(); 
  const [showPayment, setShowPayment] = useState(false);

  if (!isLoaded || !user) return null; 

  const credits = (user.publicMetadata.credits as number) ?? 3; 

  return ( 
    <>
      <div className="flex items-center gap-3">
        {/* Plus Toggle Button */}
        {onTogglePlus && (
          <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 max-w-[80px] leading-tight text-right hidden sm:block">
                  Click for 3 different images & 3 credits off
              </span>
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
            onClick={() => setShowPayment(true)}
            title="شراء نقاط"
          >
            +
          </button>
        </div> 
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setShowPayment(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <PayPalPayment />
          </div>
        </div>
      )}
    </>
  ); 
} 
