import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const paypalBase =
  process.env.PAYPAL_API_BASE ||
  (process.env.PAYPAL_ENV === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com");

async function getPayPalAccessToken() {
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

async function getPayPalOrder(orderId) {
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

function getCreditsFromAmount(amountValue) {
  const creditsPerUsd = Number(process.env.PAYPAL_CREDITS_PER_USD || "2");
  const amountNumber = Number(amountValue);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0 || creditsPerUsd <= 0) {
    return 0;
  }
  return Math.round(amountNumber * creditsPerUsd);
}

export default async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const token = authHeader.split(" ")[1];
    const verified = await clerkClient.verifyToken(token);
    const userId = verified.sub;

    const body = await req.json();
    const { orderID, amount } = body || {};
    if (!orderID || typeof orderID !== "string") {
      return new Response(JSON.stringify({ error: "Missing orderID" }), { status: 400, headers });
    }

    const order = await getPayPalOrder(orderID);
    const status = order?.status;
    const purchaseUnit = order?.purchase_units?.[0];
    const captureAmount =
      purchaseUnit?.payments?.captures?.[0]?.amount?.value ||
      purchaseUnit?.amount?.value;

    if (status !== "COMPLETED" || !captureAmount) {
      return new Response(JSON.stringify({ error: "Payment not completed" }), { status: 400, headers });
    }

    if (amount && Number(amount) !== Number(captureAmount)) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), { status: 400, headers });
    }

    const creditsToAdd = getCreditsFromAmount(String(captureAmount));
    if (!creditsToAdd) {
      return new Response(JSON.stringify({ error: "Invalid amount for credits" }), { status: 400, headers });
    }

    const user = await clerkClient.users.getUser(userId);
    const currentCredits = typeof user.publicMetadata?.credits === "number" ? user.publicMetadata.credits : 0;
    const existingOrders = Array.isArray(user.privateMetadata?.paypalOrders)
      ? user.privateMetadata.paypalOrders.filter((id) => typeof id === "string")
      : [];

    if (existingOrders.includes(orderID)) {
      return new Response(JSON.stringify({ ok: true, creditsAdded: 0, credits: currentCredits, alreadyProcessed: true }), { status: 200, headers });
    }

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        credits: currentCredits + creditsToAdd
      },
      privateMetadata: {
        paypalOrders: [...existingOrders, orderID]
      }
    });

    return new Response(JSON.stringify({
      ok: true,
      creditsAdded: creditsToAdd,
      credits: currentCredits + creditsToAdd
    }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Failed to update points" }), { status: 500, headers });
  }
};
