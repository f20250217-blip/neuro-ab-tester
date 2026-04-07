"use client";

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
  color?: string;
  showValue?: boolean;
}

export default function ScoreBar({ label, score, maxScore = 10, color = "#7c6cf0", showValue = true }: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#7a7a98] font-medium tracking-wide">{label}</span>
        {showValue && (
          <span className="text-xs font-bold font-mono tabular-nums" style={{ color }}>
            {score.toFixed(1)}
          </span>
        )}
      </div>
      <div className="h-1.5 bg-[#0c0c14] rounded-full overflow-hidden border border-[#1e1e30]/50">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out relative"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
            boxShadow: `0 0 12px ${color}33, 0 0 4px ${color}22`,
          }}
        >
          <div className="absolute inset-0 rounded-full opacity-50"
            style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.15), transparent)` }} />
        </div>
      </div>
    </div>
  );
}
