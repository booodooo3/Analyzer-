
import { Paddle, EventName } from '@paddle/paddle-node-sdk';
import { createClerkClient } from "@clerk/clerk-sdk-node";

const paddle = new Paddle(process.env.PADDLE_API_KEY || 'apikey_01kfawcfzrww8h40s96xyn6rey');
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const signature = req.headers.get('paddle-signature');
  const secretKey = process.env.PADDLE_WEBHOOK_SECRET_KEY;

  if (!signature || !secretKey) {
      console.error("Missing Paddle signature or secret key");
      return new Response("Webhook Error", { status: 400 });
  }

  try {
    // 1. Verify and unmarshal the event
    // Netlify functions receive body as text/string usually? 
    // In standard fetch-based functions, req.text() gives body.
    const body = await req.text();
    
    const eventData = paddle.webhooks.unmarshal(body, secretKey, signature);

    // 2. Handle the event
    if (eventData.eventType === EventName.TransactionCompleted) {
        const transaction = eventData.data;
        const customData = transaction.customData;

        if (customData && customData.userId) {
            const userId = customData.userId;
            console.log(`💰 Payment received for user ${userId}`);

            // 3. Add credits (e.g., 50 credits for a purchase)
            // You might want to check transaction.items to decide how many credits
            // For now, let's assume a standard pack of 50
            const creditsToAdd = 50;

            const user = await clerkClient.users.getUser(userId);
            const currentCredits = (user.publicMetadata.credits) || 0;
            
            await clerkClient.users.updateUserMetadata(userId, {
                publicMetadata: {
                    credits: currentCredits + creditsToAdd
                }
            });

            console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);
        }
    }

    return new Response("OK", { status: 200 });

  } catch (e) {
    console.error("Webhook processing failed:", e);
    return new Response("Server Error", { status: 500 });
  }
};
