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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex flex-col h-screen bg-background">
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
              disabled={running}
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
