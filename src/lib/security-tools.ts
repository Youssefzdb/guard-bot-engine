export type ToolCategory = "offensive" | "defensive" | "scanning";

export interface SecurityTool {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  category: ToolCategory;
  args: { key: string; label: string; placeholder: string; required?: boolean }[];
}

export const categoryInfo: Record<ToolCategory, { label: string; icon: string; color: string }> = {
  scanning: { label: "🔍 فحص واستطلاع", icon: "🔍", color: "secondary" },
  offensive: { label: "⚔️ هجومية (اختبار اختراق)", icon: "⚔️", color: "destructive" },
  defensive: { label: "🛡️ دفاعية وحماية", icon: "🛡️", color: "primary" },
};

export const securityTools: SecurityTool[] = [
  // ========== SCANNING ==========
  {
    id: "port_scan",
    name: "Port Scanner",
    nameAr: "فحص المنافذ",
    icon: "🔍",
    category: "scanning",
    description: "فحص المنافذ المفتوحة في هدف معين",
    args: [
      { key: "target", label: "الهدف", placeholder: "example.com", required: true },
      { key: "ports", label: "المنافذ", placeholder: "80,443,22,21,25,3306,8080", required: true },
    ],
  },
  {
    id: "dns_lookup",
    name: "DNS Lookup",
    nameAr: "استعلام DNS",
    icon: "🌐",
    category: "scanning",
    description: "استعلام جميع سجلات DNS",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "http_headers",
    name: "HTTP Headers Analysis",
    nameAr: "تحليل HTTP Headers",
    icon: "📋",
    category: "scanning",
    description: "تحليل headers الأمنية لموقع ويب",
    args: [
      { key: "url", label: "الرابط", placeholder: "https://example.com", required: true },
    ],
  },
  {
    id: "ssl_check",
    name: "SSL/TLS Check",
    nameAr: "فحص SSL/TLS",
    icon: "🔒",
    category: "scanning",
    description: "فحص شهادة SSL وإعدادات HTTPS",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "whois",
    name: "Domain Info",
    nameAr: "معلومات النطاق",
    icon: "📋",
    category: "scanning",
    description: "استعلام معلومات النطاق وأمان البريد",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "subnet_calc",
    name: "Subnet Calculator",
    nameAr: "حاسبة الشبكة",
    icon: "🔢",
    category: "scanning",
    description: "حساب الشبكة الفرعية من CIDR",
    args: [
      { key: "cidr", label: "CIDR", placeholder: "192.168.1.0/24", required: true },
    ],
  },
  {
    id: "tech_detect",
    name: "Technology Detection",
    nameAr: "كشف التقنيات",
    icon: "🕵️",
    category: "scanning",
    description: "كشف التقنيات والأطر المستخدمة في موقع",
    args: [
      { key: "url", label: "الرابط", placeholder: "https://example.com", required: true },
    ],
  },
  {
    id: "email_security",
    name: "Email Security Check",
    nameAr: "فحص أمان البريد",
    icon: "📧",
    category: "scanning",
    description: "فحص SPF, DKIM, DMARC لنطاق",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "reverse_dns",
    name: "Reverse DNS",
    nameAr: "DNS عكسي",
    icon: "🔄",
    category: "scanning",
    description: "استعلام DNS عكسي لعنوان IP",
    args: [
      { key: "ip", label: "عنوان IP", placeholder: "8.8.8.8", required: true },
    ],
  },
  {
    id: "ping_check",
    name: "Ping / Availability",
    nameAr: "فحص التوفر",
    icon: "📡",
    category: "scanning",
    description: "فحص توفر خدمة على منفذ معين",
    args: [
      { key: "target", label: "الهدف", placeholder: "example.com", required: true },
      { key: "port", label: "المنفذ", placeholder: "443" },
    ],
  },

  // ========== OFFENSIVE (Ethical Pen Testing) ==========
  {
    id: "dir_bruteforce",
    name: "Directory Discovery",
    nameAr: "اكتشاف المجلدات",
    icon: "📂",
    category: "offensive",
    description: "اكتشاف مجلدات وملفات مخفية في موقع",
    args: [
      { key: "url", label: "الرابط الأساسي", placeholder: "https://example.com", required: true },
      { key: "wordlist", label: "الكلمات (اختياري)", placeholder: "admin,login,api,backup,wp-admin" },
    ],
  },
  {
    id: "sqli_test",
    name: "SQL Injection Test",
    nameAr: "اختبار SQL Injection",
    icon: "💉",
    category: "offensive",
    description: "اختبار حقن SQL على رابط معين",
    args: [
      { key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/page?id=1", required: true },
    ],
  },
  {
    id: "xss_test",
    name: "XSS Test",
    nameAr: "اختبار XSS",
    icon: "🔥",
    category: "offensive",
    description: "اختبار ثغرة Cross-Site Scripting",
    args: [
      { key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/search?q=test", required: true },
    ],
  },
  {
    id: "subdomain_enum",
    name: "Subdomain Enumeration",
    nameAr: "تعداد النطاقات الفرعية",
    icon: "🌳",
    category: "offensive",
    description: "اكتشاف النطاقات الفرعية لنطاق",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "cors_test",
    name: "CORS Misconfiguration",
    nameAr: "اختبار CORS",
    icon: "🚧",
    category: "offensive",
    description: "اختبار إعدادات CORS الخاطئة",
    args: [
      { key: "url", label: "الرابط", placeholder: "https://api.example.com", required: true },
    ],
  },
  {
    id: "open_redirect",
    name: "Open Redirect Test",
    nameAr: "اختبار إعادة التوجيه",
    icon: "↪️",
    category: "offensive",
    description: "اختبار ثغرة إعادة التوجيه المفتوحة",
    args: [
      { key: "url", label: "الرابط", placeholder: "https://example.com/redirect?url=", required: true },
    ],
  },

  // ========== DEFENSIVE ==========
  {
    id: "hash",
    name: "Hash Generator",
    nameAr: "مولّد التجزئة",
    icon: "🔐",
    category: "defensive",
    description: "توليد hash للنصوص (SHA-256, SHA-512...)",
    args: [
      { key: "text", label: "النص", placeholder: "أدخل النص للتجزئة", required: true },
      { key: "algorithm", label: "الخوارزمية", placeholder: "SHA-256 أو ALL" },
    ],
  },
  {
    id: "password_strength",
    name: "Password Analyzer",
    nameAr: "محلل كلمات المرور",
    icon: "🔑",
    category: "defensive",
    description: "تحليل قوة كلمة المرور مع وقت الكسر",
    args: [
      { key: "password", label: "كلمة المرور", placeholder: "أدخل كلمة المرور", required: true },
    ],
  },
  {
    id: "generate_password",
    name: "Password Generator",
    nameAr: "مولّد كلمات المرور",
    icon: "🎲",
    category: "defensive",
    description: "توليد كلمات مرور آمنة عشوائية",
    args: [
      { key: "length", label: "الطول", placeholder: "16" },
      { key: "count", label: "العدد", placeholder: "5" },
    ],
  },
  {
    id: "base64",
    name: "Base64 Encoder/Decoder",
    nameAr: "ترميز/فك Base64",
    icon: "📦",
    category: "defensive",
    description: "ترميز وفك ترميز Base64",
    args: [
      { key: "text", label: "النص", placeholder: "أدخل النص", required: true },
      { key: "mode", label: "الوضع", placeholder: "encode أو decode" },
    ],
  },
  {
    id: "jwt_decode",
    name: "JWT Decoder",
    nameAr: "فك JWT",
    icon: "🎫",
    category: "defensive",
    description: "فك وتحليل JWT tokens",
    args: [
      { key: "token", label: "JWT Token", placeholder: "eyJhbGciOiJI...", required: true },
    ],
  },
  {
    id: "url_encode",
    name: "URL Encoder/Decoder",
    nameAr: "ترميز/فك URL",
    icon: "🔗",
    category: "defensive",
    description: "ترميز وفك ترميز URL",
    args: [
      { key: "text", label: "النص", placeholder: "أدخل النص", required: true },
      { key: "mode", label: "الوضع", placeholder: "encode أو decode" },
    ],
  },
  {
    id: "hash_identify",
    name: "Hash Identifier",
    nameAr: "تحديد نوع Hash",
    icon: "🔎",
    category: "defensive",
    description: "تحديد نوع خوارزمية التجزئة",
    args: [
      { key: "hash", label: "قيمة Hash", placeholder: "أدخل الـ hash", required: true },
    ],
  },
  {
    id: "csp_generator",
    name: "CSP Generator",
    nameAr: "مولّد CSP",
    icon: "🏗️",
    category: "defensive",
    description: "توليد Content-Security-Policy مناسب لموقع",
    args: [
      { key: "url", label: "رابط الموقع", placeholder: "https://example.com", required: true },
    ],
  },
  {
    id: "hex_converter",
    name: "Hex Converter",
    nameAr: "محوّل Hex",
    icon: "🔠",
    category: "defensive",
    description: "تحويل بين نص و Hex",
    args: [
      { key: "text", label: "النص", placeholder: "Hello World", required: true },
      { key: "mode", label: "الوضع", placeholder: "to_hex أو from_hex" },
    ],
  },
  {
    id: "timestamp_convert",
    name: "Timestamp Converter",
    nameAr: "محوّل التوقيت",
    icon: "⏰",
    category: "defensive",
    description: "تحويل Unix timestamp إلى تاريخ والعكس",
    args: [
      { key: "value", label: "القيمة", placeholder: "1700000000 أو 2024-01-01", required: true },
    ],
  },
];

const EXEC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cyber-execute`;

export async function executeTool(toolId: string, args: Record<string, string>): Promise<string> {
  const resp = await fetch(EXEC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ tool: toolId, args }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "فشل التنفيذ");
  return data.result;
}
