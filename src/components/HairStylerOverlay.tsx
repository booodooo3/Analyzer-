import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Camera,
  Check,
  Download,
  Eye,
  Glasses,
  Loader2,
  Move,
  Palette,
  ScanFace,
  Scissors,
  Shirt,
  Smile,
  Sparkles,
  UserRound,
  Upload,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { generateTextToImage } from '../services/apiService';

interface HairStylerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type Language = 'en' | 'ar';
type OutputResolution = '2K' | '4K';
type Choice = { id: string; en: string; ar: string; prompt?: string };
type GeneratedImage = { id: string; url: string; expiresAt: number };
type ChoiceGroup = {
  id: string;
  title: { en: string; ar: string };
  icon: LucideIcon;
  options: Choice[];
  layout?: 'cards';
  accent: string;
  selectedStyle: string;
};

const selectedChoiceStyle = 'border-[#626675] bg-[#393c46] text-zinc-100 shadow-none';

const groups: ChoiceGroup[] = [
  {
    id: 'brows',
    title: { en: 'Eyebrow Expression', ar: 'تعبير الحاجبين' },
    icon: ScanFace,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Brows', ar: 'الحاجبان الأصليان' },
      { id: 'raised', en: 'Raised', ar: 'مرفوعان', prompt: 'raised eyebrows' },
      { id: 'connected', en: 'Connected / Unibrow', ar: 'حاجبان متصلان' },
      { id: 'happy', en: 'Happy / Relaxed', ar: 'سعيدان / مسترخيان' },
      { id: 'angry', en: 'Angry / Furrowed', ar: 'غاضبان / مقطبان' },
      { id: 'amazed', en: 'Amazed / Astonished', ar: 'مندهشان' },
    ],
  },
  {
    id: 'mouth',
    title: { en: 'Mouth & Smile Expression', ar: 'تعبير الفم والابتسامة' },
    icon: Smile,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Mouth', ar: 'الفم الأصلي' },
      { id: 'smiling', en: 'Smiling', ar: 'ابتسامة', prompt: 'smiling naturally' },
      { id: 'not-smiling', en: 'Not Smiling', ar: 'بدون ابتسامة', prompt: 'a neutral closed-mouth expression' },
      { id: 'laughing', en: 'Laughing', ar: 'ضحك', prompt: 'laughing' },
      { id: 'slightly-open', en: 'Slightly Open (Visible Teeth)', ar: 'مفتوح قليلاً (أسنان ظاهرة)' },
      { id: 'teeth', en: 'Teeth Edges / Tips Showing', ar: 'ظهور أطراف الأسنان' },
    ],
  },
  {
    id: 'gaze',
    title: { en: 'Eye Gaze & Look', ar: 'نظرة العينين' },
    icon: Eye,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Gaze', ar: 'النظرة الأصلية' },
      { id: 'normal', en: 'Normal Look', ar: 'نظرة طبيعية' },
      { id: 'happy', en: 'Happy Look', ar: 'نظرة سعيدة', prompt: 'a happy expression in the eyes' },
      { id: 'angry', en: 'Angry Glare', ar: 'نظرة غاضبة' },
      { id: 'sunlight', en: 'Sunlight Protection', ar: 'حماية من ضوء الشمس' },
      { id: 'smirk', en: 'Mocking / Smirk', ar: 'نظرة ساخرة' },
    ],
  },
  {
    id: 'pose',
    title: { en: 'Pose', ar: 'الوضعية' },
    icon: Move,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'automatic', en: 'Automatic', ar: 'تلقائي' },
      { id: 'standing', en: 'Standing', ar: 'وقوف', prompt: 'standing pose' },
      { id: 'sitting', en: 'Sitting', ar: 'جلوس', prompt: 'sitting pose' },
      { id: 'lying', en: 'Lying Down', ar: 'استلقاء', prompt: 'lying down pose' },
    ],
  },
  {
    id: 'clothing',
    title: { en: 'Clothing', ar: 'الملابس' },
    icon: Shirt,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'modern', en: 'Modern', ar: 'عصري', prompt: 'modern clothing' },
      { id: 'original', en: 'Original Clothes', ar: 'الملابس الأصلية', prompt: 'preserve the original clothing exactly as shown in the input image' },
      { id: '60s', en: '60s', ar: 'الستينيات', prompt: '1960s clothing' },
      { id: '70s', en: '70s', ar: 'السبعينيات', prompt: '1970s clothing' },
      { id: '80s', en: '80s', ar: 'الثمانينيات', prompt: '1980s clothing' },
      { id: 'y2k', en: 'Y2K', ar: 'أزياء الألفينات', prompt: 'early 2000s clothing' },
      { id: 'formal', en: 'Formal', ar: 'رسمي', prompt: 'formal clothing' },
      { id: 'casual', en: 'Casual', ar: 'كاجوال', prompt: 'casual clothing' },
    ],
  },
  {
    id: 'beard',
    title: { en: 'Beard & Facial Hair', ar: 'اللحية وشعر الوجه' },
    icon: UserRound,
    layout: 'cards',
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Beard (Auto)', ar: 'اللحية الأصلية (تلقائي)', prompt: 'preserve the original facial hair' },
      { id: 'goatee', en: 'Dirty Goatee', ar: 'سكسوكة خفيفة', prompt: 'a subtle goatee and chin beard' },
      { id: 'defined', en: 'Heavy Defined', ar: 'لحية كثيفة ومحددة', prompt: 'a thick, sharply defined full beard' },
      { id: 'natural', en: 'Heavy Natural (Unlined)', ar: 'لحية كثيفة طبيعية', prompt: 'a thick, natural unlined beard' },
      { id: 'stubble', en: 'Machine #1 (Stubble)', ar: 'ماكينة رقم 1 (خفيفة)', prompt: 'very light stubble' },
      { id: 'medium-stubble', en: 'Machine #3 (Medium Stubble)', ar: 'ماكينة رقم 3 (متوسطة)', prompt: 'neatly trimmed medium stubble' },
      { id: 'clean', en: 'Clean Shaven (No Beard)', ar: 'حلاقة كاملة بدون لحية', prompt: 'a clean-shaven face with no beard' },
    ],
  },
  {
    id: 'hair',
    title: { en: 'Hairstyles & Cuts', ar: 'تسريحات وقصات الشعر' },
    icon: Scissors,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'automatic', en: 'Automatic (Original)', ar: 'تلقائي (الأصلي)' },
      { id: 'uncombed', en: 'Uncombed', ar: 'غير ممشط', prompt: 'an intentionally uncombed hairstyle' },
      { id: 'spiky', en: 'Spiky', ar: 'شائك', prompt: 'spiky hair' },
      { id: 'messy', en: 'Messy / Tousled', ar: 'فوضوي / منكوش', prompt: 'messy tousled hair' },
      { id: '60s', en: '60s Vintage', ar: 'ستايل الستينيات', prompt: 'a 1960s vintage hairstyle' },
      { id: '70s', en: '70s Retro', ar: 'ستايل السبعينيات', prompt: 'a 1970s retro hairstyle' },
      { id: '80s', en: '80s Big Hair', ar: 'شعر كثيف من الثمانينيات', prompt: 'voluminous 1980s hair' },
      { id: '90s', en: '90s Layers', ar: 'طبقات التسعينيات', prompt: 'a layered 1990s haircut' },
      { id: 'y2k', en: '2000s / Y2K', ar: 'ستايل الألفينات', prompt: 'a Y2K-era hairstyle' },
    ],
  },
  {
    id: 'hairColor',
    title: { en: 'Hair Color', ar: 'لون الشعر' },
    icon: Palette,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original', ar: 'الأصلي' },
      { id: 'black', en: 'Black', ar: 'أسود', prompt: 'natural black hair' },
      { id: 'brown', en: 'Brown', ar: 'بني', prompt: 'natural brown hair' },
      { id: 'blonde', en: 'Blonde', ar: 'أشقر', prompt: 'blonde hair' },
      { id: 'gray', en: 'Gray', ar: 'رمادي', prompt: 'gray hair' },
      { id: 'red', en: 'Red', ar: 'أحمر', prompt: 'red hair' },
    ],
  },
  {
    id: 'age',
    title: { en: 'Age', ar: 'العمر' },
    icon: CalendarDays,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Age', ar: 'العمر الأصلي' },
      { id: 'younger', en: 'Younger', ar: 'أصغر سناً', prompt: 'slightly younger appearance' },
      { id: 'older', en: 'Older', ar: 'أكبر سناً', prompt: 'slightly older appearance' },
    ],
  },
  {
    id: 'accessories',
    title: { en: 'Accessories', ar: 'الإكسسوارات' },
    icon: Glasses,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'none', en: 'No Accessories', ar: 'بدون إكسسوارات' },
      { id: 'glasses', en: 'Glasses', ar: 'نظارات', prompt: 'wearing stylish glasses' },
      { id: 'sunglasses', en: 'Sunglasses', ar: 'نظارات شمسية', prompt: 'wearing sunglasses' },
      { id: 'hat', en: 'Hat', ar: 'قبعة', prompt: 'wearing a hat' },
      { id: 'earrings', en: 'Earrings', ar: 'أقراط', prompt: 'wearing subtle earrings' },
      { id: 'watch', en: 'Watch', ar: 'ساعة يد', prompt: 'wearing a wristwatch' },
    ],
  },
  {
    id: 'makeup',
    title: { en: "Women's Makeup", ar: 'مكياج النساء' },
    icon: Sparkles,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Makeup', ar: 'المكياج الأصلي' },
      { id: 'none', en: 'No Makeup', ar: 'بدون مكياج', prompt: 'no makeup, natural bare face' },
      { id: 'natural', en: 'Natural Makeup', ar: 'مكياج طبيعي', prompt: 'subtle natural makeup' },
      { id: 'soft', en: 'Soft Glam', ar: 'مكياج ناعم', prompt: 'soft glam makeup' },
      { id: 'full', en: 'Full Glam', ar: 'مكياج كامل', prompt: 'full glam makeup' },
      { id: 'eyes', en: 'Eye Makeup', ar: 'مكياج عيون', prompt: 'tasteful eye makeup' },
    ],
  },
  {
    id: 'skinTexture',
    title: { en: 'Skin Texture', ar: 'ملمس البشرة' },
    icon: ScanFace,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Texture', ar: 'الملمس الأصلي' },
      { id: 'smooth', en: 'Clear & Smooth', ar: 'صافية وناعمة', prompt: 'clear, smooth natural-looking skin, gently even the complexion without changing facial features' },
      { id: 'natural', en: 'Natural Pores', ar: 'مسام طبيعية', prompt: 'natural realistic skin texture with visible pores' },
      { id: 'bumps', en: 'Bumps & Blemishes', ar: 'نتوءات وعيوب البشرة', prompt: 'natural-looking skin with mild visible bumps and blemishes' },
      { id: 'pitted', en: 'Pitted Acne Scars', ar: 'ندبات وحفر البشرة', prompt: 'visible pitted acne scars and uneven skin texture, realistic and natural' },
      { id: 'freckles', en: 'Freckles', ar: 'نمش', prompt: 'natural facial freckles' },
    ],
  },
  {
    id: 'lipColor',
    title: { en: 'Lip Color & Gloss', ar: 'لون الشفاه والقلوس' },
    icon: Smile,
    accent: 'text-zinc-400',
    selectedStyle: selectedChoiceStyle,
    options: [
      { id: 'original', en: 'Original Lips', ar: 'لون الشفاه الأصلي' },
      { id: 'none', en: 'No Lipstick', ar: 'بدون أحمر شفاه', prompt: 'natural bare lips without lipstick' },
      { id: 'red', en: 'Red', ar: 'أحمر', prompt: 'classic red lipstick' },
      { id: 'pink', en: 'Pink', ar: 'وردي', prompt: 'pink lipstick' },
      { id: 'nude', en: 'Nude', ar: 'نيود', prompt: 'natural nude lipstick' },
      { id: 'berry', en: 'Berry', ar: 'توتي', prompt: 'berry lipstick' },
      { id: 'clear-gloss', en: 'Clear Lip Gloss', ar: 'قلوس شفاف', prompt: 'clear glossy lip gloss' },
      { id: 'red-gloss', en: 'Red Gloss', ar: 'قلوس أحمر', prompt: 'red glossy lip gloss' },
      { id: 'pink-gloss', en: 'Pink Gloss', ar: 'قلوس وردي', prompt: 'pink glossy lip gloss' },
    ],
  },
];

