
import Replicate from "replicate";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const createTextToImageHandler = (billingFeature) => async (req, context) => {
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
      const user = await clerkClient.users.getUser(userId);
      const predictionCosts = user.privateMetadata?.textToImagePredictionCosts;
      const refundCost = predictionCosts?.[predictionId];
      if (typeof refundCost !== "number" || !Number.isFinite(refundCost)) {
        return new Response(JSON.stringify({ error: "Prediction not found for this user." }), { status: 404, headers });
      }

      const prediction = await replicate.predictions.cancel(predictionId);
      const currentCredits = typeof user.publicMetadata.credits === "number" ? user.publicMetadata.credits : 3;
      const shouldRefund = prediction && (prediction.status === "canceled" || prediction.status === "failed");
      const remainingCosts = { ...predictionCosts };
      delete remainingCosts[predictionId];

      await clerkClient.users.updateUserMetadata(userId, {
        ...(shouldRefund ? { publicMetadata: { credits: currentCredits + refundCost } } : {}),
        privateMetadata: { textToImagePredictionCosts: remainingCosts },
      });

      if (shouldRefund) {
        console.log(`✅ TextToImage: Refunded ${refundCost}. New balance: ${currentCredits + refundCost}`);
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
    const {
      images,
      prompt,
      model = "bytedance/seedream-4.5",
      size = "4K",
      outputFormat = "jpeg",
    } = body;

    if (billingFeature === "smart-style-changer" && size !== "2K" && size !== "4K") {
      return new Response(JSON.stringify({ error: "Unsupported Smart Style Changer resolution." }), { status: 400, headers });
    }

    // 1. Verify Auth & Credits
    let userId;
    let currentCredits;
    const cost = billingFeature === "smart-style-changer" && size === "4K" ? 1 : 0.5;
    
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

    // 2. Prepare input for the selected Replicate model
    // Accept aspectRatio from frontend, fallback to match_input_image
    let aspect = body.aspectRatio || "match_input_image";
    if (aspect === "Match Input Image") aspect = "match_input_image";
    const input = model === "google/nano-banana-2.1"
      ? {
          prompt: prompt || "A creative image",
          resolution: size,
          aspect_ratio: aspect,
          output_format: outputFormat === "jpeg" ? "jpg" : outputFormat,
          google_search: false,
          image_search: false,
        }
      : {
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

    const user = await clerkClient.users.getUser(userId);
    const predictionCosts = user.privateMetadata?.textToImagePredictionCosts;
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        textToImagePredictionCosts: {
          ...(predictionCosts && typeof predictionCosts === "object" ? predictionCosts : {}),
          [prediction.id]: cost,
        },
      },
    });

    return new Response(JSON.stringify({ id: prediction.id, status: prediction.status }), { headers });

  } catch (error) {
    console.error("Handler Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500, headers });
  }
};

export default createTextToImageHandler();
