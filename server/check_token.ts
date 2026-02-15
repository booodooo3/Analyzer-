
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const token = process.env.HUGGING_FACE_TOKEN;

async function checkToken() {
    console.log(`🔑 Checking token: ${token?.substring(0, 10)}...`);
    try {
        const response = await fetch("https://huggingface.co/api/whoami-v2", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Token is VALID!");
            console.log("👤 User:", data.name);
            console.log("📧 Email:", data.email);
            console.log("💎 Plan:", data.plan);
        } else {
            console.error("❌ Token INVALID:", response.status, response.statusText);
            const text = await response.text();
            console.error(text);
        }
    } catch (error: any) {
        console.error("❌ Network error:", error.message);
    }
}

checkToken();
