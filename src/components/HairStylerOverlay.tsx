import React, { useRef, useState } from 'react';
import { Camera, Loader2, Upload, Wand2, X } from 'lucide-react';
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
    accent: 'text-cyan-300',
    selectedStyle: 'border-cyan-400 bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]',
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
    accent: 'text-pink-300',
    selectedStyle: 'border-pink-400 bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)]',
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
    accent: 'text-amber-300',
    selectedStyle: 'border-amber-400 bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]',
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
    accent: 'text-cyan-300',
    selectedStyle: 'border-cyan-400 bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]',
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
    accent: 'text-amber-300',
    selectedStyle: 'border-amber-400 bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]',
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
    accent: 'text-violet-300',
    selectedStyle: 'border-amber-400 bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.3)]',
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
    accent: 'text-pink-300',
    selectedStyle: 'border-pink-400 bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)]',
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
    accent: 'text-orange-300',
    selectedStyle: 'border-orange-400 bg-orange-600 text-white shadow-[0_0_12px_rgba(249,115,22,0.3)]',
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
    accent: 'text-violet-300',
    selectedStyle: 'border-violet-400 bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]',
    options: [
      { id: 'original', en: 'Original Age', ar: 'العمر الأصلي' },
      { id: 'younger', en: 'Younger', ar: 'أصغر سناً', prompt: 'slightly younger appearance' },
      { id: 'older', en: 'Older', ar: 'أكبر سناً', prompt: 'slightly older appearance' },
    ],
  },
  {
    id: 'accessories',
    title: { en: 'Accessories', ar: 'الإكسسوارات' },
    accent: 'text-emerald-300',
    selectedStyle: 'border-emerald-400 bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]',
    options: [
      { id: 'none', en: 'No Accessories', ar: 'بدون إكسسوارات' },
      { id: 'glasses', en: 'Glasses', ar: 'نظارات', prompt: 'wearing stylish glasses' },
      { id: 'sunglasses', en: 'Sunglasses', ar: 'نظارات شمسية', prompt: 'wearing sunglasses' },
      { id: 'hat', en: 'Hat', ar: 'قبعة', prompt: 'wearing a hat' },
      { id: 'earrings', en: 'Earrings', ar: 'أقراط', prompt: 'wearing subtle earrings' },
      { id: 'watch', en: 'Watch', ar: 'ساعة يد', prompt: 'wearing a wristwatch' },
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

  const selectOption = (groupId: string, optionId: string) => {
    setSelections(current => ({ ...current, [groupId]: optionId }));
    setResultImage(null);
  };

  const getChoice = (group: ChoiceGroup) => group.options.find(option => option.id === selections[group.id]);

  const renderChoiceGroup = (group: ChoiceGroup) => (
    <section key={group.id} className="min-w-0 rounded-lg border border-[#282d38] bg-[#191c24] p-2.5">
      <h3 className={`mb-2 text-[9px] font-bold uppercase tracking-wide ${userImage ? group.accent : 'text-zinc-400'}`}>{group.title[language]}</h3>
      <div className={`grid ${group.layout === 'cards' ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5`}>
        {group.options.map(option => {
          const selected = selections[group.id] === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectOption(group.id, option.id)}
              aria-pressed={selected}
              className={`min-h-9 rounded-lg border px-1.5 py-1.5 text-[8px] leading-tight transition sm:text-[9px] ${
                selected && userImage
                  ? `${group.selectedStyle} font-semibold`
                  : selected
                    ? 'border-zinc-500 bg-zinc-500/70 font-semibold text-white'
                  : 'border-[#2a2e38] bg-[#1d2029] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
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
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#111827] text-white" dir={isArabic ? 'rtl' : 'ltr'}>
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#1f2937]">
        <div className="mx-auto flex h-[30px] w-full max-w-[464px] items-center justify-between px-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-600"><Wand2 className="h-3 w-3" /></span>
            <span>{copy.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(current => current === 'en' ? 'ar' : 'en')}
              className="rounded-full border border-slate-600 bg-slate-700 px-3 py-1 text-[9px] text-slate-200 hover:bg-slate-600"
            >
              {isArabic ? 'English' : 'العربية'}
            </button>
            <button onClick={onClose} aria-label={copy.close} className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[464px] flex-col gap-2.5 px-3 py-3">
        <section className={`rounded-lg border p-2.5 transition-all duration-500 ${
          userImage
            ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/30 via-[#1f2937] to-cyan-950/20 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
            : 'border-slate-700 bg-[#1f2937]'
        }`}>
          <div className="mb-2 flex items-center justify-between text-[9px] font-bold">
            <span className="flex items-center gap-1.5">
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] transition-colors ${
                userImage ? 'bg-emerald-500 text-white' : 'bg-indigo-500'
              }`}>{userImage ? '✓' : '1'}</span>
              {copy.choosePhoto}
            </span>
          </div>
          {userImage ? (
            <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-md border border-slate-600">
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
                className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-[8px] font-semibold"
              >
                {copy.changePhoto}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-[58px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-600 text-[8px] text-slate-300 transition hover:border-indigo-400 hover:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5 text-indigo-400" />
                {copy.upload}
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-[58px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-600 text-[8px] text-slate-300 transition hover:border-pink-400 hover:bg-slate-800"
              >
                <Camera className="h-3.5 w-3.5 text-pink-400" />
                {copy.camera}
              </button>
            </div>
          )}
          <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleImageUpload} className="hidden" />
        </section>

        <section className={`rounded-lg border p-2.5 transition-all duration-500 ${
          userImage
            ? 'border-violet-500/50 bg-gradient-to-br from-[#211d32] via-[#1b1e27] to-[#20212d] shadow-[0_0_24px_rgba(139,92,246,0.16)]'
            : 'border-slate-700 bg-[#1b1e27]'
        }`}>
          <div className="mb-2 flex items-center justify-between text-[9px] font-bold">
            <span className="flex items-center gap-1.5">
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] transition-colors ${
                userImage ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-[0_0_10px_rgba(217,70,239,0.6)]' : 'bg-indigo-500'
              }`}>2</span>
              {copy.customize}
            </span>
            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[7px] text-slate-400">✓ {copy.exactMatch}</span>
          </div>

          <section className={`mb-2.5 rounded-lg border p-2 transition-all duration-500 ${
            userImage ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/30 to-cyan-950/20' : 'border-slate-700/70 bg-[#171a22]'
          }`}>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-500 bg-emerald-500 text-[10px] font-bold">✓</span>
              <span className="flex-1 text-[8px] font-bold">{copy.identity}</span>
              <span className="rounded border border-slate-600 px-1.5 py-0.5 text-[7px] text-slate-400">{copy.locked}</span>
            </div>
            <p className="my-1.5 text-[7px] leading-3 text-slate-500">{copy.identityDescription}</p>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={identityMatch}
                onChange={event => setIdentityMatch(Number(event.target.value))}
                aria-label={copy.identity}
                className="h-1 flex-1 cursor-pointer accent-emerald-500"
              />
              <span className="w-7 text-right text-[8px] font-bold text-slate-300">{identityMatch}%</span>
            </div>
            <div className="mt-1 flex justify-between text-[6px] text-slate-600">
              <span>0% ({copy.flexible})</span>
              <span>100% ({copy.locked})</span>
            </div>
          </section>

          <section className={`mb-2.5 rounded-lg border p-2 transition-all duration-500 ${
            userImage
              ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 via-[#171a22] to-orange-950/20'
              : 'border-slate-700/70 bg-[#171a22]'
          }`}>
            <h3 className={`mb-2 text-[9px] font-bold ${userImage ? 'text-amber-200' : 'text-slate-300'}`}>
              {isArabic ? 'تعابير الوجه (الحواجب والفم ونظرة العين)' : 'Facial Expressions (Brows, Mouth & Eye Gaze)'}
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {groups.slice(0, 3).map(group => renderChoiceGroup(group))}
            </div>
          </section>

          <label htmlFor="style-description" className="mb-1 block text-[8px] font-bold text-slate-300">{copy.extraDetails}</label>
          <textarea
            id="style-description"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder={copy.promptPlaceholder}
            rows={2}
            className="mb-2 w-full resize-y rounded-md border border-slate-700 bg-[#111827] p-2 text-[8px] leading-4 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />

          <div className="grid grid-cols-3 items-stretch gap-1.5">
            <div className={`flex flex-col gap-2.5 rounded-lg border p-2 ${
              userImage ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/30 to-[#191c24]' : 'border-[#282d38] bg-[#191c24]'
            }`}>
              {renderChoiceGroup(groups[3])}
              {renderChoiceGroup(groups[4])}
            </div>
            <div className={`rounded-lg border p-2 ${
              userImage ? 'border-violet-500/40 bg-gradient-to-b from-violet-950/30 to-[#191c24]' : 'border-[#282d38] bg-[#191c24]'
            }`}>
              {renderChoiceGroup(groups[5])}
            </div>
            <div className={`rounded-lg border p-2 ${
              userImage ? 'border-pink-500/40 bg-gradient-to-b from-pink-950/30 to-[#191c24]' : 'border-[#282d38] bg-[#191c24]'
            }`}>
              {renderChoiceGroup(groups[6])}
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {groups.slice(7).map(group => (
              <div key={group.id} className={`rounded-lg border p-2 ${
                !userImage
                  ? 'border-[#282d38] bg-[#191c24]'
                  : group.id === 'hairColor'
                  ? 'border-orange-500/25 bg-gradient-to-b from-orange-950/20 to-[#191c24]'
                  : group.id === 'age'
                    ? 'border-violet-500/25 bg-gradient-to-b from-violet-950/20 to-[#191c24]'
                    : 'border-emerald-500/25 bg-gradient-to-b from-emerald-950/20 to-[#191c24]'
              }`}>
                {renderChoiceGroup(group)}
              </div>
            ))}
          </div>
        </section>

        {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-950/40 p-2 text-center text-[8px] text-red-300">{error}</p>}

        {resultImage && (
          <section className="rounded-lg border border-slate-700 bg-[#1f2937] p-2.5">
            <h2 className="mb-2 text-[9px] font-bold">{copy.result}</h2>
            <img src={resultImage} alt={copy.result} className="mx-auto max-h-72 rounded-lg object-contain" />
          </section>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !userImage}
          className="mx-auto flex w-fit min-w-36 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 px-5 py-2 text-[9px] font-bold shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none"
        >
          {isGenerating
            ? <><Loader2 className="h-3 w-3 animate-spin" />{copy.generating}</>
            : <><Wand2 className="h-3 w-3" />{copy.generate}</>}
        </button>
        <p className="pb-2 text-center text-[7px] text-slate-500">{copy.credits}</p>
      </main>
    </div>
  );
};
