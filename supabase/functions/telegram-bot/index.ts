import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId: number, text: string, parseMode = 'HTML') {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

async function handleUpdate(update: any) {
  const message = update.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text;
  const userName = message.from?.first_name || 'صديقي';

  // /start command
  if (text === '/start') {
    await sendMessage(chatId, `مرحباً ${userName}! 👋\nأنا بوت تم إنشاؤه بواسطة CyberGuard.\nأنا أعمل حالياً! 🚀`);
    return;
  }

  // /help command
  if (text === '/help') {
    await sendMessage(chatId, `📋 <b>الأوامر المتاحة:</b>\n\n/start - بدء المحادثة\n/help - عرض المساعدة\n/info - معلومات عن البوت\n/echo [نص] - ترديد النص\n\nأو أرسل أي رسالة وسأرد عليك!`);
    return;
  }

  // /info command
  if (text === '/info') {
    await sendMessage(chatId, `🤖 <b>معلومات البوت:</b>\n\n📌 الاسم: CyberGuard Bot\n⚙️ المحرك: Lovable Cloud\n🌐 النوع: Webhook\n📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`);
    return;
  }

  // /echo command
  if (text.startsWith('/echo ')) {
    const echoText = text.substring(6);
    await sendMessage(chatId, `🔊 ${echoText}`);
    return;
  }

  // Default reply for any other text
  await sendMessage(chatId, `لقد أرسلت: "${text}"\nشكراً لك يا ${userName}! 😊`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // GET request = setup webhook
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');
      
      if (action === 'set_webhook') {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
        const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        });
        const data = await res.json();
        return new Response(JSON.stringify({ success: true, telegram_response: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'delete_webhook') {
        const res = await fetch(`${TELEGRAM_API}/deleteWebhook`);
        const data = await res.json();
        return new Response(JSON.stringify({ success: true, telegram_response: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'info') {
        const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
        const data = await res.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        status: 'running',
        actions: ['set_webhook', 'delete_webhook', 'info'],
        usage: 'Add ?action=set_webhook to activate the bot'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST request = incoming update from Telegram
    if (req.method === 'POST') {
      const update = await req.json();
      await handleUpdate(update);
      return new Response('ok', { headers: corsHeaders });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
