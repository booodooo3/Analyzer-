
import { Client } from "@gradio/client";

async function testPrediction() {
    console.log("🚀 Testing OOTDiffusion Prediction...");
    
    // Public images for testing
    const personImage = "https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png"; // Just a dummy, might fail model logic but tests connection
    // Better images
    const modelUrl = "https://levihsu-ootdiffusion.hf.space/file=/tmp/gradio/aa9673ab8fa122b9c5cdccf326e5f6fc244bc89b/model_8.png";
    const garmentUrl = "https://levihsu-ootdiffusion.hf.space/file=/tmp/gradio/17c62353c027a67af6f4c6e8dccce54fba3e1e43/048554_1.jpg";

    try {
        const client = await Client.connect("levihsu/OOTDiffusion");
        
        console.log("Connected. Sending prediction request...");
        const result = await client.predict("/process_dc", { 
            vton_img: await (await fetch(modelUrl)).blob(), 
            garm_img: await (await fetch(garmentUrl)).blob(), 
            category: "Upper-body", 
            n_samples: 1, 
            n_steps: 20, 
            image_scale: 2, 
            seed: -1, 
        });

        console.log("✅ Prediction Success!");
        console.log(JSON.stringify(result, null, 2));

    } catch (e: any) {
        console.log("❌ Prediction Failed:", e.message);
    }
}

testPrediction();
