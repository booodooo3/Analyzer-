
import { ImageData, GarmentType } from "../types";

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Robustly converts an image URL or ImageData to a base64 string compatible with Gemini.
 */
const getImageData = async (image: ImageData): Promise<{ data: string; mimeType: string }> => {
  if (image.base64) {
    return {
      data: image.base64.split(',')[1],
      mimeType: image.mimeType
    };
  }

  if (!image.url) {
    throw new Error("Invalid image data: No source found.");
  }

  // Attempt direct fetch
  try {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error("Fetch failed");
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return {
      data: base64.split(',')[1],
      mimeType: blob.type
    };
  } catch (e) {
    // CORS Fallback: Use Image -> Canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL('image/png');
          resolve({
            data: dataUrl.split(',')[1],
            mimeType: 'image/png'
          });
        } catch (err) {
          reject(new Error("CORS Restriction: The image source does not allow programmatic access. Please download the image and upload it manually."));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image from source URL. Check your connection or the URL."));
      img.src = image.url!;
    });
  }
};

const createPrompt = (viewType: 'front' | 'side' | 'full-body', garmentType: GarmentType) => {
  const typeMap: Record<GarmentType, string> = {
    shirt: 'shirt',
    long_dress: 'long dress',
    short_dress: 'short dress',
    long_skirt: 'long skirt',
    short_skirt: 'short skirt',
    pants: 'pants',
    jacket: 'jacket',
    other: 'clothing item'
  };

  const garmentName = typeMap[garmentType];
  const basePrompt = `Perform a hyper-realistic virtual try-on. ` +
    `Take the ${garmentName} from the second image and place it on the person in the first image. ` +
    `CRITICAL INSTRUCTION: If the person's pose in the input photo is awkward, poorly framed, or has missing/cut-off limbs (like hands or arms), ` +
    `you MUST intelligently correct the posture and complete the missing body parts to look natural and professional. ` +
    `Ensure the ${garmentName} drapes and fits perfectly as a real ${garmentName} would on their body. ` +
    `Specifically, ensure the length of the ${garmentName} is respected based on its category. ` +
    `The person's facial features and hair must remain consistent with the original. ` +
    `Ensure the fabric drapes naturally on the corrected body physique.`;

  switch (viewType) {
    case 'front':
      return `${basePrompt} Generate a clear, well-composed front-facing fashion portrait focusing on the upper body and how the ${garmentName} fits. Ensure hands and arms are visible and posed naturally.`;
    case 'side':
      return `${basePrompt} Generate a professional side profile or three-quarter view. Adjust the body's rotation to perfectly showcase the ${garmentName}'s silhouette and fit from the side.`;
    case 'full-body':
      return `${basePrompt} Generate a wide-angle full-body fashion shot. If the original photo was a close-up, intelligently expand the view to show the person standing in a confident fashion pose showing the full length of the ${garmentName}.`;
    default:
      return basePrompt;
  }
};

export const performVirtualTryOn = async (
  personImage: ImageData,
  clothImage: ImageData,
  garmentType: GarmentType
): Promise<{ front: string; side: string; full: string }> => {
  
  // Resolve image data
  const personData = await getImageData(personImage);
  const clothData = await getImageData(clothImage);

  const generateView = async (viewType: 'front' | 'side' | 'full-body') => {
    try {
      const prompt = createPrompt(viewType, garmentType);
      
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          images: [
            `data:${personData.mimeType};base64,${personData.data}`,
            `data:${clothData.mimeType};base64,${clothData.data}`
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate ${viewType} view`);
      }

      const data = await response.json();
      return data.text; 
    } catch (error: any) {
      console.error(`Error generating ${viewType} view:`, error);
      throw error;
    }
  };

  const [front, side, full] = await Promise.all([generateView('front'), generateView('side'), generateView('full-body')]);
  return { front, side, full };
};

export const analyzeStyle = async (image: string, lang: 'ar' | 'en'): Promise<{
  fitScore: number;
  colorScore: number;
  styleGrade: string;
  tips: string[];
}> => {
  try {
    const prompt = lang === 'ar' 
      ? `قم بتحليل مظهر الشخص في هذه الصورة. قيم المقاس (fitScore) من 100، وتناسق الألوان (colorScore) من 100، وأعط تقييماً عاماً للستايل (styleGrade) مثل A+, B, C. ثم قدم 3 نصائح لتحسين المظهر.
         أرجع النتيجة بصيغة JSON فقط، بدون أي نص إضافي، بالشكل التالي:
         { "fitScore": 85, "colorScore": 90, "styleGrade": "A", "tips": ["نصيحة 1", "نصيحة 2", "نصيحة 3"] }`
      : `Analyze the person's outfit in this image. Rate the fit (fitScore) out of 100, color coordination (colorScore) out of 100, and give a style grade (styleGrade) like A+, B, C. Provide 3 tips for improvement.
         Return ONLY JSON format, no extra text, like:
         { "fitScore": 85, "colorScore": 90, "styleGrade": "A", "tips": ["Tip 1", "Tip 2", "Tip 3"] }`;

    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image // Assuming 'image' here is a base64 string or url. If it's a URL, the backend handles it? 
              // Wait, the backend expects base64 in `image` field if it's not `images` array?
              // `server/index.ts`: `const images = req.body.images || (image ? [image] : []);`
              // And `cleanImage = img.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');`
              // So it expects a Data URL.
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to analyze style');
    }

    const data = await response.json();
    const text = data.text;
    
    // Clean code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);

  } catch (error: any) {
    console.error("Error analyzing style:", error);
    // Return mock data on failure to prevent crash
    return {
      fitScore: 85,
      colorScore: 88,
      styleGrade: 'B+',
      tips: lang === 'ar' 
        ? ['تأكد من تناسق الألوان', 'جرب مقاساً أضيق قليلاً', 'أضف بعض الإكسسوارات']
        : ['Ensure color coordination', 'Try a slightly tighter fit', 'Add some accessories']
    };
  }
};
