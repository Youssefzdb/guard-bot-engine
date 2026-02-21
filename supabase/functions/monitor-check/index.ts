import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

async function checkTarget(target: string): Promise<{ score: number; changes: string[] }> {
  const changes: string[] = [];
  let score = 0;

  // Run key checks
  const checks = [
    { name: "ssl_check", args: { domain: target } },
    { name: "http_headers", args: { url: `https://${target}` } },
    { name: "email_security", args: { domain: target } },
    { name: "waf_detect", args: { url: `https://${target}` } },
  ];

  for (const check of checks) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/cyber-execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ tool: check.name, args: check.args }),
      });
      const data = await resp.json();
      if (data.result) {
        // Simple scoring based on results
        const result = data.result as string;
        if (result.includes("✅")) score += 15;
        if (result.includes("❌")) score -= 5;
      }
    } catch {}
  }

  score = Math.max(0, Math.min(100, 50 + score));

  // Get previous score
  try {
    const prevResp = await fetch(`${SUPABASE_URL}/rest/v1/monitored_targets?target=eq.${encodeURIComponent(target)}&select=last_score&limit=1`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const prev = await prevResp.json();
    if (prev[0]?.last_score !== null && prev[0]?.last_score !== undefined) {
      const diff = score - prev[0].last_score;
      if (Math.abs(diff) >= 5) {
        changes.push(`📊 تغير في درجة الأمان: ${prev[0].last_score} → ${score} (${diff > 0 ? "+" : ""}${diff})`);
      }
    }
  } catch {}

  // Update last_check and last_score
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/monitored_targets?target=eq.${encodeURIComponent(target)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ last_check: new Date().toISOString(), last_score: score }),
    });
  } catch {}

  // Save scan result
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scan_results`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ target, tool_name: "monitor_check", result: `Score: ${score}, Changes: ${changes.length}`, security_score: score }),
    });
  } catch {}

  return { score, changes };
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch {}
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Get active monitored targets
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/monitored_targets?active=eq.true`, {
      headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const targets = await resp.json();

    const results = [];

    for (const target of targets) {
      // Check if enough time has passed
      if (target.last_check) {
        const lastCheck = new Date(target.last_check).getTime();
        const intervalMs = (target.interval_hours || 24) * 60 * 60 * 1000;
        if (Date.now() - lastCheck < intervalMs) continue;
      }

      const { score, changes } = await checkTarget(target.target);

      if (changes.length > 0 && target.telegram_chat_id) {
        const msg = `🛡️ *CyberGuard Monitor*\n\n🎯 الهدف: \`${target.target}\`\n📊 الدرجة: ${score}/100\n\n${changes.join("\n")}`;
        await sendTelegramMessage(target.telegram_chat_id, msg);
      }

      results.push({ target: target.target, score, changes: changes.length });
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("monitor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
