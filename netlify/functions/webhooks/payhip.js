import { createHmac, timingSafeEqual } from 'crypto';
import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const getHeaderValue = (req, names) => {
  for (const name of names) {
    const value = req.headers.get(name);
    if (value) return value;
  }
  return null;
};

const normalizeSignature = (signature) => {
  if (!signature) return null;
  if (signature.includes('=')) {
    const parts = signature.split('=');
    return parts[parts.length - 1];
  }
  return signature;
};

const isValidSignature = (body, signature, secret) => {
  if (!signature || !secret) return false;
  const computed = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  const provided = normalizeSignature(signature);
  if (!provided) return false;
  const computedBuffer = Buffer.from(computed, 'hex');
  const providedBuffer = Buffer.from(provided, 'hex');
  if (computedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(computedBuffer, providedBuffer);
};

const extractEventType = (payload) => {
  return payload?.event || payload?.event_type || payload?.eventName || payload?.event_name || payload?.type || null;
};

const extractEmail = (payload) => {
  return (
    payload?.email ||
    payload?.buyer_email ||
    payload?.customer?.email ||
    payload?.order?.email ||
    payload?.data?.email ||
    payload?.data?.buyer_email ||
    payload?.data?.customer?.email ||
    null
  );
};

const extractTransactionId = (payload) => {
  return (
    payload?.transaction_id ||
    payload?.transactionId ||
    payload?.order_id ||
    payload?.orderId ||
    payload?.purchase_id ||
    payload?.purchaseId ||
    payload?.data?.transaction_id ||
    payload?.data?.id ||
    payload?.data?.order_id ||
    payload?.data?.purchase_id ||
    null
  );
};

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = process.env.PAYHIP_API_KEY;
  const signature = getHeaderValue(req, ['payhip-signature', 'x-payhip-signature', 'x-webhook-signature']);

  const body = await req.text();

  if (!secret || !signature || !isValidSignature(body, signature, secret)) {
    return new Response("Webhook Error", { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = extractEventType(payload);
  if (eventType !== 'payment_success') {
    return new Response("OK", { status: 200 });
  }

  const email = extractEmail(payload);
  if (!email) {
    return new Response("OK", { status: 200 });
  }

  const users = await clerkClient.users.getUserList({ emailAddress: [email] });
  const user = users[0];
  if (!user) {
    return new Response("OK", { status: 200 });
  }

  const currentCredits = typeof user.publicMetadata?.credits === 'number' ? user.publicMetadata.credits : 0;
  const transactionId = extractTransactionId(payload);
  const existingTransactions = Array.isArray(user.privateMetadata?.payhipTransactions) ? user.privateMetadata.payhipTransactions : [];

  if (transactionId && existingTransactions.includes(transactionId)) {
    return new Response("OK", { status: 200 });
  }

  const updatePayload = {
    publicMetadata: {
      credits: currentCredits + 10
    }
  };

  if (transactionId) {
    updatePayload.privateMetadata = {
      ...(user.privateMetadata || {}),
      payhipTransactions: [...existingTransactions, transactionId]
    };
  }

  await clerkClient.users.updateUserMetadata(user.id, updatePayload);

  return new Response("OK", { status: 200 });
};
