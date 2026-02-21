import { Progress } from "@/components/ui/progress";
import { Timer, Zap } from "lucide-react";

interface ScanProgressBarProps {
  currentRound: number;
  maxRounds: number;
  timeLeft: number;
  toolsExecuted: string[];
}

export function ScanProgressBar({ currentRound, maxRounds, timeLeft, toolsExecuted }: ScanProgressBarProps) {
  const progressPercent = (currentRound / maxRounds) * 100;

  return (
    <div className="p-3 rounded-xl bg-card border border-primary/20 my-3 animate-matrix-fade">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-xs font-semibold text-foreground">اختبار شامل جارٍ...</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Timer className="w-3 h-3" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      <Progress value={progressPercent} className="h-2 mb-2" />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>الجولة {currentRound}/{maxRounds}</span>
        <span>{toolsExecuted.length} أداة</span>
      </div>

      {toolsExecuted.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {toolsExecuted.slice(-8).map((tool, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
              {tool}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
