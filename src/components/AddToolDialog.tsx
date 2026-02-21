import { useState } from "react";
import { Plus, X, Trash2, Upload, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { type ToolCategory } from "@/lib/security-tools";
import { saveCustomTool, deleteCustomTool, getCustomToolDefinitions, exportCustomTools, importCustomTools, type CustomToolDefinition } from "@/lib/custom-tools";
import { useToast } from "@/hooks/use-toast";

interface AddToolDialogProps {
  onToolsChanged: () => void;
}

const defaultTool: Omit<CustomToolDefinition, "id"> = {
  name: "",
  nameAr: "",
  icon: "🔧",
  description: "",
  category: "scanning",
  args: [{ key: "target", label: "الهدف", placeholder: "example.com", required: true }],
  executionType: "http_fetch",
  executionConfig: {},
};

const iconOptions = ["🔧", "⚡", "🛠️", "🔬", "🎯", "💣", "🕸️", "🧰", "📡", "🔮", "🦠", "🧲", "⛏️", "🗡️", "🔋"];

export function AddToolDialog({ onToolsChanged }: AddToolDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"create" | "manage">("create");
  const [tool, setTool] = useState(defaultTool);
  const [args, setArgs] = useState(defaultTool.args);
  const { toast } = useToast();

  const customTools = getCustomToolDefinitions();

  const handleSave = () => {
    if (!tool.name.trim() || !tool.nameAr.trim()) {
      toast({ title: "خطأ", description: "الاسم مطلوب", variant: "destructive" });
      return;
    }
    const id = tool.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    saveCustomTool({ ...tool, id, args });
    onToolsChanged();
    toast({ title: "تم", description: `تمت إضافة الأداة: ${tool.nameAr}` });
    setTool(defaultTool);
    setArgs(defaultTool.args);
    setTab("manage");
  };

  const handleDelete = (id: string) => {
    deleteCustomTool(id);
    onToolsChanged();
    toast({ title: "تم", description: "تم حذف الأداة" });
  };

  const handleExport = () => {
    const data = exportCustomTools();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom-tools.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = importCustomTools(text);
        onToolsChanged();
        toast({ title: "تم", description: `تم استيراد ${count} أداة` });
      } catch (err) {
        toast({ title: "خطأ", description: err instanceof Error ? err.message : "فشل الاستيراد", variant: "destructive" });
      }
    };
    input.click();
  };

  const addArg = () => {
    setArgs([...args, { key: "", label: "", placeholder: "", required: false }]);
  };

  const removeArg = (i: number) => {
    setArgs(args.filter((_, idx) => idx !== i));
  };

  const updateArg = (i: number, field: string, value: string | boolean) => {
    setArgs(args.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-primary/30 text-primary text-xs hover:bg-primary/5 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          إضافة أداة مخصصة
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-sm font-display">إدارة الأدوات المخصصة</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button onClick={() => setTab("create")} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "create" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            إنشاء أداة
          </button>
          <button onClick={() => setTab("manage")} className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${tab === "manage" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
            الأدوات ({customTools.length})
          </button>
        </div>

        {tab === "create" ? (
          <div className="space-y-3">
            {/* Icon picker */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-1 block">الأيقونة</label>
              <div className="flex flex-wrap gap-1">
                {iconOptions.map(icon => (
                  <button key={icon} onClick={() => setTool({ ...tool, icon })}
                    className={`w-8 h-8 rounded-md text-sm flex items-center justify-center transition-all ${tool.icon === icon ? "bg-primary/20 ring-1 ring-primary" : "bg-muted hover:bg-muted/80"}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground mb-0.5 block">الاسم (English)</label>
                <input type="text" value={tool.name} onChange={e => setTool({ ...tool, name: e.target.value })}
                  placeholder="My Scanner" className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs" dir="ltr" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-0.5 block">الاسم (عربي)</label>
                <input type="text" value={tool.nameAr} onChange={e => setTool({ ...tool, nameAr: e.target.value })}
                  placeholder="أداتي المخصصة" className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-0.5 block">الوصف</label>
              <input type="text" value={tool.description} onChange={e => setTool({ ...tool, description: e.target.value })}
                placeholder="وصف الأداة ووظيفتها" className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs" />
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-0.5 block">التصنيف</label>
              <select value={tool.category} onChange={e => setTool({ ...tool, category: e.target.value as ToolCategory })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs">
                <option value="scanning">🔍 فحص واستطلاع</option>
                <option value="offensive">⚔️ هجومية</option>
                <option value="defensive">🛡️ دفاعية</option>
              </select>
            </div>

            {/* Execution type */}
            <div>
              <label className="text-[11px] text-muted-foreground mb-0.5 block">نوع التنفيذ</label>
              <select value={tool.executionType} onChange={e => setTool({ ...tool, executionType: e.target.value as CustomToolDefinition["executionType"] })}
                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs">
                <option value="http_fetch">HTTP Fetch - طلب HTTP لرابط</option>
                <option value="dns_query">DNS Query - استعلام DNS</option>
                <option value="tcp_connect">TCP Connect - اتصال TCP</option>
                <option value="custom_script">Custom Script - سكريبت مخصص</option>
              </select>
            </div>

            {/* Execution config based on type */}
            {tool.executionType === "http_fetch" && (
              <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
                <label className="text-[10px] text-muted-foreground block">إعدادات HTTP</label>
                <input type="text" placeholder="URL template: https://api.example.com/{target}" 
                  value={tool.executionConfig.urlTemplate || ""}
                  onChange={e => setTool({ ...tool, executionConfig: { ...tool.executionConfig, urlTemplate: e.target.value } })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-[11px] font-mono" dir="ltr" />
                <select value={tool.executionConfig.method || "GET"}
                  onChange={e => setTool({ ...tool, executionConfig: { ...tool.executionConfig, method: e.target.value } })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </div>
            )}

            {tool.executionType === "custom_script" && (
              <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
                <label className="text-[10px] text-muted-foreground block">سكريبت التنفيذ (JavaScript)</label>
                <textarea placeholder={`// المتغيرات المتاحة: args (المدخلات)\n// مثال:\nconst resp = await fetch(args.url);\nconst data = await resp.text();\nreturn "النتيجة: " + data.length + " بايت";`}
                  value={tool.executionConfig.script || ""}
                  onChange={e => setTool({ ...tool, executionConfig: { ...tool.executionConfig, script: e.target.value } })}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-[11px] font-mono min-h-[100px]" dir="ltr" />
              </div>
            )}

            {/* Arguments */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] text-muted-foreground">المدخلات (Arguments)</label>
                <button onClick={addArg} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> إضافة
                </button>
              </div>
              <div className="space-y-2">
                {args.map((arg, i) => (
                  <div key={i} className="flex gap-1 items-start p-2 bg-muted/30 rounded">
                    <div className="flex-1 grid grid-cols-3 gap-1">
                      <input type="text" placeholder="key" value={arg.key} onChange={e => updateArg(i, "key", e.target.value)}
                        className="bg-background border border-border rounded px-1.5 py-1 text-[10px] font-mono" dir="ltr" />
                      <input type="text" placeholder="التسمية" value={arg.label} onChange={e => updateArg(i, "label", e.target.value)}
                        className="bg-background border border-border rounded px-1.5 py-1 text-[10px]" />
                      <input type="text" placeholder="placeholder" value={arg.placeholder} onChange={e => updateArg(i, "placeholder", e.target.value)}
                        className="bg-background border border-border rounded px-1.5 py-1 text-[10px]" dir="ltr" />
                    </div>
                    <label className="flex items-center gap-0.5 text-[9px] text-muted-foreground whitespace-nowrap">
                      <input type="checkbox" checked={arg.required || false} onChange={e => updateArg(i, "required", e.target.checked)} className="w-3 h-3" />
                      مطلوب
                    </label>
                    <button onClick={() => removeArg(i)} className="text-destructive/60 hover:text-destructive p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSave}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-xs font-medium hover:bg-primary/90 transition-colors">
              حفظ الأداة
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Import/Export */}
            <div className="flex gap-2">
              <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded border border-border text-xs hover:bg-muted transition-colors">
                <Download className="w-3 h-3" /> تصدير
              </button>
              <button onClick={handleImport} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded border border-border text-xs hover:bg-muted transition-colors">
                <Upload className="w-3 h-3" /> استيراد
              </button>
            </div>

            {customTools.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">لا توجد أدوات مخصصة بعد</p>
            ) : (
              <div className="space-y-1">
                {customTools.map(t => (
                  <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                    <span>{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{t.nameAr}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{t.name} • {t.category} • {t.executionType}</p>
                    </div>
                    <button onClick={() => handleDelete(t.id)} className="text-destructive/60 hover:text-destructive p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