const initialSelections: Record<string, string> = {
  brows: 'original',
  mouth: 'original',
  gaze: 'original',
  pose: 'automatic',
  clothing: 'modern',
  beard: 'original',
  hair: 'automatic',
  hairColor: 'original',
  age: 'original',
  accessories: 'none',
  makeup: 'original',
  skinTexture: 'original',
  lipColor: 'original',
};

const text = {
  en: {
    title: 'Smart Style Changer',
    choosePhoto: 'Choose Photo',
    upload: 'Upload from Gallery',
    camera: 'Take a Photo',
    changePhoto: 'Change Photo',
    removePhoto: 'Remove photo',
    customize: 'Customize Look',
    identity: 'Face Identity Preservation',
    identityDescription: 'Preserves the person’s identity and facial features while applying your selected changes.',
    locked: '100% Locked Identity',
    flexible: 'Flexible',
    exactMatch: '100% Exact Match',
    prompt: 'Describe the changes you want',
    promptPlaceholder: 'Describe your desired look...',
    extraDetails: 'Additional Details',
    resolution: 'Output Quality',
    standardResolution: 'Standard · Google 2K',
    goldResolution: 'Gold · Google 4K',
    resolutionNote: 'Google Nano Banana 2.1 supports output up to 4K.',
    standardCost: '0.5 credits',
    goldCost: '1 credit',
    generate: 'Generate New Look',
    generating: 'Generating...',
    result: 'Generated Result',
    download: 'Download Image',
    downloadError: 'Could not download the image. Please try again.',
    imageExpiryWarning: 'Automatically deleted 5 minutes after generation.',
    expiresIn: 'Expires in',
    uploadError: 'Could not read the image. Please choose another photo.',
    imageRequired: 'Please upload a photo first.',
    optionsRequired: 'Choose at least one change or describe the look you want.',
    signIn: 'Please sign in first.',
    generationError: 'Could not generate the image.',
    close: 'Close',
  },
  ar: {
    title: 'مغيّر المظهر الذكي',
    choosePhoto: 'اختر الصورة',
    upload: 'رفع من المعرض',
    camera: 'التقط صورة',
    changePhoto: 'تغيير الصورة',
    removePhoto: 'إزالة الصورة',
    customize: 'تخصيص المظهر',
    identity: 'الحفاظ على هوية الوجه',
    identityDescription: 'يحافظ على هوية الشخص وملامح الوجه أثناء تطبيق التغييرات التي اخترتها.',
    locked: 'تثبيت الهوية 100%',
    flexible: 'مرن',
    exactMatch: 'تطابق 100%',
    prompt: 'صف التغييرات التي تريدها',
    promptPlaceholder: 'اكتب وصف المظهر الذي تريده...',
    extraDetails: 'تفاصيل إضافية',
    resolution: 'جودة الصورة',
    standardResolution: 'عادي · Google 2K',
    goldResolution: 'ذهبي · Google 4K',
    resolutionNote: 'نموذج Google Nano Banana 2.1 يدعم إخراج الصور بدقة تصل إلى 4K.',
    standardCost: 'نصف نقطة',
    goldCost: 'نقطة واحدة',
    generate: 'إنشاء المظهر الجديد',
    generating: 'جارٍ الإنشاء...',
    result: 'النتيجة',
    download: 'تنزيل الصورة',
    downloadError: 'تعذر تنزيل الصورة. حاول مرة أخرى.',
    imageExpiryWarning: 'تحذف الصورة تلقائياً بعد 5 دقائق من إنشائها.',
    expiresIn: 'الوقت المتبقي',
    uploadError: 'تعذرت قراءة الصورة. اختر صورة أخرى.',
    imageRequired: 'ارفع صورة أولاً.',
    optionsRequired: 'اختر تغييراً واحداً على الأقل أو اكتب وصفاً للمظهر.',
    signIn: 'يرجى تسجيل الدخول أولاً.',
    generationError: 'تعذر إنشاء الصورة.',
    close: 'إغلاق',
  },
};

