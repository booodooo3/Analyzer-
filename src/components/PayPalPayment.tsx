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

    return <div ref={containerRef} id="paypal-container-SBPEKLY44BE8J" className="w-full min-h-[200px]" />;
};

export default function PayPalPayment() {
    
    // Hosted Buttons Configuration
    const initialOptions = {
        clientId: "AQNoA7KjWTwuNVuhy9nKnBzc9jHp6mFif6vFOgLkm7N2M5aHHXHTicVNr09mg_9hJemDso1H2UXwDeDA",
        components: "hosted-buttons",
        disableFunding: "venmo",
        currency: "USD",
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full">
                <h2 className="text-xl font-bold mb-6 text-center text-white">Buy 10 Credits ($5)</h2>
                <div style={{ width: "300px", margin: "20px auto" }} className="max-w-full">
                    <HostedButton />
                </div>
            </div>
        </PayPalScriptProvider>
    );
}
