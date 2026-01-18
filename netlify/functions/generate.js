import Replicate from "replicate";

export default async (req, context) => {
  // 1. Ensure POST request
  if (req.method !== "POST") {
    return new Response("Must be a POST request", { status: 405 });
  }

  try {
    // 2. Parse body
    const body = await req.json();
    const { personImage, clothImage, type, garmentDescription } = body;

    // Validation
    if (!personImage || !clothImage) {
      return new Response(JSON.stringify({ error: "Both person and cloth images are required." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Setup Replicate
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Helper to ensure data URI format
    const ensureDataURI = (base64Str) => {
      if (typeof base64Str !== 'string') return base64Str;
      if (base64Str.startsWith('http')) return base64Str;
      if (base64Str.startsWith('data:')) return base64Str;
      return `data:image/png;base64,${base64Str}`;
    };

    const personDataURI = ensureDataURI(personImage);
    const clothDataURI = ensureDataURI(clothImage);
    const desc = garmentDescription || "A cool outfit";

    console.log("🚀 Starting Replicate generation (IDM-VTON)...");

    // 4. Run Model (google/nano-banana-pro)
    // Reverting to user requested model
    const output = await replicate.run(
      "google/nano-banana-pro",
      {
        input: {
          prompt: `A photo of a person wearing ${desc}. The person is wearing the garment shown in the second image. High quality, realistic.`,
          image_input: [personDataURI, clothDataURI],
          aspect_ratio: "match_input_image",
          output_format: "png",
          safety_filter_level: "block_only_high"
        }
      }
    );

    console.log("✅ Replicate Output:", output);

    // 5. Process Output
    let finalImageUrl = output;
    
    // Handle different output formats
    if (typeof output !== 'string') {
        if (Array.isArray(output) && output.length > 0) {
            finalImageUrl = output[0];
        } else if (output?.url) {
            finalImageUrl = output.url.toString();
        }
    }

    // 6. Return Response in expected format
    return new Response(JSON.stringify({ 
        front: finalImageUrl,
        side: finalImageUrl, // Mock side view
        full: finalImageUrl, // Mock full view
        analysis: "Generated successfully via Netlify",
        remaining: 99 // Mock credits
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error in Netlify Function:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
};
