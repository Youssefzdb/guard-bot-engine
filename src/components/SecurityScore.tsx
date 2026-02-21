import { Shield } from "lucide-react";

interface SecurityScoreProps {
  score: number;
}

export function SecurityScore({ score }: SecurityScoreProps) {
  const getColor = () => {
    if (score >= 70) return { text: "text-green-400", bg: "bg-green-500", border: "border-green-500/30", label: "جيد" };
    if (score >= 40) return { text: "text-yellow-400", bg: "bg-yellow-500", border: "border-yellow-500/30", label: "متوسط" };
    return { text: "text-red-400", bg: "bg-red-500", border: "border-red-500/30", label: "ضعيف" };
  };

  const { text, bg, border, label } = getColor();
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl bg-card border ${border} my-3`}>
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={text}
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${text}`}>{score}</span>
          <span className="text-[10px] text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Shield className={`w-4 h-4 ${text}`} />
          <span className={`text-sm font-semibold ${text}`}>درجة الأمان: {label}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-muted/20 overflow-hidden">
          <div className={`h-full rounded-full ${bg} transition-all duration-1000`} style={{ width: `${score}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
