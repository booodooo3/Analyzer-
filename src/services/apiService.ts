import { ImageData, GarmentType } from '../types';

// Helper to resize image to reduce payload size
const resizeImage = (input: File | string, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. If it's a URL (http/https), return as is (Replicate handles URLs)
    if (typeof input === 'string' && !input.startsWith('data:')) {
      resolve(input);
      return;
    }

    const processImage = (src: string) => {
      const img = new Image();
      img.src = src;
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
        if (!ctx) {
             resolve(src); // Fallback
             return;
        }
        
        // Fill white background to handle transparency converting to black in JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress to JPEG 80%
      };
      img.onerror = (err) => reject(err);
    };

    if (typeof input === 'string') {
        // Data URI
        processImage(input);
    } else {
        // File object
        const reader = new FileReader();
        reader.readAsDataURL(input);
        reader.onload = (event) => processImage(event.target?.result as string);
        reader.onerror = (err) => reject(err);
    }
  });
};

export const performVirtualTryOn = async (person: ImageData, cloth: ImageData, type: GarmentType, token: string, garmentDescription?: string, isPlusMode: boolean = false, isMakeoverMode: boolean = false, makeup: string = 'default', lipstick: string = 'default') => {
  try {
    // 0. Resize images before sending to avoid Netlify timeout (10s limit) and Payload Too Large errors
    // Ensure we handle File, Base64, or URL
    const personInput = person.file || person.base64 || person.url;
    const clothInput = cloth.file || cloth.base64 || cloth.url;

    if (!personInput || !clothInput) {
        throw new Error("Two images are required (person and garment)");
    }

    const personImage = await resizeImage(personInput);
    const clothImage = await resizeImage(clothInput);

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
        garmentDescription: garmentDescription,
        isPlusMode: isPlusMode,
        isMakeoverMode: isMakeoverMode,
        makeup: makeup,
        lipstick: lipstick
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
    const maxAttempts = 100; // 5 minutes timeout
    let attempts = 0;
    let consecutiveFetchErrors = 0;
    const maxConsecutiveFetchErrors = 5;

    while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, pollInterval));

        try {
            const statusResponse = await fetch(`/api/generate?id=${encodeURIComponent(predictionId)}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Reset error counter on successful fetch
            consecutiveFetchErrors = 0;

            if (!statusResponse.ok) {
                // If it's a server error but the request reached the server, we might want to wait and try again
                if (statusResponse.status >= 500) {
                    continue;
                }
                const errorData = await statusResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Server Error: ${statusResponse.status}`);
            }

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
        } catch (fetchErr: any) {
            consecutiveFetchErrors++;
            console.warn(`Fetch attempt ${attempts} failed (${consecutiveFetchErrors}/${maxConsecutiveFetchErrors}):`, fetchErr);
            
            // If we hit too many consecutive fetch errors (like "Failed to fetch"), then give up
            if (consecutiveFetchErrors >= maxConsecutiveFetchErrors) {
                throw new Error(`Network Error: Connection lost during generation. Please check your internet. (${fetchErr.message})`);
            }
            // Otherwise, just continue to the next attempt (wait and try again)
            continue;
        }
        
        // If 'starting' or 'processing', continue loop
    }
    
    throw new Error("Timeout waiting for generation.");

  } catch (error: any) {
    console.error("Virtual Try-On Error:", error);
    throw new Error(error.message || 'An error occurred while connecting to the server');
  }
};

