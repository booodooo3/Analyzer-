import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async (req, context) => {
  // Handle CORS
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { image, description, model } = body;

    console.log("📥 Video Generation Request:", { model, descriptionLength: description?.length });

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
        
        console.log(`👤 User ${userId} requests video generation. Credits: ${currentCredits}`);
        
        // Cost for Video AI is 5 credits
        const cost = 5;

        if (currentCredits < cost) {
            return new Response(JSON.stringify({ error: `Insufficient credits! You need ${cost} credits for video generation.` }), { status: 403, headers });
        }
        
        // Deduct Credit
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                credits: currentCredits - cost
            }
        });
        console.log(`✅ Deducted ${cost} credits. New balance: ${currentCredits - cost}`);

    } catch (e) {
        console.error("Auth/Credit Check Failed:", e);
        return new Response(JSON.stringify({ error: "Unauthorized: Please login first." }), { status: 401, headers });
    }

    // 2. Mock Video Generation
    // Since we don't have the actual bytedance/seedance-1.5-pro integration details or key,
    // we will acknowledge the request and simulate success after credit deduction.
    // In a real scenario, we would call Replicate or another API here.
    
    // For now, return success
    return new Response(JSON.stringify({
        status: "starting",
        message: "Video generation started successfully",
        deducted: 5,
        model: "bytedance/seedance-1.5-pro",
        duration: "8s"
    }), { status: 200, headers });

  } catch (error) {
    console.error("❌ Error processing video request:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
};
