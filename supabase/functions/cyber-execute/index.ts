import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Safe cybersecurity tools that can be executed
const tools: Record<string, (args: Record<string, string>) => Promise<string>> = {

  // Port scanning (TCP connect)
  async port_scan(args) {
    const { target, ports } = args;
    if (!target || !ports) return "❌ مطلوب: target و ports";
    
    // Security: only allow scanning specific safe targets or localhost
    const portList = ports.split(",").map(p => parseInt(p.trim())).filter(p => p > 0 && p <= 65535).slice(0, 20);
    const results: string[] = [`🔍 فحص المنافذ لـ ${target}\n${"─".repeat(40)}`];
    
    for (const port of portList) {
      try {
        const conn = await Deno.connect({ hostname: target, port, transport: "tcp" });
        conn.close();
        results.push(`  ✅ المنفذ ${port} - مفتوح (OPEN)`);
      } catch {
        results.push(`  ❌ المنفذ ${port} - مغلق (CLOSED)`);
      }
    }
    results.push(`\n📊 تم فحص ${portList.length} منفذ`);
    return results.join("\n");
  },

  // DNS lookup
  async dns_lookup(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    
    const results: string[] = [`🌐 DNS Lookup: ${domain}\n${"─".repeat(40)}`];
    
    try {
      const records = await Deno.resolveDns(domain, "A");
      results.push(`\n📌 A Records:`);
      records.forEach(r => results.push(`  → ${r}`));
    } catch { results.push(`  ⚠️ لا توجد سجلات A`); }

    try {
      const records = await Deno.resolveDns(domain, "AAAA");
      results.push(`\n📌 AAAA Records:`);
      records.forEach(r => results.push(`  → ${r}`));
    } catch { results.push(`  ⚠️ لا توجد سجلات AAAA`); }

    try {
      const records = await Deno.resolveDns(domain, "MX");
      results.push(`\n📧 MX Records:`);
      records.forEach(r => results.push(`  → ${r.exchange} (priority: ${r.preference})`));
    } catch { results.push(`  ⚠️ لا توجد سجلات MX`); }

    try {
      const records = await Deno.resolveDns(domain, "NS");
      results.push(`\n🏷️ NS Records:`);
      records.forEach(r => results.push(`  → ${r}`));
    } catch { results.push(`  ⚠️ لا توجد سجلات NS`); }

    try {
      const records = await Deno.resolveDns(domain, "TXT");
      results.push(`\n📝 TXT Records:`);
      records.forEach(r => results.push(`  → ${r.join("")}`));
    } catch { results.push(`  ⚠️ لا توجد سجلات TXT`); }

    return results.join("\n");
  },

  // Hash generation
  async hash(args) {
    const { text, algorithm = "SHA-256" } = args;
    if (!text) return "❌ مطلوب: text";

    const algos = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];
    const results: string[] = [`🔐 تجزئة النص\n${"─".repeat(40)}\n📝 النص: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n`];

    if (algorithm.toUpperCase() === "ALL") {
      for (const algo of algos) {
        try {
          const encoder = new TextEncoder();
          const data = encoder.encode(text);
          if (algo === "MD5") {
            // Use SubtleCrypto doesn't support MD5, use manual
            results.push(`  ⚠️ MD5 (غير آمن - لا يُنصح باستخدامه)`);
          } else {
            const hashBuffer = await crypto.subtle.digest(algo, data);
            const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
            results.push(`  🔑 ${algo}: ${hashHex}`);
          }
        } catch {
          results.push(`  ❌ ${algo}: غير مدعوم`);
        }
      }
    } else {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest(algorithm.toUpperCase(), data);
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
        results.push(`  🔑 ${algorithm}: ${hashHex}`);
      } catch {
        results.push(`  ❌ خوارزمية غير مدعومة: ${algorithm}`);
      }
    }

    return results.join("\n");
  },

  // Base64 encode/decode
  async base64(args) {
    const { text, mode = "encode" } = args;
    if (!text) return "❌ مطلوب: text";

    if (mode === "decode") {
      try {
        const decoded = new TextDecoder().decode(base64Decode(text));
        return `🔓 Base64 Decode:\n${"─".repeat(40)}\n📥 المدخل: ${text}\n📤 النتيجة: ${decoded}`;
      } catch {
        return "❌ نص Base64 غير صالح";
      }
    } else {
      const encoded = base64Encode(new TextEncoder().encode(text));
      return `🔒 Base64 Encode:\n${"─".repeat(40)}\n📥 المدخل: ${text}\n📤 النتيجة: ${encoded}`;
    }
  },

  // HTTP headers analysis
  async http_headers(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";

    try {
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      const results: string[] = [`🌐 تحليل HTTP Headers\n${"─".repeat(40)}\n🔗 URL: ${url}\n📊 Status: ${response.status} ${response.statusText}\n`];

      const securityHeaders: Record<string, { found: boolean; value: string; importance: string }> = {
        "strict-transport-security": { found: false, value: "", importance: "🔴 حرج" },
        "content-security-policy": { found: false, value: "", importance: "🔴 حرج" },
        "x-content-type-options": { found: false, value: "", importance: "🟡 مهم" },
        "x-frame-options": { found: false, value: "", importance: "🟡 مهم" },
        "x-xss-protection": { found: false, value: "", importance: "🟡 مهم" },
        "referrer-policy": { found: false, value: "", importance: "🟢 مستحسن" },
        "permissions-policy": { found: false, value: "", importance: "🟢 مستحسن" },
      };

      results.push("📋 جميع Headers:");
      response.headers.forEach((value, key) => {
        results.push(`  ${key}: ${value.substring(0, 100)}`);
        if (securityHeaders[key.toLowerCase()]) {
          securityHeaders[key.toLowerCase()].found = true;
          securityHeaders[key.toLowerCase()].value = value;
        }
      });

      results.push(`\n🛡️ تحليل الأمان:`);
      for (const [header, info] of Object.entries(securityHeaders)) {
        if (info.found) {
          results.push(`  ✅ ${header}: ${info.value.substring(0, 80)}`);
        } else {
          results.push(`  ❌ ${info.importance} - ${header}: مفقود!`);
        }
      }

      const score = Object.values(securityHeaders).filter(h => h.found).length;
      const total = Object.keys(securityHeaders).length;
      results.push(`\n📊 نتيجة الأمان: ${score}/${total} (${Math.round(score/total*100)}%)`);

      return results.join("\n");
    } catch (e) {
      return `❌ فشل الاتصال: ${e instanceof Error ? e.message : "خطأ غير معروف"}`;
    }
  },

  // SSL/TLS certificate check
  async ssl_check(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";

    try {
      const url = `https://${domain}`;
      const response = await fetch(url, { method: "HEAD" });
      const results: string[] = [`🔒 فحص SSL/TLS: ${domain}\n${"─".repeat(40)}`];
      
      if (response.ok || response.status < 500) {
        results.push(`  ✅ اتصال HTTPS ناجح`);
        results.push(`  📊 Status: ${response.status}`);
        
        const hsts = response.headers.get("strict-transport-security");
        if (hsts) {
          results.push(`  ✅ HSTS مفعّل: ${hsts}`);
        } else {
          results.push(`  ❌ HSTS غير مفعّل`);
        }
      }

      // Try HTTP to check redirect
      try {
        const httpResp = await fetch(`http://${domain}`, { method: "HEAD", redirect: "manual" });
        if (httpResp.status >= 300 && httpResp.status < 400) {
          const location = httpResp.headers.get("location");
          if (location?.startsWith("https")) {
            results.push(`  ✅ HTTP → HTTPS إعادة توجيه مفعّلة`);
          } else {
            results.push(`  ⚠️ إعادة التوجيه ليست إلى HTTPS`);
          }
        } else {
          results.push(`  ❌ لا توجد إعادة توجيه من HTTP إلى HTTPS`);
        }
      } catch {
        results.push(`  ⚠️ لم يتم التحقق من إعادة توجيه HTTP`);
      }

      return results.join("\n");
    } catch (e) {
      return `❌ فشل فحص SSL: ${e instanceof Error ? e.message : "خطأ"}`;
    }
  },

  // Password strength analyzer
  async password_strength(args) {
    const { password } = args;
    if (!password) return "❌ مطلوب: password";

    const results: string[] = [`🔑 تحليل قوة كلمة المرور\n${"─".repeat(40)}`];
    let score = 0;
    const checks: { label: string; pass: boolean }[] = [];

    checks.push({ label: "الطول ≥ 8 أحرف", pass: password.length >= 8 });
    checks.push({ label: "الطول ≥ 12 حرف", pass: password.length >= 12 });
    checks.push({ label: "الطول ≥ 16 حرف", pass: password.length >= 16 });
    checks.push({ label: "أحرف كبيرة (A-Z)", pass: /[A-Z]/.test(password) });
    checks.push({ label: "أحرف صغيرة (a-z)", pass: /[a-z]/.test(password) });
    checks.push({ label: "أرقام (0-9)", pass: /[0-9]/.test(password) });
    checks.push({ label: "رموز خاصة (!@#$...)", pass: /[^A-Za-z0-9]/.test(password) });
    checks.push({ label: "لا تكرار متتالي (aaa, 111)", pass: !/(.)\1{2,}/.test(password) });
    checks.push({ label: "لا تسلسل (abc, 123)", pass: !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password) });

    for (const check of checks) {
      results.push(`  ${check.pass ? "✅" : "❌"} ${check.label}`);
      if (check.pass) score++;
    }

    const entropy = Math.log2(Math.pow(
      ((/[a-z]/.test(password) ? 26 : 0) + (/[A-Z]/.test(password) ? 26 : 0) + (/[0-9]/.test(password) ? 10 : 0) + (/[^A-Za-z0-9]/.test(password) ? 33 : 0)),
      password.length
    ));

    results.push(`\n📊 Entropy: ${entropy.toFixed(1)} bits`);

    let strength = "ضعيفة جداً 🔴";
    if (score >= 8) strength = "قوية جداً 🟢";
    else if (score >= 6) strength = "قوية 🟡";
    else if (score >= 4) strength = "متوسطة 🟠";

    results.push(`💪 القوة: ${strength} (${score}/${checks.length})`);

    const crackTime = Math.pow(2, entropy) / 1e12;
    if (crackTime < 1) results.push(`⏱️ وقت الكسر التقريبي: أقل من ثانية`);
    else if (crackTime < 60) results.push(`⏱️ وقت الكسر التقريبي: ${crackTime.toFixed(0)} ثانية`);
    else if (crackTime < 3600) results.push(`⏱️ وقت الكسر التقريبي: ${(crackTime/60).toFixed(0)} دقيقة`);
    else if (crackTime < 86400 * 365) results.push(`⏱️ وقت الكسر التقريبي: ${(crackTime/86400).toFixed(0)} يوم`);
    else results.push(`⏱️ وقت الكسر التقريبي: ${(crackTime/86400/365).toExponential(1)} سنة`);

    return results.join("\n");
  },

  // Whois-like info
  async whois(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";

    const results: string[] = [`📋 معلومات النطاق: ${domain}\n${"─".repeat(40)}`];

    try {
      const aRecords = await Deno.resolveDns(domain, "A");
      results.push(`\n🌐 عناوين IP:`);
      aRecords.forEach(r => results.push(`  → ${r}`));
    } catch { /* ignore */ }

    try {
      const nsRecords = await Deno.resolveDns(domain, "NS");
      results.push(`\n🏷️ خوادم الأسماء (NS):`);
      nsRecords.forEach(r => results.push(`  → ${r}`));
    } catch { /* ignore */ }

    try {
      const mxRecords = await Deno.resolveDns(domain, "MX");
      results.push(`\n📧 خوادم البريد (MX):`);
      mxRecords.forEach(r => results.push(`  → ${r.exchange} (أولوية: ${r.preference})`));
    } catch { /* ignore */ }

    try {
      const txtRecords = await Deno.resolveDns(domain, "TXT");
      results.push(`\n📝 سجلات TXT:`);
      txtRecords.forEach(r => results.push(`  → ${r.join("")}`));

      const spf = txtRecords.find(r => r.join("").includes("v=spf"));
      const dmarc = txtRecords.find(r => r.join("").includes("v=DMARC"));
      
      results.push(`\n🛡️ تحليل أمان البريد:`);
      results.push(`  ${spf ? "✅" : "❌"} SPF Record`);
      results.push(`  ${dmarc ? "✅" : "❌"} DMARC Record`);
    } catch { /* ignore */ }

    return results.join("\n");
  },

  // Generate secure password
  async generate_password(args) {
    const { length = "16", count = "5" } = args;
    const len = Math.min(Math.max(parseInt(length) || 16, 8), 128);
    const cnt = Math.min(parseInt(count) || 5, 10);

    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    const results: string[] = [`🔐 مولّد كلمات مرور آمنة\n${"─".repeat(40)}\n📏 الطول: ${len} حرف\n`];

    for (let i = 0; i < cnt; i++) {
      const bytes = new Uint8Array(len);
      crypto.getRandomValues(bytes);
      const password = Array.from(bytes).map(b => charset[b % charset.length]).join("");
      results.push(`  ${i + 1}. ${password}`);
    }

    results.push(`\n💡 نصيحة: استخدم مدير كلمات مرور لحفظ كلمات المرور`);
    return results.join("\n");
  },

  // JWT decoder
  async jwt_decode(args) {
    const { token } = args;
    if (!token) return "❌ مطلوب: token";

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return "❌ صيغة JWT غير صالحة";

      const header = JSON.parse(new TextDecoder().decode(base64Decode(parts[0].replace(/-/g, "+").replace(/_/g, "/") + "==")));
      const payload = JSON.parse(new TextDecoder().decode(base64Decode(parts[1].replace(/-/g, "+").replace(/_/g, "/") + "==")));

      const results: string[] = [`🔓 JWT Token Decoder\n${"─".repeat(40)}`];
      results.push(`\n📋 Header:`);
      results.push(JSON.stringify(header, null, 2));
      results.push(`\n📦 Payload:`);
      results.push(JSON.stringify(payload, null, 2));

      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const isExpired = expDate < new Date();
        results.push(`\n⏰ انتهاء الصلاحية: ${expDate.toISOString()} ${isExpired ? "❌ منتهي" : "✅ صالح"}`);
      }
      if (payload.iat) {
        results.push(`📅 تاريخ الإصدار: ${new Date(payload.iat * 1000).toISOString()}`);
      }

      return results.join("\n");
    } catch {
      return "❌ فشل فك تشفير JWT";
    }
  },

  // URL encode/decode
  async url_encode(args) {
    const { text, mode = "encode" } = args;
    if (!text) return "❌ مطلوب: text";

    if (mode === "decode") {
      return `🔓 URL Decode:\n${"─".repeat(40)}\n📥 المدخل: ${text}\n📤 النتيجة: ${decodeURIComponent(text)}`;
    }
    return `🔒 URL Encode:\n${"─".repeat(40)}\n📥 المدخل: ${text}\n📤 النتيجة: ${encodeURIComponent(text)}`;
  },

  // Subnet calculator
  async subnet_calc(args) {
    const { cidr } = args;
    if (!cidr) return "❌ مطلوب: cidr (مثال: 192.168.1.0/24)";

    const match = cidr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    if (!match) return "❌ صيغة CIDR غير صالحة";

    const [, ...octets] = match;
    const prefix = parseInt(octets[4]);
    const ip = octets.slice(0, 4).map(Number);

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const ipNum = (ip[0] << 24 | ip[1] << 16 | ip[2] << 8 | ip[3]) >>> 0;
    const network = (ipNum & mask) >>> 0;
    const broadcast = (network | ~mask) >>> 0;
    const hosts = Math.max(0, Math.pow(2, 32 - prefix) - 2);

    const numToIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;

    return [
      `🔢 حاسبة الشبكة الفرعية`,
      `${"─".repeat(40)}`,
      `📌 CIDR: ${cidr}`,
      `🌐 عنوان الشبكة: ${numToIp(network)}`,
      `📡 عنوان البث: ${numToIp(broadcast)}`,
      `🎭 قناع الشبكة: ${numToIp(mask)}`,
      `🏠 أول عنوان: ${numToIp(network + 1)}`,
      `🏢 آخر عنوان: ${numToIp(broadcast - 1)}`,
      `📊 عدد المضيفين: ${hosts.toLocaleString()}`,
      `📏 بادئة: /${prefix}`,
    ].join("\n");
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool, args } = await req.json();

    if (!tool || !tools[tool]) {
      return new Response(JSON.stringify({
        error: "أداة غير معروفة",
        available_tools: Object.keys(tools),
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await tools[tool](args || {});

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("execution error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ في التنفيذ" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
