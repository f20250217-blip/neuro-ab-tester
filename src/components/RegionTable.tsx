"use client";

interface RegionRow {
  region: string;
  activationA: number;
  activationB: number;
  difference: number;
  insight: string;
}

interface RegionTableProps {
  rows: RegionRow[];
}

export default function RegionTable({ rows }: RegionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-[#1e1e30]">
            <th className="text-left py-4 px-5 text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.15em]">Brain Region</th>
            <th className="text-center py-4 px-5 text-[10px] font-semibold text-[#7c6cf0] uppercase tracking-[0.15em]">Content A</th>
            <th className="text-center py-4 px-5 text-[10px] font-semibold text-[#00e8b0] uppercase tracking-[0.15em]">Content B</th>
            <th className="text-left py-4 px-5 text-[10px] font-semibold text-[#4a4a68] uppercase tracking-[0.15em]">Insight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const winnerA = row.activationA > row.activationB;
            return (
              <tr key={i} className="border-b border-[#1e1e30]/40 stat-card group">
                <td className="py-3.5 px-5">
                  <span className="text-[#f0f0f8] font-medium text-sm">{row.region}</span>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="w-20 h-1.5 bg-[#0c0c14] rounded-full overflow-hidden border border-[#1e1e30]/50">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${row.activationA * 100}%`,
                          background: winnerA ? "linear-gradient(90deg, #7c6cf066, #7c6cf0)" : "#7c6cf066",
                          boxShadow: winnerA ? "0 0 8px #7c6cf033" : "none",
                        }}
                      />
                    </div>
                    <span className={`text-xs font-mono tabular-nums ${winnerA ? "text-[#9d8ff8] font-bold" : "text-[#4a4a68]"}`}>
                      {(row.activationA * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-5">
                  <div className="flex items-center justify-center gap-2.5">
                    <div className="w-20 h-1.5 bg-[#0c0c14] rounded-full overflow-hidden border border-[#1e1e30]/50">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${row.activationB * 100}%`,
                          background: !winnerA ? "linear-gradient(90deg, #00e8b066, #00e8b0)" : "#00e8b066",
                          boxShadow: !winnerA ? "0 0 8px #00e8b033" : "none",
                        }}
                      />
                    </div>
                    <span className={`text-xs font-mono tabular-nums ${!winnerA ? "text-[#00e8b0] font-bold" : "text-[#4a4a68]"}`}>
                      {(row.activationB * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-5 text-xs text-[#7a7a98] leading-relaxed max-w-xs">{row.insight}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
