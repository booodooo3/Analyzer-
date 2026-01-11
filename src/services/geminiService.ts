import { ImageData, GarmentType } from '../types';

export const performVirtualTryOn = async (person: ImageData, cloth: ImageData, type: GarmentType) => {
  // هنا نجهز الوصف للذكاء الاصطناعي
  // ملاحظة: نرسل وصف نصي لأن دالة generate الحالية تدعم النصوص
  // لتطويرها لتدعم الصور تحتاج تعديل الباك إند، لكن سنجرب الربط الآن
  const prompt = `Virtual Try-On Task:
  Person Image: [Base64 Image Data...]
  Clothing Image: [Base64 Image Data...]
  Garment Type: ${type}
  
  Please generate a realistic image of the person wearing this clothing.`;

  const response = await fetch('/.netlify/functions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }), // نرسل البيانات
  });

  const data = await response.json();

  if (!data.image) {
    throw new Error(data.error || 'فشل التوليد');
  }

  // نرجع نفس الصورة للزوايا الثلاثة (مؤقتاً)
  return {
    front: data.image,
    side: data.image,
    full: data.image
  };
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
