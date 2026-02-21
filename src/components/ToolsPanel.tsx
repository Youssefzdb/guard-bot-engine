import { useState, useCallback, useEffect } from "react";
import { Play, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { securityTools, executeTool, categoryInfo, getAllTools, type SecurityTool, type ToolCategory } from "@/lib/security-tools";
import { fetchCustomTools, mapToSecurityTool, type CustomToolDefinition } from "@/lib/custom-tools";
import { AddToolDialog } from "@/components/AddToolDialog";

interface ToolsPanelProps {
  onResult: (result: string) => void;
}

const categoryOrder: ToolCategory[] = ["scanning", "offensive", "defensive"];

const categoryBorderColors: Record<ToolCategory, string> = {
  scanning: "border-secondary/50",
  offensive: "border-destructive/40",
  defensive: "border-primary/40",
};

const categoryBadgeColors: Record<ToolCategory, string> = {
  scanning: "bg-secondary/10 text-secondary",
  offensive: "bg-destructive/10 text-destructive",
  defensive: "bg-primary/10 text-primary",
};

export function ToolsPanel({ onResult }: ToolsPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("scanning");
  const [customDefs, setCustomDefs] = useState<CustomToolDefinition[]>([]);

  const loadCustomTools = useCallback(async () => {
    try { setCustomDefs(await fetchCustomTools()); } catch {}
  }, []);

  useEffect(() => { loadCustomTools(); }, [loadCustomTools]);

  const customSecurityTools = customDefs.map(mapToSecurityTool);
  const allTools = getAllTools(customSecurityTools);

  const handleRun = async (tool: SecurityTool) => {
    const args = formData[tool.id] || {};
    const missing = tool.args.filter(a => a.required && !args[a.key]?.trim());
    if (missing.length > 0) return;

    setLoading(tool.id);
    try {
      const customId = tool.id.replace("custom_", "");
      const customDef = customDefs.find(d => d.tool_id === customId);
      const customConfig = customDef ? { executionType: customDef.execution_type, executionConfig: customDef.execution_config } : undefined;
      const result = await executeTool(tool.id, args, customConfig);
      onResult(result);
    } catch (e) {
      onResult(`❌ خطأ: ${e instanceof Error ? e.message : "فشل التنفيذ"}`);
    }
    setLoading(null);
  };

  const updateArg = (toolId: string, key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [toolId]: { ...(prev[toolId] || {}), [key]: value },
    }));
  };

  const filteredTools = allTools.filter(t => t.category === activeCategory);

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {categoryOrder.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 text-[10px] py-1.5 px-1 rounded-md font-medium transition-all ${
              activeCategory === cat
                ? `bg-card text-foreground shadow-sm ${categoryBorderColors[cat]} border`
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {categoryInfo[cat].icon} {categoryInfo[cat].label.split(" ").slice(1).join(" ")}
          </button>
        ))}
      </div>

      {/* Tools count */}
      <div className="flex items-center justify-between px-1">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryBadgeColors[activeCategory]}`}>
          {filteredTools.length} أداة
        </span>
      </div>

      {/* Tools list */}
      <div className="space-y-1">
        {filteredTools.map((tool) => (
          <div key={tool.id} className={`border rounded-lg overflow-hidden ${categoryBorderColors[activeCategory]}`}>
            <button
              onClick={() => setExpanded(expanded === tool.id ? null : tool.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
            >
              <span>{tool.icon}</span>
              <span className="flex-1 text-right text-foreground text-xs">{tool.nameAr}</span>
              {tool.id.startsWith("custom_") && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-accent text-accent-foreground">مخصصة</span>
              )}
              {expanded === tool.id ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>

            {expanded === tool.id && (
              <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                <p className="text-[11px] text-muted-foreground">{tool.description}</p>
                {tool.args.map((arg) => (
                  <div key={arg.key}>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">{arg.label}</label>
                    <input
                      type="text"
                      placeholder={arg.placeholder}
                      value={formData[tool.id]?.[arg.key] || ""}
                      onChange={(e) => updateArg(tool.id, arg.key, e.target.value)}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      dir="ltr"
                    />
                  </div>
                ))}
                <button
                  onClick={() => handleRun(tool)}
                  disabled={loading === tool.id}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 transition-all ${
                    activeCategory === "offensive"
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : activeCategory === "scanning"
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {loading === tool.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>تنفيذ</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add custom tool button */}
      <AddToolDialog onToolsChanged={loadCustomTools} />
    </div>
  );
}
