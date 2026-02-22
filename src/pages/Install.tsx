import { useState, useEffect } from "react";
import { Shield, Download, CheckCircle, Smartphone, Monitor, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir="rtl">
      <Link to="/" className="absolute top-4 right-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        العودة للتطبيق
      </Link>

      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 animate-pulse-glow">
        <Shield className="w-10 h-10 text-primary" />
      </div>

      <h1 className="text-2xl font-display font-bold text-foreground mb-2">تثبيت CyberGuard AI</h1>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
        ثبّت التطبيق على جهازك للوصول السريع والعمل بدون اتصال
      </p>

      {isInstalled ? (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-primary/5 border border-primary/20">
          <CheckCircle className="w-12 h-12 text-primary" />
          <p className="text-foreground font-semibold">التطبيق مثبّت بالفعل! 🎉</p>
          <Link to="/" className="text-sm text-primary hover:underline">افتح التطبيق</Link>
        </div>
      ) : deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all shadow-[var(--glow-primary)]"
        >
          <Download className="w-6 h-6" />
          تثبيت التطبيق
        </button>
      ) : isIOS ? (
        <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-card border border-border max-w-sm">
          <Smartphone className="w-10 h-10 text-primary" />
          <p className="text-foreground font-semibold text-center">خطوات التثبيت على iPhone/iPad</p>
          <ol className="text-sm text-muted-foreground space-y-3 text-right w-full">
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">1</span>
              اضغط على زر المشاركة <span className="inline-block px-1 bg-muted rounded text-xs">⬆️</span> في الأسفل
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">2</span>
              اختر "إضافة إلى الشاشة الرئيسية"
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">3</span>
              اضغط "إضافة" للتأكيد
            </li>
          </ol>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-card border border-border max-w-sm">
          <Monitor className="w-10 h-10 text-primary" />
          <p className="text-foreground font-semibold text-center">خطوات التثبيت</p>
          <ol className="text-sm text-muted-foreground space-y-3 text-right w-full">
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">1</span>
              افتح قائمة المتصفح (⋮)
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">2</span>
              اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"
            </li>
          </ol>
        </div>
      )}

      <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm w-full">
        {[
          { icon: "⚡", label: "سريع" },
          { icon: "📴", label: "يعمل أوفلاين" },
          { icon: "🔒", label: "آمن" },
        ].map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-1 p-3 rounded-lg bg-card border border-border">
            <span className="text-2xl">{f.icon}</span>
            <span className="text-xs text-muted-foreground">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Install;
