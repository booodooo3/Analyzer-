
import Replicate from "replicate";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Helper: Sleep function
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async (req, context) => {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  // Handle CORS
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // --- GET Request: Check Prediction Status ---
  const url = new URL(req.url);
  const predictionId = url.searchParams.get("id");

  if (req.method === "GET" && predictionId) {
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
        
        return new Response(JSON.stringify({
            status: "succeeded",
            output: finalImageUrl
        }), { headers });
      } else if (prediction.status === "failed" || prediction.status === "canceled") {
         return new Response(JSON.stringify({ status: "failed", error: prediction.error }), { headers });
      } else {
         return new Response(JSON.stringify({ status: prediction.status }), { headers });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }
  }

  // --- POST Request: Start Generation ---
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { image, style, color, keepStyle, model, customPrompt } = body;
    const selectedModel = model || "google/nano-banana";

    // 1. Verify Auth & Credits
    let userId;
    let currentCredits;
    
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new Error("Missing Authorization header");
        }
        const token = authHeader.split(" ")[1];
        const verified = await clerkClient.verifyToken(token);
        userId = verified.sub;
        
        const user = await clerkClient.users.getUser(userId);
        currentCredits = typeof user.publicMetadata.credits === 'number' ? user.publicMetadata.credits : 3;
        const hairUsageCount = typeof user.publicMetadata.hair_usage_count === 'number' ? user.publicMetadata.hair_usage_count : 0;
        
        // Cost Logic: 0.5 credits per generation
        const newCount = hairUsageCount + 1;
        const cost = 0.5;

        if (currentCredits < cost) {
            return new Response(JSON.stringify({ error: `Insufficient credits! You need ${cost} credit for this generation.` }), { status: 403, headers });
        }
        
        // Deduct Credits & Update Count
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                credits: currentCredits - cost,
                hair_usage_count: newCount
            }
        });
        console.log(`✅ Hair Styler: Count ${newCount}, Deducted ${cost}. New balance: ${currentCredits - cost}`);

    } catch (e) {
        console.error("Auth/Credit Check Failed:", e);
        return new Response(JSON.stringify({ error: "Unauthorized: Please login first." }), { status: 401, headers });
    }

    if (!image) {
      return new Response(JSON.stringify({ error: "Image is required." }), { status: 400, headers });
    }

    // 2. Construct Prompt
    let promptText = "High quality, photorealistic portrait. ";
    
    if (keepStyle && color) {
        promptText += `Keep the person's current hairstyle but change the hair color to ${color}. `;
    } else if (style) {
        promptText += `Change the person's hairstyle to a ${style}. `;
        if (color) {
            promptText += `The hair color should be ${color}. `;
        }
    } else if (color) {
        promptText += `Change the hair color to ${color}. `;
    } else {
        promptText += "Enhance the hair. ";
    }

    if (customPrompt) {
        promptText += ` ${customPrompt} `;
    }

    promptText += "Maintain the original face, facial features, and identity with 100% accuracy. Only modify the hair. The lighting and skin tone should remain consistent. 2k resolution, highly detailed, sharp focus.";

    // 3. Call Replicate (Google Gemini 2.5 Flash Image)
    // Model: google/gemini-2.5-flash-image
    console.log(`🚀 Starting Hair Styler generation with prompt: ${promptText} | Model: ${selectedModel}`);

    let inputParams = {
        prompt: promptText,
        output_format: "jpg",
        output_quality: 100,
        megapixels: "2", // For 2K resolution if supported
        aspect_ratio: "match_input_image"
    };

    if (selectedModel.includes('nano-banana') || selectedModel.includes('gemini-2.5')) {
        inputParams.image_input = [image]; // Both models expect array 'image_input'
    } else {
        // Fallback for older models (e.g. Gemini 1.5 if used)
        inputParams.image = image;
    }

    const prediction = await replicate.predictions.create({
      model: selectedModel,
      input: inputParams
    });

    return new Response(JSON.stringify({ 
        id: prediction.id, 
        status: "starting" 
    }), { status: 202, headers });

  } catch (error) {
    console.error("❌ Error starting prediction:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
