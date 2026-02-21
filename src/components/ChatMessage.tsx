import ReactMarkdown from "react-markdown";
import { Shield, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { ChatMessage as ChatMsg } from "@/lib/chat-stream";

interface ChatMessageProps {
  message: ChatMsg;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 animate-matrix-fade ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
          isUser
            ? "bg-muted border-border"
            : "bg-primary/10 border-primary/30 animate-pulse-glow"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Shield className="w-4 h-4 text-primary" />
        )}
      </div>

      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? "bg-muted border border-border"
            : "bg-card border border-border"
        }`}
      >
        {isUser ? (
          <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-card-foreground">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isInline = !match;
                  if (isInline) {
                    return (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-primary text-xs font-mono" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <CodeBlock language={match[1]}>
                      {String(children).replace(/\n$/, "")}
                    </CodeBlock>
                  );
                },
                pre({ children }) {
                  return <>{children}</>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-typing-cursor" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ children, language }: { children: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cyber-code-block my-3">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs text-primary font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="text-xs font-mono text-foreground">{children}</code>
      </pre>
    </div>
  );
}
