import React, { useState } from 'react';
import { X, Languages } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ContentItem = {
  title: string;
  desc: string;
  usage: string;
};

type Section = {
  title: string;
  colorClass: string;
  borderColorClass: string;
  items: ContentItem[];
};

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [language, setLanguage] = useState<'ar' | 'en'>('en');

  if (!isOpen) return null;

  const content: Record<'ar' | 'en', Section[]> = {
    ar: [
      {
        title: "1. الحركات الأساسية (Basic Movements)",
        colorClass: "text-blue-400",
        borderColorClass: "border-blue-500/20",
        items: [
          {
            title: "Static (ثابت)",
            desc: "الشرح: الكاميرا لا تتحرك أبداً.",
            usage: "الاستخدام: للمشاهد الهادئة، التركيز على الحوار، أو عندما يكون هناك الكثير من الحركة داخل المشهد نفسه ولا تريد تشتيت المشاهد."
          },
          {
            title: "Zoom In (تقريب)",
            desc: "الشرح: العدسة تقترب تدريجياً من الهدف.",
            usage: "الاستخدام: للتركيز على تفصيل معين، إظهار رد فعل عاطفي على وجه شخصية، أو زيادة التوتر."
          },
          {
            title: "Zoom Out (تبعيد)",
            desc: "الشرح: العدسة تبتعد تدريجياً لتكشف مساحة أكبر.",
            usage: "الاستخدام: لكشف المكان المحيط (Context)، إظهار الوحدة (شخص صغير في مكان كبير)، أو إنهاء المشهد."
          },
          {
            title: "Pan Left / Pan Right (تحريك أفقي)",
            desc: "الشرح: الكاميرا تدور حول محورها يميناً أو يساراً.",
            usage: "الاستخدام: لمتابعة شخصية تمشي، أو استعراض منظر طبيعي عريض."
          },
          {
            title: "Pan Up / Pan Down (تحريك رأسي)",
            desc: "الشرح: الكاميرا تدور للأعلى أو للأسفل (Tilt).",
            usage: "الاستخدام: لإظهار طول مبنى شاهق، أو النظر لشخصية من القدم إلى الرأس."
          }
        ]
      },
      {
        title: "2. التلاعب بالزمن (Time Effects)",
        colorClass: "text-purple-400",
        borderColorClass: "border-purple-500/20",
        items: [
          {
            title: "Slow Motion (تصوير بطيء)",
            desc: "الشرح: إبطاء سرعة الفيديو.",
            usage: "الاستخدام: لإظهار تفاصيل الحركة السريعة، أو لإضفاء طابع درامي ورومانسي."
          },
          {
            title: "Hyperlapse / Timelapse",
            desc: "الشرح: تسريع الفيديو بشكل كبير.",
            usage: "الاستخدام: لإظهار مرور الوقت (شروق/غروب)، حركة المرور، أو انتقال سريع."
          },
          {
            title: "Freeze Frame (تجميد الإطار)",
            desc: "الشرح: الصورة تتوقف تماماً وتصبح ثابتة للحظات.",
            usage: "الاستخدام: للتعريف بشخصية، أو التأكيد على نهاية صادمة لمشهد."
          },
          {
            title: "Reverse (عكس)",
            desc: "الشرح: تشغيل الفيديو من النهاية للبداية.",
            usage: "الاستخدام: لخدع سحرية، أو استرجاع الزمن، أو تأثيرات فنية غريبة."
          }
        ]
      },
      {
        title: "3. حركات سينمائية متقدمة (Cinematic Moves)",
        colorClass: "text-green-400",
        borderColorClass: "border-green-500/20",
        items: [
          {
            title: "Roll (دوران/دحرجة)",
            desc: "الشرح: الكاميرا تدور حول محور العدسة.",
            usage: "الاستخدام: لخلق شعور بعدم الاتزان، الدوار، الفوضى، أو الأكشن."
          },
          {
            title: "Dolly / Tracking (تتبع)",
            desc: "الشرح: الكاميرا نفسها تتحرك جسدياً للأمام/الخلف أو للجانب.",
            usage: "الاستخدام: لتبع شخصية تمشي، أو الدخول في عمق المشهد بواقعية."
          },
          {
            title: "Orbit / Arc (دوران حول الهدف)",
            desc: "الشرح: الكاميرا تدور في دائرة حول الشخص أو الشيء.",
            usage: "الاستخدام: مشهد بطولي، رومانسي، أو لفحص منتج من جميع الجهات."
          },
          {
            title: "Crane / Boom / Pedestal",
            desc: "الشرح: الكاميرا ترتفع جسدياً للأعلى أو تنخفض للأسفل.",
            usage: "الاستخدام: لقطات تأسيسية تكشف المدينة، أو النزول لمستوى الجمهور."
          }
        ]
      },
      {
        title: "4. تأثيرات خاصة (Special Stylistic Effects)",
        colorClass: "text-orange-400",
        borderColorClass: "border-orange-500/20",
        items: [
          {
            title: "Handheld / Shake (اهتزاز)",
            desc: "الشرح: الكاميرا تهتز قليلاً وكأن شخصاً يحملها بيده.",
            usage: "الاستخدام: لإعطاء طابع واقعي (وثائقي)، أو خلق توتر وخوف."
          },
          {
            title: "Rack Focus (نقل التركيز)",
            desc: "الشرح: تغيير التركيز من جسم قريب إلى بعيد مع تغبيش الآخر.",
            usage: "الاستخدام: لتوجيه عين المشاهد بين شخصيات أو عناصر."
          },
          {
            title: "Dolly Zoom (تأثير فيرتيغو)",
            desc: "الشرح: التحرك للخلف مع Zoom In في نفس الوقت (أو العكس).",
            usage: "الاستخدام: لحظة إدراك صادمة، رعب نفسي، أو شعور بالدوار."
          }
        ]
      }
    ],
    en: [
      {
        title: "1. Basic Movements",
        colorClass: "text-blue-400",
        borderColorClass: "border-blue-500/20",
        items: [
          {
            title: "Static",
            desc: "Explanation: The camera never moves.",
            usage: "Usage: For calm scenes, focusing on dialogue, or when there is a lot of movement within the scene itself."
          },
          {
            title: "Zoom In",
            desc: "Explanation: The lens gradually gets closer to the subject.",
            usage: "Usage: To focus on a specific detail, show an emotional reaction, or increase tension."
          },
          {
            title: "Zoom Out",
            desc: "Explanation: The lens gradually moves away to reveal more space.",
            usage: "Usage: To reveal context, show loneliness, or end a scene."
          },
          {
            title: "Pan Left / Pan Right",
            desc: "Explanation: The camera rotates horizontally left or right.",
            usage: "Usage: To follow a walking character, or showcase a wide landscape."
          },
          {
            title: "Pan Up / Pan Down",
            desc: "Explanation: The camera rotates vertically up or down (Tilt).",
            usage: "Usage: To show the height of a tall building, or scan a character from head to toe."
          }
        ]
      },
      {
        title: "2. Time Effects",
        colorClass: "text-purple-400",
        borderColorClass: "border-purple-500/20",
        items: [
          {
            title: "Slow Motion",
            desc: "Explanation: Slowing down video speed.",
            usage: "Usage: To show fast movement details, or add a dramatic/romantic feel."
          },
          {
            title: "Hyperlapse / Timelapse",
            desc: "Explanation: Speeding up video significantly.",
            usage: "Usage: To show passage of time (sunrise/sunset), city traffic, or fast travel."
          },
          {
            title: "Freeze Frame",
            desc: "Explanation: The image stops completely and freezes for moments.",
            usage: "Usage: To introduce a character, or emphasize a shocking scene ending."
          },
          {
            title: "Reverse",
            desc: "Explanation: Playing video from end to start.",
            usage: "Usage: For magic tricks, reversing time, or strange artistic effects."
          }
        ]
      },
      {
        title: "3. Cinematic Moves",
        colorClass: "text-green-400",
        borderColorClass: "border-green-500/20",
        items: [
          {
            title: "Roll",
            desc: "Explanation: The camera rotates around the lens axis.",
            usage: "Usage: To create a feeling of imbalance, dizziness, chaos, or dynamic action."
          },
          {
            title: "Dolly / Tracking",
            desc: "Explanation: The camera itself physically moves forward/backward or sideways.",
            usage: "Usage: To follow a walking character, or enter deep into the scene realistically."
          },
          {
            title: "Orbit / Arc",
            desc: "Explanation: The camera rotates in a circle around the subject.",
            usage: "Usage: Heroic scene, romantic moment, or inspecting a product from all sides."
          },
          {
            title: "Crane / Boom / Pedestal",
            desc: "Explanation: The camera physically rises up or down.",
            usage: "Usage: Establishing shots revealing the city, or coming down to audience level."
          }
        ]
      },
      {
        title: "4. Special Stylistic Effects",
        colorClass: "text-orange-400",
        borderColorClass: "border-orange-500/20",
        items: [
          {
            title: "Handheld / Shake",
            desc: "Explanation: The camera shakes slightly as if held by hand.",
            usage: "Usage: To give a realistic (documentary) feel, or create tension/fear."
          },
          {
            title: "Rack Focus",
            desc: "Explanation: Changing focus from near to far object (or vice versa).",
            usage: "Usage: To guide viewer's eye between characters or elements."
          },
          {
            title: "Dolly Zoom",
            desc: "Explanation: Moving camera back while zooming in (or vice versa).",
            usage: "Usage: Shocking realization moment, psychological horror, or vertigo effect."
          }
        ]
      }
    ]
  };

  const currentContent = content[language];
  const isRTL = language === 'ar';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {language === 'en' ? 'Camera Effects Guide' : 'دليل تأثيرات الكاميرا'}
            </h2>
            
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(l => l === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 transition-all group"
            >
              <Languages className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span className="text-xs font-medium text-zinc-400 group-hover:text-white">
                {language === 'en' ? 'العربية' : 'English'}
              </span>
            </button>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {currentContent.map((section, idx) => (
            <section key={idx} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <h3 className={`text-lg font-bold ${section.colorClass} border-b ${section.borderColorClass} pb-2`}>
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.items.map((item, itemIdx) => (
                  <EffectItem 
                    key={itemIdx}
                    title={item.title}
                    desc={item.desc}
                    usage={item.usage}
                    isRTL={isRTL}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 text-center text-zinc-500 text-xs">
          Press 'ESC' or click outside to close
        </div>
      </div>
    </div>
  );
};

const EffectItem = ({ title, desc, usage, isRTL }: { title: string, desc: string, usage: string, isRTL: boolean }) => (
  <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
    <h4 className={`font-bold text-white mb-2 ${isRTL ? 'font-arabic' : ''}`}>{title}</h4>
    <p className={`text-zinc-400 text-sm mb-2 leading-relaxed ${isRTL ? 'font-arabic' : ''}`}>{desc}</p>
    <p className={`text-zinc-500 text-xs leading-relaxed border-t border-zinc-700/50 pt-2 ${isRTL ? 'font-arabic' : ''}`}>{usage}</p>
  </div>
);

export default HelpModal;
