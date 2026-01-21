
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClerkExpressWithAuth, createClerkClient } from '@clerk/clerk-sdk-node';
import { Client } from "@gradio/client";
import Replicate from "replicate";

dotenv.config({ path: '../.env.local' });

const app = express();
const port = 3001;

// Increase limit for large images
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Check keys
if (!process.env.CLERK_SECRET_KEY) {
  console.error("❌ ERROR: CLERK_SECRET_KEY is missing! Check .env.local");
}

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("❌ ERROR: REPLICATE_API_TOKEN is missing! Check .env.local");
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function queryReplicate(personImageBase64: string, garmentImageBase64: string, category: string, garmentDescription: string = "A cool outfit"): Promise<string> {
    console.log("🚀 Connecting to Replicate (IDM-VTON)...");
    
    // Ensure we have a token
    if (!process.env.REPLICATE_API_TOKEN) {
        throw new Error("REPLICATE_API_TOKEN is missing from .env.local");
    }

    // Run the model
    // Using: google/nano-banana-pro
    console.log("🍌 Using Model: google/nano-banana-pro");
    let output;
    try {
        output = await replicate.run(
            "google/nano-banana-pro",
            {
              input: {
                prompt: `A photo of a person wearing ${garmentDescription}. The person is wearing the garment shown in the second image. High quality, realistic.`,
                image_input: [personImageBase64, garmentImageBase64],
                aspect_ratio: "match_input_image",
                output_format: "png",
                safety_filter_level: "block_only_high"
              }
            }
        );
        console.log("✅ Raw Replicate Output:", output);
    } catch (err) {
        console.error("❌ Replicate Run Error:", err);
        throw err;
    }

    console.log("✅ Replicate Output Type:", typeof output);
    
    // Replicate returns the URL directly (usually string or string[])
    if (typeof output === 'string') return output;
    if (Array.isArray(output) && output.length > 0) return output[0];
    
    // Handle FileOutput object (has url() method) - common for google/nano-banana
    if (output && typeof (output as any).url === 'function') {
        console.log("✅ Output is a FileOutput, calling .url()");
        return (output as any).url().toString();
    }

    // Handle if it is an object with url property
    if (output && (output as any).url) {
        return (output as any).url.toString();
    }
    
    console.error("❌ Unexpected Replicate Output:", output);
    throw new Error("Replicate did not return a valid image URL.");
}


async function queryOOTDiffusion(personImageBase64: string, garmentImageBase64: string, category: string): Promise<string> {
    console.log(`🚀 Connecting to Hugging Face (OOTDiffusion) for ${category}...`);
    
    const token = process.env.HUGGING_FACE_TOKEN;
    const options = token ? { hf_token: token as `hf_${string}` } : undefined;
    
    const client = await Client.connect("levihsu/OOTDiffusion", options as any);
    
    // Map 'type' to OOTDiffusion categories: 'Upper-body', 'Lower-body', 'Dress'
    // Note: These values are case-sensitive and must match the API exactly.
    let modelCategory = 'Upper-body';
    if (category === 'bottom') modelCategory = 'Lower-body';
    if (category === 'full' || category === 'dresses') modelCategory = 'Dress';

    // OOTDiffusion expects specific parameters including category
    const result = await client.predict("/process_dc", { 
		vton_img: await (await fetch(personImageBase64)).blob(), 
		garm_img: await (await fetch(garmentImageBase64)).blob(), 
		category: modelCategory,
		n_samples: 1, 
		n_steps: 20, 
		image_scale: 2, 
		seed: -1, 
    });

    const generatedImage = (result as any).data[0];
    
    if (!generatedImage || !generatedImage.url) {
        throw new Error("OOTDiffusion did not return a valid image URL.");
    }
    
    return generatedImage.url;
}

