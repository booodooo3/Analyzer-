
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API KEY found");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    try {
        // We can't list models directly via the SDK easily in all versions, 
        // but let's try a direct fetch if SDK doesn't expose it conveniently,
        // or just try to use a known working model like 'gemini-pro' to verify connectivity first.
        
        // Actually, the error message suggests calling ListModels.
        // Let's try to hit the API endpoint directly to list models.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("Response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
