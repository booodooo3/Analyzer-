import React from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth, useUser } from "@clerk/clerk-react";

export default function PayPalPayment() {
    const { getToken } = useAuth();
    const { user } = useUser();

    const initialOptions = {
        clientId: "AQNoA7KjWTwuNVuhy9nKnBzc9jHp6mFif6vFOgLkm7N2M5aHHXHTicVNr09mg_9hJemDso1H2UXwDeDA",
        currency: "USD",
        intent: "capture",
        disableFunding: "applepay,venmo",
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full">
                <h2 className="text-xl font-bold mb-6 text-center text-white">Buy 10 Credits ($15)</h2>
                <PayPalButtons
                    style={{ layout: "vertical" }}
                    createOrder={(_, actions) => {
                        return actions.order.create({
                            purchase_units: [
                                {
                                    description: "10 Credits",
                                    amount: {
                                        value: "15.00",
                                        currency_code: "USD",
                                    },
                                },
                            ],
                        });
                    }}
                    onApprove={async (_, actions) => {
                        const order = await actions.order!.capture();
                        const orderID = order?.id;
                        const amount = order?.purchase_units?.[0]?.amount?.value;

                        if (!orderID || !amount) {
                            throw new Error("Invalid PayPal order response");
                        }

                        const token = await getToken();
                        if (!token) {
                            throw new Error("Unauthorized");
                        }

                        const response = await fetch("/api/add-points", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                orderID,
                                amount
                            })
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            // Try to parse JSON error if possible
                            try {
                                const errorJson = JSON.parse(errorText);
                                throw new Error(errorJson.error || errorText);
                            } catch (e) {
                                throw new Error(errorText || "Failed to update points");
                            }
                        }

                        await user?.reload();
                        alert("تم الدفع بنجاح! تم إضافة النقاط لحسابك.");
                    }}
                    onError={(err: any) => {
                        console.error("PayPal Error:", err);
                        alert(`حدث خطأ أثناء عملية الدفع: ${err.message || err}`);
                    }}
                />
            </div>
        </PayPalScriptProvider>
    );
}
