import { ImageData, GarmentType } from '../types';

export const performVirtualTryOn = async (person: ImageData, cloth: ImageData, type: GarmentType, token: string, garmentDescription?: string) => {
  try {
    // 1. Start Prediction
    const startResponse = await fetch('/api/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        personImage: person.url || person.base64, 
        clothImage: cloth.url || cloth.base64,
        type: type,
        garmentDescription: garmentDescription
      }),
    });

    if (!startResponse.ok) {
         const contentType = startResponse.headers.get("content-type");
         if (contentType && contentType.indexOf("application/json") !== -1) {
              const errorData = await startResponse.json();
              throw new Error(errorData.error || `Server Error: ${startResponse.status}`);
         } else {
              const text = await startResponse.text();
              console.error("Non-JSON Error Response:", text);
              throw new Error(`Server Error (${startResponse.status}): Unexpected response (HTML). Check Netlify logs.`);
         }
    }

    const startData = await startResponse.json();
    const predictionId = startData.id;

    if (!predictionId) {
        throw new Error("No prediction ID returned from server.");
    }

    // 2. Poll for status
    const pollInterval = 3000; // 3 seconds
    const maxAttempts = 40; // 2 minutes timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, pollInterval));

        const statusResponse = await fetch(`/api/generate?id=${predictionId}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!statusResponse.ok) continue;

        const statusData = await statusResponse.json();
        
        if (statusData.status === 'succeeded') {
             return {
                front: statusData.output.front,
                side: statusData.output.side || statusData.output.front,
                full: statusData.output.full || statusData.output.front
             };
        }

        if (statusData.status === 'failed' || statusData.status === 'canceled') {
            throw new Error(`Generation failed: ${statusData.error || 'Unknown error'}`);
        }
        
        // If 'starting' or 'processing', continue loop
    }
    
    throw new Error("Timeout waiting for generation.");

  } catch (error: any) {
    console.error("Virtual Try-On Error:", error);
    throw new Error(error.message || 'حدث خطأ أثناء الاتصال بالخادم');
  }
};

export const analyzeStyle = async (image: string, lang: 'ar' | 'en') => {
  // محاكاة للتحليل (Mock) لسرعة الاستجابة
  return {
    fitScore: 94,
    colorScore: 88,
    styleGrade: 'A+',
    tips: lang === 'ar'
      ? ['الألوان متناسقة جداً مع البشرة', 'المقاس يبدو مثالياً عند الأكتاف', 'تنسيق رائع للمناسبة الرسمية']
      : ['Colors match skin tone perfectly', 'Fit looks perfect at the shoulders', 'Great coordination for formal events']
  };
};
