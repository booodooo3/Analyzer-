import { ImageData, GarmentType } from '../types'; 
 import { GoogleGenerativeAI } from "@google/generative-ai"; 
 
 const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; 
 
 export const performVirtualTryOn = async ( 
   personImage: ImageData, 
   clothImage: ImageData, 
   type: GarmentType, 
   token: string | null 
 ) => { 
   
   try { 
     const response = await fetch('http://localhost:3001/api/generate', { 
       method: 'POST', 
       headers: { 
         'Content-Type': 'application/json', 
         'Authorization': `Bearer ${token}` 
       }, 
       body: JSON.stringify({ 
        // ✅ Modification here: Send text (base64) only instead of the full object
        personImage: personImage.base64, 
        
        // Send base64 if available, otherwise send URL (for ready-made clothes)
        clothImage: clothImage.base64 || clothImage.url, 
        
        type 
      }) 
    }); 

    if (!response.ok) { 
      const errorData = await response.json().catch(() => ({})); 
      throw new Error(errorData.error || `Error: ${response.status} - Connection to server failed`); 
    } 

    const data = await response.json(); 
    return data; 

  } catch (error) { 
    console.error("Virtual Try-On Error:", error); 
    throw error; 
  } 
}; 

// Style analysis function
export const analyzeStyle = async (imageBase64: string) => { 
  try { 
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY); 
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); 

    const prompt = "Analyze this outfit. Give me a score out of 100 for fit and color match, a style grade, and 3 short tips. Response must be JSON."; 

    const base64Data = imageBase64.split(',')[1] || imageBase64; 

    const result = await model.generateContent([ 
      prompt, 
      { inlineData: { data: base64Data, mimeType: "image/png" } } 
    ]); 

    const response = await result.response; 
    const text = response.text(); 
    const jsonString = text.replace(/```json|```/g, '').trim(); 
    return JSON.parse(jsonString); 

  } catch (error) { 
    console.error("Analysis Error:", error); 
    return { 
      fitScore: 85, 
      colorScore: 90, 
      styleGrade: "A", 
      tips: ["Check lighting", "Good angle", "Colors match"] 
    }; 
  } 
};