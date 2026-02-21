import { useState } from "react";
import { Play, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { securityTools, executeTool, type SecurityTool } from "@/lib/security-tools";

interface ToolsPanelProps {
  onResult: (result: string) => void;
}

export function ToolsPanel({ onResult }: ToolsPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});

  const handleRun = async (tool: SecurityTool) => {
    const args = formData[tool.id] || {};
    const missing = tool.args.filter(a => a.required && !args[a.key]?.trim());
    if (missing.length > 0) return;

    setLoading(tool.id);
    try {
      const result = await executeTool(tool.id, args);
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

  return (
    <div className="space-y-1">
      {securityTools.map((tool) => (
        <div key={tool.id} className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === tool.id ? null : tool.id)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
          >
            <span>{tool.icon}</span>
            <span className="flex-1 text-right text-foreground">{tool.nameAr}</span>
            {expanded === tool.id ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>

          {expanded === tool.id && (
            <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
              <p className="text-xs text-muted-foreground">{tool.description}</p>
              {tool.args.map((arg) => (
                <input
                  key={arg.key}
                  type="text"
                  placeholder={arg.placeholder}
                  value={formData[tool.id]?.[arg.key] || ""}
                  onChange={(e) => updateArg(tool.id, arg.key, e.target.value)}
                  className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  dir="ltr"
                />
              ))}
              <button
                onClick={() => handleRun(tool)}
                disabled={loading === tool.id}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
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
  );
}
