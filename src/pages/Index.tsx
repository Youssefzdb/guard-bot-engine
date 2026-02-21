import { useState, useRef, useEffect } from "react";
import { Shield, Terminal, Wrench, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SuggestionChips } from "@/components/SuggestionChips";
import { ToolsPanel } from "@/components/ToolsPanel";
import { ExecutionResult } from "@/components/ExecutionResult";
import { streamChat, type ChatMessage as ChatMsg } from "@/lib/chat-stream";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "tools">("chat");
  const [executionResults, setExecutionResults] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, executionResults]);

  const send = async (input: string) => {
    const userMsg: ChatMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setActiveTab("chat");

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: newMessages,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
        onError: (error) => {
          setIsLoading(false);
          toast({ title: "خطأ", description: error, variant: "destructive" });
        },
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      toast({ title: "خطأ", description: "فشل الاتصال بالوكيل", variant: "destructive" });
    }
  };

  const handleToolResult = (result: string) => {
    setExecutionResults((prev) => [...prev, result]);
    setActiveTab("chat");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Tools */}
      <aside className="hidden md:flex flex-col w-72 border-r border-border bg-card">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-display font-semibold text-foreground">أدوات أمنية</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">أدوات حقيقية تنفذ وتعطي نتائج فعلية</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <ToolsPanel onResult={handleToolResult} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center animate-pulse-glow">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                CyberGuard AI
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  AGENT
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">وكيل أمن سيبراني ذكي • تنفيذ أكواد حقيقي</p>
            </div>

            {/* Mobile tab switcher */}
            <div className="ml-auto flex md:hidden gap-1">
              <button
                onClick={() => setActiveTab("chat")}
                className={`p-2 rounded-lg transition-colors ${activeTab === "chat" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab("tools")}
                className={`p-2 rounded-lg transition-colors ${activeTab === "tools" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <Wrench className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden md:flex ml-auto items-center gap-3">
              <Link to="/terminal" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10">
                <Terminal className="w-3.5 h-3.5" />
                <span>Terminal</span>
              </Link>
              <span className="text-xs text-muted-foreground">v2.0 • Live Execution</span>
            </div>
          </div>
        </header>

        {/* Mobile tools view */}
        {activeTab === "tools" && (
          <div className="flex-1 overflow-y-auto p-3 md:hidden">
            <ToolsPanel onResult={handleToolResult} />
          </div>
        )}

        {/* Chat area */}
        <div className={`flex-1 overflow-y-auto ${activeTab === "tools" ? "hidden md:block" : ""}`} ref={scrollRef}>
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            {messages.length === 0 && executionResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse-glow">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-display font-bold text-foreground">CyberGuard AI</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    وكيل ذكاء اصطناعي متخصص في الأمن السيبراني مع قدرة تنفيذ أكواد حقيقية.
                    <br />
                    استخدم الأدوات الجانبية أو اسأل الوكيل مباشرة.
                  </p>
                </div>
                <SuggestionChips onSelect={send} />
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    message={msg}
                    isStreaming={isLoading && i === messages.length - 1 && msg.role === "assistant"}
                  />
                ))}
                {executionResults.map((result, i) => (
                  <ExecutionResult
                    key={`exec-${i}`}
                    result={result}
                    onClose={() => setExecutionResults((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Input */}
        <div className={activeTab === "tools" ? "hidden md:block" : ""}>
          <ChatInput onSend={send} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default Index;
