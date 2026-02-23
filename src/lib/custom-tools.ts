import { supabase } from "@/integrations/supabase/client";
import type { SecurityTool, ToolCategory } from "./security-tools";

export interface CustomToolDefinition {
  id: string;
  tool_id: string;
  name: string;
  name_ar: string;
  icon: string;
  description: string;
  category: ToolCategory;
  args: { key: string; label: string; placeholder: string; required?: boolean }[];
  execution_type: "http_fetch" | "dns_query" | "tcp_connect" | "custom_script";
  execution_config: Record<string, string>;
}

export function mapToSecurityTool(t: CustomToolDefinition): SecurityTool {
  let parsedArgs = t.args;
  if (typeof parsedArgs === "string") {
    try { parsedArgs = JSON.parse(parsedArgs); } catch { parsedArgs = []; }
  }
  if (!Array.isArray(parsedArgs)) parsedArgs = [];
  return {
    id: `custom_${t.tool_id}`,
    name: t.name,
    nameAr: t.name_ar,
    icon: t.icon,
    description: t.description,
    category: t.category as ToolCategory,
    args: parsedArgs as SecurityTool["args"],
  };
}

export async function fetchCustomTools(): Promise<CustomToolDefinition[]> {
  const { data, error } = await supabase
    .from("custom_tools")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map(d => ({
    ...d,
    category: d.category as ToolCategory,
    args: d.args as CustomToolDefinition["args"],
    execution_type: d.execution_type as CustomToolDefinition["execution_type"],
    execution_config: d.execution_config as Record<string, string>,
  }));
}

export async function saveCustomTool(tool: {
  tool_id: string;
  name: string;
  name_ar: string;
  icon: string;
  description: string;
  category: string;
  args: unknown;
  execution_type: string;
  execution_config: unknown;
}): Promise<void> {
  const { error } = await supabase
    .from("custom_tools")
    .upsert(tool as any, { onConflict: "tool_id" });
  if (error) throw error;
}

export async function deleteCustomTool(tool_id: string): Promise<void> {
  const { error } = await supabase
    .from("custom_tools")
    .delete()
    .eq("tool_id", tool_id);
  if (error) throw error;
}

export function exportTools(tools: CustomToolDefinition[]): string {
  return JSON.stringify(tools, null, 2);
}

export async function importTools(json: string): Promise<number> {
  const imported = JSON.parse(json);
  const arr = Array.isArray(imported) ? imported : imported.tools;
  if (!Array.isArray(arr)) throw new Error("صيغة غير صالحة");
  let count = 0;
  for (const t of arr) {
    const toolId = t.tool_id || t.id || t.name?.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const nameAr = t.name_ar || t.nameAr || t.name || "";
    if (toolId && (t.name || nameAr)) {
      await saveCustomTool({
        tool_id: toolId,
        name: t.name || nameAr,
        name_ar: nameAr || t.name,
        icon: t.icon || "🔧",
        description: t.description || "",
        category: t.category || "scanning",
        args: t.args || [],
        execution_type: t.execution_type || t.executionType || "http_fetch",
        execution_config: t.execution_config || t.executionConfig || {},
      });
      count++;
    }
  }
  return count;
}

export async function importToolsFromGitHub(url: string): Promise<number> {
  let rawUrl = url.trim();

  // Detect repo-only URLs (no file path) and show helpful error
  const repoOnlyMatch = rawUrl.match(/^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/]+\/?$/);
  if (repoOnlyMatch) {
    // Try common file names in the repo
    const repoBase = rawUrl.replace(/\/$/, "");
    const candidates = [
      `${repoBase}/blob/main/tools.json`,
      `${repoBase}/blob/master/tools.json`,
      `${repoBase}/blob/main/custom-tools.json`,
      `${repoBase}/blob/master/custom-tools.json`,
    ];
    for (const candidate of candidates) {
      const candidateRaw = candidate
        .replace("github.com", "raw.githubusercontent.com")
        .replace("/blob/", "/");
      try {
        const resp = await fetch(candidateRaw);
        if (resp.ok) {
          const text = await resp.text();
          return importTools(text);
        }
      } catch {}
    }
    throw new Error("هذا رابط مستودع وليس ملف. أضف مسار الملف مثل:\ngithub.com/user/repo/blob/main/tools.json");
  }

  // Convert GitHub blob URL to raw
  if (rawUrl.includes("github.com") && rawUrl.includes("/blob/")) {
    rawUrl = rawUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  } else if (rawUrl.includes("github.com") && !rawUrl.includes("raw.githubusercontent.com")) {
    rawUrl = rawUrl.replace("github.com", "raw.githubusercontent.com").replace("/tree/", "/");
  }

  const resp = await fetch(rawUrl);
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`فشل جلب الملف (${resp.status}): تأكد أن الرابط يشير لملف JSON صالح`);
  }
  const text = await resp.text();
  
  try {
    return importTools(text);
  } catch (e) {
    throw new Error("الملف ليس بصيغة JSON صالحة للأدوات");
  }
}
