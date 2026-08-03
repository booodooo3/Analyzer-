
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
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
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

  // --- DELETE Request: Cancel Generation ---
  if (req.method === "DELETE" && predictionId) {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
      }
      const token = authHeader.split(" ")[1];
      const verified = await clerkClient.verifyToken(token);
      const userId = verified.sub;

      const prediction = await replicate.predictions.cancel(predictionId);
      
      // Refund credits if canceled successfully
      if (prediction && (prediction.status === "canceled" || prediction.status === "failed")) {
        const user = await clerkClient.users.getUser(userId);
        const currentCredits = typeof user.publicMetadata.credits === 'number' ? user.publicMetadata.credits : 3;
        
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                credits: currentCredits + 0.5
            }
        });
        console.log(`✅ TextToImage: Refunded 0.5. New balance: ${currentCredits + 0.5}`);
      }

      return new Response(JSON.stringify({ status: "canceled" }), { headers });
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
    const { images, prompt, model = "bytedance/seedream-4.5", size = "4K", outputFormat = "jpeg" } = body; // changed from image to images

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
    // Accept aspectRatio from frontend, fallback to match_input_image
    let aspect = body.aspectRatio || "match_input_image";
    if (aspect === "Match Input Image") aspect = "match_input_image";
    const input = {
      prompt: prompt || "A creative image",
      size: size,
      aspect_ratio: aspect,
      output_format: outputFormat,
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
    console.log(`🚀 Starting TextToImage generation with prompt: ${input.prompt}, model: ${model}`);

    const prediction = await replicate.predictions.create({
      model: model,
      input: input
    });

    return new Response(JSON.stringify({ id: prediction.id, status: prediction.status }), { headers });

  } catch (error) {
    console.error("Handler Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500, headers });
  }
};
