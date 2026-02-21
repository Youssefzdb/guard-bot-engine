import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

interface ExecutionResultProps {
  result: string;
  onClose: () => void;
}

export function ExecutionResult({ result, onClose }: ExecutionResultProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cyber-code-block animate-matrix-fade">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs text-primary font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          نتيجة التنفيذ
        </span>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors p-1">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <pre className="p-3 overflow-x-auto max-h-80 overflow-y-auto" dir="ltr">
        <code className="text-xs font-mono text-foreground whitespace-pre-wrap">{result}</code>
      </pre>
    </div>
  );
}
