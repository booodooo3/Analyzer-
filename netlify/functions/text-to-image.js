
import Replicate from "replicate";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async (req, context) => {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

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
        // Handle different output formats (array or object)
        if (Array.isArray(prediction.output) && prediction.output.length > 0) {
             finalImageUrl = prediction.output[0];
        } else if (prediction.output?.url) {
             finalImageUrl = prediction.output.url.toString();
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
    const { images, prompt } = body; // changed from image to images

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
        
        // Cost Logic: 0.5 credits per generation
        const cost = 0.5;

        if (currentCredits < cost) {
            return new Response(JSON.stringify({ error: `Insufficient credits! You need ${cost} credit for this generation.` }), { status: 403, headers });
        }
        
        // Deduct Credits
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                credits: currentCredits - cost
            }
        });
        console.log(`✅ TextToImage: Deducted ${cost}. New balance: ${currentCredits - cost}`);

    } catch (e) {
        console.error("Auth/Credit Check Failed:", e);
        return new Response(JSON.stringify({ error: "Unauthorized: Please login first." }), { status: 401, headers });
    }

    // 2. Prepare Input for bytedance/seedream-4.5
    const input = {
        prompt: prompt || "A creative image",
        size: "4K",
        aspect_ratio: "match_input_image",
        disable_safety_checker: true,
    };

    if (images && images.length > 0) {
        input.image_input = images; // Pass array of images directly
    } else {
        // Fallback if no image provided
        input.aspect_ratio = "1:1"; 
        delete input.image_input;
    }

    // 3. Call Replicate
    console.log(`🚀 Starting TextToImage generation with prompt: ${input.prompt}`);

    const prediction = await replicate.predictions.create({
      model: "bytedance/seedream-4.5",
      input: input
    });

    return new Response(JSON.stringify({ id: prediction.id, status: prediction.status }), { headers });

  } catch (error) {
    console.error("Handler Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500, headers });
  }
};
