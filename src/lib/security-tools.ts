export interface SecurityTool {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  args: { key: string; label: string; placeholder: string; required?: boolean }[];
}

export const securityTools: SecurityTool[] = [
  {
    id: "port_scan",
    name: "Port Scanner",
    nameAr: "فحص المنافذ",
    icon: "🔍",
    description: "فحص المنافذ المفتوحة في هدف معين",
    args: [
      { key: "target", label: "الهدف (IP/Domain)", placeholder: "example.com", required: true },
      { key: "ports", label: "المنافذ", placeholder: "80,443,22,21,25,3306,8080", required: true },
    ],
  },
  {
    id: "dns_lookup",
    name: "DNS Lookup",
    nameAr: "استعلام DNS",
    icon: "🌐",
    description: "استعلام سجلات DNS لنطاق معين",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "http_headers",
    name: "HTTP Headers Analysis",
    nameAr: "تحليل HTTP Headers",
    icon: "🛡️",
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
    description: "فحص شهادة SSL/TLS لنطاق",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "hash",
    name: "Hash Generator",
    nameAr: "مولّد التجزئة",
    icon: "🔐",
    description: "توليد hash للنصوص",
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
    description: "تحليل قوة كلمة المرور",
    args: [
      { key: "password", label: "كلمة المرور", placeholder: "أدخل كلمة المرور للتحليل", required: true },
    ],
  },
  {
    id: "generate_password",
    name: "Password Generator",
    nameAr: "مولّد كلمات المرور",
    icon: "🎲",
    description: "توليد كلمات مرور آمنة",
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
    description: "فك وتحليل JWT tokens",
    args: [
      { key: "token", label: "JWT Token", placeholder: "eyJhbGciOiJI...", required: true },
    ],
  },
  {
    id: "whois",
    name: "Domain Info",
    nameAr: "معلومات النطاق",
    icon: "📋",
    description: "استعلام معلومات النطاق",
    args: [
      { key: "domain", label: "النطاق", placeholder: "example.com", required: true },
    ],
  },
  {
    id: "subnet_calc",
    name: "Subnet Calculator",
    nameAr: "حاسبة الشبكة",
    icon: "🔢",
    description: "حساب الشبكة الفرعية",
    args: [
      { key: "cidr", label: "CIDR", placeholder: "192.168.1.0/24", required: true },
    ],
  },
  {
    id: "url_encode",
    name: "URL Encoder/Decoder",
    nameAr: "ترميز/فك URL",
    icon: "🔗",
    description: "ترميز وفك ترميز URL",
    args: [
      { key: "text", label: "النص", placeholder: "أدخل النص", required: true },
      { key: "mode", label: "الوضع", placeholder: "encode أو decode" },
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
