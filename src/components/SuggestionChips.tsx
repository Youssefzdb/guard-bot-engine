import { Shield, Bug, Lock, Globe, FileCode } from "lucide-react";

const suggestions = [
  { icon: Shield, text: "فحص ثغرات الشبكة", prompt: "اكتب لي سكربت Python لفحص المنافذ المفتوحة في شبكة معينة" },
  { icon: Lock, text: "تشفير البيانات", prompt: "اشرح لي كيفية تشفير البيانات باستخدام AES-256 مع مثال عملي بالكود" },
  { icon: Bug, text: "تحليل برمجيات خبيثة", prompt: "ما هي الخطوات الأساسية لتحليل ملف مشبوه وكيف يمكنني فحصه بأمان؟" },
  { icon: Globe, text: "أمن تطبيقات الويب", prompt: "اشرح لي OWASP Top 10 مع أمثلة عملية لكل ثغرة وكيفية الحماية منها" },
  { icon: FileCode, text: "سكربت أمني", prompt: "اكتب لي سكربت Bash لمراقبة محاولات تسجيل الدخول الفاشلة وحظر عناوين IP المشبوهة" },
];

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s.prompt)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-foreground group"
        >
          <s.icon className="w-3.5 h-3.5 text-primary/60 group-hover:text-primary transition-colors" />
          <span>{s.text}</span>
        </button>
      ))}
    </div>
  );
}