app.post('/api/generate', ClerkExpressWithAuth(), async (req: any, res: any) => {
    try {
        // 1. Auth Check
        const { userId } = req.auth;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        console.log(`👤 User ${userId} is generating content`);

        // 2. Credit Check
        const user = await clerkClient.users.getUser(userId);
        let currentCredits = user.publicMetadata.credits as number;
        if (currentCredits === undefined) currentCredits = 3;

        console.log(`💰 User credits: ${currentCredits}`);

        if (currentCredits <= 0) {
            return res.status(403).json({
                error: "Insufficient credits! 🚫",
                needPayment: true
            });
        }

        const { personImage, clothImage, type, garmentDescription } = req.body;

        if (!personImage || !clothImage) {
            return res.status(400).json({ error: "Both person and cloth images are required." });
        }

        // Default type if not provided
        const garmentType = type || 'upper_body'; 
        const desc = garmentDescription || "A cool outfit";

        let finalImageUrl: string | null = null;
        let usedModel = "Google Gemini Studio";
        let errorReason = "";

        // 1. Start Prediction
        console.log("🚀 Starting Replicate prediction (google/nano-banana-pro)...");
        
        // Use hardcoded version ID to save time (avoid fetching model info)
        const versionId = "f5318740f60d79bf0c480216aaf9ca7614977553170eacd19ff8cbcda2409ac8";

        // Prepare Base64 for Replicate
        const personBase64 = personImage.startsWith('http') ? 
            await (await fetch(personImage)).arrayBuffer().then(b => Buffer.from(b).toString('base64')) : 
            personImage;
         
        const clothBase64 = clothImage.startsWith('http') ? 
            await (await fetch(clothImage)).arrayBuffer().then(b => Buffer.from(b).toString('base64')) : 
            clothImage;
         
        const personDataURI = personBase64.startsWith('data:') ? personBase64 : `data:image/png;base64,${personBase64}`;
        const clothDataURI = clothBase64.startsWith('data:') ? clothBase64 : `data:image/png;base64,${clothBase64}`;

        const prediction = await replicate.predictions.create({
            version: versionId,
            input: {
                prompt: `A photo of a person wearing ${desc}. The person is wearing the garment shown in the second image. High quality, realistic.`,
                image_input: [personDataURI, clothDataURI],
                aspect_ratio: "match_input_image",
                output_format: "png",
                safety_filter_level: "block_only_high"
            }
        });

        console.log("✅ Prediction created:", prediction.id);

        // Deduct credit immediately (or wait? Netlify function deducts immediately)
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                credits: currentCredits - 1
            }
        });

        res.status(202).json({
            id: prediction.id,
            status: prediction.status
        });

    } catch (error: any) {
        console.error("🔥 Server Error:", error.message);
        res.status(503).json({ error: error.message || "Service busy. Please try again later." });
    }
});

app.get('/api/generate', async (req: any, res: any) => {
    const predictionId = req.query.id;
    if (!predictionId) {
        return res.status(400).json({ error: "Missing id parameter" });
    }

    try {
        const prediction = await replicate.predictions.get(predictionId);
        
        if (prediction.status === "succeeded") {
            let finalImageUrl = prediction.output;
             // Handle different output formats
            if (typeof prediction.output !== 'string') {
                if (Array.isArray(prediction.output) && prediction.output.length > 0) {
                    finalImageUrl = prediction.output[0];
                } else if (prediction.output?.url) {
                    finalImageUrl = prediction.output.url.toString();
                }
            }
            
            res.json({
                status: "succeeded",
                output: {
                    front: finalImageUrl,
                    side: finalImageUrl, 
                    full: finalImageUrl,
                    analysis: "Generated successfully",
                    remaining: 99
                }
            });
        } else if (prediction.status === "failed" || prediction.status === "canceled") {
            res.json({ status: "failed", error: prediction.error });
        } else {
            res.json({ status: prediction.status });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ Server running with HIGH QUALITY Engines on port ${port}`);
});
