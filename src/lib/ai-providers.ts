export interface AIProvider {
  id: string;
  name: string;
  nameAr: string;
  baseUrl: string;
  apiKeyUrl: string;
  models: { id: string; name: string }[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    nameAr: "أوبن إيه آي",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    apiKeyUrl: "https://platform.openai.com/api-keys",
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
    apiKeyUrl: "https://aistudio.google.com/apikey",
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
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
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
    apiKeyUrl: "https://console.x.ai",
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
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    nameAr: "جروك",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyUrl: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
      { id: "gemma2-9b-it", name: "Gemma 2 9B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B" },
    ],
  },
];

const PROVIDER_SETTINGS_KEY = "cyberguard-ai-provider";

export interface APIKeyEntry {
  key: string;
  label: string;
  status?: "unknown" | "valid" | "invalid" | "no_balance";
  balance?: string;
  lastChecked?: number;
}

export interface AIProviderSettings {
  providerId: string;
  modelId: string;
  apiKey: string; // kept for backward compat - primary key
  apiKeys: APIKeyEntry[]; // all keys for fallback
  enabled: boolean;
}

export function getAIProviderSettings(): AIProviderSettings | null {
  try {
    const raw = localStorage.getItem(PROVIDER_SETTINGS_KEY);
    if (!raw) return null;
    const settings = JSON.parse(raw) as AIProviderSettings;
    if (!settings.enabled) return null;
    // Migrate old format (single key) to new format
    if (!settings.apiKeys || settings.apiKeys.length === 0) {
      if (settings.apiKey) {
        settings.apiKeys = [{ key: settings.apiKey, label: "مفتاح 1", status: "unknown" }];
      } else {
        return null;
      }
    }
    // Ensure apiKey is always the first valid key
    settings.apiKey = settings.apiKeys[0]?.key || "";
    if (!settings.apiKey) return null;
    return settings;
  } catch {
    return null;
  }
}

export function saveAIProviderSettings(settings: AIProviderSettings) {
  // Sync apiKey with first key in array
  if (settings.apiKeys && settings.apiKeys.length > 0) {
    settings.apiKey = settings.apiKeys[0].key;
  }
  localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearAIProviderSettings() {
  localStorage.removeItem(PROVIDER_SETTINGS_KEY);
}

export function updateKeyStatus(keyIndex: number, status: APIKeyEntry["status"], balance?: string) {
  try {
    const raw = localStorage.getItem(PROVIDER_SETTINGS_KEY);
    if (!raw) return;
    const settings = JSON.parse(raw) as AIProviderSettings;
    if (settings.apiKeys && settings.apiKeys[keyIndex]) {
      settings.apiKeys[keyIndex].status = status;
      settings.apiKeys[keyIndex].balance = balance;
      settings.apiKeys[keyIndex].lastChecked = Date.now();
      localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {}
}
