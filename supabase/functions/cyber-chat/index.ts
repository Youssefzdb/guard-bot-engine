import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت وكيل ذكاء اصطناعي متخصص في الأمن السيبراني. اسمك "CyberGuard AI".

مهاراتك:
- تحليل الثغرات الأمنية وتقديم حلول
- كتابة أكواد أمنية (Python, Bash, PowerShell)
- فحص الشبكات وتحليل الحزم
- اختبار الاختراق الأخلاقي
- تحليل البرمجيات الخبيثة
- تشفير البيانات وفك التشفير
- أمن تطبيقات الويب (OWASP Top 10)
- الاستجابة للحوادث الأمنية
- تحليل السجلات (Log Analysis)

قواعد مهمة:
1. قدم أكواد عملية وآمنة فقط
2. استخدم markdown لتنسيق الردود
3. ضع الأكواد في code blocks مع تحديد اللغة
4. حذر المستخدم من أي مخاطر محتملة
5. لا تقدم أي أدوات أو أكواد يمكن استخدامها لأغراض ضارة
6. ركز على الدفاع والحماية
7. أجب بالعربية إذا كان السؤال بالعربية، وبالإنجليزية إذا كان بالإنجليزية

عند كتابة الأكواد:
- أضف تعليقات توضيحية
- اشرح كل خطوة
- قدم أمثلة على الاستخدام
- حذر من أي مخاطر أمنية`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في الاتصال بالذكاء الاصطناعي" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير معروف" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
