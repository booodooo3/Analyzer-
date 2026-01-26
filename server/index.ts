
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

const paypalBase =
  process.env.PAYPAL_API_BASE ||
  (process.env.PAYPAL_ENV === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com");

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing PayPal credentials");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${paypalBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to get PayPal access token");
  }

  const data = await response.json();
  return data.access_token;
}

async function getPayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${paypalBase}/v2/checkout/orders/${orderId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to fetch PayPal order");
  }

  return response.json();
}

function getCreditsFromAmount(amountValue: string) {
  const amountNumber = Number(amountValue);

  // Special case for $13 package -> 10 credits
  if (Math.abs(amountNumber - 13.0) < 0.01) {
      return 10;
  }

  const creditsPerUsd = Number(process.env.PAYPAL_CREDITS_PER_USD || "2");
  if (!Number.isFinite(amountNumber) || amountNumber <= 0 || creditsPerUsd <= 0) {
    return 0;
  }
  return Math.round(amountNumber * creditsPerUsd);
}

app.post('/api/user/add-points', ClerkExpressWithAuth(), async (req: any, res: any) => {
  try {
    const { userId } = req.auth;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { orderID, amount } = req.body || {};
    if (!orderID || typeof orderID !== 'string') {
      return res.status(400).json({ error: "Missing orderID" });
    }

    const order = await getPayPalOrder(orderID);
    const status = order?.status;
    const purchaseUnit = order?.purchase_units?.[0];
    const captureAmount =
      purchaseUnit?.payments?.captures?.[0]?.amount?.value ||
      purchaseUnit?.amount?.value;

    if (status !== "COMPLETED" || !captureAmount) {
      return res.status(400).json({ error: "Payment not completed" });
    }

    if (amount && Number(amount) !== Number(captureAmount)) {
      return res.status(400).json({ error: "Amount mismatch" });
    }

    const creditsToAdd = getCreditsFromAmount(String(captureAmount));
    if (!creditsToAdd) {
      return res.status(400).json({ error: "Invalid amount for credits" });
    }

    const user = await clerkClient.users.getUser(userId);
    const currentCredits = typeof user.publicMetadata?.credits === "number" ? user.publicMetadata.credits : 0;
    const existingOrders = Array.isArray(user.privateMetadata?.paypalOrders)
      ? user.privateMetadata.paypalOrders.filter((id: any) => typeof id === "string")
      : [];

    if (existingOrders.includes(orderID)) {
      console.log(`⚠️ Order ${orderID} already processed.`);
      return res.json({ ok: true, creditsAdded: 0, credits: currentCredits, alreadyProcessed: true });
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        credits: currentCredits + creditsToAdd
      },
      privateMetadata: {
        paypalOrders: [...existingOrders, orderID]
      }
    });
    
    console.log(`✅ Successfully added ${creditsToAdd} credits to user ${userId}. New total: ${currentCredits + creditsToAdd}`);

    return res.json({
      ok: true,
      creditsAdded: creditsToAdd,
      credits: currentCredits + creditsToAdd
    });
  } catch (error: any) {
    console.error("❌ Error in /api/user/add-points:", error);
    console.error("Stack:", error.stack);
    if (error.response) {
       console.error("Response data:", await error.response.text().catch(() => "No text"));
    }
    return res.status(500).json({ error: error.message || "Failed to update points" });
  }
});

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

        const { personImage, clothImage, type, garmentDescription, isPlusMode } = req.body;
        
        console.log("📥 Request Body keys:", Object.keys(req.body));
        
        // Robust parsing of isPlusMode
        let isPlusModeBool = false;
        if (typeof isPlusMode === 'boolean') {
            isPlusModeBool = isPlusMode;
        } else if (typeof isPlusMode === 'string') {
            isPlusModeBool = (isPlusMode === 'true');
        }

        console.log(" Parsed isPlusMode:", isPlusModeBool);

        if (!personImage || !clothImage) {
            return res.status(400).json({ error: "Both person and cloth images are required." });
        }
        
        // Plus Mode Logic (3 credits)
        // Bronze Mode Logic (let's assume 1 credit for now unless specified, but user didn't specify cost)
        // Standard Mode (1 credit)
        const cost = isPlusModeBool ? 3 : 1;
        if (currentCredits < cost) {
             return res.status(403).json({
                error: `Insufficient credits! This action requires ${cost} credits.`,
                needPayment: true
            });
        }

        // Default type if not provided
        const garmentType = type || 'upper_body'; 
        const typeHints: Record<string, string> = {
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

        // 1. Start Prediction
        // Define Models
        // Standard Mode uses "Pro" (Gemini 3 Pro Image)
        // Plus Mode uses "Nano Banana" (Gemini 2.5 Flash Image)
        const modelOwner = "google";
        let modelName = "nano-banana-pro"; // Default

        if (isPlusModeBool) {
            modelName = "nano-banana";
            console.log("➕ PLUS MODE DETECTED: Switching to google/nano-banana");
        } else {
            console.log("🍌 STANDARD MODE: Using google/nano-banana-pro");
        }
        
        console.log(`🚀 Starting Replicate prediction (${modelOwner}/${modelName})...`);
        
        // Fetch latest version ID dynamically
        const modelData = await replicate.models.get(modelOwner, modelName);
        const versionId = modelData?.latest_version?.id;
        if (!versionId) {
            throw new Error("Model version not available");
        }

        // Prepare Base64 for Replicate
        const personBase64 = personImage.startsWith('http') ? 
            await (await fetch(personImage)).arrayBuffer().then(b => Buffer.from(b).toString('base64')) : 
            personImage;
         
        const clothBase64 = clothImage.startsWith('http') ? 
            await (await fetch(clothImage)).arrayBuffer().then(b => Buffer.from(b).toString('base64')) : 
            clothImage;
         
        const personDataURI = personBase64.startsWith('data:') ? personBase64 : `data:image/png;base64,${personBase64}`;
        const clothDataURI = clothBase64.startsWith('data:') ? clothBase64 : `data:image/png;base64,${clothBase64}`;

        const inputPayload = {
            prompt: `A photo of a person wearing ${desc}. The person is wearing the garment shown in the second image. High quality, realistic. MANDATORY: Preserve the person's identity, facial features, and hairstyle from the first image EXACTLY. Do not alter the face, skin tone, or hair. Only modify the clothing area.`,
            image_input: [personDataURI, clothDataURI],
            aspect_ratio: "match_input_image",
            output_format: "png",
            safety_filter_level: "block_only_high"
        };
        
        // If Plus Mode, we generate 3 distinct views
        if (isPlusModeBool) {
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

             // Deduct credit immediately (3 credits)
             await clerkClient.users.updateUserMetadata(userId, {
                publicMetadata: {
                    credits: currentCredits - cost
                }
             });

             return res.status(202).json({
                id: predictionIds,
                status: "starting",
                cost: cost
             });
        }
        
        // Standard Mode (Single Image)
        const prediction = await replicate.predictions.create({
            version: versionId,
            input: inputPayload
        });

        console.log("✅ Prediction created:", prediction.id);

        // Deduct credit immediately
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                credits: currentCredits - cost
            }
        });

        res.status(202).json({
            id: prediction.id,
            status: prediction.status,
            cost: cost
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
        // Handle Multiple IDs (Plus Mode)
        if (predictionId.includes('|')) {
            const ids = predictionId.split('|');
            const predictions = await Promise.all(ids.map((id: string) => replicate.predictions.get(id)));
            
            // Check statuses
            const allSucceeded = predictions.every((p: any) => p.status === "succeeded");
            const anyFailed = predictions.find((p: any) => p.status === "failed" || p.status === "canceled");
            
            if (allSucceeded) {
                // Map outputs to front, side, full
                // Order matches the prompts array: [front, side, full]
                const getUrl = (p: any) => {
                    if (typeof p.output === 'string') return p.output;
                    if (Array.isArray(p.output) && p.output.length > 0) return p.output[0];
                    if (p.output?.url) return p.output.url.toString();
                    return "";
                };

                res.json({
                    status: "succeeded",
                    output: {
                        front: getUrl(predictions[0]),
                        side: getUrl(predictions[1]),
                        full: getUrl(predictions[2]),
                        analysis: "Generated successfully (Plus Mode)",
                        remaining: 99
                    }
                });
            } else if (anyFailed) {
                res.json({ status: "failed", error: anyFailed.error || "One of the generations failed" });
            } else {
                // Still processing
                res.json({ status: "processing" });
            }
            return;
        }

        // Standard Single ID Logic
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
