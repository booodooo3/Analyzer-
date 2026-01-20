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
      <span className="text-sm font-medium"> 
        💰 {credits}
      </span> 
      <button 
        className="bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700 text-xs transition-colors"
          onClick={handleBuyCredits}
          title="Add Credits"
        > 
        +
      </button> 
    </div> 
  ); 
} 
