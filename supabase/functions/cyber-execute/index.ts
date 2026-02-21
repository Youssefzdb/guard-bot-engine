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
    const results: string[] = [`🧱 كشف WAF: ${url}\n${"─".repeat(40)}`];
    try {
      const resp = await fetch(url, { redirect: "follow" });
      await resp.text();
      const headers = Object.fromEntries(resp.headers.entries());
      const wafs: { name: string; detected: boolean }[] = [
        { name: "Cloudflare", detected: !!headers["cf-ray"] || !!headers["cf-cache-status"] },
        { name: "AWS WAF", detected: !!headers["x-amzn-requestid"] || !!headers["x-amz-cf-id"] },
        { name: "Akamai", detected: !!headers["x-akamai-transformed"] },
        { name: "Sucuri", detected: !!headers["x-sucuri-id"] },
        { name: "Imperva/Incapsula", detected: !!headers["x-iinfo"] || !!headers["x-cdn"] },
        { name: "F5 BIG-IP", detected: !!headers["x-cnection"] || !!headers["x-wa-info"] },
        { name: "ModSecurity", detected: !!headers["server"]?.includes("mod_security") },
      ];
      const detected = wafs.filter(w => w.detected);
      if (detected.length > 0) { results.push(`\n✅ WAF مكتشف:`); detected.forEach(w => results.push(`  🛡️ ${w.name}`)); }
      else { results.push(`\nℹ️ لم يتم اكتشاف WAF معروف`); }
      // Test with malicious payload
      try {
        const testResp = await fetch(`${url}/?test=<script>alert(1)</script>`, { redirect: "follow" });
        if (testResp.status === 403 || testResp.status === 406) { results.push(`\n⚠️ الموقع يحظر الطلبات المشبوهة (${testResp.status})`); }
        await testResp.text();
      } catch {}
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
    const results: string[] = [`💉 اختبار SQL Injection\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = [
      { name: "Single Quote", payload: "'" }, { name: "OR 1=1", payload: "' OR '1'='1" },
      { name: "Comment", payload: "' --" }, { name: "Union Select", payload: "' UNION SELECT NULL--" },
      { name: "Boolean", payload: "' AND '1'='1" },
    ];
    for (const { name, payload } of payloads) {
      try {
        const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?id=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const suspicious = body.toLowerCase().includes("sql") || body.toLowerCase().includes("syntax") || body.toLowerCase().includes("mysql") || resp.status === 500;
        results.push(`  ${suspicious ? "⚠️" : "✅"} ${name}: ${resp.status} ${suspicious ? "(مشبوه!)" : "(آمن)"}`);
      } catch { results.push(`  ❌ ${name}: فشل`); }
    }
    return results.join("\n");
  },

  async xss_test(args) {
    const { url } = args;
    if (!url) return "❌ مطلوب: url";
    const results: string[] = [`🔥 اختبار XSS\n${"─".repeat(40)}\n🔗 الهدف: ${url}\n⚠️ اختبار أخلاقي فقط!\n`];
    const payloads = [
      { name: "Basic Script", payload: "<script>alert(1)</script>" },
      { name: "IMG Tag", payload: '<img src=x onerror=alert(1)>' },
      { name: "SVG", payload: '<svg onload=alert(1)>' },
      { name: "Event Handler", payload: '" onmouseover="alert(1)"' },
    ];
    for (const { name, payload } of payloads) {
      try {
        const testUrl = url.includes("?") ? url + encodeURIComponent(payload) : url + "?q=" + encodeURIComponent(payload);
        const resp = await fetch(testUrl, { redirect: "follow" });
        const body = await resp.text();
        const reflected = body.includes(payload);
        results.push(`  ${reflected ? "⚠️" : "✅"} ${name}: ${reflected ? "منعكس!" : "مفلتر"}`);
      } catch { results.push(`  ❌ ${name}: فشل`); }
    }
    try {
      const resp = await fetch(url, { method: "HEAD" });
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
