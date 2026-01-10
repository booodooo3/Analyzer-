import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Button } from './components/Button';
import { performVirtualTryOn, analyzeStyle } from './services/geminiService';
import { ImageData, AppState, GarmentType } from './types';

interface ResultImages {
  front: string;
  side: string;
  full: string;
}

interface AnalysisResult {
  fitScore: number;
  colorScore: number;
  styleGrade: string;
  tips: string[];
}

interface ClothingSample {
  id: string;
  name: string;
  type: GarmentType;
  url: string;
}

type Lang = 'ar' | 'en';

const CLOTHING_SAMPLES: ClothingSample[] = [
  { 
    id: 'mens-suit-classic', 
    name: 'بدلة رجالية', 
    type: 'jacket', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:c25ec5aa-1275-4fa6-a99f-ea651c765391/as/EID-b23b17624ba58e6ef254783aabe1506f45a66951.jpg?preferwebp=true&&auto=webp&width=960' 
  },
  { 
    id: 'chiffon-seamed-blouse', 
    name: 'بلوزة شيفون بدرزات', 
    type: 'shirt', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:22d952e5-353c-4d06-b868-1f7d10e692c3/as/EID-3d686024ff8b472a33b1000a82b88584f79afd20.jpg?preferwebp=true&width=1920&auto=webp' 
  },
  { 
    id: 'elegant-blue-patterned', 
    name: 'قميص منقوش راقي', 
    type: 'shirt', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:1e10c2d1-6bc9-403d-8947-afcabf028707/as/EID-6c86442f168d579d8fcb0ceffa2df42a636c4a6b.jpg?preferwebp=true&width=1920&auto=webp' 
  },
  { 
    id: 'royal-red-dress', 
    name: 'بنطلون رياضي واسع', 
    type: 'pants', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:eb66fc0a-948b-4e5a-8fa0-6b53b09c3304/as/EID-672a43a479f4f10ff8d564eb44086ed6acbbd2ed.jpg?preferwebp=true&width=1920&auto=webp' 
  },
  { 
    id: 'boho-chic-dress', 
    name: 'فستان عصري بوهيمي', 
    type: 'long_dress', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:8a4bf0bb-855e-423f-88c3-9b52446e4e23/as/EID-dc1dccd77cc851bbde5ac37555247844bd237f89.jpg?preferwebp=true&width=1920&auto=webp' 
  },
  { 
    id: 'classic-elegant-dress', 
    name: 'ترينق رياضي', 
    type: 'other', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:26773462-c8e5-459a-9e22-036c022e9a98/as/EID-49827a42c05a4a93d83b184f1f8d310af5e56447.jpg?preferwebp=true&width=1920&auto=webp' 
  },
  { 
    id: 'patterned-elegant-dress', 
    name: 'بنطلون قطني بخصر مطوي', 
    type: 'pants', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:3d6a722e-89b1-4c42-9831-e237f816d7cf/as/EID-68bd8dab7afea82792aa1ceaa66e2746b4264615.jpg?preferwebp=true&auto=webp&width=960' 
  },
  { 
    id: 'formal-elegant-gown', 
    name: 'فستان سهرة فاخر', 
    type: 'long_dress', 
    url: 'https://media.alshaya.com/adobe/assets/urn:aaid:aem:b38ddb67-4525-4802-b0f1-f275e70c1d33/as/EID-35ef66eb61d951aba0405929a6152403d022ae63.jpg?preferwebp=true&width=1920&auto=webp' 
  }
];

