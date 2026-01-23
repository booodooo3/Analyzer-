import React, { useEffect, useRef } from "react";
import { PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";

const HostedButton = () => {
    const [{ isResolved }] = usePayPalScriptReducer();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isResolved && containerRef.current && window.paypal && window.paypal.HostedButtons) {
            containerRef.current.innerHTML = ""; // Clear previous content
            window.paypal.HostedButtons({
                hostedButtonId: "SBPEKLY44BE8J",
            }).render(containerRef.current);
        }
    }, [isResolved]);

    return <div ref={containerRef} id="paypal-container-SBPEKLY44BE8J" className="w-full flex flex-col items-center justify-center min-h-[200px]" />;
};

export default function PayPalPayment() {
    
    // Hosted Buttons Configuration
    const initialOptions = {
        clientId: "BAA-2DKrXqYDZpVUgC3XUJbfQF39Q7GIOhwuL3MSIOjhghOV4BwpN0hKNVMQu6S7hiW7i_MZVe-cZ1yTiM",
        components: "hosted-buttons",
        disableFunding: "venmo",
        currency: "USD",
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full">
                <h2 className="text-xl font-bold mb-6 text-center text-white">Buy 10 Credits ($5)</h2>
                <HostedButton />
            </div>
        </PayPalScriptProvider>
    );
}
