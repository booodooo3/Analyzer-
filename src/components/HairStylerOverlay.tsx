import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, Wand2, X } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { generateTextToImage } from '../services/apiService';

interface HairStylerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const styleGroups = [
  {
    title: 'ستايل الصورة',
    color: 'blue',
    options: ['واقعي', 'سينمائي', 'بورتريه احترافي', 'أنمي', 'كرتوني', 'رسم زيتي'],
  },
  {
    title: 'الشعر والمظهر',
    color: 'pink',
    options: ['تسريحة عصرية', 'شعر طويل', 'شعر قصير', 'شعر مموج', 'لحية مرتبة', 'مظهر طبيعي'],
  },
  {
    title: 'الملابس',
    color: 'amber',
    options: ['رسمي', 'كاجوال', 'رياضي', 'تقليدي', 'بدلة أنيقة', 'ملابس عصرية'],
  },
  {
    title: 'الخلفية',
    color: 'cyan',
    options: ['استوديو', 'مدينة عصرية', 'طبيعة', 'شاطئ', 'مكتب أنيق', 'خلفية بسيطة'],
  },
  {
    title: 'الإضاءة والألوان',
    color: 'violet',
    options: ['إضاءة ناعمة', 'إضاءة سينمائية', 'ألوان دافئة', 'ألوان باردة', 'ألوان زاهية', 'أبيض وأسود'],
  },
  {
    title: 'زاوية التصوير',
    color: 'green',
    options: ['أمامية', 'من الجانب', 'لقطة قريبة', 'نصف الجسم', 'صورة كاملة', 'لقطة عفوية'],
  },
];

const selectedStyles: Record<string, string> = {
  blue: 'border-cyan-500 bg-sky-500 text-white',
  pink: 'border-pink-500 bg-pink-600 text-white',
  amber: 'border-amber-500 bg-amber-500 text-white',
  cyan: 'border-cyan-500 bg-cyan-600 text-white',
  violet: 'border-violet-500 bg-violet-600 text-white',
  green: 'border-emerald-500 bg-emerald-600 text-white',
};

