
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '../.env.local' });

const token = process.env.HUGGING_FACE_TOKEN;

async function testOOTDRest() {
    console.log("🚀 Testing OOTDiffusion via REST API...");
    
    // Use dummy images
    const personUrl = "https://img.freepik.com/free-photo/handsome-man-smiling-happy-face-portrait-close-up_53876-146189.jpg";
    const garmentUrl = "https://img.freepik.com/free-photo/black-t-shirt-front-view_1101-38.jpg";

    const personBuffer = await (await fetch(personUrl)).arrayBuffer();
    const garmentBuffer = await (await fetch(garmentUrl)).arrayBuffer();
    
    const personBase64 = Buffer.from(personBuffer).toString('base64');
    const garmentBase64 = Buffer.from(garmentBuffer).toString('base64');

    // Prepare payload matching OOTDiffusion expectations
    // Note: This payload structure depends on the specific Gradio version/API
    // Usually it expects "data": [param1, param2, ...]
    const payload = {
        data: [
            { path: personUrl, url: personUrl, orig_name: "person.jpg", size: personBuffer.byteLength, mime_type: "image/jpeg" }, // vton_img
            { path: garmentUrl, url: garmentUrl, orig_name: "garment.jpg", size: garmentBuffer.byteLength, mime_type: "image/jpeg" }, // garm_img
            "Upper-body", // category
            1, // n_samples
            20, // n_steps
            2.0, // image_scale
            -1 // seed
        ]
    };

    try {
        console.log("📤 Sending request to https://levihsu-ootdiffusion.hf.space/api/predict");
        const response = await fetch("https://levihsu-ootdiffusion.hf.space/api/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("✅ Response Status:", response.status);
        console.log("📄 Response Data:", JSON.stringify(data).substring(0, 200));
        
        if (data.error) {
             console.error("❌ API Error:", data.error);
        }

    } catch (error: any) {
        console.error("❌ Request failed:", error.message);
    }
}

testOOTDRest();