export const HairStylerOverlay: React.FC<HairStylerOverlayProps> = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [userImage, setUserImage] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [prompt, setPrompt] = useState('');
  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);
  const [identityMatch, setIdentityMatch] = useState(100);
  const [outputResolution, setOutputResolution] = useState<OutputResolution>('2K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const copy = text[language];
  const isArabic = language === 'ar';
  const activeImage = generatedImages.find(image => image.id === selectedImageId) || generatedImages[0] || null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setCurrentTime(now);
      setGeneratedImages(images => images.filter(image => image.expiresAt > now));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedImageId && !generatedImages.some(image => image.id === selectedImageId)) {
      setSelectedImageId(generatedImages[0]?.id || null);
    }
  }, [generatedImages, selectedImageId]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUserImage(reader.result);
        setError(null);
      }
    };
    reader.onerror = () => setError(copy.uploadError);
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    if (!activeImage) return;

    try {
      const response = await fetch(activeImage.url);
      if (!response.ok) throw new Error(`Image download failed: ${response.status}`);

      const imageBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `smart-style-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      setError(null);
    } catch (downloadError) {
      console.error('Smart Style Changer download failed:', downloadError);
      setError(copy.downloadError);
    }
  };

  const selectOption = (groupId: string, optionId: string) => {
    setSelections(current => ({ ...current, [groupId]: optionId }));
  };

  const getChoice = (group: ChoiceGroup) => group.options.find(option => option.id === selections[group.id]);

  const renderChoiceGroup = (group: ChoiceGroup) => (
    <section key={group.id} className="min-w-0 rounded-xl border border-[#2b2f3b] bg-[#171a23] p-3 sm:p-4">
      <h3 className={`mb-3 flex items-center gap-2 font-bold uppercase tracking-wide ${isArabic ? 'text-[13px] sm:text-sm' : 'text-xs sm:text-sm'} ${group.accent}`}>
        <group.icon className="h-4 w-4 shrink-0 text-[#858b9a]" aria-hidden="true" />
        {group.title[language]}
      </h3>
      <div className={`grid ${group.layout === 'cards' ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
        {group.options.map(option => {
          const selected = selections[group.id] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectOption(group.id, option.id)}
              aria-pressed={selected}
              className={`rounded-lg border leading-snug transition ${
                isArabic
                  ? 'min-h-10 px-2 py-2 text-[13px] sm:min-h-11 sm:px-3 sm:py-2.5 sm:text-sm'
                  : 'min-h-12 px-3 py-2.5 text-[11px] sm:min-h-14 sm:px-4 sm:py-3 sm:text-xs'
              } ${
                selected && userImage
                  ? `${group.selectedStyle} font-semibold`
                  : selected
                    ? 'border-zinc-700 bg-[#080808] font-semibold text-zinc-300'
                  : 'border-[#303441] bg-[#1a1c25] text-[#aeb2bf] hover:border-[#555a69] hover:text-zinc-100'
              } ${group.layout === 'cards' ? 'text-start' : 'text-center'}`}
            >
              {option[language]}
            </button>
          );
        })}
      </div>
    </section>
  );

  const formatTimeRemaining = (expiresAt: number) => {
    const secondsRemaining = Math.max(0, Math.ceil((expiresAt - currentTime) / 1000));
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleGenerate = async () => {
    if (!userImage) {
      setError(copy.imageRequired);
      return;
    }

    const selectedPrompts = groups
      .filter(group => !['brows', 'mouth', 'gaze'].includes(group.id))
      .map(group => getChoice(group))
      .filter((choice): choice is Choice => Boolean(choice?.prompt))
      .map(choice => choice.prompt as string);
    const expressionPrompts = groups
      .filter(group => ['brows', 'mouth', 'gaze'].includes(group.id))
      .map(group => getChoice(group))
      .filter((choice): choice is Choice => Boolean(choice?.prompt))
      .map(choice => choice.prompt as string);
    const hasChanges = selectedPrompts.length > 0 || expressionPrompts.length > 0 || prompt.trim().length > 0;
    if (!hasChanges) {
      setError(copy.optionsRequired);
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error(copy.signIn);

      const identityInstruction = identityMatch > 0
        ? `Preserve the person's identity and facial features with ${identityMatch}% facial identity similarity. `
        : '';
      const fullPrompt = [
        'Edit the uploaded portrait. Apply only these requested changes:',
        ...selectedPrompts,
        ...expressionPrompts,
        prompt.trim(),
        identityInstruction,
        'Keep the result photorealistic, detailed, and consistent with the input image.',
      ].filter(Boolean).join(' ');

      const output = await generateTextToImage(
        [userImage],
        fullPrompt,
        token,
        'Match Input Image',
        'google/nano-banana-2.1',
        outputResolution,
        'jpg',
        undefined,
        'smart-style-changer'
      );
      const generatedImage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: output,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      setGeneratedImages(images => [generatedImage, ...images].slice(0, 3));
      setSelectedImageId(generatedImage.id);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : copy.generationError);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="smart-style-changer fixed inset-0 z-[100] overflow-y-auto bg-[#191b24] text-[#e6e8ee]" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-20 border-b border-[#303441] bg-[#191b24]">
        <div className="mx-auto flex h-14 w-full max-w-[1536px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#3b404e] bg-[#232631] text-[#aeb2bf]"><Wand2 className="h-4 w-4" /></span>
            <span>{copy.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(current => current === 'en' ? 'ar' : 'en')}
              className="rounded-full border border-[#3b404e] bg-[#232631] px-3 py-1 text-[9px] text-[#b1b5c1] hover:bg-[#2b2f3b]"
            >
              {isArabic ? 'English' : 'العربية'}
            </button>
            <button onClick={onClose} aria-label={copy.close} className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1536px] flex-col gap-6 px-4 py-6 sm:px-8">
        <section className="rounded-2xl border border-[#303441] bg-[#1d2029] p-5 transition-all duration-500 sm:p-7">
          <div className="mb-3 flex items-center justify-between text-xs font-bold sm:text-sm">
            <span className="flex items-center gap-1.5">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-colors ${
                userImage ? 'bg-[#414552] text-zinc-100' : 'bg-[#292d38] text-[#aeb2bf]'
              }`}>{userImage ? '✓' : '1'}</span>
              {copy.choosePhoto}
            </span>
          </div>
          {userImage ? (
            <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-xl border border-[#454a58] sm:h-48 sm:w-48">
              <img src={userImage} alt={copy.choosePhoto} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setUserImage(null);
                  setResultImage(null);
                }}
                aria-label={copy.removePhoto}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-400"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-xs font-semibold"
              >
                {copy.changePhoto}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#454a58] bg-[#191c25] text-sm text-[#aeb2bf] transition hover:border-[#626777] hover:bg-[#20232d] sm:h-40 sm:text-base"
              >
                <Upload className="h-7 w-7 text-[#9da3b2]" />
                {copy.upload}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#454a58] bg-[#191c25] text-sm text-[#aeb2bf] transition hover:border-[#626777] hover:bg-[#20232d] sm:h-40 sm:text-base"
              >
                <Camera className="h-7 w-7 text-[#9da3b2]" />
                {copy.camera}
              </button>
            </div>
          )}
          <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleImageUpload} className="hidden" />
        </section>

        <section className="rounded-2xl border border-[#303441] bg-[#1d2029] p-5 transition-all duration-500 sm:p-7">
          <div className="mb-4 flex items-center justify-between text-xs font-bold sm:text-sm">
            <span className="flex items-center gap-1.5">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-colors ${
                userImage ? 'bg-[#414552] text-zinc-100' : 'bg-[#292d38] text-[#aeb2bf]'
              }`}>2</span>
              {copy.customize}
            </span>
            <span className="rounded-full border border-[#343947] px-3 py-1 text-[9px] text-[#9da3b2] sm:text-[10px]">✓ {copy.exactMatch}</span>
          </div>

          <section className="mb-5 rounded-xl border border-[#303441] bg-[#191c25] p-5 transition-all duration-500 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-[#414655] bg-[#252935] text-xs font-bold text-[#b2b7c3]"><Check className="h-3.5 w-3.5" /></span>
              <span className="flex-1 text-[11px] font-bold text-[#b1b5c1] sm:text-xs">{copy.identity}</span>
              <span className="rounded border border-zinc-800 px-2 py-1 text-[8px] text-zinc-500 sm:text-[9px]">{copy.locked}</span>
            </div>
            <p className="my-2 text-[9px] leading-4 text-[#9298a7] sm:text-[10px]">{copy.identityDescription}</p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={identityMatch}
                onChange={event => setIdentityMatch(Number(event.target.value))}
                aria-label={copy.identity}
                className="h-1 flex-1 cursor-pointer accent-[#858b9a]"
              />
              <span className="w-9 text-right text-[10px] font-bold text-slate-300">{identityMatch}%</span>
            </div>
            <div className="mt-1 flex justify-between text-[8px] text-slate-600">
              <span>0% ({copy.flexible})</span>
              <span>100% ({copy.locked})</span>
            </div>
          </section>

          <section className="mb-5 rounded-xl border border-[#303441] bg-[#191c25] p-4 sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-[#b1b5c1] sm:text-sm">
              <Sparkles className="h-4 w-4 text-[#9da3b2]" aria-hidden="true" />
              {copy.resolution}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: '2K', label: copy.standardResolution, cost: copy.standardCost },
                { value: '4K', label: copy.goldResolution, cost: copy.goldCost },
              ] as const).map(option => {
                const selected = outputResolution === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOutputResolution(option.value)}
                    aria-pressed={selected}
                    className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold transition sm:text-sm ${
                      selected
                        ? 'border-[#626675] bg-[#393c46] text-zinc-100'
                        : 'border-[#303441] bg-[#1a1c25] text-[#aeb2bf] hover:border-[#555a69] hover:text-zinc-100'
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-[10px] font-normal opacity-75 sm:text-xs">{option.cost}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[10px] text-[#9298a7]">{copy.resolutionNote}</p>
          </section>

          <section className="mb-5 rounded-xl border border-[#303441] bg-[#191c25] p-5 transition-all duration-500 sm:p-6">
            <h3 className="mb-3 text-[11px] font-bold text-zinc-400 sm:text-xs">
              {isArabic ? 'تعابير الوجه (الحواجب والفم ونظرة العين)' : 'Facial Expressions (Brows, Mouth & Eye Gaze)'}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {groups.slice(0, 3).map(group => renderChoiceGroup(group))}
            </div>
          </section>

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-4">
              {renderChoiceGroup(groups[3])}
              {renderChoiceGroup(groups[4])}
              {renderChoiceGroup(groups[8])}
            </div>
            <div className="flex flex-col gap-4">
              {renderChoiceGroup(groups[5])}
              {renderChoiceGroup(groups[10])}
              {renderChoiceGroup(groups[7])}
              {renderChoiceGroup(groups[11])}
              {renderChoiceGroup(groups[12])}
            </div>
            <div className="flex flex-col gap-4">
              {renderChoiceGroup(groups[6])}
              {renderChoiceGroup(groups[9])}
              <div className="rounded-xl border border-[#2b2f3b] bg-[#171a23] p-4">
                <label htmlFor="style-description" className="mb-2 block text-[10px] font-bold text-[#b6bbc7] sm:text-xs">{copy.extraDetails}</label>
                <textarea
                  id="style-description"
                  value={prompt}
                  onChange={event => setPrompt(event.target.value)}
                  placeholder={copy.promptPlaceholder}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-[#303441] bg-[#1a1c25] p-4 text-xs leading-6 text-white placeholder:text-[#777d8c] focus:border-[#626a7a] focus:outline-none sm:text-sm"
                />
              </div>
            </div>
          </div>
        </section>

        {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-950/40 p-2 text-center text-[8px] text-red-300">{error}</p>}

        {activeImage && (
          <section className="rounded-xl border border-[#303441] bg-[#1d2029] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">{copy.result}</h2>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 rounded-lg border border-[#3b404e] bg-[#252935] px-4 py-2 text-xs font-bold text-[#d0d3dc] transition hover:border-[#555a69] hover:bg-[#2b2f3b]"
              >
                <Download className="h-4 w-4" />
                {copy.download}
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="flex min-h-56 items-center justify-center rounded-lg border border-[#303441] bg-[#171a23] p-2 sm:min-h-80">
                <img src={activeImage.url} alt={copy.result} className="max-h-[38rem] rounded-lg object-contain" />
              </div>
              <aside className="flex flex-col gap-3" aria-label={copy.result}>
                {generatedImages.map((image, index) => {
                  const secondsRemaining = Math.max(0, Math.ceil((image.expiresAt - currentTime) / 1000));
                  const urgent = secondsRemaining <= 60;
                  const active = activeImage.id === image.id;
                  return (
                    <div
                      key={image.id}
                      className={`rounded-lg border p-2 transition ${
                        active ? 'border-[#626a7a] bg-[#252935]' : 'border-[#303441] bg-[#1a1c25]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedImageId(image.id)}
                        aria-label={`${copy.result} ${generatedImages.length - index}`}
                        aria-pressed={active}
                        className="block w-full"
                      >
                        <img src={image.url} alt="" className="h-24 w-full rounded-md object-cover sm:h-28" />
                      </button>
                      <div className={`mt-2 flex items-center justify-between text-[10px] ${urgent ? 'text-red-400' : 'text-zinc-400'}`}>
                        <span>{copy.expiresIn}</span>
                        <span className="font-mono font-bold">{formatTimeRemaining(image.expiresAt)}</span>
                      </div>
                      <p className={`mt-1 text-[9px] leading-4 ${urgent ? 'text-red-400' : 'text-zinc-500'}`}>
                        {copy.imageExpiryWarning}
                      </p>
                    </div>
                  );
                })}
              </aside>
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !userImage}
          className={`mx-auto flex w-fit min-w-48 items-center justify-center gap-2 rounded-full border px-7 py-3 text-xs font-bold transition-all duration-300 ${
            isGenerating
              ? 'border-emerald-400 bg-emerald-950 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.8),0_0_28px_rgba(16,185,129,0.45),inset_0_0_16px_rgba(16,185,129,0.2)]'
              : 'border-[#3b404e] bg-[#252935] text-[#d0d3dc] hover:border-[#555a69] hover:bg-[#2b2f3b] disabled:cursor-not-allowed disabled:border-[#303441] disabled:bg-[#1a1c25] disabled:text-[#777d8c]'
          }`}
        >
          {isGenerating
            ? <><Loader2 className="h-4 w-4 animate-spin" />{copy.generating}</>
            : <><Wand2 className="h-4 w-4" />{copy.generate}</>}
        </button>
        <p className="pb-2 text-center text-[9px] text-slate-500">
          {outputResolution === '2K' ? copy.standardCost : copy.goldCost}
        </p>
      </main>
    </div>
  );
};
