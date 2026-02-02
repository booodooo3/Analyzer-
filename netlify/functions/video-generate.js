import { createClerkClient } from "@clerk/clerk-sdk-node";
import Replicate from "replicate";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export default async (req, context) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    };

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers });
    }

    // GET Request: Check Prediction Status
    const url = new URL(req.url);
    const predictionId = url.searchParams.get("id");

    if (req.method === "GET" && predictionId) {
        try {
            const prediction = await replicate.predictions.get(predictionId);
            
            if (prediction.status === "succeeded") {
                let outputUrl = prediction.output;
                // Handle array output (common in video models)
                if (Array.isArray(outputUrl)) {
                    outputUrl = outputUrl[0];
                }
                return new Response(JSON.stringify({ 
                    status: "succeeded", 
                    output: outputUrl 
                }), { headers });
            } else if (prediction.status === "failed" || prediction.status === "canceled") {
                return new Response(JSON.stringify({ 
                    status: "failed", 
                    error: prediction.error 
                }), { headers });
            } else {
                return new Response(JSON.stringify({ status: "processing" }), { headers });
            }
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
        }
    }

    // POST Request: Start Generation
    if (req.method === "POST") {
        try {
            const authHeader = req.headers.get("Authorization");
            const token = authHeader?.split(" ")[1];

            if (!token) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
            }

            // 1. Verify User & Credits
            const verified = await clerkClient.verifyToken(token);
            const userId = verified.sub;
            const user = await clerkClient.users.getUser(userId);
            
            const currentCredits = typeof user.publicMetadata.credits === 'number' ? user.publicMetadata.credits : 3;
            const cost = 4;

            if (currentCredits < cost) {
                return new Response(JSON.stringify({ error: `Insufficient credits! You need ${cost} credits for video generation.` }), { status: 403, headers });
            }

            const { image, description, duration, cameraEffect, aiFilter, model } = await req.json();

            // Construct Enhanced Prompt
            let enhancedPrompt = description;
            
            // Append Camera Effect
            if (cameraEffect && cameraEffect !== 'Static') {
                if (cameraEffect === 'The Camera Follows The Subject Moving') {
                    enhancedPrompt += `, the camera follows the subject moving`;
                } else {
                    enhancedPrompt += `, ${cameraEffect} camera movement`;
                }
            }

            // Append AI Filter Style
            if (aiFilter && aiFilter !== 'No Filter') {
                enhancedPrompt += `, ${aiFilter} style`;
            }

            // Determine Model Version
            let modelOwner = "bytedance";
            let modelName = "seedance-1.5-pro";

            if (model === 'bytedance/seedance-1-pro-fast') {
                modelOwner = "bytedance";
                modelName = "seedance-1-pro-fast";
            } else if (model === 'bytedance/seedance-1.5-pro') {
                modelOwner = "bytedance";
                modelName = "seedance-1.5-pro";
            }

            let input = {
                prompt: enhancedPrompt,
                duration: duration || 10,
                image: image,
                fps: 24
            };

            // Get latest version of the model
            let version;
            try {
                const replicateModel = await replicate.models.get(modelOwner, modelName);
                version = replicateModel.latest_version.id;
            } catch (e) {
                console.error("Model fetch error:", e);
                return new Response(JSON.stringify({ error: `Model ${modelOwner}/${modelName} not found or accessible. Details: ${e.message}` }), { status: 500, headers });
            }

            const prediction = await replicate.predictions.create({
                version: version,
                input: input
            });

            // 3. Deduct Credit ONLY if prediction started successfully
            await clerkClient.users.updateUserMetadata(userId, {
                publicMetadata: { credits: currentCredits - cost }
            });

            return new Response(JSON.stringify({
                status: "starting",
                message: "Video generation started",
                id: prediction.id,
                deducted: cost,
                model: `${modelOwner}/${modelName}`
            }), { status: 200, headers });

        } catch (error) {
            console.error("Error:", error);
            return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500, headers });
        }
    }

    return new Response("Method Not Allowed", { status: 405, headers });
};
