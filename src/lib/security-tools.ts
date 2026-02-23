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
  // ========== SCANNING (20 tools) ==========
  {
    id: "port_scan", name: "Port Scanner", nameAr: "فحص المنافذ", icon: "🔍", category: "scanning",
    description: "فحص المنافذ المفتوحة في هدف معين",
    args: [{ key: "target", label: "الهدف", placeholder: "example.com", required: true }, { key: "ports", label: "المنافذ", placeholder: "80,443,22,21,25,3306,8080", required: true }],
  },
  {
    id: "dns_lookup", name: "DNS Lookup", nameAr: "استعلام DNS", icon: "🌐", category: "scanning",
    description: "استعلام جميع سجلات DNS",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },
  {
    id: "http_headers", name: "HTTP Headers Analysis", nameAr: "تحليل HTTP Headers", icon: "📋", category: "scanning",
    description: "تحليل headers الأمنية لموقع ويب",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "ssl_check", name: "SSL/TLS Check", nameAr: "فحص SSL/TLS", icon: "🔒", category: "scanning",
    description: "فحص شهادة SSL وإعدادات HTTPS",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },
  {
    id: "whois", name: "Domain Info", nameAr: "معلومات النطاق", icon: "📋", category: "scanning",
    description: "استعلام معلومات النطاق وأمان البريد",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },
  {
    id: "subnet_calc", name: "Subnet Calculator", nameAr: "حاسبة الشبكة", icon: "🔢", category: "scanning",
    description: "حساب الشبكة الفرعية من CIDR",
    args: [{ key: "cidr", label: "CIDR", placeholder: "192.168.1.0/24", required: true }],
  },
  {
    id: "tech_detect", name: "Technology Detection", nameAr: "كشف التقنيات", icon: "🕵️", category: "scanning",
    description: "كشف التقنيات والأطر المستخدمة في موقع",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "email_security", name: "Email Security Check", nameAr: "فحص أمان البريد", icon: "📧", category: "scanning",
    description: "فحص SPF, DKIM, DMARC لنطاق",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },
  {
    id: "reverse_dns", name: "Reverse DNS", nameAr: "DNS عكسي", icon: "🔄", category: "scanning",
    description: "استعلام DNS عكسي لعنوان IP",
    args: [{ key: "ip", label: "عنوان IP", placeholder: "8.8.8.8", required: true }],
  },
  {
    id: "ping_check", name: "Ping / Availability", nameAr: "فحص التوفر", icon: "📡", category: "scanning",
    description: "فحص توفر خدمة على منفذ معين",
    args: [{ key: "target", label: "الهدف", placeholder: "example.com", required: true }, { key: "port", label: "المنفذ", placeholder: "443" }],
  },
  // --- 10 NEW SCANNING TOOLS ---
  {
    id: "traceroute", name: "Traceroute", nameAr: "تتبع المسار", icon: "🗺️", category: "scanning",
    description: "تتبع مسار الشبكة إلى هدف معين",
    args: [{ key: "target", label: "الهدف", placeholder: "example.com", required: true }],
  },
  {
    id: "geo_ip", name: "IP Geolocation", nameAr: "موقع IP الجغرافي", icon: "📍", category: "scanning",
    description: "تحديد الموقع الجغرافي لعنوان IP",
    args: [{ key: "ip", label: "عنوان IP", placeholder: "8.8.8.8", required: true }],
  },
  {
    id: "asn_lookup", name: "ASN Lookup", nameAr: "استعلام ASN", icon: "🏢", category: "scanning",
    description: "معرفة معلومات ASN ومزود الخدمة",
    args: [{ key: "ip", label: "IP أو ASN", placeholder: "8.8.8.8", required: true }],
  },
  {
    id: "robots_check", name: "Robots.txt Analyzer", nameAr: "تحليل Robots.txt", icon: "🤖", category: "scanning",
    description: "تحليل ملف robots.txt لاكتشاف المسارات المخفية",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "sitemap_check", name: "Sitemap Analyzer", nameAr: "تحليل Sitemap", icon: "🗂️", category: "scanning",
    description: "تحليل ملف sitemap.xml لاكتشاف صفحات الموقع",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "cookie_analyzer", name: "Cookie Analyzer", nameAr: "تحليل الكوكيز", icon: "🍪", category: "scanning",
    description: "تحليل كوكيز الموقع وأعلام الأمان",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "cms_detect", name: "CMS Detection", nameAr: "كشف نظام إدارة المحتوى", icon: "🖥️", category: "scanning",
    description: "كشف نوع نظام إدارة المحتوى المستخدم",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "waf_detect", name: "WAF Detection", nameAr: "كشف جدار الحماية", icon: "🧱", category: "scanning",
    description: "كشف وجود Web Application Firewall",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "link_extractor", name: "Link Extractor", nameAr: "استخراج الروابط", icon: "🔗", category: "scanning",
    description: "استخراج جميع الروابط من صفحة ويب",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "js_file_scanner", name: "JS File Scanner", nameAr: "فحص ملفات JavaScript", icon: "📜", category: "scanning",
    description: "اكتشاف ملفات JS واستخراج endpoints و secrets",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },

  // ========== WAF BYPASS TOOLS ==========
  {
    id: "waf_bypass_test", name: "WAF Bypass Test", nameAr: "اختبار تجاوز WAF", icon: "🔓", category: "offensive",
    description: "اختبار شامل لتجاوز WAF مع تقنيات متعددة (ترميز، headers، methods)",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "waf_fingerprint", name: "WAF Fingerprint", nameAr: "بصمة WAF", icon: "🔍", category: "scanning",
    description: "بصمة WAF تفصيلية مع اختبار حساسية لأنواع الهجمات",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "rate_limit_test", name: "Rate Limit Test", nameAr: "اختبار حد الطلبات", icon: "⏱️", category: "scanning",
    description: "اختبار حدود Rate Limiting للموقع",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },

  // ========== OFFENSIVE (20 tools) ==========
  {
    id: "dir_bruteforce", name: "Directory Discovery", nameAr: "اكتشاف المجلدات", icon: "📂", category: "offensive",
    description: "اكتشاف مجلدات وملفات مخفية في موقع",
    args: [{ key: "url", label: "الرابط الأساسي", placeholder: "https://example.com", required: true }, { key: "wordlist", label: "الكلمات (اختياري)", placeholder: "admin,login,api,backup,wp-admin" }],
  },
  {
    id: "sqli_test", name: "SQL Injection Test", nameAr: "اختبار SQL Injection", icon: "💉", category: "offensive",
    description: "اختبار حقن SQL على رابط معين",
    args: [{ key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/page?id=1", required: true }],
  },
  {
    id: "xss_test", name: "XSS Test", nameAr: "اختبار XSS", icon: "🔥", category: "offensive",
    description: "اختبار ثغرة Cross-Site Scripting",
    args: [{ key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/search?q=test", required: true }],
  },
  {
    id: "subdomain_enum", name: "Subdomain Enumeration", nameAr: "تعداد النطاقات الفرعية", icon: "🌳", category: "offensive",
    description: "اكتشاف النطاقات الفرعية لنطاق",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },
  {
    id: "cors_test", name: "CORS Misconfiguration", nameAr: "اختبار CORS", icon: "🚧", category: "offensive",
    description: "اختبار إعدادات CORS الخاطئة",
    args: [{ key: "url", label: "الرابط", placeholder: "https://api.example.com", required: true }],
  },
  {
    id: "open_redirect", name: "Open Redirect Test", nameAr: "اختبار إعادة التوجيه", icon: "↪️", category: "offensive",
    description: "اختبار ثغرة إعادة التوجيه المفتوحة",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com/redirect?url=", required: true }],
  },
  // --- 14 NEW OFFENSIVE TOOLS ---
  {
    id: "lfi_test", name: "LFI Test", nameAr: "اختبار LFI", icon: "📁", category: "offensive",
    description: "اختبار ثغرة Local File Inclusion",
    args: [{ key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/page?file=test", required: true }],
  },
  {
    id: "rfi_test", name: "RFI Test", nameAr: "اختبار RFI", icon: "🌍", category: "offensive",
    description: "اختبار ثغرة Remote File Inclusion",
    args: [{ key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/page?file=test", required: true }],
  },
  {
    id: "ssrf_test", name: "SSRF Test", nameAr: "اختبار SSRF", icon: "🔀", category: "offensive",
    description: "اختبار ثغرة Server-Side Request Forgery",
    args: [{ key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/fetch?url=", required: true }],
  },
  {
    id: "crlf_test", name: "CRLF Injection Test", nameAr: "اختبار CRLF", icon: "⏎", category: "offensive",
    description: "اختبار حقن CRLF في Headers",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com/redirect?url=test", required: true }],
  },
  {
    id: "clickjacking_test", name: "Clickjacking Test", nameAr: "اختبار Clickjacking", icon: "🖱️", category: "offensive",
    description: "اختبار ثغرة Clickjacking عبر X-Frame-Options",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "host_header_injection", name: "Host Header Injection", nameAr: "حقن Host Header", icon: "🏷️", category: "offensive",
    description: "اختبار حقن Host Header",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "http_methods_test", name: "HTTP Methods Test", nameAr: "اختبار HTTP Methods", icon: "📮", category: "offensive",
    description: "اكتشاف HTTP Methods المسموحة",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "param_discovery", name: "Parameter Discovery", nameAr: "اكتشاف المعاملات", icon: "🔎", category: "offensive",
    description: "اكتشاف معاملات URL المخفية",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com/page", required: true }],
  },
  {
    id: "path_traversal", name: "Path Traversal Test", nameAr: "اختبار اجتياز المسار", icon: "📂", category: "offensive",
    description: "اختبار ثغرة Path Traversal",
    args: [{ key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/file?name=test", required: true }],
  },
  {
    id: "ssti_test", name: "SSTI Test", nameAr: "اختبار SSTI", icon: "🧩", category: "offensive",
    description: "اختبار Server-Side Template Injection",
    args: [{ key: "url", label: "الرابط مع المعامل", placeholder: "https://example.com/page?name=test", required: true }],
  },
  {
    id: "xxe_test", name: "XXE Test", nameAr: "اختبار XXE", icon: "📄", category: "offensive",
    description: "اختبار XML External Entity Injection",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com/api/xml", required: true }],
  },
  {
    id: "nosql_test", name: "NoSQL Injection Test", nameAr: "اختبار NoSQL Injection", icon: "🗄️", category: "offensive",
    description: "اختبار حقن NoSQL على واجهة API",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com/api/login", required: true }],
  },
  {
    id: "api_fuzzer", name: "API Fuzzer", nameAr: "فحص API عشوائي", icon: "🎯", category: "offensive",
    description: "فحص نقاط نهاية API الشائعة",
    args: [{ key: "url", label: "الرابط الأساسي", placeholder: "https://api.example.com", required: true }],
  },
  {
    id: "subdomain_takeover", name: "Subdomain Takeover", nameAr: "استيلاء على النطاق الفرعي", icon: "🏴", category: "offensive",
    description: "فحص إمكانية الاستيلاء على النطاقات الفرعية",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },

  // ========== DEFENSIVE (20 tools) ==========
  {
    id: "hash", name: "Hash Generator", nameAr: "مولّد التجزئة", icon: "🔐", category: "defensive",
    description: "توليد hash للنصوص (SHA-256, SHA-512...)",
    args: [{ key: "text", label: "النص", placeholder: "أدخل النص للتجزئة", required: true }, { key: "algorithm", label: "الخوارزمية", placeholder: "SHA-256 أو ALL" }],
  },
  {
    id: "password_strength", name: "Password Analyzer", nameAr: "محلل كلمات المرور", icon: "🔑", category: "defensive",
    description: "تحليل قوة كلمة المرور مع وقت الكسر",
    args: [{ key: "password", label: "كلمة المرور", placeholder: "أدخل كلمة المرور", required: true }],
  },
  {
    id: "generate_password", name: "Password Generator", nameAr: "مولّد كلمات المرور", icon: "🎲", category: "defensive",
    description: "توليد كلمات مرور آمنة عشوائية",
    args: [{ key: "length", label: "الطول", placeholder: "16" }, { key: "count", label: "العدد", placeholder: "5" }],
  },
  {
    id: "base64", name: "Base64 Encoder/Decoder", nameAr: "ترميز/فك Base64", icon: "📦", category: "defensive",
    description: "ترميز وفك ترميز Base64",
    args: [{ key: "text", label: "النص", placeholder: "أدخل النص", required: true }, { key: "mode", label: "الوضع", placeholder: "encode أو decode" }],
  },
  {
    id: "jwt_decode", name: "JWT Decoder", nameAr: "فك JWT", icon: "🎫", category: "defensive",
    description: "فك وتحليل JWT tokens",
    args: [{ key: "token", label: "JWT Token", placeholder: "eyJhbGciOiJI...", required: true }],
  },
  {
    id: "url_encode", name: "URL Encoder/Decoder", nameAr: "ترميز/فك URL", icon: "🔗", category: "defensive",
    description: "ترميز وفك ترميز URL",
    args: [{ key: "text", label: "النص", placeholder: "أدخل النص", required: true }, { key: "mode", label: "الوضع", placeholder: "encode أو decode" }],
  },
  {
    id: "hash_identify", name: "Hash Identifier", nameAr: "تحديد نوع Hash", icon: "🔎", category: "defensive",
    description: "تحديد نوع خوارزمية التجزئة",
    args: [{ key: "hash", label: "قيمة Hash", placeholder: "أدخل الـ hash", required: true }],
  },
  {
    id: "csp_generator", name: "CSP Generator", nameAr: "مولّد CSP", icon: "🏗️", category: "defensive",
    description: "توليد Content-Security-Policy مناسب لموقع",
    args: [{ key: "url", label: "رابط الموقع", placeholder: "https://example.com", required: true }],
  },
  {
    id: "hex_converter", name: "Hex Converter", nameAr: "محوّل Hex", icon: "🔠", category: "defensive",
    description: "تحويل بين نص و Hex",
    args: [{ key: "text", label: "النص", placeholder: "Hello World", required: true }, { key: "mode", label: "الوضع", placeholder: "to_hex أو from_hex" }],
  },
  {
    id: "timestamp_convert", name: "Timestamp Converter", nameAr: "محوّل التوقيت", icon: "⏰", category: "defensive",
    description: "تحويل Unix timestamp إلى تاريخ والعكس",
    args: [{ key: "value", label: "القيمة", placeholder: "1700000000 أو 2024-01-01", required: true }],
  },
  // --- 10 NEW DEFENSIVE TOOLS ---
  {
    id: "ip_converter", name: "IP Converter", nameAr: "محوّل عناوين IP", icon: "🔄", category: "defensive",
    description: "تحويل IP بين عشري وثنائي وست عشري",
    args: [{ key: "ip", label: "عنوان IP", placeholder: "192.168.1.1", required: true }],
  },
  {
    id: "cidr_calculator", name: "CIDR Range Calculator", nameAr: "حاسبة نطاق CIDR", icon: "📐", category: "defensive",
    description: "حساب نطاق عناوين IP من CIDR",
    args: [{ key: "cidr", label: "CIDR", placeholder: "10.0.0.0/8", required: true }],
  },
  {
    id: "html_encode", name: "HTML Encoder/Decoder", nameAr: "ترميز/فك HTML", icon: "🌐", category: "defensive",
    description: "ترميز وفك ترميز HTML entities",
    args: [{ key: "text", label: "النص", placeholder: "<script>alert(1)</script>", required: true }, { key: "mode", label: "الوضع", placeholder: "encode أو decode" }],
  },
  {
    id: "uuid_generator", name: "UUID Generator", nameAr: "مولّد UUID", icon: "🆔", category: "defensive",
    description: "توليد معرفات UUID عشوائية",
    args: [{ key: "count", label: "العدد", placeholder: "5" }],
  },
  {
    id: "regex_tester", name: "Regex Tester", nameAr: "اختبار Regex", icon: "🧪", category: "defensive",
    description: "اختبار تعبير نمطي على نص",
    args: [{ key: "pattern", label: "النمط", placeholder: "\\d{3}-\\d{4}", required: true }, { key: "text", label: "النص", placeholder: "الرقم 123-4567", required: true }],
  },
  {
    id: "ssl_cert_generator", name: "Self-Signed Cert Generator", nameAr: "مولّد شهادات SSL", icon: "📜", category: "defensive",
    description: "توليد أوامر إنشاء شهادة SSL ذاتية التوقيع",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }, { key: "days", label: "المدة (أيام)", placeholder: "365" }],
  },
  {
    id: "htaccess_generator", name: ".htaccess Generator", nameAr: "مولّد .htaccess", icon: "⚙️", category: "defensive",
    description: "توليد قواعد .htaccess أمنية",
    args: [{ key: "features", label: "الميزات", placeholder: "redirect,block_bots,security_headers" }],
  },
  {
    id: "cors_header_generator", name: "CORS Header Generator", nameAr: "مولّد CORS Headers", icon: "🛡️", category: "defensive",
    description: "توليد إعدادات CORS آمنة",
    args: [{ key: "origin", label: "Origin المسموح", placeholder: "https://example.com", required: true }, { key: "methods", label: "Methods", placeholder: "GET,POST,PUT" }],
  },
  {
    id: "encryption_tool", name: "AES Encrypt/Decrypt", nameAr: "تشفير/فك AES", icon: "🔏", category: "defensive",
    description: "تشفير وفك تشفير النصوص باستخدام AES",
    args: [{ key: "text", label: "النص", placeholder: "أدخل النص", required: true }, { key: "key", label: "المفتاح", placeholder: "أدخل مفتاح التشفير", required: true }, { key: "mode", label: "الوضع", placeholder: "encrypt أو decrypt" }],
  },
  {
    id: "security_checklist", name: "Security Checklist", nameAr: "قائمة التحقق الأمني", icon: "✅", category: "defensive",
    description: "فحص قائمة تحقق أمنية شاملة لموقع",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  // ========== NEW ADVANCED TOOLS ==========
  {
    id: "security_txt_check", name: "Security.txt Check", nameAr: "فحص Security.txt", icon: "🔐", category: "scanning",
    description: "فحص ملف security.txt للموقع",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "dns_zone_transfer", name: "DNS Zone Transfer", nameAr: "اختبار نقل المنطقة", icon: "🔄", category: "scanning",
    description: "اختبار نقل منطقة DNS (AXFR)",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },
  {
    id: "cloud_metadata_check", name: "Cloud Metadata Check", nameAr: "فحص بيانات السحابة", icon: "☁️", category: "scanning",
    description: "فحص تسرب بيانات السحابة (AWS/GCP/Azure)",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "cve_search", name: "CVE Search", nameAr: "بحث ثغرات CVE", icon: "🔍", category: "scanning",
    description: "البحث عن ثغرات CVE معروفة لتقنية معينة",
    args: [{ key: "keyword", label: "الكلمة المفتاحية", placeholder: "Apache 2.4", required: true }],
  },
  {
    id: "screenshot_site", name: "Website Screenshot", nameAr: "لقطة شاشة الموقع", icon: "📸", category: "scanning",
    description: "التقاط صورة لموقع ويب",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  // ========== VIRUSTOTAL ==========
  {
    id: "vt_scan_url", name: "VT URL Scan", nameAr: "فحص رابط (VirusTotal)", icon: "🛡️", category: "scanning",
    description: "فحص رابط عبر 70+ محرك مكافحة فيروسات",
    args: [{ key: "url", label: "الرابط", placeholder: "https://example.com", required: true }],
  },
  {
    id: "vt_scan_domain", name: "VT Domain Analysis", nameAr: "تحليل نطاق (VirusTotal)", icon: "🛡️", category: "scanning",
    description: "تحليل نطاق شامل: سمعة، DNS، SSL، نطاقات فرعية",
    args: [{ key: "domain", label: "النطاق", placeholder: "example.com", required: true }],
  },
  {
    id: "vt_scan_ip", name: "VT IP Analysis", nameAr: "تحليل IP (VirusTotal)", icon: "🛡️", category: "scanning",
    description: "تحليل عنوان IP: ASN، دولة، سمعة، تهديدات",
    args: [{ key: "ip", label: "عنوان IP", placeholder: "8.8.8.8", required: true }],
  },
  {
    id: "vt_scan_file_hash", name: "VT File Hash", nameAr: "فحص ملف (VirusTotal)", icon: "🛡️", category: "scanning",
    description: "فحص ملف عبر hash (MD5/SHA1/SHA256)",
    args: [{ key: "hash", label: "Hash", placeholder: "SHA256 أو MD5 أو SHA1", required: true }],
  },
];

const EXEC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cyber-execute`;

export async function executeTool(toolId: string, args: Record<string, string>, customConfig?: { executionType: string; executionConfig: Record<string, string> }): Promise<string> {
  const resp = await fetch(EXEC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ tool: toolId, args, customConfig }),
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "فشل التنفيذ");
  return data.result;
}

export function getAllTools(customTools: SecurityTool[]): SecurityTool[] {
  return [...securityTools, ...customTools];
}
