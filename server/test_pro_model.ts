
import Replicate from "replicate";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testProModel() {
    console.log("🚀 Testing google/nano-banana...");
    
    // Using reliable public images
    const pUrl = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"; 
    const cUrl = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png";

    try {
        console.log("Sending request...");
        const output = await replicate.run(
            "google/nano-banana",
            {
              input: {
                prompt: "A photo of a person wearing a red shirt",
                image_input: [pUrl, cUrl],
                aspect_ratio: "match_input_image",
                output_format: "png",
                safety_filter_level: "block_only_high",
                num_inference_steps: 25
              }
            }
        );

        console.log("✅ Output received!");
        console.log("Type:", typeof output);
        console.log("Value:", output);
        
        if (typeof output === 'object') {
             console.log("Keys:", Object.keys(output as object));
             // Check for FileOutput url method
             if (typeof (output as any).url === 'function') {
                 console.log("Has .url() method ->", (output as any).url());
             }
        }

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

testProModel();
