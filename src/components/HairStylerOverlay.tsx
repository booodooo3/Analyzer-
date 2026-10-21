import React, { useRef, useState } from 'react';
import { Camera, Download, Loader2, Upload, Wand2, X } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { generateTextToImage } from '../services/apiService';

interface HairStylerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type Language = 'en' | 'ar';
type Choice = { id: string; en: string; ar: string; prompt?: string };
type ChoiceGroup = {
  id: string;
  title: { en: string; ar: string };
  options: Choice[];
  layout?: 'cards';
  accent: string;
  selectedStyle: string;
};

const groups: ChoiceGroup[] = [
  {
    id: 'brows',
    title: { en: 'Eyebrow Expression', ar: 'تعبير الحاجبين' },
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
    options: [
      { id: 'modern', en: 'Modern', ar: 'عصري', prompt: 'modern clothing' },
      { id: 'classic', en: 'Classic', ar: 'كلاسيكي', prompt: 'classic clothing' },
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
    layout: 'cards',
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
    options: [
      { id: 'original', en: 'Original Age', ar: 'العمر الأصلي' },
      { id: 'younger', en: 'Younger', ar: 'أصغر سناً', prompt: 'slightly younger appearance' },
      { id: 'older', en: 'Older', ar: 'أكبر سناً', prompt: 'slightly older appearance' },
    ],
  },
  {
    id: 'accessories',
    title: { en: 'Accessories', ar: 'الإكسسوارات' },
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    accent: 'text-zinc-400',
    selectedStyle: 'border-red-500 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.14)_0%,#050505_78%)] text-red-100 shadow-[0_0_5px_rgba(239,68,68,0.85),0_0_18px_rgba(239,68,68,0.4),inset_0_0_14px_rgba(239,68,68,0.1)]',
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
    generate: 'Generate New Look',
    generating: 'Generating...',
    result: 'Generated Result',
    download: 'Download Image',
    downloadError: 'Could not download the image. Please try again.',
    credits: '0.5 credits per generation',
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
    generate: 'إنشاء المظهر الجديد',
    generating: 'جارٍ الإنشاء...',
    result: 'النتيجة',
    download: 'تنزيل الصورة',
    downloadError: 'تعذر تنزيل الصورة. حاول مرة أخرى.',
    credits: '0.5 رصيد لكل عملية إنشاء',
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
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);
  const [identityMatch, setIdentityMatch] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const copy = text[language];
  const isArabic = language === 'ar';

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUserImage(reader.result);
        setResultImage(null);
        setError(null);
      }
    };
    reader.onerror = () => setError(copy.uploadError);
    reader.readAsDataURL(file);
  };

  const handleDownload = async () => {
    if (!resultImage) return;

    try {
      const response = await fetch(resultImage);
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
    setResultImage(null);
  };

  const getChoice = (group: ChoiceGroup) => group.options.find(option => option.id === selections[group.id]);

  const renderChoiceGroup = (group: ChoiceGroup) => (
    <section key={group.id} className="min-w-0 rounded-lg border border-zinc-800 bg-black p-3">
      <h3 className={`mb-3 text-xs font-bold uppercase tracking-wide sm:text-sm ${group.accent}`}>{group.title[language]}</h3>
      <div className={`grid ${group.layout === 'cards' ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
        {group.options.map(option => {
          const selected = selections[group.id] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectOption(group.id, option.id)}
              aria-pressed={selected}
              style={selected && userImage ? { textShadow: '0 0 8px rgba(239,68,68,0.9), 0 0 18px rgba(239,68,68,0.45)' } : undefined}
              className={`min-h-12 rounded-lg border px-3 py-2.5 text-[11px] leading-snug transition sm:min-h-14 sm:px-4 sm:py-3 sm:text-xs ${
                selected && userImage
                  ? `${group.selectedStyle} font-semibold`
                  : selected
                    ? 'border-zinc-500 bg-zinc-900 font-semibold text-zinc-200'
                  : 'border-zinc-800 bg-[#080808] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              } ${group.layout === 'cards' ? 'text-start' : 'text-center'}`}
            >
              {option[language]}
            </button>
          );
        })}
      </div>
    </section>
  );

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
        '1K',
        'jpg'
      );
      setResultImage(output);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : copy.generationError);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#050505] text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-black">
        <div className="mx-auto flex h-14 w-full max-w-[1536px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400"><Wand2 className="h-4 w-4" /></span>
            <span>{copy.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(current => current === 'en' ? 'ar' : 'en')}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[9px] text-zinc-400 hover:bg-zinc-800"
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
        <section className="rounded-2xl border border-zinc-800 bg-black p-5 transition-all duration-500 sm:p-7">
          <div className="mb-3 flex items-center justify-between text-xs font-bold sm:text-sm">
            <span className="flex items-center gap-1.5">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-colors ${
                userImage ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-400'
              }`}>{userImage ? '✓' : '1'}</span>
              {copy.choosePhoto}
            </span>
          </div>
          {userImage ? (
            <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-xl border border-slate-600 sm:h-48 sm:w-48">
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
                className="flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-black text-sm text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-950 sm:h-40 sm:text-base"
              >
                <Upload className="h-7 w-7 text-zinc-400" />
                {copy.upload}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700 bg-black text-sm text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-950 sm:h-40 sm:text-base"
              >
                <Camera className="h-7 w-7 text-zinc-400" />
                {copy.camera}
              </button>
            </div>
          )}
          <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleImageUpload} className="hidden" />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-black p-5 transition-all duration-500 sm:p-7">
          <div className="mb-4 flex items-center justify-between text-xs font-bold sm:text-sm">
            <span className="flex items-center gap-1.5">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] transition-colors ${
                userImage ? 'bg-red-700 text-white shadow-[0_0_10px_rgba(239,68,68,0.45)]' : 'bg-zinc-800 text-zinc-400'
              }`}>2</span>
              {copy.customize}
            </span>
            <span className="rounded-full border border-zinc-800 px-3 py-1 text-[9px] text-zinc-500 sm:text-[10px]">✓ {copy.exactMatch}</span>
          </div>

          <section className="mb-5 rounded-xl border border-zinc-800 bg-black p-5 transition-all duration-500 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-400">✓</span>
              <span className="flex-1 text-[11px] font-bold text-zinc-400 sm:text-xs">{copy.identity}</span>
              <span className="rounded border border-zinc-800 px-2 py-1 text-[8px] text-zinc-500 sm:text-[9px]">{copy.locked}</span>
            </div>
            <p className="my-2 text-[9px] leading-4 text-slate-500 sm:text-[10px]">{copy.identityDescription}</p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={identityMatch}
                onChange={event => setIdentityMatch(Number(event.target.value))}
                aria-label={copy.identity}
                className="h-1 flex-1 cursor-pointer accent-red-500"
              />
              <span className="w-9 text-right text-[10px] font-bold text-slate-300">{identityMatch}%</span>
            </div>
            <div className="mt-1 flex justify-between text-[8px] text-slate-600">
              <span>0% ({copy.flexible})</span>
              <span>100% ({copy.locked})</span>
            </div>
          </section>

          <section className="mb-5 rounded-xl border border-zinc-800 bg-black p-5 transition-all duration-500 sm:p-6">
            <h3 className="mb-3 text-[11px] font-bold text-zinc-400 sm:text-xs">
              {isArabic ? 'تعابير الوجه (الحواجب والفم ونظرة العين)' : 'Facial Expressions (Brows, Mouth & Eye Gaze)'}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {groups.slice(0, 3).map(group => renderChoiceGroup(group))}
            </div>
          </section>

          <label htmlFor="style-description" className="mb-2 block text-[10px] font-bold text-slate-300 sm:text-xs">{copy.extraDetails}</label>
          <textarea
            id="style-description"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder={copy.promptPlaceholder}
            rows={3}
            className="mb-5 w-full resize-y rounded-lg border border-zinc-800 bg-black p-4 text-xs leading-6 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none sm:text-sm"
          />

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-black p-4 sm:p-5">
              {renderChoiceGroup(groups[3])}
              {renderChoiceGroup(groups[4])}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-4 sm:p-5">
              {renderChoiceGroup(groups[5])}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black p-4 sm:p-5">
              {renderChoiceGroup(groups[6])}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {groups.slice(7).map(group => (
              <div key={group.id} className="rounded-xl border border-zinc-800 bg-black p-4 sm:p-5">
                {renderChoiceGroup(group)}
              </div>
            ))}
          </div>
        </section>

        {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-950/40 p-2 text-center text-[8px] text-red-300">{error}</p>}

        {resultImage && (
          <section className="rounded-xl border border-zinc-800 bg-black p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">{copy.result}</h2>
              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                <Download className="h-4 w-4" />
                {copy.download}
              </button>
            </div>
            <img src={resultImage} alt={copy.result} className="mx-auto max-h-[32rem] rounded-lg object-contain" />
          </section>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !userImage}
          className="mx-auto flex w-fit min-w-48 items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-7 py-3 text-xs font-bold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600"
        >
          {isGenerating
            ? <><Loader2 className="h-4 w-4 animate-spin" />{copy.generating}</>
            : <><Wand2 className="h-4 w-4" />{copy.generate}</>}
        </button>
        <p className="pb-2 text-center text-[9px] text-slate-500">{copy.credits}</p>
      </main>
    </div>
  );
};
