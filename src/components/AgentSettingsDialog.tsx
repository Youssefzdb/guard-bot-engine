import { useState, useEffect } from "react";
import { Settings, Eye, EyeOff, Cpu, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
import { AI_PROVIDERS, getAIProviderSettings, saveAIProviderSettings, clearAIProviderSettings, type AIProviderSettings, type APIKeyEntry } from "@/lib/ai-providers";

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
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const [providerEnabled, setProviderEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [selectedModel, setSelectedModel] = useState("");
  const [apiKeys, setApiKeys] = useState<APIKeyEntry[]>([]);
  const [checkingKey, setCheckingKey] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setPrompt(getAgentCustomPrompt());
      (async () => {
        const settings = await getAIProviderSettings();
        if (settings) {
          setProviderEnabled(settings.enabled);
          setSelectedProvider(settings.providerId);
          setSelectedModel(settings.modelId);
          setApiKeys(settings.apiKeys || [{ key: settings.apiKey || "", label: "مفتاح 1", status: "unknown" }]);
        } else {
          setProviderEnabled(false);
          setSelectedProvider("openai");
          setSelectedModel("");
          setApiKeys([]);
        }
      })();
      setShowKeys({});
    }
  }, [open]);

  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider);

  useEffect(() => {
    if (currentProvider && !currentProvider.models.find(m => m.id === selectedModel)) {
      setSelectedModel(currentProvider.models[0]?.id || "");
    }
  }, [selectedProvider]);

  const addKey = () => {
    setApiKeys(prev => [...prev, { key: "", label: `مفتاح ${prev.length + 1}`, status: "unknown" }]);
  };

  const removeKey = (index: number) => {
    setApiKeys(prev => prev.filter((_, i) => i !== index));
  };

  const updateKey = (index: number, field: keyof APIKeyEntry, value: string) => {
    setApiKeys(prev => prev.map((k, i) => i === index ? { ...k, [field]: value } : k));
  };

  const checkKeyBalance = async (index: number) => {
    const entry = apiKeys[index];
    if (!entry?.key.trim()) return;
    setCheckingKey(index);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-api-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ providerId: selectedProvider, apiKey: entry.key }),
      });
      const data = await resp.json();
      setApiKeys(prev => prev.map((k, i) => i === index ? { ...k, status: data.status || "unknown", balance: data.balance || "غير متاح", lastChecked: Date.now() } : k));
    } catch {
      setApiKeys(prev => prev.map((k, i) => i === index ? { ...k, status: "invalid", balance: "فشل الفحص" } : k));
    }
    setCheckingKey(null);
  };

  const checkAllKeys = async () => {
    for (let i = 0; i < apiKeys.length; i++) {
      if (apiKeys[i].key.trim()) await checkKeyBalance(i);
    }
  };

  const handleSave = async () => {
    localStorage.setItem(STORAGE_KEY, prompt);
    const validKeys = apiKeys.filter(k => k.key.trim());
    if (providerEnabled && validKeys.length > 0) {
      await saveAIProviderSettings({
        providerId: selectedProvider,
        modelId: selectedModel,
        apiKey: validKeys[0].key,
        apiKeys: validKeys,
        enabled: true,
      });
    } else {
      await clearAIProviderSettings();
    }
    toast({ title: "تم الحفظ", description: "تم حفظ جميع الإعدادات بنجاح" });
    setOpen(false);
  };

  const handleReset = async () => {
    setPrompt("");
    setProviderEnabled(false);
    setApiKeys([]);
    localStorage.removeItem(STORAGE_KEY);
    await clearAIProviderSettings();
    toast({ title: "تم إعادة التعيين", description: "تم إعادة الوكيل للإعدادات الافتراضية" });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "valid": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "invalid": return <XCircle className="w-4 h-4 text-red-500" />;
      case "no_balance": return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (entry: APIKeyEntry) => {
    if (!entry.status || entry.status === "unknown") return "لم يُفحص";
    if (entry.status === "valid") return entry.balance || "✓ صالح";
    if (entry.status === "invalid") return "❌ غير صالح";
    if (entry.status === "no_balance") return "⚠️ لا رصيد";
    return "غير معروف";
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "valid": return "text-green-500";
      case "invalid": return "text-red-500";
      case "no_balance": return "text-yellow-500";
      default: return "text-muted-foreground";
    }
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

                {/* API Keys Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">مفاتيح API</Label>
                    <div className="flex items-center gap-2">
                      {currentProvider && (
                        <a
                          href={currentProvider.apiKeyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          🔑 احصل على مفتاح
                        </a>
                      )}
                      {apiKeys.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={checkAllKeys} className="h-6 text-[11px] gap-1">
                          <RefreshCw className="w-3 h-3" />
                          فحص الكل
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    أضف عدة مفاتيح - عند فشل مفتاح يتم تجربة المفتاح التالي تلقائياً.
                  </p>

                  {/* Keys List */}
                  <div className="space-y-2">
                    {apiKeys.map((entry, index) => (
                      <div key={index} className="p-3 rounded-lg border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={entry.label}
                            onChange={(e) => updateKey(index, "label", e.target.value)}
                            className="h-7 text-xs bg-background w-32"
                            dir="rtl"
                            placeholder="اسم المفتاح"
                          />
                          <div className="flex items-center gap-1.5">
                            {/* Status badge */}
                            <div className={`flex items-center gap-1 text-[10px] ${getStatusColor(entry.status)}`}>
                              {getStatusIcon(entry.status)}
                              <span>{getStatusText(entry)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => checkKeyBalance(index)}
                              disabled={checkingKey === index || !entry.key.trim()}
                              className="h-6 w-6 p-0"
                            >
                              <RefreshCw className={`w-3 h-3 ${checkingKey === index ? "animate-spin" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeKey(index)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="relative">
                          <Input
                            type={showKeys[index] ? "text" : "password"}
                            value={entry.key}
                            onChange={(e) => updateKey(index, "key", e.target.value)}
                            placeholder={`أدخل مفتاح ${currentProvider?.name || ""} API...`}
                            className="bg-background pl-10 text-xs"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys(prev => ({ ...prev, [index]: !prev[index] }))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showKeys[index] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={addKey} className="w-full gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    إضافة مفتاح جديد
                  </Button>

                  <p className="text-[10px] text-muted-foreground">
                    المفاتيح تُحفظ في قاعدة البيانات بشكل آمن.
                  </p>
                </div>

                {/* Info */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
                  <p>⚡ عند التفعيل، سيستخدم الوكيل المزود والموديل المختار بدل الافتراضي.</p>
                  <p>🔄 عند فشل مفتاح (انتهاء الرصيد أو خطأ)، يتم تجربة المفتاح التالي تلقائياً.</p>
                  <p>🔒 المفاتيح تُحفظ في قاعدة البيانات بشكل آمن ومشفر.</p>
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
