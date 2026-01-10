import express from 'express'; 
import cors from 'cors'; 
import dotenv from 'dotenv'; 
import { GoogleGenerativeAI } from '@google/generative-ai'; 

dotenv.config({ path: '../.env.local' }); 

const app = express(); 
app.use(cors()); 
app.use(express.json({ limit: '50mb' })); 

const port = 3001; 

// التحقق من المفتاح 
if (!process.env.VITE_GEMINI_API_KEY) { 
  console.error("❌ ERROR: API Key is missing! Check .env.local"); 
} 

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || ""); 

app.post('/api/generate', async (req, res) => { 
  try { 
    const { prompt, image, images } = req.body; 
    
    // 👇👇 هنا الحل: استخدام الاسم الصحيح للموديل 👇👇 
    const modelName = "gemini-2.5-flash-lite";
    console.log("🤖 Using Gemini Model:", modelName);
    const model = genAI.getGenerativeModel({ model: modelName }); 

    let imageParts: any[] = []; 
    if (images && Array.isArray(images)) { 
       imageParts = images.map((img: string) => { 
        const cleanData = img.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ''); 
        return { inlineData: { data: cleanData, mimeType: "image/png" } }; 
      }); 
    } else if (image) { 
      const cleanImage = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ''); 
      imageParts = [{ inlineData: { data: cleanImage, mimeType: "image/png" } }]; 
    } 

    let result; 
    if (imageParts.length > 0) { 
      result = await model.generateContent([prompt, ...imageParts]); 
    } else { 
      result = await model.generateContent(prompt); 
    } 

    const response = await result.response; 
    // نرسل النص كنتيجة 
    res.json({ text: response.text() }); 
    
  } catch (error: any) { 
    console.error("🔥 Server Error:", error); 
    res.status(500).json({ error: error.message || "Internal Server Error" }); 
  } 
}); 

app.listen(port, () => { 
  console.log(`✅ Server running on port ${port}`); 
});