const App: React.FC = () => {
  const [lang, setLang] = useState<Lang>('ar');
  const [personImage, setPersonImage] = useState<ImageData | null>(null);
  const [clothImage, setClothImage] = useState<ImageData | null>(null);
  const [garmentType, setGarmentType] = useState<GarmentType>('shirt');
  const [results, setResults] = useState<ResultImages | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isClosetOpen, setIsClosetOpen] = useState(false);

  const translations = {
    ar: {
      appName: 'Stylestoo',
      nav: { login: 'دخول' },
      header: { title: 'تجربة الموضة بالذكاء الاصطناعي', subtitle: 'محركنا المتقدم يقوم بتركيب أي قطعة ملابس على صورتك بدقة فيزيائية عالية. لا داعي لغرف القياس بعد الآن.' },
      step1: { 
        label: 'الخطوة 1: ارفع صورتك', 
        desc: 'استخدم صورة واضحة ومواجهة للكاميرا',
        guidelinesTitle: 'إرشادات لصورتك الشخصية:',
        guidelines: [
          'قف بشكل مستقيم ومواجه للكاميرا مباشرة.',
          'تأكد من وجود إضاءة جيدة على وجهك وجسمك.',
          'يفضل ارتداء ملابس بسيطة وضيقة قليلاً لنتائج أفضل.',
          'تجنب الخلفيات المزدحمة؛ الخلفية السادة هي الأفضل.'
        ]
      },
      step2: { 
        label: 'الخطوة 2: اختر الملابس', 
        desc: 'ارفع صورة لقطعة الملابس التي تريد تجربتها',
        typeLabel: 'حدد نوع القطعة:',
        samplesLabel: 'خزانة الملابس',
        openCloset: 'فتح الدولاب',
        closeCloset: 'إغلاق',
        types: {
          shirt: 'قميص / تيشيرت',
          long_dress: 'فستان طويل',
          short_dress: 'فستان قصير',
          long_skirt: 'تنورة طويلة',
          short_skirt: 'تنورة قصيرة',
          pants: 'بنطال',
          jacket: 'جاكيت / معطف',
          other: 'أخرى'
        },
        guidelinesTitle: 'إرشادات لنتائج مثالية:',
        guidelines: [
          'استخدم خلفية بيضاء أو سادة تماماً.',
          'تأكد من أن قطعة الملابس مفرودة وغير مطوية.',
          'تجنب وجود أشخاص أو عارضين في صورة الملابس.',
          'صور القطعة في إضاءة جيدة وواضحة.'
        ]
      },
      actions: { start: 'ابدأ التحويل', cancel: 'إلغاء', save: 'حفظ النتائج', saveThis: 'حفظ الصورة', tryAgain: 'تجربة أخرى', downloading: 'جاري التحميل...' },
      steps: ['تحليل الصور...', 'تحديد أنسجة القماش...', 'رسم أبعاد الجسم...', 'توليد الصور الثلاث...', 'اللمسات النهائية...'],
      results: { title: 'النتائج النهائية', subtitle: 'تم توليد ثلاث زوايا مختلفة لعرض الملابس.', front: 'من الأمام', side: 'من الجنب', full: 'الجسم كامل' },
      analysis: { title: 'تحليل المظهر', fit: 'دقة المقاس', color: 'تناسق اللون', style: 'تقييم الستايل', tips: 'إرشادات للكمال' },
      usedImages: 'الصور المستخدمة',
      footer: '© 2026 Developed by boood0003'
    },
    en: {
      appName: 'Stylestoo',
      nav: { login: 'Login' },
      header: { title: 'AI Fashion Experience', subtitle: 'Our advanced engine morphs any garment onto your photo with physical accuracy. No more fitting rooms.' },
      step1: { 
        label: 'Step 1: Upload Photo', 
        desc: 'Use a clear front-facing portrait',
        guidelinesTitle: 'Guidelines for your photo:',
        guidelines: [
          'Stand straight and face the camera directly.',
          'Ensure even and bright lighting on your body.',
          'Wear simple, form-fitting clothes for best results.',
          'Plain backgrounds yield the highest accuracy.'
        ]
      },
      step2: { 
        label: 'Step 2: Choose Garment', 
        desc: 'Upload the item you want to try',
        typeLabel: 'Select Garment Type:',
        samplesLabel: 'Smart Closet',
        openCloset: 'Open Closet',
        closeCloset: 'Close',
        types: {
          shirt: 'Shirt / T-Shirt',
          long_dress: 'Long Dress',
          short_dress: 'Short Dress',
          long_skirt: 'Long Skirt',
          short_skirt: 'Short Skirt',
          pants: 'Pants',
          jacket: 'Jacket / Coat',
          other: 'Other'
        },
        guidelinesTitle: 'Best results checklist:',
        guidelines: [
          'Use a plain or solid white background.',
          'Ensure the garment is laid flat and unwrinkled.',
          'Do not include models or people in the item photo.',
          'Capture with bright, even lighting.'
        ]
      },
      actions: { start: 'Start Morphing', cancel: 'Cancel', save: 'Save Results', saveThis: 'Save Image', tryAgain: 'Try Another', downloading: 'Downloading...' },
      steps: ['Analyzing images...', 'Identifying textures...', 'Mapping physique...', 'Generating 3 views...', 'Polishing results...'],
      results: { title: 'Final Results', subtitle: 'Three distinct angles generated for your preview.', front: 'Front View', side: 'Side View', full: 'Full Body' },
      analysis: { title: 'Style Analysis', fit: 'Fit Accuracy', color: 'Color Match', style: 'Style Score', tips: 'Tips for Perfection' },
      usedImages: 'Input Images',
      footer: '© 2026 Developed by boood0003'
    }
  };

  const garmentIcons: Record<GarmentType, React.ReactNode> = {
    shirt: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4L4 8v10l8 4 8-4V8l-8-4z M12 4v18 M4 8l8 4 8-4" />
      </svg>
    ),
    long_dress: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L8 6l-1 14h10l-1-14-4-4z" />
      </svg>
    ),
    short_dress: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L9 5l-1 9h8l-1-9-3-3z" />
      </svg>
    ),
    long_skirt: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 4h8l2 16H6L8 4z" />
      </svg>
    ),
    short_skirt: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 4h8l1 8H7l1-8z" />
      </svg>
    ),
    pants: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 2l-2 20h3l2-10 2 10h3L15 2H9z" />
      </svg>
    ),
    jacket: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 3v18h12V3H6z M12 3v18 M6 8h12 M6 13h12" />
      </svg>
    ),
    other: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    )
  };

  const t = translations[lang];

  useEffect(() => {
    if (appState === AppState.PROCESSING) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => (prev < t.steps.length - 1 ? prev + 1 : prev));
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setCurrentStep(0);
    }
  }, [appState, t.steps.length]);

  const handleSampleClick = (sample: ClothingSample) => {
    setGarmentType(sample.type);
    setClothImage({
      base64: '',
      mimeType: 'image/png',
      url: sample.url
    });
    setIsClosetOpen(false); // Close closet after selection
  };

  const handleTryOn = async () => {
    if (!personImage || !clothImage) return;
    setAppState(AppState.PROCESSING);
    setError(null);
    setResults(null);
    setAnalysis(null);

    try {
      const resultData = await performVirtualTryOn(personImage, clothImage, garmentType);
      setResults(resultData);
      
      const styleAnalysis = await analyzeStyle(resultData.front, lang);
      setAnalysis(styleAnalysis);
      
      setAppState(AppState.RESULT);
    } catch (err: any) {
      setError(err.message);
      setAppState(AppState.ERROR);
    }
  };

  const reset = () => {
    setPersonImage(null);
    setClothImage(null);
    setGarmentType('shirt');
    setResults(null);
    setAnalysis(null);
    setAppState(AppState.IDLE);
    setError(null);
  };

  const cancelProcessing = () => {
    setAppState(AppState.IDLE);
    setError(null);
  };

  const downloadSingleImage = (base64: string, name: string) => {
    const link = document.createElement('a');
    link.href = base64;
    link.download = `stylestoo-${name}.png`;
    link.click();
  };

  const handleSaveAll = () => {
    if (!results) return;
    downloadSingleImage(results.front, 'front');
    downloadSingleImage(results.side, 'side');
    downloadSingleImage(results.full, 'full');
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#050505] text-white`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center glass-effect sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-black rotate-45" />
          </div>
          <span className="text-xl font-bold tracking-tighter uppercase mr-2 ml-2">
            {t.appName} <span className="text-zinc-500">AI</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="text-xs font-bold border border-zinc-700 px-3 py-1 rounded-full hover:bg-zinc-800 transition-colors"
          >
            {lang === 'ar' ? 'English' : 'عربي'}
          </button>
          <Button variant="outline" className="text-sm px-4 py-2">{t.nav.login}</Button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {appState === AppState.IDLE || appState === AppState.ERROR ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                {t.header.title}
              </h1>
              <p className="text-zinc-400 max-w-xl mx-auto">{t.header.subtitle}</p>
            </header>

            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Step 1 */}
              <div className="space-y-6">
                <ImageUploader 
                  label={t.step1.label} 
                  description={t.step1.desc}
                  onImageSelected={setPersonImage}
                  currentImage={personImage?.base64}
                />
                
                {/* Person Photo Guidelines */}
                <div className="glass-effect rounded-2xl p-6 border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-4 text-zinc-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h4 className="text-sm font-bold uppercase tracking-wider">{t.step1.guidelinesTitle}</h4>
                  </div>
                  <ul className="space-y-3">
                    {t.step1.guidelines.map((guide, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs text-zinc-400 leading-relaxed">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                        {guide}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-6 items-start">
                  <div className="space-y-6">
                    <ImageUploader 
                      label={t.step2.label} 
                      description={t.step2.desc}
                      onImageSelected={setClothImage}
                      currentImage={clothImage?.base64}
                      currentUrl={clothImage?.url}
                    />

                    {/* Garment Type Grid Selector */}
                    <div className="space-y-4">
                       <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{t.step2.typeLabel}</h4>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                         {(Object.keys(t.step2.types) as GarmentType[]).map((type) => (
                           <button
                             key={type}
                             onClick={() => setGarmentType(type)}
                             className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 gap-2 ${
                               garmentType === type 
                               ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                               : 'bg-white/5 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:bg-white/10'
                             }`}
                           >
                             <div className={garmentType === type ? 'text-black' : 'text-zinc-400'}>
                               {garmentIcons[type]}
                             </div>
                             <span className="text-[10px] font-bold text-center leading-tight">
                               {t.step2.types[type]}
                             </span>
                           </button>
                         ))}
                       </div>
                    </div>
                  </div>
                  
                  {/* Black Closet Component */}
                  <div className="flex flex-col items-center gap-3">
                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">{t.step2.samplesLabel}</h4>
                    <button 
                      onClick={() => setIsClosetOpen(true)}
                      className="w-full aspect-[2/3] bg-zinc-950 border border-zinc-800 rounded-3xl relative overflow-hidden group hover:border-white/20 transition-all shadow-2xl flex flex-col items-center justify-center gap-4"
                    >
                      {/* Closet Doors Detail */}
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-zinc-900 group-hover:bg-zinc-800" />
                      <div className="absolute top-1/2 left-2 w-1.5 h-6 bg-zinc-800 rounded-full" />
                      <div className="absolute top-1/2 right-2 w-1.5 h-6 bg-zinc-800 rounded-full" />
                      
                      <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:scale-110 transition-transform duration-500">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5V2m0 2.5a2.5 2.5 0 00-2.5 2.5h5a2.5 2.5 0 00-2.5-2.5zM4 11.5c0-1.1.9-2 2-2h12a2 2 0 012 2l1 7c.1.6-.4 1.2-1 1.2H4a1 1 0 01-1-1.2l1-7z" />
                           <path d="M7 9.5L12 6.5L17 9.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-500 group-hover:text-white uppercase tracking-tighter transition-colors">
                        {t.step2.openCloset}
                      </span>
                    </button>
                  </div>
                </div>
                
                {/* Clothing Guidelines Panel */}
                <div className="glass-effect rounded-2xl p-6 border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 mb-4 text-zinc-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h4 className="text-sm font-bold uppercase tracking-wider">{t.step2.guidelinesTitle}</h4>
                  </div>
                  <ul className="space-y-3">
                    {t.step2.guidelines.map((guide, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-xs text-zinc-400 leading-relaxed">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-700 shrink-0" />
                        {guide}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-900/20 border border-red-900/40 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-center gap-4 pt-8">
              <Button 
                onClick={handleTryOn} 
                className="w-full md:w-64 text-lg font-bold"
                disabled={!personImage || (!clothImage?.base64 && !clothImage?.url)}
              >
                {t.actions.start}
              </Button>
              {(personImage || clothImage) && (
                <Button variant="outline" onClick={reset} className="w-full md:w-32">
                  {t.actions.cancel}
                </Button>
              )}
            </div>
          </div>
        ) : appState === AppState.PROCESSING ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
            <div className="relative">
              <div className="w-48 h-48 rounded-full border-4 border-zinc-800 border-t-white animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden grayscale opacity-50 animate-pulse">
                   <img src={personImage?.base64} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4 w-full max-sm:px-4">
               {t.steps.map((step, idx) => (
                 <div key={idx} className={`flex items-center gap-3 transition-opacity duration-500 ${idx === currentStep ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`w-2 h-2 rounded-full ${idx < currentStep ? 'bg-green-500' : idx === currentStep ? 'bg-white animate-ping' : 'bg-zinc-700'}`} />
                    <span className="text-sm font-medium">{step}</span>
                 </div>
               ))}
            </div>

            <Button variant="outline" onClick={cancelProcessing}>
              {t.actions.cancel}
            </Button>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in zoom-in duration-700">
            {/* Results Header and Grid */}
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-4 mb-8">
              <div className="text-center md:text-right">
                <h2 className="text-3xl font-bold">{t.results.title}</h2>
                <p className="text-zinc-400">{t.results.subtitle}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>{t.actions.tryAgain}</Button>
                <Button onClick={handleSaveAll}>{t.actions.save}</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { img: results?.front, label: t.results.front, id: 'front' },
                { img: results?.side, label: t.results.side, id: 'side' },
                { img: results?.full, label: t.results.full, id: 'full' }
              ].map((view, i) => (
                <div key={i} className="space-y-3 group">
                  <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold text-center">{view.label}</p>
                  <div className="glass-effect rounded-2xl overflow-hidden shadow-xl aspect-[3/4] relative hover:ring-2 hover:ring-white/20 transition-all duration-300">
                    <img src={view.img} alt={view.label} className="w-full h-full object-cover" />
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <button 
                        onClick={() => downloadSingleImage(view.img!, view.id)}
                        className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-white hover:text-black transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {t.actions.saveThis}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Analysis and Used Images */}
            <div className="grid md:grid-cols-2 gap-8 pt-8">
              <div className="glass-effect p-8 rounded-3xl space-y-6 flex flex-col">
                 <h3 className="text-xl font-bold border-r-4 border-white pr-4">{t.analysis.title}</h3>
                 
                 {analysis ? (
                   <>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-2xl bg-zinc-900/50">
                          <p className="text-2xl font-bold">{analysis.fitScore}%</p>
                          <p className="text-[10px] text-zinc-500">{t.analysis.fit}</p>
                        </div>
                        <div className="text-center p-4 rounded-2xl bg-zinc-900/50">
                          <p className="text-2xl font-bold">{analysis.colorScore}%</p>
                          <p className="text-[10px] text-zinc-500">{t.analysis.color}</p>
                        </div>
                        <div className="text-center p-4 rounded-2xl bg-zinc-900/50">
                          <p className="text-2xl font-bold">{analysis.styleGrade}</p>
                          <p className="text-[10px] text-zinc-500">{t.analysis.style}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-zinc-800">
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1 h-1 bg-white rounded-full"></span>
                        {t.analysis.tips}
                      </h4>
                      <ul className="space-y-2">
                        {analysis.tips.map((tip, idx) => (
                          <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2 leading-relaxed">
                            <span className="text-zinc-600 mt-1">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-12 gap-4 animate-pulse">
                      <div className="w-10 h-10 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
                      <p className="text-sm text-zinc-500 italic">Generating expert styling advice...</p>
                   </div>
                 )}
              </div>

              <div className="glass-effect p-8 rounded-3xl space-y-4">
                 <h3 className="text-xl font-bold">{t.usedImages}</h3>
                 <div className="flex gap-4">
                   <div className="flex-1 aspect-square rounded-2xl overflow-hidden border border-zinc-800 grayscale hover:grayscale-0 transition-all">
                     <img src={personImage?.base64} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1 aspect-square rounded-2xl overflow-hidden border border-zinc-800 grayscale hover:grayscale-0 transition-all">
                     <img src={clothImage?.base64 || clothImage?.url} className="w-full h-full object-cover" />
                   </div>
                 </div>
                 <p className="text-[10px] text-zinc-500 italic opacity-50">Powered by Gemini 2.5 Flash Lite (Optimized).</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CLOSET MODAL/OVERLAY */}
      {isClosetOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsClosetOpen(false)} />
           
           <div className="relative glass-effect w-full max-w-4xl p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-8 overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="flex justify-between items-center">
                 <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">{t.step2.samplesLabel}</h2>
                    <p className="text-zinc-500 text-sm italic">Collection 2026 • AI Recommended</p>
                 </div>
                 <button 
                  onClick={() => setIsClosetOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                 >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {CLOTHING_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSampleClick(sample)}
                    className={`aspect-[3/4] rounded-3xl overflow-hidden border-2 transition-all duration-300 relative group flex items-center justify-center bg-zinc-950 ${
                      clothImage?.url === sample.url
                      ? 'border-white scale-95' 
                      : 'border-white/5 hover:border-white/40'
                    }`}
                  >
                    <img src={sample.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={sample.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{sample.name}</span>
                      <span className="text-[8px] text-zinc-400 mt-1">{t.step2.types[sample.type]}</span>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="text-center pt-4">
                <Button variant="outline" onClick={() => setIsClosetOpen(false)} className="px-8">
                  {t.step2.closeCloset}
                </Button>
              </div>
           </div>
        </div>
      )}

      <footer className="p-12 border-t border-zinc-900 mt-auto bg-zinc-950">
        <div className="max-w-6xl mx-auto text-center space-y-4">
           <p className="text-zinc-600 text-sm">{t.footer}</p>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default App;