import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Camera Effects Guide</span>
            <span className="text-zinc-500">|</span>
            <span className="font-arabic">دليل تأثيرات الكاميرا</span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Section 1 */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-blue-400 border-b border-blue-500/20 pb-2">
              1. الحركات الأساسية (Basic Movements)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EffectItem 
                title="Static (ثابت)"
                desc="الشرح: الكاميرا لا تتحرك أبداً."
                usage="الاستخدام: للمشاهد الهادئة، التركيز على الحوار، أو عندما يكون هناك الكثير من الحركة داخل المشهد نفسه ولا تريد تشتيت المشاهد."
              />
              <EffectItem 
                title="Zoom In (تقريب)"
                desc="الشرح: العدسة تقترب تدريجياً من الهدف."
                usage="الاستخدام: للتركيز على تفصيل معين، إظهار رد فعل عاطفي على وجه شخصية، أو زيادة التوتر."
              />
              <EffectItem 
                title="Zoom Out (تبعيد)"
                desc="الشرح: العدسة تبتعد تدريجياً لتكشف مساحة أكبر."
                usage="الاستخدام: لكشف المكان المحيط (Context)، إظهار الوحدة (شخص صغير في مكان كبير)، أو إنهاء المشهد."
              />
              <EffectItem 
                title="Pan Left / Pan Right (تحريك أفقي)"
                desc="الشرح: الكاميرا تدور حول محورها يميناً أو يساراً."
                usage="الاستخدام: لمتابعة شخصية تمشي، أو استعراض منظر طبيعي عريض."
              />
              <EffectItem 
                title="Pan Up / Pan Down (تحريك رأسي)"
                desc="الشرح: الكاميرا تدور للأعلى أو للأسفل (Tilt)."
                usage="الاستخدام: لإظهار طول مبنى شاهق، أو النظر لشخصية من القدم إلى الرأس."
              />
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-purple-400 border-b border-purple-500/20 pb-2">
              2. التلاعب بالزمن (Time Effects)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EffectItem 
                title="Slow Motion (تصوير بطيء)"
                desc="الشرح: إبطاء سرعة الفيديو."
                usage="الاستخدام: لإظهار تفاصيل الحركة السريعة، أو لإضفاء طابع درامي ورومانسي."
              />
              <EffectItem 
                title="Hyperlapse / Timelapse"
                desc="الشرح: تسريع الفيديو بشكل كبير."
                usage="الاستخدام: لإظهار مرور الوقت (شروق/غروب)، حركة المرور، أو انتقال سريع."
              />
              <EffectItem 
                title="Freeze Frame (تجميد الإطار)"
                desc="الشرح: الصورة تتوقف تماماً وتصبح ثابتة للحظات."
                usage="الاستخدام: للتعريف بشخصية، أو التأكيد على نهاية صادمة لمشهد."
              />
              <EffectItem 
                title="Reverse (عكس)"
                desc="الشرح: تشغيل الفيديو من النهاية للبداية."
                usage="الاستخدام: لخدع سحرية، أو استرجاع الزمن، أو تأثيرات فنية غريبة."
              />
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-green-400 border-b border-green-500/20 pb-2">
              3. حركات سينمائية متقدمة (Cinematic Moves)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EffectItem 
                title="Roll (دوران/دحرجة)"
                desc="الشرح: الكاميرا تدور حول محور العدسة."
                usage="الاستخدام: لخلق شعور بعدم الاتزان، الدوار، الفوضى، أو الأكشن."
              />
              <EffectItem 
                title="Dolly / Tracking (تتبع)"
                desc="الشرح: الكاميرا نفسها تتحرك جسدياً للأمام/الخلف أو للجانب."
                usage="الاستخدام: لتبع شخصية تمشي، أو الدخول في عمق المشهد بواقعية."
              />
              <EffectItem 
                title="Orbit / Arc (دوران حول الهدف)"
                desc="الشرح: الكاميرا تدور في دائرة حول الشخص أو الشيء."
                usage="الاستخدام: مشهد بطولي، رومانسي، أو لفحص منتج من جميع الجهات."
              />
              <EffectItem 
                title="Crane / Boom / Pedestal"
                desc="الشرح: الكاميرا ترتفع جسدياً للأعلى أو تنخفض للأسفل."
                usage="الاستخدام: لقطات تأسيسية تكشف المدينة، أو النزول لمستوى الجمهور."
              />
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-orange-400 border-b border-orange-500/20 pb-2">
              4. تأثيرات خاصة (Special Stylistic Effects)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EffectItem 
                title="Handheld / Shake (اهتزاز)"
                desc="الشرح: الكاميرا تهتز قليلاً وكأن شخصاً يحملها بيده."
                usage="الاستخدام: لإعطاء طابع واقعي (وثائقي)، أو خلق توتر وخوف."
              />
              <EffectItem 
                title="Rack Focus (نقل التركيز)"
                desc="الشرح: تغيير التركيز من جسم قريب إلى بعيد مع تغبيش الآخر."
                usage="الاستخدام: لتوجيه عين المشاهد بين شخصيات أو عناصر."
              />
              <EffectItem 
                title="Dolly Zoom (تأثير فيرتيغو)"
                desc="الشرح: التحرك للخلف مع Zoom In في نفس الوقت (أو العكس)."
                usage="الاستخدام: لحظة إدراك صادمة، رعب نفسي، أو شعور بالدوار."
              />
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 text-center text-zinc-500 text-xs">
          Press 'ESC' or click outside to close
        </div>
      </div>
    </div>
  );
};

const EffectItem = ({ title, desc, usage }: { title: string, desc: string, usage: string }) => (
  <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 hover:bg-zinc-800/50 transition-colors">
    <h4 className="font-bold text-white mb-2">{title}</h4>
    <p className="text-zinc-400 text-sm mb-2 leading-relaxed" dir="rtl">{desc}</p>
    <p className="text-zinc-500 text-xs leading-relaxed border-t border-zinc-700/50 pt-2" dir="rtl">{usage}</p>
  </div>
);

export default HelpModal;
