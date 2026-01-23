import React, { useEffect } from 'react';
import { useUser } from "@clerk/clerk-react";

export default function CreditDisplay({ isPlusMode, onTogglePlus }: { isPlusMode?: boolean, onTogglePlus?: () => void }) { 
  const { user, isLoaded } = useUser(); 

  if (!isLoaded || !user) return null; 

  const credits = (user.publicMetadata.credits as number) ?? 3; 
  const checkoutUrl = import.meta.env.VITE_FASTSPRING_CHECKOUT_URL as string | undefined;
  const handleCheckoutClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!checkoutUrl) {
      event.preventDefault();
    }
  };

  const paypalContainerId = "paypal-container-VH2RX7QQAK2AG";

  useEffect(() => {
    const renderButtons = () => {
      const paypal = (window as any).paypal;
      const container = document.getElementById(paypalContainerId);
      if (!paypal?.HostedButtons || !container) return;
      container.innerHTML = "";
      paypal.HostedButtons({
        hostedButtonId: "VH2RX7QQAK2AG",
      }).render(`#${paypalContainerId}`);
    };

    const existingScript = document.getElementById("paypal-sdk");
    if (existingScript) {
      renderButtons();
      return;
    }

    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = "https://www.paypal.com/sdk/js?client-id=BAA-2DKrXqYDZpVUgC3XUJbfQF39Q7GIOhwuL3MSIOjhghOV4BwpN0hKNVMQu6S7hiW7i_MZVe-cZ1yTiM&components=hosted-buttons&disable-funding=venmo&currency=USD";
    script.async = true;
    script.onload = renderButtons;
    document.head.appendChild(script);
  }, []);

  return ( 
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
        <a
          className="w-6 h-6 rounded-full bg-white text-black text-sm font-bold flex items-center justify-center hover:bg-zinc-200 transition-colors"
          href={checkoutUrl ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          title="شراء 10 نقاط"
          onClick={handleCheckoutClick}
        >
          +
        </a>
      </div> 
      <div id={paypalContainerId} className="min-w-[160px]" />
    </div>
  ); 
} 
