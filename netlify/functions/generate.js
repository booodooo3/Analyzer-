import Replicate from "replicate";

export default async (req, context) => {
  // 1. نتأكد أن الطلب جاي بطريقة صحيحة (POST)
  if (req.method !== "POST") {
    return new Response("Must be a POST request", { status: 405 });
  }

  try {
    // 2. نقرأ وصف الصورة اللي كتبه المستخدم
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "No prompt provided" }), { status: 400 });
    }

    // 3. نجهز الاتصال مع Replicate باستخدام المفتاح المخزن في Netlify
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN, // هذا اللي خزنته قبل شوي
    });

    // 4. نرسل الطلب للموديل (اخترت لك موديل سريع جداً اسمه Flux-Schnell)
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: prompt,
          go_fast: true, // عشان يخلص بسرعة
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 80
        }
      }
    );

    // 5. نرجع رابط الصورة للموقع
    return new Response(JSON.stringify({ image: output[0] }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