export const HairStylerOverlay: React.FC<HairStylerOverlayProps> = ({ isOpen, onClose }) => {
  const { getToken } = useAuth();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [preserveIdentity, setPreserveIdentity] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    reader.onerror = () => setError('تعذر قراءة الصورة. حاول اختيار صورة أخرى.');
    reader.readAsDataURL(file);
  };

  const toggleOption = (group: string, option: string) => {
    setSelections(current => {
      const selected = current[group] || [];
      return {
        ...current,
        [group]: selected.includes(option)
          ? selected.filter(item => item !== option)
          : [...selected, option],
      };
    });
    setResultImage(null);
  };

  const handleGenerate = async () => {
    if (!userImage) {
      setError('ارفع صورة شخصية أولاً.');
      return;
    }

    const selectedOptions = styleGroups.flatMap(group => selections[group.title] || []);
    if (!prompt.trim() && selectedOptions.length === 0) {
      setError('اكتب وصفاً أو اختر بعض خيارات المظهر.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('يرجى تسجيل الدخول أولاً.');

      const styleDescription = selectedOptions.length
        ? `Apply these appearance choices: ${selectedOptions.join(', ')}.`
        : '';
      const identityInstruction = preserveIdentity
        ? 'Preserve the person’s identity, face, and facial features. '
        : '';
      const fullPrompt = [
        'Edit the uploaded portrait according to the following instructions.',
        identityInstruction,
        styleDescription,
        prompt.trim(),
        'Create a polished, high-quality image with natural details.',
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
      setError(generationError instanceof Error ? generationError.message : 'تعذر إنشاء الصورة.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#111827] text-white" dir="rtl">
      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-white/5 bg-[#1f2937] px-4 sm:px-8">
        <span className="rounded-full bg-slate-700 px-3 py-1 text-[10px] text-slate-200">English</span>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span># Smart Style Changer</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600"><Wand2 className="h-3.5 w-3.5" /></span>
        </div>
        <button onClick={onClose} aria-label="إغلاق" className="rounded-full p-2 text-slate-400 hover:bg-slate-700 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-[500px] flex-col gap-3 px-3 py-4 sm:px-4">
        <section className="rounded-xl border border-slate-700 bg-[#1f2937] p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold">
            <span>اختيار الصورة الشخصية</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px]">1</span>
          </div>
          {userImage ? (
            <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-lg border border-slate-600 sm:h-36 sm:w-36">
              <img src={userImage} alt="الصورة الشخصية" className="h-full w-full object-cover" />
              <button
                onClick={() => {
                  setUserImage(null);
                  setResultImage(null);
                }}
                aria-label="إزالة الصورة"
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-400"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="absolute inset-x-0 bottom-0 bg-black/65 py-1.5 text-[10px] font-semibold"
              >
                تغيير الصورة
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-600 text-[10px] text-slate-300 transition hover:border-pink-400 hover:bg-slate-800"
              >
                <Camera className="h-4 w-4 text-pink-400" />
                التقاط بالكاميرا
              </button>
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-600 text-[10px] text-slate-300 transition hover:border-indigo-400 hover:bg-slate-800"
              >
                <ImageIcon className="h-4 w-4 text-indigo-400" />
                رفع من الجهاز
              </button>
            </div>
          )}
          <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handleImageUpload} className="hidden" />
        </section>

        <section className="rounded-xl border border-slate-700 bg-[#1f2937] p-3">
          <div className="mb-3 flex items-center justify-between text-[11px] font-bold">
            <span>تخصيص المظهر</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px]">2</span>
          </div>

          <div className={`mb-3 rounded-lg border p-3 transition ${preserveIdentity ? 'border-emerald-700 bg-emerald-950/30' : 'border-slate-700 bg-slate-900/50'}`}>
            <button
              onClick={() => setPreserveIdentity(value => !value)}
              aria-pressed={preserveIdentity}
              className="flex w-full items-center justify-between gap-3 text-right"
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded border ${preserveIdentity ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'}`}>
                {preserveIdentity && <span className="text-xs font-bold">✓</span>}
              </span>
              <span className="flex-1 text-[11px] font-bold">حفظ ملامح الوجه</span>
              <span className="text-[9px] text-emerald-300">{preserveIdentity ? 'مفعل 100%' : 'غير مفعل'}</span>
            </button>
            <p className="mt-2 text-[9px] leading-4 text-slate-400">
              يحافظ على هوية الشخص وملامح الوجه أثناء تطبيق التغييرات المطلوبة.
            </p>
          </div>

          <label htmlFor="style-description" className="mb-1 block text-[10px] font-bold text-slate-300">صف التغييرات التي تريدها</label>
          <textarea
            id="style-description"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder="مثال: اجعل الصورة احترافية بإضاءة ناعمة وخلفية عصرية..."
            rows={2}
            className="mb-3 w-full resize-y rounded-lg border border-slate-700 bg-[#111827] p-2.5 text-[10px] leading-5 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />

          <div className="space-y-2.5">
            {styleGroups.map(group => (
              <div key={group.title} className="rounded-lg border border-slate-700/80 bg-[#172131] p-2">
                <h3 className="mb-2 text-[10px] font-bold text-slate-300">{group.title}</h3>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {group.options.map(option => {
                    const selected = (selections[group.title] || []).includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => toggleOption(group.title, option)}
                        aria-pressed={selected}
                        className={`min-h-8 rounded-md border px-2 py-1.5 text-[9px] transition ${selected ? selectedStyles[group.color] : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:bg-slate-700'}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-950/40 p-2 text-center text-[10px] text-red-300">{error}</p>}

        {resultImage && (
          <section className="rounded-xl border border-slate-700 bg-[#1f2937] p-3">
            <h2 className="mb-2 text-[11px] font-bold">النتيجة</h2>
            <img src={resultImage} alt="الصورة بعد تعديل المظهر" className="mx-auto max-h-80 rounded-lg object-contain" />
          </section>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !userImage}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 py-3 text-xs font-bold shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none"
        >
          {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ إنشاء المظهر...</> : <><Wand2 className="h-4 w-4" /> توليد المظهر الجديد</>}
        </button>
        <p className="pb-3 text-center text-[9px] text-slate-500">0.5 رصيد لكل عملية توليد</p>
      </main>
    </div>
  );
};
