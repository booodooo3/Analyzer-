
import Replicate from "replicate";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env.local') });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testGemini25() {
    console.log("🚀 Testing google/gemini-2.5-flash-image...");
    const pUrl = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png";

    try {
        console.log("Attempt: Sending request with 'image' param...");
        const output = await replicate.run(
            "google/gemini-2.5-flash-image",
            {
              input: {
                prompt: "Describe this image",
                image: pUrl, 
                output_format: "jpg"
              }
            }
        );
        console.log("✅ Success with 'image'!");
        console.log(output);
    } catch (error) {
        console.error("❌ Failed with 'image':", error.message);
        
        // Try 'image_input' as fallback
        try {
            console.log("Attempt: Sending request with 'image_input' param...");
            const output = await replicate.run(
                "google/gemini-2.5-flash-image",
                {
                input: {
                    prompt: "Describe this image",
                    image_input: pUrl, // Try string first
                    output_format: "jpg"
                }
                }
            );
            console.log("✅ Success with 'image_input' (string)!");
            console.log(output);
        } catch (e2) {
             console.error("❌ Failed with 'image_input' (string):", e2.message);
        }
    }
}

testGemini25();
