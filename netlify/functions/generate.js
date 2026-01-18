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

    // Map category to IDM-VTON format
    // Inputs: upper_body, lower_body, dresses
    let category = "upper_body";
    if (type === "bottom") category = "lower_body";
    if (type === "full" || type === "dresses") category = "dresses";

    // 4. Run Model (cuuupid/idm-vton)
    const output = await replicate.run(
      "cuuupid/idm-vton:c871bb9b0466074280c2a97189d0c63f3ce05eb30c6ed0547527964b46714d2b",
      {
        input: {
          human_img: personDataURI,
          garm_img: clothDataURI,
          garment_des: desc,
          category: category,
          steps: 30,
          seed: 42
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
