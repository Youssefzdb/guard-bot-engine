import type { SecurityTool, ToolCategory } from "./security-tools";

const STORAGE_KEY = "cyberguard_custom_tools";

export interface CustomToolDefinition {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  category: ToolCategory;
  args: { key: string; label: string; placeholder: string; required?: boolean }[];
  // Custom execution: the code template to run on the backend
  executionType: "http_fetch" | "dns_query" | "tcp_connect" | "custom_script";
  executionConfig: Record<string, string>;
}

export function getCustomTools(): SecurityTool[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const tools: CustomToolDefinition[] = JSON.parse(raw);
    return tools.map(t => ({
      id: `custom_${t.id}`,
      name: t.name,
      nameAr: t.nameAr,
      icon: t.icon,
      description: t.description,
      category: t.category,
      args: t.args,
    }));
  } catch {
    return [];
  }
}

export function getCustomToolDefinitions(): CustomToolDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomTool(tool: CustomToolDefinition): void {
  const tools = getCustomToolDefinitions();
  const existing = tools.findIndex(t => t.id === tool.id);
  if (existing >= 0) {
    tools[existing] = tool;
  } else {
    tools.push(tool);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}

export function deleteCustomTool(id: string): void {
  const tools = getCustomToolDefinitions().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}

export function exportCustomTools(): string {
  return localStorage.getItem(STORAGE_KEY) || "[]";
}

export function importCustomTools(json: string): number {
  try {
    const imported: CustomToolDefinition[] = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error("Invalid format");
    const existing = getCustomToolDefinitions();
    let count = 0;
    for (const tool of imported) {
      if (tool.id && tool.name && tool.nameAr) {
        const idx = existing.findIndex(t => t.id === tool.id);
        if (idx >= 0) existing[idx] = tool;
        else existing.push(tool);
        count++;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return count;
  } catch {
    throw new Error("صيغة JSON غير صالحة");
  }
}
