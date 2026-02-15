
import Replicate from "replicate";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testNano() {
    console.log("🚀 Testing google/nano-banana...");
    
    // Dummy images (small, public URLs)
    const personImage = "https://replicate.delivery/pbxt/IJZFVy7mrz6v6q7R8q7R8q7R8q7R8q7R8q7R8q7R8q7/person.jpg"; // Placeholder
    // Actually, let's use real dummy URLs that work.
    const pUrl = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png";
    const cUrl = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png";

    try {
        const output = await replicate.run(
            "google/nano-banana",
            {
              input: {
                prompt: "A photo of a person wearing a red shirt",
                image_input: [pUrl, cUrl],
                aspect_ratio: "match_input_image",
                output_format: "png",
                safety_filter_level: "block_only_high"
              }
            }
        );

        console.log("✅ Output received type:", typeof output);
        console.log("✅ Output received:", JSON.stringify(output, null, 2));

        if (Array.isArray(output)) {
            console.log("It is an array. First element:", output[0]);
        }
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

testNano();
