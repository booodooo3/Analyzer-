import React from "react";
import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { useAuth, useUser } from "@clerk/clerk-react";

export default function PayPalPayment() {
    const { getToken } = useAuth();
    const { user } = useUser();

    const initialOptions = {
        clientId: "AQNoA7KjWTwuNVuhy9nKnBzc9jHp6mFif6vFOgLkm7N2M5aHHXHTicVNr09mg_9hJemDso1H2UXwDeDA",
        currency: "USD",
        intent: "capture",
        enableFunding: "applepay,googlepay",
    };

    const createOrder = (_: unknown, actions: any) => {
        return actions.order.create({
            purchase_units: [
                {
                    description: "10 Points Package",
                    amount: { value: "5.00" },
                },
            ],
        });
    };

    const handleApprove = async (_: unknown, actions: any) => {
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

        const response = await fetch("/api/user/add-points", {
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
            throw new Error(errorText || "Failed to update points");
        }

        await user?.reload();
        alert("تم الدفع بنجاح! تم إضافة النقاط لحسابك.");
    };

    const handleError = (err: any) => {
        console.error("PayPal Error:", err);
        alert("حدث خطأ أثناء عملية الدفع.");
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full">
                <h2 className="text-xl font-bold mb-6 text-center text-white">Buy 10 Credits ($5)</h2>
                <PayPalButtons
                    style={{ layout: "vertical" }}
                    createOrder={createOrder}
                    onApprove={handleApprove}
                    onError={handleError}
                />
                <div className="mt-4">
                    <PayPalButtons
                        fundingSource={FUNDING.GOOGLEPAY}
                        style={{ label: "pay", height: 45 }}
                        createOrder={createOrder}
                        onApprove={handleApprove}
                        onError={handleError}
                    />
                </div>
                <div className="mt-4">
                    <PayPalButtons
                        fundingSource={FUNDING.APPLEPAY}
                        style={{ label: "pay", height: 45 }}
                        createOrder={createOrder}
                        onApprove={handleApprove}
                        onError={handleError}
                    />
                </div>
            </div>
        </PayPalScriptProvider>
    );
}
