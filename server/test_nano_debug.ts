
import Replicate from "replicate";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function testNano() {
    console.log("🚀 Testing google/nano-banana...");
    
    // Using two dummy images (bus and person)
    const img1 = "https://replicate.delivery/pbxt/IJZFVy7mrz6v6q7R8q7R8q7R8q7R8q7R8q7R8q7R8q7/person.jpg"; 
    // Just use a reliable public image
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
                safety_filter_level: "block_only_high"
              }
            }
        );

        console.log("✅ Output received!");
        console.log("Type:", typeof output);
        console.log("Value:", output);
        console.log("JSON:", JSON.stringify(output, null, 2));

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

testNano();
