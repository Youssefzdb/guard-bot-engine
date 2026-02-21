import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Terminal as TerminalIcon, Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { securityTools, type SecurityTool } from "@/lib/security-tools";
import { fetchCustomTools, saveCustomTool, deleteCustomTool, mapToSecurityTool } from "@/lib/custom-tools";

interface TermLine {
  type: "input" | "output" | "error" | "info";
  text: string;
}

interface VFile {
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const WELCOME = `
╔══════════════════════════════════════════════╗
║       🛡️  CyberGuard Terminal v2.0          ║
║       وحدة تنفيذ الأوامر الأمنية            ║
╚══════════════════════════════════════════════╝

اكتب "help" لعرض الأوامر المتاحة.
`;

const Terminal = () => {
  const [lines, setLines] = useState<TermLine[]>([
    { type: "info", text: WELCOME },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const [customTools, setCustomTools] = useState<SecurityTool[]>([]);
  const [loadedLibs, setLoadedLibs] = useState<{ name: string; url: string }[]>([]);
  const [vFiles, setVFiles] = useState<VFile[]>([]);
  const [nanoMode, setNanoMode] = useState<{ fileName: string; content: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nanoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
    loadCustomTools();
  }, []);

  const loadCustomTools = async () => {
    try {
      const tools = await fetchCustomTools();
      setCustomTools(tools.map(mapToSecurityTool));
    } catch {}
  };

  const allTools = [...securityTools, ...customTools];

  const addLine = (type: TermLine["type"], text: string) =>
    setLines((prev) => [...prev, { type, text }]);

  const handleHelp = () => {
    let help = `\n📋 الأوامر المتاحة:\n${"─".repeat(50)}\n`;
    help += `  help                  - عرض هذه القائمة\n`;
    help += `  clear                 - مسح الشاشة\n`;
    help += `  tools                 - عرض جميع الأدوات\n`;
    help += `  run <tool> [args]     - تنفيذ أداة\n`;
    help += `  info <tool>           - معلومات عن أداة\n`;
    help += `  addcmd                - إضافة أمر مخصص (تفاعلي)\n`;
    help += `  addcmd <id> <name_ar> <type> <config> [args...]\n`;
    help += `                        - إضافة أمر سريع\n`;
    help += `  delcmd <tool_id>      - حذف أمر مخصص\n`;
    help += `  mycmds                - عرض الأوامر المخصصة\n`;
    help += `  exec_js <code>        - تنفيذ كود JavaScript مباشرة\n`;
    help += `  load_lib <url|name>   - تحميل مكتبة JS من CDN\n`;
    help += `  libs                  - عرض المكتبات المحمّلة\n`;
    help += `  nano <filename>       - إنشاء/تحرير ملف\n`;
    help += `  cat <filename>        - عرض محتوى ملف\n`;
    help += `  ls                    - عرض الملفات\n`;
    help += `  rm <filename>         - حذف ملف\n`;
    help += `  run_file <filename>   - تنفيذ ملف JS\n`;
    help += `  reload                - إعادة تحميل الأوامر المخصصة\n\n`;
    help += `📌 أنواع التنفيذ: http_fetch, dns_query, tcp_connect\n`;
    help += `📌 مثال إضافة: addcmd my_scan "فحصي" http_fetch url=https://example.com target:الهدف:example.com\n`;
    help += `📌 مثال تنفيذ: run dns_lookup domain=example.com\n`;
    return help;
  };

  const handleTools = () => {
    const total = allTools.length;
    let out = `\n🛠️ الأدوات المتاحة (${total}):\n${"─".repeat(50)}\n`;
    const grouped: Record<string, SecurityTool[]> = {};
    allTools.forEach((t) => {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    });
    const catLabels: Record<string, string> = {
      scanning: "🔍 فحص واستطلاع",
      offensive: "⚔️ هجومية",
      defensive: "🛡️ دفاعية",
    };
    for (const [cat, tools] of Object.entries(grouped)) {
      out += `\n${catLabels[cat] || cat}:\n`;
      tools.forEach((t) => {
        const isCustom = t.id.startsWith("custom_");
        out += `  ${t.icon} ${t.id.padEnd(22)} ${t.nameAr}${isCustom ? " ⭐" : ""}\n`;
      });
    }
    if (customTools.length > 0) {
      out += `\n⭐ = أمر مخصص`;
    }
    return out;
  };

  const handleInfo = (toolId: string) => {
    const tool = allTools.find((t) => t.id === toolId);
    if (!tool) return `❌ أداة غير موجودة: ${toolId}`;
    let out = `\n${tool.icon} ${tool.name} (${tool.nameAr})\n${"─".repeat(40)}\n`;
    out += `📝 ${tool.description}\n`;
    out += `📂 التصنيف: ${tool.category}\n`;
    out += `${tool.id.startsWith("custom_") ? "⭐ أمر مخصص\n" : ""}`;
    out += `\n📋 المعاملات:\n`;
    tool.args.forEach((a) => {
      out += `  ${a.required ? "●" : "○"} ${a.key.padEnd(15)} ${a.label} (${a.placeholder})\n`;
    });
    out += `\n📌 الاستخدام: run ${tool.id} ${tool.args.map((a) => `${a.key}=${a.placeholder}`).join(" ")}\n`;
    return out;
  };

  const handleRun = async (toolId: string, argsStr: string) => {
    const tool = allTools.find((t) => t.id === toolId);
    if (!tool) {
      addLine("error", `❌ أداة غير موجودة: ${toolId}\nاكتب "tools" لعرض الأدوات المتاحة.`);
      return;
    }

    const args: Record<string, string> = {};
    const pairs = argsStr.match(/(\w+)=("[^"]*"|'[^']*'|\S+)/g) || [];
    pairs.forEach((pair) => {
      const eqIdx = pair.indexOf("=");
      const key = pair.substring(0, eqIdx);
      let val = pair.substring(eqIdx + 1);
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      args[key] = val;
    });

    const missing = tool.args.filter((a) => a.required && !args[a.key]);
    if (missing.length > 0) {
      addLine("error", `❌ معاملات مطلوبة: ${missing.map((a) => a.key).join(", ")}\n📌 استخدم: run ${toolId} ${tool.args.map((a) => `${a.key}=${a.placeholder}`).join(" ")}`);
      return;
    }

    addLine("info", `⏳ جاري تنفيذ ${tool.icon} ${tool.nameAr}...`);
    setRunning(true);

    try {
      // For custom tools, strip the "custom_" prefix for the engine
      const engineToolId = toolId.startsWith("custom_") ? toolId.substring(7) : toolId;
      const { data, error } = await supabase.functions.invoke("cyber-execute", {
        body: { tool: engineToolId, args },
      });

      if (error) throw error;
      addLine("output", data?.result || "✅ تم التنفيذ بدون نتائج");
    } catch (e: any) {
      addLine("error", `❌ خطأ في التنفيذ: ${e.message || "غير معروف"}`);
    } finally {
      setRunning(false);
    }
  };

  const handleAddCmd = async (argsStr: string) => {
    // Parse: addcmd <id> <name_ar> <exec_type> <config_key=val> [arg_defs...]
    // arg_defs format: key:label:placeholder[:required]
    const parts = argsStr.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    
    if (parts.length < 3) {
      let guide = `\n📝 إضافة أمر مخصص:\n${"─".repeat(40)}\n`;
      guide += `الصيغة: addcmd <id> "<الاسم>" <نوع_التنفيذ> [config] [args...]\n\n`;
      guide += `أنواع التنفيذ:\n`;
      guide += `  http_fetch    - طلب HTTP (يحتاج url في config)\n`;
      guide += `  dns_query     - استعلام DNS\n`;
      guide += `  tcp_connect   - اتصال TCP\n\n`;
      guide += `تعريف المعاملات (args):\n`;
      guide += `  key:label:placeholder        - معامل اختياري\n`;
      guide += `  key:label:placeholder:true   - معامل مطلوب\n\n`;
      guide += `أمثلة:\n`;
      guide += `  addcmd check_api "فحص API" http_fetch url=https://api.example.com endpoint:النقطة:/api:true\n`;
      guide += `  addcmd my_dns "DNS خاص" dns_query domain:النطاق:example.com:true\n`;
      guide += `  addcmd my_port "فحص منفذ" tcp_connect target:الهدف:example.com:true port:المنفذ:80:true\n`;
      addLine("info", guide);
      return;
    }

    const toolId = parts[0].replace(/[^a-zA-Z0-9_]/g, "");
    const nameAr = parts[1].replace(/"/g, "");
    const execType = parts[2] as "http_fetch" | "dns_query" | "tcp_connect" | "custom_script";
    
    // Parse config and args
    const execConfig: Record<string, string> = {};
    const toolArgs: { key: string; label: string; placeholder: string; required?: boolean }[] = [];

    for (let i = 3; i < parts.length; i++) {
      const p = parts[i];
      if (p.includes("=")) {
        // config key=value
        const [k, ...v] = p.split("=");
        execConfig[k] = v.join("=");
      } else if (p.includes(":")) {
        // arg definition key:label:placeholder[:required]
        const argParts = p.split(":");
        toolArgs.push({
          key: argParts[0],
          label: argParts[1] || argParts[0],
          placeholder: argParts[2] || "",
          required: argParts[3] === "true",
        });
      }
    }

    try {
      await saveCustomTool({
        tool_id: toolId,
        name: toolId,
        name_ar: nameAr,
        icon: "⭐",
        description: `أمر مخصص: ${nameAr}`,
        category: "scanning",
        args: toolArgs,
        execution_type: execType,
        execution_config: execConfig,
      });
      await loadCustomTools();
      addLine("output", `✅ تم إضافة الأمر: ${toolId} (${nameAr})\n📌 استخدم: run custom_${toolId} ${toolArgs.map(a => `${a.key}=${a.placeholder}`).join(" ")}`);
    } catch (e: any) {
      addLine("error", `❌ فشل الحفظ: ${e.message}`);
    }
  };

  const handleDelCmd = async (toolId: string) => {
    if (!toolId) {
      addLine("error", "❌ حدد معرف الأمر: delcmd <tool_id>");
      return;
    }
    // Strip custom_ prefix if provided
    const cleanId = toolId.startsWith("custom_") ? toolId.substring(7) : toolId;
    try {
      await deleteCustomTool(cleanId);
      await loadCustomTools();
      addLine("output", `✅ تم حذف الأمر: ${cleanId}`);
    } catch (e: any) {
      addLine("error", `❌ فشل الحذف: ${e.message}`);
    }
  };

  const handleMyCmds = () => {
    if (customTools.length === 0) {
      return `\n📭 لا توجد أوامر مخصصة.\nاستخدم "addcmd" لإضافة أمر جديد.\n`;
    }
    let out = `\n⭐ الأوامر المخصصة (${customTools.length}):\n${"─".repeat(40)}\n`;
    customTools.forEach((t) => {
      out += `  ${t.icon} ${t.id.padEnd(25)} ${t.nameAr}\n`;
      out += `     المعاملات: ${t.args.map(a => a.key).join(", ") || "بدون"}\n`;
    });
    out += `\n📌 لحذف أمر: delcmd <tool_id>\n`;
    return out;
  };

  const processCommand = async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine("input", `$ ${trimmed}`);
    setHistory((prev) => [trimmed, ...prev].slice(0, 50));
    setHistIdx(-1);

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
      case "help":
        addLine("info", handleHelp());
        break;
      case "clear":
        setLines([]);
        break;
      case "tools":
        addLine("info", handleTools());
        break;
      case "info":
        if (parts[1]) addLine("info", handleInfo(parts[1]));
        else addLine("error", "❌ حدد اسم الأداة: info <tool_id>");
        break;
      case "run":
        if (parts[1]) await handleRun(parts[1], parts.slice(2).join(" "));
        else addLine("error", '❌ حدد الأداة: run <tool_id> [args]\nاكتب "tools" لعرض الأدوات.');
        break;
      case "addcmd":
        await handleAddCmd(parts.slice(1).join(" "));
        break;
      case "delcmd":
        await handleDelCmd(parts[1]);
        break;
      case "mycmds":
        addLine("info", handleMyCmds());
        break;
      case "exec_js": {
        const code = trimmed.substring(trimmed.indexOf(" ") + 1);
        if (!code || code === "exec_js") {
          let guide = `\n💻 تنفيذ كود JavaScript:\n${"─".repeat(40)}\n`;
          guide += `الصيغة: exec_js <كود>\n\n`;
          guide += `أمثلة:\n`;
          guide += `  exec_js 2 + 2\n`;
          guide += `  exec_js console.log("مرحباً")\n`;
          guide += `  exec_js return [1,2,3].map(x => x * x)\n`;
          guide += `  exec_js return await fetch("https://api.github.com").then(r => r.json())\n`;
          guide += `  exec_js for(let i=0;i<5;i++) console.log(i)\n`;
          guide += `  exec_js const a=10; const b=20; return a+b\n`;
          guide += `  exec_js return document.title\n`;
          guide += `  exec_js return navigator.userAgent\n`;
          guide += `  exec_js return performance.now()\n\n`;
          guide += `📌 يدعم: async/await, fetch, DOM, console.log, return, حلقات, دوال, كلاسات\n`;
          guide += `📌 استخدم ; للفصل بين التعليمات المتعددة\n`;
          guide += `📌 استخدم return لإرجاع قيمة، أو console.log لطباعة مخرجات\n`;
          addLine("info", guide);
          break;
        }
        addLine("info", "⏳ جاري تنفيذ الكود...");
        setRunning(true);
        try {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const trimmedCode = code.trim();
          const isExpression = !trimmedCode.startsWith("return ") &&
            !trimmedCode.startsWith("return;") &&
            !trimmedCode.includes("console.") &&
            !trimmedCode.startsWith("var ") &&
            !trimmedCode.startsWith("let ") &&
            !trimmedCode.startsWith("const ") &&
            !trimmedCode.startsWith("if") &&
            !trimmedCode.startsWith("for") &&
            !trimmedCode.startsWith("while") &&
            !trimmedCode.startsWith("class ") &&
            !trimmedCode.startsWith("function ") &&
            !trimmedCode.startsWith("async ") &&
            !trimmedCode.startsWith("try") &&
            !trimmedCode.startsWith("{") &&
            !trimmedCode.includes(";");
          const wrappedCode = isExpression ? "return " + trimmedCode : trimmedCode;

          // Build function body without template literals to avoid backtick conflicts
          const fnBody = [
            "const __results = [];",
            "const __origLog = console.log;",
            "const __origWarn = console.warn;",
            "const __origError = console.error;",
            "const __origInfo = console.info;",
            "const __fmt = function(a) {",
            "  if (a === undefined) return 'undefined';",
            "  if (a === null) return 'null';",
            "  if (a instanceof Error) return a.stack || a.message;",
            "  if (typeof a === 'object') { try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); } }",
            "  return String(a);",
            "};",
            "const __logFn = function(prefix) { return function() { var args = Array.from(arguments); __results.push((prefix ? prefix + ' ' : '') + args.map(__fmt).join(' ')); }; };",
            "console.log = __logFn('');",
            "console.warn = __logFn('\\u26a0\\ufe0f');",
            "console.error = __logFn('\\u274c');",
            "console.info = __logFn('\\u2139\\ufe0f');",
            "try {",
            "  const __ret = await (async function() { " + wrappedCode + " })();",
            "  console.log = __origLog; console.warn = __origWarn; console.error = __origError; console.info = __origInfo;",
            "  if (__ret !== undefined) __results.push(__fmt(__ret));",
            "  return __results.join('\\n') || '\\u2705 تم التنفيذ (بدون مخرجات)';",
            "} catch(e) {",
            "  console.log = __origLog; console.warn = __origWarn; console.error = __origError; console.info = __origInfo;",
            "  throw e;",
            "}"
          ].join("\n");

          const fn = new AsyncFunction(fnBody);
          const result = await fn();
          addLine("output", result);
        } catch (e: any) {
          addLine("error", "❌ خطأ: " + e.message);
        } finally {
          setRunning(false);
        }
        break;
      }
      case "load_lib": {
        const libInput = parts.slice(1).join(" ").trim();
        if (!libInput) {
          let guide = `\n📦 تحميل مكتبة JavaScript:\n${"─".repeat(40)}\n`;
          guide += `الصيغة: load_lib <اسم أو رابط>\n\n`;
          guide += `أمثلة:\n`;
          guide += `  load_lib lodash\n`;
          guide += `  load_lib axios\n`;
          guide += `  load_lib moment\n`;
          guide += `  load_lib chart.js\n`;
          guide += `  load_lib https://cdn.jsdelivr.net/npm/lodash/lodash.min.js\n\n`;
          guide += `📌 يتم التحميل من cdnjs أو jsdelivr تلقائياً\n`;
          guide += `📌 بعد التحميل، استخدم المكتبة مباشرة في exec_js\n`;
          addLine("info", guide);
          break;
        }
        addLine("info", `⏳ جاري تحميل المكتبة: ${libInput}...`);
        setRunning(true);
        try {
          let url = libInput;
          let libName = libInput;
          if (!libInput.startsWith("http")) {
            // Try jsdelivr CDN
            url = `https://cdn.jsdelivr.net/npm/${libInput}`;
            libName = libInput;
          } else {
            libName = libInput.split("/").pop()?.replace(/\.min\.js|\.js/, "") || libInput;
          }
          // Check if already loaded
          if (loadedLibs.some(l => l.name === libName)) {
            addLine("info", `ℹ️ المكتبة "${libName}" محمّلة بالفعل.`);
            setRunning(false);
            break;
          }
          const script = document.createElement("script");
          script.src = url;
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`فشل تحميل: ${url}`));
            document.head.appendChild(script);
          });
          setLoadedLibs(prev => [...prev, { name: libName, url }]);
          addLine("output", `✅ تم تحميل المكتبة: ${libName}\n📌 الرابط: ${url}\n📌 يمكنك استخدامها الآن في exec_js`);
        } catch (e: any) {
          addLine("error", `❌ فشل تحميل المكتبة: ${e.message}\n💡 جرب رابط مباشر مثل:\n   load_lib https://cdn.jsdelivr.net/npm/lodash/lodash.min.js`);
        } finally {
          setRunning(false);
        }
        break;
      }
      case "libs": {
        if (loadedLibs.length === 0) {
          addLine("info", `\n📭 لا توجد مكتبات محمّلة.\nاستخدم "load_lib <اسم>" لتحميل مكتبة.\n\nمثال: load_lib lodash\n`);
        } else {
          let out = `\n📦 المكتبات المحمّلة (${loadedLibs.length}):\n${"─".repeat(40)}\n`;
          loadedLibs.forEach((l, i) => {
            out += `  ${i + 1}. ${l.name}\n     ${l.url}\n`;
          });
          addLine("info", out);
        }
        break;
      }
      case "nano": {
        const fileName = parts[1];
        if (!fileName) {
          addLine("error", "❌ حدد اسم الملف: nano <filename>\nمثال: nano script.js");
          break;
        }
        const existing = vFiles.find(f => f.name === fileName);
        setNanoMode({ fileName, content: existing?.content || "" });
        setTimeout(() => nanoRef.current?.focus(), 100);
        break;
      }
      case "cat": {
        const fileName = parts[1];
        if (!fileName) { addLine("error", "❌ حدد اسم الملف: cat <filename>"); break; }
        const file = vFiles.find(f => f.name === fileName);
        if (!file) { addLine("error", `❌ ملف غير موجود: ${fileName}\nاكتب "ls" لعرض الملفات.`); break; }
        addLine("output", `📄 ${file.name}:\n${"─".repeat(40)}\n${file.content}`);
        break;
      }
      case "ls": {
        if (vFiles.length === 0) {
          addLine("info", `\n📭 لا توجد ملفات.\nاستخدم "nano <filename>" لإنشاء ملف.\n`);
        } else {
          let out = `\n📁 الملفات (${vFiles.length}):\n${"─".repeat(40)}\n`;
          vFiles.forEach(f => {
            const size = new Blob([f.content]).size;
            const date = f.updatedAt.toLocaleString("ar-EG");
            out += `  📄 ${f.name.padEnd(25)} ${size} bytes   ${date}\n`;
          });
          addLine("info", out);
        }
        break;
      }
      case "rm": {
        const fileName = parts[1];
        if (!fileName) { addLine("error", "❌ حدد اسم الملف: rm <filename>"); break; }
        const idx = vFiles.findIndex(f => f.name === fileName);
        if (idx === -1) { addLine("error", `❌ ملف غير موجود: ${fileName}`); break; }
        setVFiles(prev => prev.filter(f => f.name !== fileName));
        addLine("output", `🗑️ تم حذف الملف: ${fileName}`);
        break;
      }
      case "run_file": {
        const fileName = parts[1];
        if (!fileName) { addLine("error", "❌ حدد اسم الملف: run_file <filename.js>"); break; }
        const file = vFiles.find(f => f.name === fileName);
        if (!file) { addLine("error", `❌ ملف غير موجود: ${fileName}`); break; }
        if (!fileName.endsWith(".js") && !fileName.endsWith(".ts")) {
          addLine("error", "❌ يمكن تنفيذ ملفات .js و .ts فقط");
          break;
        }
        addLine("info", `⏳ جاري تنفيذ ${fileName}...`);
        // Reuse exec_js logic
        await processCommand(`exec_js ${file.content}`);
        break;
      }
      case "reload":
        await loadCustomTools();
        addLine("info", "🔄 تم إعادة تحميل الأوامر المخصصة.");
        break;
      default:
        const directTool = allTools.find((t) => t.id === command);
        if (directTool) {
          await handleRun(command, parts.slice(1).join(" "));
        } else {
          addLine("error", `❌ أمر غير معروف: ${command}\nاكتب "help" للمساعدة.`);
        }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !running) {
      processCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx > 0) {
        const newIdx = histIdx - 1;
        setHistIdx(newIdx);
        setInput(history[newIdx]);
      } else {
        setHistIdx(-1);
        setInput("");
      }
    }
  };

  const getLineColor = (type: TermLine["type"]) => {
    switch (type) {
      case "input": return "text-primary";
      case "output": return "text-foreground";
      case "error": return "text-destructive";
      case "info": return "text-muted-foreground";
    }
  };

  const handleNanoSave = () => {
    if (!nanoMode) return;
    const { fileName, content } = nanoMode;
    setVFiles(prev => {
      const idx = prev.findIndex(f => f.name === fileName);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content, updatedAt: new Date() };
        return updated;
      }
      return [...prev, { name: fileName, content, createdAt: new Date(), updatedAt: new Date() }];
    });
    addLine("output", `✅ تم حفظ الملف: ${fileName} (${new Blob([content]).size} bytes)`);
    setNanoMode(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleNanoCancel = () => {
    addLine("info", "❌ تم إلغاء التحرير.");
    setNanoMode(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col h-screen bg-background relative">
      {/* Nano Editor Overlay */}
      {nanoMode && (
        <div className="absolute inset-0 z-50 flex flex-col bg-background">
          <div className="border-b border-primary/30 bg-primary/10 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-primary font-bold">GNU nano</span>
              <span className="text-muted-foreground">─</span>
              <span className="text-foreground">{nanoMode.fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNanoSave}
                className="px-3 py-1 text-xs font-mono bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors"
              >
                ^O حفظ
              </button>
              <button
                onClick={handleNanoCancel}
                className="px-3 py-1 text-xs font-mono bg-destructive/20 text-destructive border border-destructive/30 rounded hover:bg-destructive/30 transition-colors"
              >
                ^X إغلاق
              </button>
            </div>
          </div>
          <textarea
            ref={nanoRef}
            value={nanoMode.content}
            onChange={(e) => setNanoMode({ ...nanoMode, content: e.target.value })}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "o") { e.preventDefault(); handleNanoSave(); }
              if (e.ctrlKey && e.key === "x") { e.preventDefault(); handleNanoCancel(); }
            }}
            className="flex-1 bg-background text-foreground font-mono text-sm p-4 outline-none resize-none caret-primary border-none"
            placeholder="ابدأ الكتابة..."
            dir="ltr"
            spellCheck={false}
            autoComplete="off"
          />
          <div className="border-t border-border bg-card px-4 py-1.5 flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
            <span>^O حفظ</span>
            <span>^X إغلاق</span>
            <span className="ml-auto">{nanoMode.content.split("\n").length} أسطر | {new Blob([nanoMode.content]).size} bytes</span>
          </div>
        </div>
      )}

      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </Link>
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
          <TerminalIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            CyberGuard Terminal
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-muted-foreground">وحدة تنفيذ أوامر أمنية مباشرة</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          <span>{allTools.length} أداة متاحة</span>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto p-4 font-mono text-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="max-w-5xl mx-auto space-y-0.5">
          {lines.map((line, i) => (
            <pre key={i} className={`whitespace-pre-wrap break-words ${getLineColor(line.type)}`} dir="ltr">
              {line.text}
            </pre>
          ))}
          <div className="flex items-center gap-2 mt-2" dir="ltr">
            <span className="text-primary font-bold select-none">
              {running ? "⏳" : "$"}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={running || !!nanoMode}
              className="flex-1 bg-transparent outline-none text-foreground caret-primary placeholder:text-muted-foreground/50 disabled:opacity-50"
              placeholder={running ? "جاري التنفيذ..." : "اكتب أمراً..."}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
