import React from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function PayPalPayment() {
    
    // إعدادات الكونفيج مع الكلاينت آيدي الخاص بك
    const initialOptions = {
        clientId: "BAA-2DKrXqYDZpVUgC3XUJbfQF39Q7GIOhwuL3MSIOjhghOV4BwpN0hKNVMQu6S7hiW7i_MZVe-cZ1yTiM",
        currency: "USD",
        intent: "capture",
    };

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div style={{ maxWidth: "750px", minHeight: "200px" }} className="w-full">
                
                <h2 className="text-xl font-bold mb-4 text-center text-white">شراء 10 نقاط (5$)</h2>
                
                <PayPalButtons
                    style={{ layout: "vertical" }}
                    
                    // 1. إنشاء الطلب عند الضغط
                    createOrder={(data, actions) => {
                        return actions.order.create({
                            purchase_units: [
                                {
                                    description: "10 Points Package",
                                    amount: {
                                        value: "5.00", // السعر هنا
                                    },
                                },
                            ],
                        });
                    }}

                    // 2. ماذا يحدث عند نجاح الدفع
                    onApprove={async (data, actions) => {
                        const order = await actions.order!.capture();
                        console.log("Payment Successful:", order);
                        
                        // هنا تضع كود إضافة النقاط للمستخدم
                        alert("تم الدفع بنجاح! سيتم إضافة النقاط لحسابك.");
                    }}

                    // 3. التعامل مع الأخطاء
                    onError={(err) => {
                        console.error("PayPal Error:", err);
                        alert("حدث خطأ أثناء عملية الدفع.");
                    }}
                />
            </div>
        </PayPalScriptProvider>
    );
}
