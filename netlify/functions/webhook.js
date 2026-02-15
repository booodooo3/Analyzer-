
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
  const trimmed = signature.trim();
  if (trimmed.includes('=')) {
    const parts = trimmed.split('=');
    return parts[parts.length - 1];
  }
  return trimmed;
};

const signatureToBuffer = (signature) => {
  if (!signature) return null;
  const normalized = normalizeSignature(signature);
  if (!normalized) return null;
  const hexPattern = /^[0-9a-f]{64}$/i;
  if (hexPattern.test(normalized)) {
    return Buffer.from(normalized, 'hex');
  }
  try {
    return Buffer.from(normalized, 'base64');
  } catch {
    return null;
  }
};

const isValidSignature = (body, signature, secret) => {
  if (!signature || !secret) return false;
  const computedBuffer = createHmac('sha256', secret).update(body, 'utf8').digest();
  const providedBuffer = signatureToBuffer(signature);
  if (!providedBuffer) return false;
  if (computedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(computedBuffer, providedBuffer);
};

const normalizeEventType = (eventType) => {
  if (!eventType) return null;
  return String(eventType).toLowerCase().replace(/[\s.-]+/g, '.');
};

const extractEmail = (payload) => {
  const email =
    payload?.data?.customer?.email ||
    payload?.data?.account?.email ||
    payload?.data?.order?.email ||
    payload?.data?.email ||
    payload?.customer?.email ||
    payload?.email ||
    null;
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
};

const extractProductNames = (payload) => {
  const items =
    payload?.data?.items ||
    payload?.data?.order?.items ||
    payload?.items ||
    [];
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => item?.product || item?.productName || item?.display || item?.name || item?.product_display || null)
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim().toLowerCase());
};

const getEvents = (payload) => {
  if (Array.isArray(payload?.events)) return payload.events;
  return [payload];
};

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.text();

  const fastspringSignature = getHeaderValue(req, [
    'fastspring-signature',
    'x-fastspring-signature',
    'x-events-signature',
    'x-event-signature',
    'x-webhook-signature',
    'x-signature'
  ]);
  const fastspringSecret = process.env.FASTSPRING_WEBHOOK_SECRET || process.env.FASTSPRING_SECRET;

  if (!fastspringSecret || !fastspringSignature || !isValidSignature(body, fastspringSignature, fastspringSecret)) {
    return new Response("Webhook Error", { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const targetProduct = '10-credits';
  const events = getEvents(payload);
  const shouldHandle = events.some((event) => normalizeEventType(event?.type) === 'order.completed');

  if (!shouldHandle) {
    return new Response("OK", { status: 200 });
  }

  const email = extractEmail(events.find((event) => normalizeEventType(event?.type) === 'order.completed') || payload);
  if (!email) {
    return new Response("OK", { status: 200 });
  }

  const products = events.flatMap((event) => extractProductNames(event));
  if (!products.includes(targetProduct)) {
    return new Response("OK", { status: 200 });
  }

  const users = await clerkClient.users.getUserList({ emailAddress: [email] });
  const user = users[0];
  if (!user) {
    return new Response("OK", { status: 200 });
  }

  const creditsToAdd = 10;
  const currentCredits = typeof user.publicMetadata?.credits === 'number' ? user.publicMetadata.credits : 0;

  await clerkClient.users.updateUserMetadata(user.id, {
    publicMetadata: {
      credits: currentCredits + creditsToAdd
    }
  });

  return new Response("OK", { status: 200 });
};
