import React from 'react';
import { useUser } from "@clerk/clerk-react";

export default function CreditDisplay() { 
  const { user, isLoaded } = useUser(); 

  if (!isLoaded || !user) return null; 

  const credits = (user.publicMetadata.credits as number) ?? 3; 

  return ( 
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100">
      <span className="text-sm font-medium"> 
        💰 {credits}
      </span> 
      {credits === 0 && ( 
        <button 
          className="bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700 text-xs transition-colors"
          onClick={() => alert("سيتم نقلك لصفحة الدفع قريباً!")}
        > 
          +
        </button> 
      )} 
    </div> 
  ); 
} 
