import { ImageData, GarmentType } from '../types';

// Helper to resize image to reduce payload size
const resizeImage = (file: File | string, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof file === 'string') {
        if (file.startsWith('data:')) resolve(file);
        else resolve(file); // URL
        return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress to JPEG 80%
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const performVirtualTryOn = async (person: ImageData, cloth: ImageData, type: GarmentType, token: string, garmentDescription?: string) => {
  try {
    // 0. Resize images before sending to avoid Netlify timeout (10s limit)
    const personImage = person.file ? await resizeImage(person.file) : (person.base64 || person.url);
    const clothImage = cloth.file ? await resizeImage(cloth.file) : (cloth.base64 || cloth.url);

    // 1. Start Prediction
    const startResponse = await fetch('/api/generate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        personImage: personImage, 
        clothImage: clothImage,
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
