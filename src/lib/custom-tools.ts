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
  if (!Array.isArray(imported)) throw new Error("صيغة غير صالحة");
  let count = 0;
  for (const t of imported) {
    if (t.tool_id && t.name && t.name_ar) {
      await saveCustomTool({
        tool_id: t.tool_id,
        name: t.name,
        name_ar: t.name_ar,
        icon: t.icon || "🔧",
        description: t.description || "",
        category: t.category || "scanning",
        args: t.args || [],
        execution_type: t.execution_type || "http_fetch",
        execution_config: t.execution_config || {},
      });
      count++;
    }
  }
  return count;
}
