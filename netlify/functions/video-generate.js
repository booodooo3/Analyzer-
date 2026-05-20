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
                    output: outputUrl,
                    input: prediction.input // Include input to allow chaining check
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
            
            const { image, image2, description, duration, cameraEffect, aiFilter, model, aspectRatio, audioFile, videoInput, characterOrientation, video_path, resolution, seed, reference_images, reference_videos, reference_audios } = await req.json();

            // Calculate cost based on duration
            let cost = 4;
            if (duration === 5) {
                cost = 2;
            }
            if (model === 'bytedance/omni-human' || model === 'kwaivgi/kling-lip-sync' || model === 'pixverse/lipsync') {
                cost = 2;
            }
            if (!image && model === 'bytedance/seedance-2.0' && !reference_images && !reference_videos) {
                cost = 5; // Cost for text to video
            }

            // Custom cost for seedance-2.0 based on duration
            if (model === 'bytedance/seedance-2.0') {
                if (duration === 5) {
                    cost = 3;
                } else if (duration === 8) {
                    cost = 5;
                } else if (duration === 10) {
                    cost = 7;
                }
            }


            if (currentCredits < cost) {
                return new Response(JSON.stringify({ error: `Insufficient credits! You need ${cost} credits for video generation.` }), { status: 403, headers });
            }

            // Construct Enhanced Prompt
            let enhancedPrompt = description;
            
            // Append Camera Effect
            if (cameraEffect && cameraEffect !== 'Static') {
                if (cameraEffect === 'The Camera Follows The Subject Moving') {
                    enhancedPrompt += `, the camera follows the subject moving`;
                } else if (cameraEffect === 'Free Camera') {
                    enhancedPrompt += `, dynamic free camera movement, orbiting and panning from multiple angles, professional commercial style cinematography, sweeping dynamic shots, highly cinematic and smooth`;
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
            let modelName = "seedance-2.0";

            if (model === 'bytedance/seedance-2.0') {
                modelOwner = "bytedance";
                modelName = "seedance-2.0";
            } else if (model === 'minimax/hailuo-2.3') {
                modelOwner = "minimax";
                modelName = "hailuo-2.3";
            } else if (model === 'kwaivgi/kling-v2.6-motion-control') {
                modelOwner = "kwaivgi";
                modelName = "kling-v2.6-motion-control";
            } else if (model === 'sync/lipsync-2') {
                modelOwner = "sync";
                modelName = "lipsync-2";
            } else if (model === 'bytedance/omni-human') {
                modelOwner = "bytedance";
                modelName = "omni-human";
            } else if (model === 'kwaivgi/kling-lip-sync') {
                modelOwner = "kwaivgi";
                modelName = "kling-lip-sync";
            } else if (model === 'pixverse/lipsync') {
                modelOwner = "pixverse";
                modelName = "lipsync";
            }

            let input = {
                prompt: enhancedPrompt,
                duration: duration || 10
            };

                // Only add image if it exists, otherwise leave it out of the input object completely
            if (image && !model.includes("seedance")) {
                input.image = image;
            } else if (image && model.includes("seedance")) {
                // For seedance, primary image maps to 'image' field in replicate which acts as first_frame_image
                input.image = image;
            }

            // Fix for seedance: if we have reference images but no primary image, we should NOT pass `image: null`
            // and we need to ensure Replicate handles the base64 string correctly.
            // Also, some replicate models fail with 400 Bad Request if the payload is too large or base64 is improperly formatted.
            // Netlify functions have a strict 6MB payload limit. If we exceed it, Netlify blocks it before it reaches Replicate.

            // دعم video_path و resolution فقط لموديل bytedance/seedance-2.0
            if (model === 'bytedance/seedance-2.0') {
                if (video_path) {
                    input.video_path = video_path;
                }
                if (resolution) {
                    input.resolution = resolution;
                }
                if (seed !== undefined) {
                    input.seed = seed;
                }
                if (reference_images && reference_images.length > 0) {
                    input.reference_images = reference_images;
                }
                if (reference_videos && reference_videos.length > 0) {
                    // Seedance-2.0 expects a single string for video path, not an array of base64
                    // Wait, Replicate schema for seedance might not support an array of base64 videos directly
                    // Actually, looking at typical replicate APIs, if it's multiple it might need specific formatting.
                    // But let's try passing the first one if it's an array, or pass it as is if it accepts arrays.
                    // The schema typically uses `video_path` for the reference video. Let's map it there if empty,
                    // or if there is a specific `reference_videos` field, let's just pass it.
                    input.reference_videos = reference_videos;
                }
                if (reference_audios && reference_audios.length > 0) {
                    input.reference_audios = Array.isArray(reference_audios) ? reference_audios : [reference_audios];
                }
            }

            // Only add aspect_ratio if not using an image (though for I2V it might be ignored, it's safer to keep unless causing issues)
            if (!image) {
                input.aspect_ratio = aspectRatio === "Match Input Image" ? "16:9" : (aspectRatio || "16:9");
            } else {
                // Some models might use aspect_ratio even with image, but let's be careful
                // For seedance, aspect_ratio is ignored if image is used
                if (aspectRatio !== "Match Input Image") {
                    input.aspect_ratio = aspectRatio || "16:9"; 
                }
            }

            if (image2) {
                // Ensure correct parameter name for Seedance models
                if (modelOwner === "bytedance" && modelName.includes("seedance")) {
                    input.last_frame_image = image2;
                } else {
                    input.last_frame_image = image2;
                }
            }

            if (modelOwner === "minimax") {
                input = {
                    prompt: enhancedPrompt,
                    duration: 10,
                    resolution: "768p",
                    prompt_optimizer: true,
                    disable_safety_checker: true
                };
                if (image) {
                    input.first_frame_image = image;
                }
            } else if (model === 'kwaivgi/kling-lip-sync') {
                input = {
                    video_url: image, // Frontend sends video URL in the 'image' field
                    audio_file: audioFile
                };
            } else if (model === 'pixverse/lipsync') {
                input = {
                    video: image,
                    audio: audioFile
                };
            } else if (model === 'kwaivgi/kling-v2.6-motion-control') {
                modelOwner = "kwaivgi";
                modelName = "kling-v2.6-motion-control";
                input = {
                    image: image, // Character Image
                    video: videoInput, // Character Actions Video
                    prompt: enhancedPrompt || "",
                    mode: "pro",
                    duration: 15,
                    character_orientation: characterOrientation || "video",
                    keep_original_sound: true
                };
            } else if (modelOwner === "kwaivgi") {
                input = {
                    prompt: enhancedPrompt,
                    duration: duration || 5,
                    disable_safety_checker: true
                };
                
                if (image) {
                    input.start_image = image;
                }

                if (aspectRatio !== "Match Input Image") {
                    input.aspect_ratio = aspectRatio || "16:9";
                }

                // Check if user requested slow motion
                const isSlowMotionRequested = enhancedPrompt.toLowerCase().includes('slow motion') || 
                                              enhancedPrompt.toLowerCase().includes('slow-motion') ||
                                              enhancedPrompt.toLowerCase().includes('slowmo');

                if (!isSlowMotionRequested) {
                    input.negative_prompt = "slow motion, frozen, static";
                }

                if (image2) {
                    input.end_image = image2;
                }
            } else if (model === 'sync/lipsync-2') {
                modelOwner = "sync";
                modelName = "lipsync-2";
                input = {
                    video: image, // Reusing 'image' param for video URL
                    audio: audioFile,
                    sync_mode: "loop",
                    active_speaker: true
                };
            } else if (model === 'bytedance/omni-human') {
                input = {
                    image: image,
                    audio: audioFile
                };
            }

            // Get latest version of the model
            let version;
            try {
                const replicateModel = await replicate.models.get(modelOwner, modelName);
                version = replicateModel.latest_version.id;
            } catch (e) {
                console.error("Model fetch error:", e);
                return new Response(JSON.stringify({ error: `Model ${modelOwner}/${modelName} not found or accessible. Details: ${e.message}` }), { status: 500, headers });
            }

            // Replicate predictions.create throws if we pass fields the model doesn't expect or in wrong format.
            // Bytedance seedance-2.0 doesn't natively have `reference_images` or `reference_videos` in its public replicate schema 
            // the same way Kling does. If it fails with 400 Bad Request directly from Replicate, 
            // it means the schema for that specific model version does not accept those fields.
            // Let's filter out undefined/null properties from input to be safe.
            Object.keys(input).forEach(key => {
                if (input[key] === undefined || input[key] === null) {
                    delete input[key];
                }
            });

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
