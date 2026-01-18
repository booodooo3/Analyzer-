import Replicate from "replicate";

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
    const { personImage, clothImage, garmentDescription } = body;

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
    const desc = garmentDescription || "A cool outfit";

    console.log("🚀 Starting Replicate prediction (google/nano-banana-pro)...");

    // Use hardcoded version ID to save time (avoid fetching model info)
    const versionId = "f5318740f60d79bf0c480216aaf9ca7614977553170eacd19ff8cbcda2409ac8";

    // Create prediction (async)
    const prediction = await replicate.predictions.create({
      version: versionId,
      input: {
          prompt: `A photo of a person wearing ${desc}. The person is wearing the garment shown in the second image. High quality, realistic.`,
          image_input: [personDataURI, clothDataURI],
          aspect_ratio: "match_input_image",
          output_format: "png",
          safety_filter_level: "block_only_high"
      }
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
