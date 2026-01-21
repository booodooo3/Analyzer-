import React from 'react';
import { useUser } from "@clerk/clerk-react";

export default function CreditDisplay() { 
  const { user, isLoaded } = useUser(); 

  if (!isLoaded || !user) return null; 

  const credits = (user.publicMetadata.credits as number) ?? 3; 
  const checkoutUrl = import.meta.env.VITE_FASTSPRING_CHECKOUT_URL as string | undefined;

  return ( 
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100">
      <span className="text-sm font-medium flex items-center gap-2"> 
        <span className="w-5 h-5 rounded-full border border-zinc-500 bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-500 text-[11px] font-bold text-zinc-800 flex items-center justify-center leading-none">
          $
        </span>
        {credits}
      </span> 
      {checkoutUrl ? (
        <a
          className="bg-white text-black px-2 py-0.5 rounded hover:bg-zinc-200 text-xs transition-colors"
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="شراء 10 نقاط"
        >
          شراء 10 نقاط
        </a>
      ) : null}
    </div> 
  ); 
} 
