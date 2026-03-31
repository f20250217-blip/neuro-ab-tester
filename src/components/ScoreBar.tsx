"use client";

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
  color?: string;
  showValue?: boolean;
}

export default function ScoreBar({ label, score, maxScore = 10, color = "#6c5ce7", showValue = true }: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-[#8888a8]">{label}</span>
        {showValue && <span className="text-sm font-mono text-[#e8e8f0]">{score.toFixed(1)}</span>}
      </div>
      <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 10px ${color}44`,
          }}
        />
      </div>
    </div>
  );
}
