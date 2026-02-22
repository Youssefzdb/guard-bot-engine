export interface AIProvider {
  id: string;
  name: string;
  nameAr: string;
  baseUrl: string;
  models: { id: string; name: string }[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    nameAr: "أوبن إيه آي",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
      { id: "o1", name: "o1" },
      { id: "o1-mini", name: "o1 Mini" },
      { id: "o3-mini", name: "o3 Mini" },
    ],
  },
  {
    id: "google",
    name: "Google AI",
    nameAr: "جوجل",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    models: [
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    nameAr: "أنثروبيك",
    baseUrl: "https://api.anthropic.com/v1/messages",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    ],
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    nameAr: "إكس إيه آي",
    baseUrl: "https://api.x.ai/v1/chat/completions",
    models: [
      { id: "grok-3", name: "Grok 3" },
      { id: "grok-3-mini", name: "Grok 3 Mini" },
      { id: "grok-2", name: "Grok 2" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    nameAr: "ديب سيك",
    baseUrl: "https://api.deepseek.com/chat/completions",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)" },
    ],
  },
];

const PROVIDER_SETTINGS_KEY = "cyberguard-ai-provider";

export interface AIProviderSettings {
  providerId: string;
  modelId: string;
  apiKey: string;
  enabled: boolean;
}

export function getAIProviderSettings(): AIProviderSettings | null {
  try {
    const raw = localStorage.getItem(PROVIDER_SETTINGS_KEY);
    if (!raw) return null;
    const settings = JSON.parse(raw) as AIProviderSettings;
    if (!settings.enabled || !settings.apiKey) return null;
    return settings;
  } catch {
    return null;
  }
}

export function saveAIProviderSettings(settings: AIProviderSettings) {
  localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearAIProviderSettings() {
  localStorage.removeItem(PROVIDER_SETTINGS_KEY);
}
