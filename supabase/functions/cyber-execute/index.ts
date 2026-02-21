import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      // Server
      if (headers["server"]) techs.push({ name: "Server", detected: true, detail: headers["server"] });
      if (headers["x-powered-by"]) techs.push({ name: "X-Powered-By", detected: true, detail: headers["x-powered-by"] });
      // Frameworks
      techs.push({ name: "React", detected: html.includes("__NEXT_DATA__") || html.includes("react") || html.includes("_react") });
      techs.push({ name: "Next.js", detected: html.includes("__NEXT_DATA__") || html.includes("/_next/") });
      techs.push({ name: "Vue.js", detected: html.includes("__vue") || html.includes("vue.") });
      techs.push({ name: "Angular", detected: html.includes("ng-version") || html.includes("angular") });
      techs.push({ name: "WordPress", detected: html.includes("wp-content") || html.includes("wp-includes") });
      techs.push({ name: "jQuery", detected: html.includes("jquery") });
      techs.push({ name: "Bootstrap", detected: html.includes("bootstrap") });
      techs.push({ name: "Tailwind CSS", detected: html.includes("tailwind") || /class="[^"]*(?:flex|grid|px-|py-|mt-|mb-|text-)[^"]*"/.test(html) });
      techs.push({ name: "Google Analytics", detected: html.includes("google-analytics") || html.includes("gtag") || html.includes("ga.js") });
      techs.push({ name: "Google Tag Manager", detected: html.includes("googletagmanager") });
      techs.push({ name: "Cloudflare", detected: !!headers["cf-ray"] || html.includes("cloudflare") });
      techs.push({ name: "Nginx", detected: headers["server"]?.toLowerCase().includes("nginx") || false });
      techs.push({ name: "Apache", detected: headers["server"]?.toLowerCase().includes("apache") || false });
      techs.push({ name: "PHP", detected: html.includes(".php") || headers["x-powered-by"]?.includes("PHP") || false });
      techs.push({ name: "Laravel", detected: html.includes("laravel") || !!headers["set-cookie"]?.includes("laravel") });
      techs.push({ name: "Django", detected: html.includes("csrfmiddlewaretoken") || headers["x-frame-options"] === "DENY" });
      techs.push({ name: "Shopify", detected: html.includes("shopify") || html.includes("cdn.shopify.com") });
      techs.push({ name: "Wix", detected: html.includes("wix.com") || html.includes("wixstatic") });

      const detected = techs.filter(t => t.detected);
      const notDetected = techs.filter(t => !t.detected);

      results.push(`\n✅ تقنيات مكتشفة (${detected.length}):`);
      detected.forEach(t => results.push(`  🟢 ${t.name}${t.detail ? `: ${t.detail}` : ""}`));
      
      if (notDetected.length > 0) {
        results.push(`\n❌ غير مكتشفة (${notDetected.length}):`);
        notDetected.forEach(t => results.push(`  ⚪ ${t.name}`));
      }

      // Meta info
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const generatorMatch = html.match(/<meta[^>]*name="generator"[^>]*content="([^"]+)"/i);
      if (titleMatch) results.push(`\n📄 العنوان: ${titleMatch[1]}`);
      if (generatorMatch) results.push(`🔧 المولّد: ${generatorMatch[1]}`);

      return results.join("\n");
    } catch (e) { return `❌ فشل: ${e instanceof Error ? e.message : "خطأ"}`; }
  },

  async email_security(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    const results: string[] = [`📧 فحص أمان البريد: ${domain}\n${"─".repeat(40)}`];
    let score = 0;
    const total = 4;

    // SPF
    try {
      const txt = await Deno.resolveDns(domain, "TXT");
      const spf = txt.find(r => r.join("").startsWith("v=spf1"));
      if (spf) { results.push(`\n✅ SPF Record موجود:`); results.push(`  → ${spf.join("")}`); score++;
        const spfStr = spf.join("");
        if (spfStr.includes("-all")) results.push(`  🟢 سياسة صارمة (-all)`);
        else if (spfStr.includes("~all")) results.push(`  🟡 سياسة ناعمة (~all)`);
        else if (spfStr.includes("?all")) results.push(`  🔴 سياسة محايدة (?all)`);
        else if (spfStr.includes("+all")) results.push(`  🔴 سياسة مفتوحة (+all) - خطير!`);
      } else { results.push(`\n❌ SPF Record غير موجود`); }
    } catch { results.push(`\n❌ فشل فحص SPF`); }

    // DMARC
    try {
      const txt = await Deno.resolveDns(`_dmarc.${domain}`, "TXT");
      const dmarc = txt.find(r => r.join("").startsWith("v=DMARC1"));
      if (dmarc) { results.push(`\n✅ DMARC Record موجود:`); results.push(`  → ${dmarc.join("")}`); score++;
        const dmarcStr = dmarc.join("");
        if (dmarcStr.includes("p=reject")) results.push(`  🟢 سياسة: reject (رفض)`);
        else if (dmarcStr.includes("p=quarantine")) results.push(`  🟡 سياسة: quarantine (عزل)`);
        else if (dmarcStr.includes("p=none")) results.push(`  🔴 سياسة: none (بلا إجراء)`);
      } else { results.push(`\n❌ DMARC Record غير موجود`); }
    } catch { results.push(`\n❌ فشل فحص DMARC`); }

    // DKIM (common selectors)
    const dkimSelectors = ["default", "google", "selector1", "selector2", "k1", "dkim"];
    let dkimFound = false;
    for (const sel of dkimSelectors) {
      try {
        const txt = await Deno.resolveDns(`${sel}._domainkey.${domain}`, "TXT");
        if (txt.length > 0) { results.push(`\n✅ DKIM Record (${sel}):`); results.push(`  → ${txt[0].join("").substring(0, 100)}...`); dkimFound = true; score++; break; }
      } catch {}
    }
    if (!dkimFound) results.push(`\n⚠️ DKIM: لم يتم العثور على سجل (تم فحص ${dkimSelectors.length} selectors)`);

    // MX
    try {
      const mx = await Deno.resolveDns(domain, "MX");
      if (mx.length > 0) { results.push(`\n✅ MX Records:`); mx.forEach(r => results.push(`  → ${r.exchange} (أولوية: ${r.preference})`)); score++; }
      else results.push(`\n❌ لا توجد MX Records`);
    } catch { results.push(`\n❌ فشل فحص MX`); }

    results.push(`\n📊 نتيجة أمان البريد: ${score}/${total} (${Math.round(score/total*100)}%)`);
    if (score === total) results.push(`🟢 ممتاز! البريد محمي بشكل جيد`);
    else if (score >= 2) results.push(`🟡 متوسط - يحتاج تحسين`);
    else results.push(`🔴 ضعيف - البريد معرض للتزوير`);

    return results.join("\n");
  },

  async reverse_dns(args) {
    const { ip } = args;
    if (!ip) return "❌ مطلوب: ip";
    const results: string[] = [`🔄 DNS عكسي: ${ip}\n${"─".repeat(40)}`];
    try {
      const parts = ip.split(".").reverse().join(".") + ".in-addr.arpa";
      results.push(`  📌 PTR Query: ${parts}`);
      try {
        const ptr = await Deno.resolveDns(parts, "PTR");
        results.push(`  ✅ PTR Records:`);
        ptr.forEach(r => results.push(`    → ${r}`));
      } catch { results.push(`  ❌ لا يوجد PTR record`); }
      // Forward confirm
      results.push(`\n  🔍 فحص إضافي:`);
      try {
        const resp = await fetch(`https://dns.google/resolve?name=${parts}&type=PTR`);
        const data = await resp.json();
        if (data.Answer) {
          data.Answer.forEach((a: any) => results.push(`    → ${a.data}`));
        }
      } catch {}
    } catch (e) { results.push(`  ❌ خطأ: ${e instanceof Error ? e.message : "خطأ"}`); }
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
      try {
        const conn = await Deno.connect({ hostname: target, port: p, transport: "tcp" });
        const elapsed = performance.now() - start;
        conn.close();
        times.push(elapsed);
        results.push(`  محاولة ${i+1}: ✅ ${elapsed.toFixed(1)}ms`);
      } catch {
        results.push(`  محاولة ${i+1}: ❌ فشل`);
      }
    }
    if (times.length > 0) {
      const avg = times.reduce((a,b) => a+b, 0) / times.length;
      const min = Math.min(...times); const max = Math.max(...times);
      results.push(`\n📊 الإحصائيات:`);
      results.push(`  أقل: ${min.toFixed(1)}ms | متوسط: ${avg.toFixed(1)}ms | أعلى: ${max.toFixed(1)}ms`);
      results.push(`  نجاح: ${times.length}/5 (${times.length/5*100}%)`);
    } else { results.push(`\n❌ الخدمة غير متوفرة`); }
    return results.join("\n");
  },

  // ===== OFFENSIVE TOOLS =====

  async dir_bruteforce(args) {
    const { url, wordlist = "" } = args;
    if (!url) return "❌ مطلوب: url";
    const defaultWords = ["admin", "login", "api", "backup", "wp-admin", "wp-login.php", "dashboard", ".env", ".git", "config", "phpmyadmin", "cpanel", "server-status", "robots.txt", "sitemap.xml", ".htaccess", "web.config", "xmlrpc.php", "wp-config.php.bak", "debug", "test", "staging", "dev", "old", "temp", "uploads", "images", "assets", "static", "js", "css"];
    const words = wordlist ? wordlist.split(",").map(w => w.trim()) : defaultWords;
    const baseUrl = url.replace(/\/+$/, "");
    const results: string[] = [`📂 اكتشاف المجلدات: ${baseUrl}\n${"─".repeat(40)}\n`];
    let found = 0;

    for (const word of words.slice(0, 30)) {
      try {
        const resp = await fetch(`${baseUrl}/${word}`, { method: "HEAD", redirect: "manual" });
        const status = resp.status;
        if (status === 200) { results.push(`  ✅ /${word} → ${status} (موجود!)`); found++; }
        else if (status >= 300 && status < 400) { results.push(`  ↪️ /${word} → ${status} (إعادة توجيه)`); found++; }
        else if (status === 403) { results.push(`  🔒 /${word} → ${status} (محظور)`); found++; }
        else if (status === 401) { results.push(`  🔐 /${word} → ${status} (يحتاج مصادقة)`); found++; }
      } catch {}
    }
    results.push(`\n📊 النتيجة: وُجد ${found} مسار من ${Math.min(words.length, 30)}`);
    return results.join("\n");
  },

  async sqli_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`💉 اختبار SQL Injection\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    results.push(`⚠️ تنبيه: هذا اختبار أخلاقي فقط - تأكد من الإذن!\n`);
    
    const payloads = [
      { name: "Single Quote", payload: "'" },
      { name: "Double Quote", payload: '"' },
      { name: "OR 1=1", payload: "' OR '1'='1" },
      { name: "Comment", payload: "' --" },
      { name: "Union Select", payload: "' UNION SELECT NULL--" },
      { name: "Sleep Based", payload: "' OR SLEEP(0)--" },
      { name: "Boolean", payload: "' AND '1'='1" },
    ];

    for (const { name, payload } of payloads) {
      try {
        const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?id=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const suspicious = body.toLowerCase().includes("sql") || body.toLowerCase().includes("syntax") || body.toLowerCase().includes("mysql") || body.toLowerCase().includes("postgresql") || body.toLowerCase().includes("oracle") || body.includes("error") || resp.status === 500;
        results.push(`  ${suspicious ? "⚠️" : "✅"} ${name}: ${resp.status} ${suspicious ? "(مشبوه!)" : "(آمن)"}`);
      } catch { results.push(`  ❌ ${name}: فشل الاتصال`); }
    }
    results.push(`\n💡 ملاحظة: هذا فحص أولي. استخدم أدوات متقدمة مثل sqlmap للفحص الشامل`);
    return results.join("\n");
  },

  async xss_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🔥 اختبار XSS\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    results.push(`⚠️ تنبيه: اختبار أخلاقي فقط!\n`);

    const payloads = [
      { name: "Basic Script", payload: "<script>alert(1)</script>" },
      { name: "IMG Tag", payload: '<img src=x onerror=alert(1)>' },
      { name: "SVG", payload: '<svg onload=alert(1)>' },
      { name: "Event Handler", payload: '" onmouseover="alert(1)"' },
      { name: "JavaScript URI", payload: "javascript:alert(1)" },
      { name: "Encoded", payload: "%3Cscript%3Ealert(1)%3C/script%3E" },
    ];

    for (const { name, payload } of payloads) {
      try {
        const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?q=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const reflected = body.includes(payload) || body.includes(decodeURIComponent(payload));
        const csp = resp.headers.get("content-security-policy");
        const xssProtection = resp.headers.get("x-xss-protection");
        results.push(`  ${reflected ? "⚠️" : "✅"} ${name}: ${reflected ? "منعكس!" : "مفلتر"}`);
        if (reflected && !csp) results.push(`    🔴 لا يوجد CSP!`);
      } catch { results.push(`  ❌ ${name}: فشل`); }
    }

    // Check headers
    try {
      const resp = await fetch(url, { method: "HEAD" });
      results.push(`\n🛡️ حماية Headers:`);
      results.push(`  ${resp.headers.get("content-security-policy") ? "✅" : "❌"} Content-Security-Policy`);
      results.push(`  ${resp.headers.get("x-xss-protection") ? "✅" : "❌"} X-XSS-Protection`);
      results.push(`  ${resp.headers.get("x-content-type-options") ? "✅" : "❌"} X-Content-Type-Options`);
    } catch {}

    return results.join("\n");
  },

  async subdomain_enum(args) {
    const { domain } = args;
    if (!domain) return "❌ مطلوب: domain";
    const results: string[] = [`🌳 تعداد النطاقات الفرعية: ${domain}\n${"─".repeat(40)}\n`];
    const subs = ["www", "mail", "ftp", "admin", "blog", "dev", "staging", "test", "api", "app", "cdn", "cloud", "cpanel", "dashboard", "db", "demo", "docs", "forum", "git", "help", "host", "img", "imap", "info", "jenkins", "jira", "lab", "login", "m", "media", "monitor", "mx", "ns1", "ns2", "pop", "portal", "proxy", "remote", "search", "shop", "smtp", "ssl", "static", "store", "support", "vpn", "webmail", "wiki"];
    let found = 0;

    for (const sub of subs) {
      try {
        const records = await Deno.resolveDns(`${sub}.${domain}`, "A");
        if (records.length > 0) {
          results.push(`  ✅ ${sub}.${domain} → ${records.join(", ")}`);
          found++;
        }
      } catch {}
    }
    results.push(`\n📊 وُجد ${found} نطاق فرعي من ${subs.length} تم فحصه`);
    return results.join("\n");
  },

  async cors_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🚧 اختبار CORS: ${url}\n${"─".repeat(40)}\n`];
    
    const origins = ["https://evil.com", "null", "https://attacker.com", url.replace(/^https?:\/\//, "https://sub."), ""];
    for (const origin of origins) {
      try {
        const resp = await fetch(url, { headers: { "Origin": origin } });
        const acao = resp.headers.get("access-control-allow-origin");
        const acac = resp.headers.get("access-control-allow-credentials");
        if (acao) {
          const dangerous = acao === "*" || acao === origin;
          results.push(`  ${dangerous ? "⚠️" : "✅"} Origin: "${origin}"`);
          results.push(`    ACAO: ${acao}`);
          if (acac) results.push(`    ACAC: ${acac} ${acac === "true" && dangerous ? "🔴 خطير!" : ""}`);
        } else {
          results.push(`  ✅ Origin: "${origin}" → لا يوجد ACAO (آمن)`);
        }
      } catch { results.push(`  ❌ فشل مع: ${origin}`); }
    }
    return results.join("\n");
  },

  async open_redirect(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`↪️ اختبار إعادة التوجيه المفتوحة\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n`];
    
    const payloads = [
      "https://evil.com", "//evil.com", "https://evil.com%2f", "/\\evil.com", "https://evil.com/..",
      "https://evil%252ecom", "/%09/evil.com", "https://evil.com%00.target.com",
    ];
    
    for (const payload of payloads) {
      try {
        const testUrl = url + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "manual" });
        const location = resp.headers.get("location") || "";
        if (resp.status >= 300 && resp.status < 400 && (location.includes("evil") || location.includes(payload))) {
          results.push(`  ⚠️ ${payload} → ${resp.status} Location: ${location.substring(0, 80)}`);
        } else {
          results.push(`  ✅ ${payload} → ${resp.status} (آمن)`);
        }
      } catch { results.push(`  ❌ ${payload}: فشل`); }
    }
    return results.join("\n");
  },

  // ===== DEFENSIVE TOOLS =====

  async hash(args) {
    const { text, algorithm = "SHA-256" } = args;
    if (!text) return "❌ مطلوب: text";
    const results: string[] = [`🔐 تجزئة النص\n${"─".repeat(40)}\n📝 النص: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n`];
    const algos = algorithm.toUpperCase() === "ALL" ? ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] : [algorithm.toUpperCase()];
    for (const algo of algos) {
      try {
        const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
        results.push(`  🔑 ${algo}: ${Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("")}`);
      } catch { results.push(`  ❌ ${algo}: غير مدعوم`); }
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
      { label: "الطول ≥ 16", pass: password.length >= 16 }, { label: "أحرف كبيرة", pass: /[A-Z]/.test(password) },
      { label: "أحرف صغيرة", pass: /[a-z]/.test(password) }, { label: "أرقام", pass: /[0-9]/.test(password) },
      { label: "رموز خاصة", pass: /[^A-Za-z0-9]/.test(password) }, { label: "لا تكرار", pass: !/(.)\1{2,}/.test(password) },
      { label: "لا تسلسل", pass: !/(?:abc|bcd|123|234|345|456|567|678|789)/i.test(password) },
    ];
    for (const c of checks) { results.push(`  ${c.pass ? "✅" : "❌"} ${c.label}`); if (c.pass) score++; }
    const entropy = Math.log2(Math.pow(((/[a-z]/.test(password)?26:0)+(/[A-Z]/.test(password)?26:0)+(/[0-9]/.test(password)?10:0)+(/[^A-Za-z0-9]/.test(password)?33:0)), password.length));
    results.push(`\n📊 Entropy: ${entropy.toFixed(1)} bits`);
    let strength = "ضعيفة 🔴"; if (score >= 8) strength = "قوية جداً 🟢"; else if (score >= 6) strength = "قوية 🟡"; else if (score >= 4) strength = "متوسطة 🟠";
    results.push(`💪 القوة: ${strength} (${score}/${checks.length})`);
    const ct = Math.pow(2, entropy) / 1e12;
    if (ct < 1) results.push(`⏱️ الكسر: < ثانية`); else if (ct < 3600) results.push(`⏱️ الكسر: ${(ct/60).toFixed(0)} دقيقة`);
    else if (ct < 86400*365) results.push(`⏱️ الكسر: ${(ct/86400).toFixed(0)} يوم`); else results.push(`⏱️ الكسر: ${(ct/86400/365).toExponential(1)} سنة`);
    return results.join("\n");
  },

  async generate_password(args) {
    const { length = "16", count = "5" } = args;
    const len = Math.min(Math.max(parseInt(length)||16, 8), 128);
    const cnt = Math.min(parseInt(count)||5, 10);
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    const results: string[] = [`🔐 مولّد كلمات مرور\n${"─".repeat(40)}\n📏 الطول: ${len}\n`];
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
      if (payload.iat) results.push(`📅 إصدار: ${new Date(payload.iat*1000).toISOString()}`);
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
    const results: string[] = [`🔎 تحديد نوع Hash\n${"─".repeat(40)}\n📥 ${hash}\n📏 الطول: ${hash.length} حرف\n`];
    const types: { name: string; len: number; pattern: RegExp }[] = [
      { name: "MD5", len: 32, pattern: /^[a-f0-9]{32}$/i },
      { name: "SHA-1", len: 40, pattern: /^[a-f0-9]{40}$/i },
      { name: "SHA-224", len: 56, pattern: /^[a-f0-9]{56}$/i },
      { name: "SHA-256", len: 64, pattern: /^[a-f0-9]{64}$/i },
      { name: "SHA-384", len: 96, pattern: /^[a-f0-9]{96}$/i },
      { name: "SHA-512", len: 128, pattern: /^[a-f0-9]{128}$/i },
      { name: "NTLM", len: 32, pattern: /^[a-f0-9]{32}$/i },
      { name: "bcrypt", len: 60, pattern: /^\$2[aby]?\$\d{2}\$/ },
      { name: "MySQL (old)", len: 16, pattern: /^[a-f0-9]{16}$/i },
      { name: "CRC32", len: 8, pattern: /^[a-f0-9]{8}$/i },
    ];
    const matches = types.filter(t => t.pattern.test(hash));
    if (matches.length > 0) { results.push(`🎯 أنواع محتملة:`); matches.forEach(m => results.push(`  → ${m.name} (${m.len} حرف)`)); }
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
      if (existingCsp) { results.push(`📋 CSP الحالي:\n  ${existingCsp.substring(0, 200)}\n`); }
      else { results.push(`❌ لا يوجد CSP حالي\n`); }
      
      const domains = new Set<string>();
      const srcMatches = html.matchAll(/(?:src|href)=["']https?:\/\/([^/"']+)/g);
      for (const m of srcMatches) domains.add(m[1]);

      const csp = [
        `default-src 'self'`,
        `script-src 'self'${domains.size > 0 ? " " + Array.from(domains).filter(d => !d.includes(".")=== false).slice(0, 5).map(d => `https://${d}`).join(" ") : ""}`,
        `style-src 'self' 'unsafe-inline'`,
        `img-src 'self' data: https:`,
        `font-src 'self' https:`,
        `connect-src 'self'`,
        `frame-ancestors 'none'`,
        `base-uri 'self'`,
        `form-action 'self'`,
      ];
      results.push(`🛡️ CSP المقترح:\n`);
      csp.forEach(d => results.push(`  ${d};`));
      results.push(`\n📝 أضفه في HTTP header أو meta tag`);
      return results.join("\n");
    } catch (e) { return `❌ فشل: ${e instanceof Error ? e.message : "خطأ"}`; }
  },

  async hex_converter(args) {
    const { text, mode = "to_hex" } = args;
    if (!text) return "❌ مطلوب: text";
    if (mode === "from_hex") {
      try {
        const decoded = text.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b, 16))).join("") || "";
        return `🔠 Hex → Text:\n${"─".repeat(40)}\n📥 ${text}\n📤 ${decoded}`;
      } catch { return "❌ Hex غير صالح"; }
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
      results.push(`\n📥 Unix Timestamp: ${value}`);
      results.push(`📤 UTC: ${d.toUTCString()}`);
      results.push(`📤 ISO: ${d.toISOString()}`);
      results.push(`📤 محلي: ${d.toLocaleString("ar-SA")}`);
    } else {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        results.push(`\n📥 التاريخ: ${value}`);
        results.push(`📤 Unix (ثواني): ${Math.floor(d.getTime()/1000)}`);
        results.push(`📤 Unix (ملي ثانية): ${d.getTime()}`);
        results.push(`📤 ISO: ${d.toISOString()}`);
      } else { results.push(`\n❌ قيمة غير صالحة`); }
    }
    results.push(`\n🕐 الآن: ${Math.floor(Date.now()/1000)} (Unix)`);
    return results.join("\n");
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tool, args } = await req.json();
    if (!tool || !tools[tool]) {
      return new Response(JSON.stringify({ error: "أداة غير معروفة", available_tools: Object.keys(tools) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = await tools[tool](args || {});
    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("execution error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