export const generateHairStyle = async (
  image: string,
  style: string,
  color: string,
  keepStyle: boolean,
  token: string,
  model: string = 'google/gemini-2.5-flash-image',
  customPrompt: string = ''
) => {
  try {
    // 0. Resize image to avoid payload limits
    const resizedImage = await resizeImage(image);

    // 1. Start Prediction
    const startResponse = await fetch('/api/hair-styler', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        image: resizedImage, 
        style, 
        color,
        keepStyle,
        model,
        customPrompt
      }),
    });

    if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${startResponse.status}`);
    }

    const startData = await startResponse.json();
    const predictionId = startData.id;

    if (!predictionId) {
        throw new Error("No prediction ID returned from server.");
    }

    // 2. Poll for status
    const pollInterval = 3000;
    const maxAttempts = 100;
    let attempts = 0;
    let consecutiveFetchErrors = 0;
    const maxConsecutiveFetchErrors = 5;

    while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, pollInterval));

        try {
            const statusResponse = await fetch(`/api/hair-styler?id=${encodeURIComponent(predictionId)}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Reset error counter on successful fetch
            consecutiveFetchErrors = 0;

            if (!statusResponse.ok) {
                if (statusResponse.status >= 500) continue;
                const errorData = await statusResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Server Error: ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json();

            if (statusData.status === 'succeeded') {
                return statusData.output;
            } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
                throw new Error(statusData.error || "Generation failed.");
            }
        } catch (fetchErr: any) {
            consecutiveFetchErrors++;
            console.warn(`Fetch attempt ${attempts} failed (${consecutiveFetchErrors}/${maxConsecutiveFetchErrors}):`, fetchErr);
            if (consecutiveFetchErrors >= maxConsecutiveFetchErrors) {
                throw new Error(`Network Error: Connection lost during generation. (${fetchErr.message})`);
            }
            continue;
        }
    }
    throw new Error("Timeout waiting for generation.");

  } catch (err: any) {
    console.error("Hair Styler Error:", err);
    throw err;
  }
};

export const generateTextToImage = async (
  images: string[],
  prompt: string,
  token: string,
  aspectRatio: '9:16' | '16:9' | 'Match Input Image' = 'Match Input Image'
) => {
  try {
  let resizedImages = [];
  if (images && images.length > 0) {
    // Resize all provided images
    resizedImages = await Promise.all(images.map(img => resizeImage(img)));
  }

  // Map UI aspect ratio to backend value
  let backendAspectRatio = 'match_input_image';
  if (aspectRatio === '9:16') backendAspectRatio = '9:16';
  else if (aspectRatio === '16:9') backendAspectRatio = '16:9';

  const startResponse = await fetch('/api/text-to-image', {
    method: 'POST',
    headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
    images: resizedImages, 
    prompt,
    aspectRatio: backendAspectRatio
    }),
  });

  if (!startResponse.ok) {
    const errorData = await startResponse.json().catch(() => ({}));
    throw new Error(errorData.error || `Server Error: ${startResponse.status}`);
  }

  const startData = await startResponse.json();
  const predictionId = startData.id;

  if (!predictionId) {
    throw new Error("No prediction ID returned from server.");
  }

  // Poll for status
  const pollInterval = 3000;
  const maxAttempts = 100;
  let attempts = 0;
  let consecutiveFetchErrors = 0;
  const maxConsecutiveFetchErrors = 5;

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise(r => setTimeout(r, pollInterval));

    try {
      const statusResponse = await fetch(`/api/text-to-image?id=${encodeURIComponent(predictionId)}`, {
         headers: { 'Authorization': `Bearer ${token}` }
      });
          
      // Reset error counter on successful fetch
      consecutiveFetchErrors = 0;

      if (!statusResponse.ok) {
        if (statusResponse.status >= 500) continue;
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${statusResponse.status}`);
      }

      const statusData = await statusResponse.json();

      if (statusData.status === 'succeeded') {
        return statusData.output;
      } else if (statusData.status === 'failed' || statusData.status === 'canceled') {
        throw new Error(statusData.error || "Generation failed.");
      }
    } catch (fetchErr: any) {
      consecutiveFetchErrors++;
      console.warn(`Fetch attempt ${attempts} failed (${consecutiveFetchErrors}/${maxConsecutiveFetchErrors}):`, fetchErr);
      if (consecutiveFetchErrors >= maxConsecutiveFetchErrors) {
        throw new Error(`Network Error: Connection lost during generation. (${fetchErr.message})`);
      }
      continue;
    }
  }
  throw new Error("Timeout waiting for generation.");

  } catch (err: any) {
    console.error("TextToImage Error:", err);
    throw err;
  }
};

export const analyzeStyle = async (image: string) => {
  // Mock analysis for speed
  return {
    fitScore: 94,
    colorScore: 88,
    styleGrade: 'A+',
    tips: ['Colors match skin tone perfectly', 'Fit looks perfect at the shoulders', 'Great coordination for formal events']
  };
};
