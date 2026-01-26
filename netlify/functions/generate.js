import Replicate from "replicate";
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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
      // Handle Multiple IDs (Plus Mode)
      if (predictionId.includes('|')) {
          const ids = predictionId.split('|');
          const predictions = await Promise.all(ids.map(id => replicate.predictions.get(id)));
          
          // Check statuses
          const allSucceeded = predictions.every(p => p.status === "succeeded");
          const anyFailed = predictions.find(p => p.status === "failed" || p.status === "canceled");
          
          if (allSucceeded) {
              const getUrl = (p) => {
                  if (typeof p.output === 'string') return p.output;
                  if (Array.isArray(p.output) && p.output.length > 0) return p.output[0];
                  if (p.output?.url) return p.output.url.toString();
                  return "";
              };

              return new Response(JSON.stringify({
                  status: "succeeded",
                  output: {
                      front: getUrl(predictions[0]),
                      side: getUrl(predictions[1]),
                      full: getUrl(predictions[2]),
                      analysis: "Generated successfully (Plus Mode)",
                      remaining: 99
                  }
              }), { headers });
          } else if (anyFailed) {
              return new Response(JSON.stringify({ status: "failed", error: anyFailed.error || "One of the generations failed" }), { headers });
          } else {
              return new Response(JSON.stringify({ status: "processing" }), { headers });
          }
      }

      // Standard Single ID Logic
      const prediction = await replicate.predictions.get(predictionId);
      
      // Check if finished
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
            output: {
                front: finalImageUrl,
                side: finalImageUrl, 
                full: finalImageUrl,
                analysis: "Generated successfully",
                remaining: 99
            }
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

  // --- POST Request: Start Prediction ---
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { personImage, clothImage, garmentDescription, isPlusMode, isBronzeMode, type } = body;

    // Robust parsing of isPlusMode
    let isPlusModeBool = false;
    if (typeof isPlusMode === 'boolean') {
        isPlusModeBool = isPlusMode;
    } else if (typeof isPlusMode === 'string') {
        isPlusModeBool = (isPlusMode === 'true');
    }

    let isBronzeModeBool = false;
    if (typeof isBronzeMode === 'boolean') {
        isBronzeModeBool = isBronzeMode;
    } else if (typeof isBronzeMode === 'string') {
        isBronzeModeBool = (isBronzeMode === 'true');
    }

    const effectivePlusMode = isPlusModeBool && !isBronzeModeBool;

    console.log("📥 Received Request Body Keys:", Object.keys(body));
    console.log("👉 isPlusMode raw:", isPlusMode, "Parsed:", isPlusModeBool);
    console.log("👉 isBronzeMode raw:", isBronzeMode, "Parsed:", isBronzeModeBool);

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
        userId = verified.sub; // 'sub' is the user ID
        
        const user = await clerkClient.users.getUser(userId);
        currentCredits = typeof user.publicMetadata.credits === 'number' ? user.publicMetadata.credits : 3;
        
        console.log(`👤 User ${userId} requests generation. Credits: ${currentCredits}`);
        
        // Cost Calculation
        const cost = effectivePlusMode ? 3 : 1;

        if (currentCredits < cost) {
            return new Response(JSON.stringify({ error: `Insufficient credits! You need ${cost} credits.` }), { status: 403, headers });
        }
        
    } catch (e) {
        console.error("Auth/Credit Check Failed:", e);
        return new Response(JSON.stringify({ error: "Unauthorized: Please login first." }), { status: 401, headers });
    }

    if (!personImage || !clothImage) {
      return new Response(JSON.stringify({ error: "Both person and cloth images are required." }), { status: 400, headers });
    }

    const ensureDataURI = (base64Str) => {
      if (typeof base64Str !== 'string') return base64Str;
      if (base64Str.startsWith('http')) return base64Str;
      if (base64Str.startsWith('data:')) return base64Str;
      return `data:image/png;base64,${base64Str}`;
    };

    const personDataURI = ensureDataURI(personImage);
    const clothDataURI = ensureDataURI(clothImage);
    const garmentType = type || 'upper_body';
    const typeHints = {
      long_dress: 'long dress (full length)',
      short_dress: 'short dress (above the knees)',
      long_skirt: 'long skirt (ankle length)',
      short_skirt: 'short skirt (above the knees)',
      shirt: 'top',
      pants: 'pants',
      jacket: 'jacket or coat',
      other: ''
    };
    const baseDesc = garmentDescription || "A cool outfit";
    const typeHint = typeHints[garmentType] || '';
    const desc = typeHint ? `${baseDesc}. The garment is a ${typeHint}` : baseDesc;

    // Deduct Credit
    const cost = effectivePlusMode ? 3 : 1;
    await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
            credits: currentCredits - cost
        }
    });
    console.log(`✅ Deducted ${cost} credit(s). New balance: ${currentCredits - cost}`);

    // Select Model
    const modelOwner = "google";
    let modelName = "nano-banana-pro";
    if (isBronzeModeBool) {
        modelName = "imagen-4";
    } else if (effectivePlusMode) {
        modelName = "nano-banana";
    }
    
    console.log(`🚀 Starting Replicate prediction (${modelOwner}/${modelName})... [Plus Mode: ${effectivePlusMode}] [Bronze Mode: ${isBronzeModeBool}]`);

    // Fetch latest version ID dynamically
    const modelData = await replicate.models.get(modelOwner, modelName);
    const versionId = modelData.latest_version.id;

    const inputPayload = {
          prompt: `A photo of a person wearing ${desc}. The person is wearing the garment shown in the second image. High quality, realistic. MANDATORY: Preserve the person's identity, facial features, and hairstyle from the first image EXACTLY. Do not alter the face, skin tone, or hair. Only modify the clothing area.`,
          image_input: [personDataURI, clothDataURI],
          aspect_ratio: isBronzeModeBool ? "3:4" : "match_input_image",
          output_format: "png",
          safety_filter_level: "block_only_high"
    };

    // If Plus Mode, we generate 3 distinct views
    if (effectivePlusMode) {
         console.log("🚀 Starting Plus Mode Prediction (3 views)...");
         
         const prompts = [
            { type: 'front', text: `Front view of a person wearing ${desc}. The person is wearing the garment shown in the second image. High quality, realistic. MANDATORY: Preserve the person's identity, facial features, and hairstyle from the first image EXACTLY. Do not alter the face, skin tone, or hair. Only modify the clothing area.` },
            { type: 'side', text: `Side profile view of a person wearing ${desc}. The person is wearing the garment shown in the second image. High quality, realistic. MANDATORY: Preserve the person's identity, facial features, and hairstyle from the first image EXACTLY. Do not alter the face, skin tone, or hair. Only modify the clothing area.` },
           { type: 'full', text: `Full body, head-to-toe shot of a person wearing ${desc}. The full body must be visible from head to feet, including legs and shoes, not cropped. The person is wearing the garment shown in the second image. High quality, realistic. MANDATORY: Preserve the person's identity, facial features, and hairstyle from the first image EXACTLY. Do not alter the face, skin tone, or hair. Only modify the clothing area.` }
         ];

         // Create 3 predictions in parallel
         const predictions = await Promise.all(prompts.map(p => 
            replicate.predictions.create({
                version: versionId,
                input: {
                    ...inputPayload,
                    prompt: p.text
                }
            })
         ));

         const predictionIds = predictions.map(p => p.id).join('|');
         console.log("✅ Plus Mode Predictions created:", predictionIds);

         return new Response(JSON.stringify({ 
            id: predictionIds, 
            status: "starting",
            cost: cost
        }), { status: 202, headers });
    }

    // Standard Mode (Single Image)
    const prediction = await replicate.predictions.create({
      version: versionId,
      input: inputPayload
    });

    console.log("✅ Prediction created:", prediction.id);

    // Return the prediction ID immediately
    return new Response(JSON.stringify({ 
        id: prediction.id, 
        status: prediction.status 
    }), { status: 202, headers });

  } catch (error) {
    console.error("❌ Error starting prediction:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
