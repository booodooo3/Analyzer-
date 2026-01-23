import React from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function PayPalPayment() {
    
    const initialOptions = {
        clientId: "AQNoA7KjWTwuNVuhy9nKnBzc9jHp6mFif6vFOgLkm7N2M5aHHXHTicVNr09mg_9hJemDso1H2UXwDeDA",
        currency: "USD",
        intent: "capture",
        disableFunding: "applepay,venmo",
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full">
                <h2 className="text-xl font-bold mb-6 text-center text-white">Buy 10 Credits ($5)</h2>
                <PayPalButtons
                    style={{ layout: "vertical" }}
                    createOrder={(_, actions) => {
                        return actions.order.create({
                            purchase_units: [
                                {
                                    description: "10 Points Package",
                                    amount: { value: "5.00" },
                                },
                            ],
                        });
                    }}
                    onApprove={async (_, actions) => {
                        const order = await actions.order!.capture();
                        console.log("Payment Successful:", order);
                        alert("تم الدفع بنجاح! سيتم إضافة النقاط لحسابك.");
                    }}
                    onError={(err) => {
                        console.error("PayPal Error:", err);
                        alert("حدث خطأ أثناء عملية الدفع.");
                    }}
                />
            </div>
        </PayPalScriptProvider>
    );
}
