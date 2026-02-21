import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sendMessage(chatId: number, text: string, parseMode = 'HTML') {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

async function getCustomCommands(): Promise<Record<string, string>> {
  const { data } = await supabase.from('telegram_commands').select('command, response');
  const cmds: Record<string, string> = {};
  if (data) data.forEach((row: any) => { cmds[row.command] = row.response; });
  return cmds;
}

async function handleUpdate(update: any) {
  const message = update.message;
  if (!message || !message.text) return;

  const chatId = message.chat.id;
  const text = message.text;
  const userName = message.from?.first_name || 'صديقي';

  // Load dynamic commands from DB
  const customCmds = await getCustomCommands();

  // Built-in /start
  if (text === '/start') {
    await sendMessage(chatId, `مرحباً ${userName}! 👋\nأنا بوت تم إنشاؤه بواسطة CyberGuard.\nأنا أعمل حالياً! 🚀`);
    return;
  }

  // Built-in /help — includes dynamic commands
  if (text === '/help') {
    let helpText = `📋 <b>الأوامر المتاحة:</b>\n\n/start - بدء المحادثة\n/help - عرض المساعدة\n/info - معلومات عن البوت`;
    for (const [cmd] of Object.entries(customCmds)) {
      helpText += `\n/${cmd} - أمر مخصص`;
    }
    helpText += `\n\nأو أرسل أي رسالة وسأرد عليك!`;
    await sendMessage(chatId, helpText);
    return;
  }

  // Built-in /info
  if (text === '/info') {
    await sendMessage(chatId, `🤖 <b>معلومات البوت:</b>\n\n📌 الاسم: CyberGuard Bot\n⚙️ المحرك: Lovable Cloud\n🌐 النوع: Webhook\n📋 الأوامر المخصصة: ${Object.keys(customCmds).length}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`);
    return;
  }

  // Check dynamic commands
  const cmdText = text.startsWith('/') ? text.split(' ')[0].substring(1).toLowerCase() : null;
  if (cmdText && customCmds[cmdText]) {
    // Replace placeholders
    let response = customCmds[cmdText];
    response = response.replace(/{name}/g, userName);
    response = response.replace(/{date}/g, new Date().toLocaleDateString('ar-EG'));
    response = response.replace(/{time}/g, new Date().toLocaleTimeString('ar-EG'));
    response = response.replace(/{args}/g, text.substring(text.indexOf(' ') + 1) || '');
    await sendMessage(chatId, response);
    return;
  }

  // Default reply
  await sendMessage(chatId, `لقد أرسلت: "${text}"\nشكراً لك يا ${userName}! 😊`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');
      
      if (action === 'set_webhook') {
        const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
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

      if (action === 'list_commands') {
        const cmds = await getCustomCommands();
        return new Response(JSON.stringify({ commands: cmds }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        status: 'running',
        actions: ['set_webhook', 'delete_webhook', 'info', 'list_commands'],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST = incoming update from Telegram OR management action
    if (req.method === 'POST') {
      const body = await req.json();
      
      // Management actions (from AI agent)
      if (body._action) {
        if (body._action === 'add_command') {
          const { command, response, description } = body;
          const { error } = await supabase.from('telegram_commands').upsert(
            { command, response, description: description || '' },
            { onConflict: 'command' }
          );
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          return new Response(JSON.stringify({ success: true, message: `تم إضافة/تحديث الأمر /${command}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        
        if (body._action === 'remove_command') {
          const { command } = body;
          const { error } = await supabase.from('telegram_commands').delete().eq('command', command);
          if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          return new Response(JSON.stringify({ success: true, message: `تم حذف الأمر /${command}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (body._action === 'list_commands') {
          const cmds = await getCustomCommands();
          return new Response(JSON.stringify({ commands: cmds }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (body._action === 'send_message') {
          const { chat_id, text: msgText } = body;
          await sendMessage(chat_id, msgText);
          return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Telegram webhook update
      await handleUpdate(body);
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
