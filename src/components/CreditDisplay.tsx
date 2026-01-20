import React, { useEffect, useState } from 'react';
import { useUser } from "@clerk/clerk-react";
import { initializePaddle, Paddle } from '@paddle/paddle-js';

export default function CreditDisplay() { 
  const { user, isLoaded } = useUser(); 
  const [paddle, setPaddle] = useState<Paddle>();

  useEffect(() => {
    initializePaddle({ environment: 'production', token: 'live_72d8492263759d9f7ac0cce6413' }).then(
      (paddleInstance) => {
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      }
    );
  }, []);

  const handleBuyCredits = () => {
      if (!paddle || !user) return;
      
      paddle.Checkout.open({
          items: [{ priceId: 'pri_01kfb29tmedn0d9wx5ywd3r3ym' }], // User provided Price ID
          customData: {
              userId: user.id
          }
      });
  };

  if (!isLoaded || !user) return null; 

  const credits = (user.publicMetadata.credits as number) ?? 3; 

  return ( 
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-100">
      <span className="text-sm font-medium flex items-center gap-2"> 
        <span className="w-5 h-5 rounded-full border border-zinc-500 bg-gradient-to-b from-zinc-200 via-zinc-300 to-zinc-500 text-[11px] font-bold text-zinc-800 flex items-center justify-center leading-none">
          $
        </span>
        {credits}
      </span> 
      <button 
        className="bg-white text-black px-2 py-0.5 rounded hover:bg-zinc-200 text-xs transition-colors"
          onClick={handleBuyCredits}
          title="Add Credits"
        > 
        +
      </button> 
    </div> 
  ); 
} 
