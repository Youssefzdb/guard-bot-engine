import { useState, useEffect } from "react";
import { Settings, Eye, EyeOff, Cpu } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AI_PROVIDERS, getAIProviderSettings, saveAIProviderSettings, clearAIProviderSettings, type AIProviderSettings } from "@/lib/ai-providers";

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
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  // AI Provider state
  const [providerEnabled, setProviderEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (open) {
      setPrompt(getAgentCustomPrompt());
      const settings = getAIProviderSettings();
      if (settings) {
        setProviderEnabled(settings.enabled);
        setSelectedProvider(settings.providerId);
        setSelectedModel(settings.modelId);
        setApiKey(settings.apiKey);
      } else {
        setProviderEnabled(false);
        setSelectedProvider("openai");
        setSelectedModel("");
        setApiKey("");
      }
      setShowKey(false);
    }
  }, [open]);

  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider);

  useEffect(() => {
    if (currentProvider && !currentProvider.models.find(m => m.id === selectedModel)) {
      setSelectedModel(currentProvider.models[0]?.id || "");
    }
  }, [selectedProvider]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, prompt);
    if (providerEnabled && apiKey.trim()) {
      saveAIProviderSettings({
        providerId: selectedProvider,
        modelId: selectedModel,
        apiKey: apiKey.trim(),
        enabled: true,
      });
    } else {
      clearAIProviderSettings();
    }
    toast({ title: "تم الحفظ", description: "تم حفظ جميع الإعدادات بنجاح" });
    setOpen(false);
  };

  const handleReset = () => {
    setPrompt("");
    setProviderEnabled(false);
    setApiKey("");
    localStorage.removeItem(STORAGE_KEY);
    clearAIProviderSettings();
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-foreground">إعدادات الوكيل</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="prompt" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">🧠 شخصية الوكيل</TabsTrigger>
            <TabsTrigger value="ai">🤖 مزود الذكاء</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-3 mt-4">
            <Label htmlFor="agent-prompt" className="text-foreground">
              تعريف الوكيل وشخصيته وقواعده
            </Label>
            <p className="text-xs text-muted-foreground">
              اكتب هنا التعليمات المخصصة التي تريد أن يتبعها الوكيل.
            </p>
            <Textarea
              id="agent-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`مثال:\nأنت خبير أمن سيبراني محترف اسمك "حارس".\nتتحدث بالعربية الفصحى فقط.\nتقدم تحليلات مفصلة مع توصيات عملية.`}
              className="min-h-[200px] text-sm font-mono bg-background text-foreground"
              dir="rtl"
            />
            <p className="text-[11px] text-muted-foreground">
              {prompt.length > 0 ? `${prompt.length} حرف` : "لا توجد تعليمات مخصصة"}
            </p>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">استخدام مزود ذكاء مخصص</p>
                  <p className="text-[11px] text-muted-foreground">بدلاً من المزود الافتراضي</p>
                </div>
              </div>
              <Switch checked={providerEnabled} onCheckedChange={setProviderEnabled} />
            </div>

            {providerEnabled && (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2">
                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label className="text-foreground">اختر المزود</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AI_PROVIDERS.map(provider => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider.id)}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all text-center ${
                          selectedProvider === provider.id
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        <div className="font-semibold">{provider.name}</div>
                        <div className="text-[10px] opacity-70">{provider.nameAr}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Selection */}
                {currentProvider && (
                  <div className="space-y-2">
                    <Label className="text-foreground">اختر الموديل</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="اختر موديل..." />
                      </SelectTrigger>
                      <SelectContent>
                        {currentProvider.models.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-foreground">مفتاح API</Label>
                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`أدخل مفتاح ${currentProvider?.name || ""} API...`}
                      className="bg-background pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    المفتاح يُحفظ محلياً في متصفحك فقط ويُرسل مباشرة للمزود عبر الخادم.
                  </p>
                </div>

                {/* Info */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
                  <p>⚡ عند التفعيل، سيستخدم الوكيل المزود والموديل المختار بدل الافتراضي.</p>
                  <p>🔒 مفتاح API لا يُحفظ في أي خادم - يبقى في متصفحك فقط.</p>
                  <p>⚠️ تأكد من صلاحية المفتاح ووجود رصيد كافٍ.</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

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
