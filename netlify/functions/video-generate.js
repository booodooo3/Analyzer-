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
            const cost = 5;

            if (currentCredits < cost) {
                return new Response(JSON.stringify({ error: `Insufficient credits! You need ${cost} credits for video generation.` }), { status: 403, headers });
            }

            const { image, description, duration } = await req.json();

            // 2. Start Replicate Prediction
            // Get latest version of the model
            // Note: If "bytedance/seedance-1.5-pro" is not public/accessible via API without version, 
            // we might need to look it up. Assuming standard Replicate usage:
            let version;
            try {
                const model = await replicate.models.get("bytedance", "seedance-1.5-pro");
                version = model.latest_version.id;
            } catch (e) {
                console.error("Model fetch error:", e);
                // Fallback or error if model not found
                return new Response(JSON.stringify({ error: "Model bytedance/seedance-1.5-pro not found or accessible." }), { status: 500, headers });
            }

            const prediction = await replicate.predictions.create({
                version: version,
                input: {
                    image: image, // Expecting data URI or URL
                    prompt: description,
                    duration: duration || 8,
                    fps: 24
                }
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
                model: "bytedance/seedance-1.5-pro"
            }), { status: 200, headers });

        } catch (error) {
            console.error("Error:", error);
            return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { status: 500, headers });
        }
    }

    return new Response("Method Not Allowed", { status: 405, headers });
};
