import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "cyberguard-agent-settings";

export function getAgentCustomPrompt(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function AgentSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setPrompt(getAgentCustomPrompt());
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, prompt);
    toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الوكيل بنجاح" });
    setOpen(false);
  };

  const handleReset = () => {
    setPrompt("");
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: "تم إعادة التعيين", description: "تم إعادة الوكيل للإعدادات الافتراضية" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10">
          <Settings className="w-3.5 h-3.5" />
          <span>إعدادات</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-foreground">إعدادات الوكيل</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="agent-prompt" className="text-foreground">
            تعريف الوكيل وشخصيته وقواعده
          </Label>
          <p className="text-xs text-muted-foreground">
            اكتب هنا التعليمات المخصصة التي تريد أن يتبعها الوكيل. سيتم إضافتها فوق التعليمات الأساسية.
          </p>
          <Textarea
            id="agent-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`مثال:\nأنت خبير أمن سيبراني محترف اسمك "حارس".\nتتحدث بالعربية الفصحى فقط.\nتقدم تحليلات مفصلة مع توصيات عملية.\nلا تستخدم مصطلحات تقنية بدون شرحها.`}
            className="min-h-[200px] text-sm font-mono bg-background text-foreground"
            dir="rtl"
          />
          <p className="text-[11px] text-muted-foreground">
            {prompt.length > 0 ? `${prompt.length} حرف` : "لا توجد تعليمات مخصصة - سيعمل الوكيل بالإعدادات الافتراضية"}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset} className="text-destructive hover:text-destructive">
            إعادة تعيين
          </Button>
          <Button onClick={handleSave}>حفظ الإعدادات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
