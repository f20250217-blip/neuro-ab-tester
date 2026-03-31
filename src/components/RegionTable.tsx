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
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b border-[#2a2a4a]">
            <th className="text-left py-3 px-4 text-[#8888a8] font-medium">Brain Region</th>
            <th className="text-center py-3 px-4 text-[#6c5ce7] font-medium">Content A</th>
            <th className="text-center py-3 px-4 text-[#00d2a0] font-medium">Content B</th>
            <th className="text-left py-3 px-4 text-[#8888a8] font-medium">Insight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#2a2a4a]/50 hover:bg-[#1a1a2e]/50">
              <td className="py-3 px-4 text-[#e8e8f0] font-medium">{row.region}</td>
              <td className="py-3 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-16 h-2 bg-[#12121a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#6c5ce7] rounded-full"
                      style={{ width: `${row.activationA * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#8888a8]">{(row.activationA * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="py-3 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-16 h-2 bg-[#12121a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00d2a0] rounded-full"
                      style={{ width: `${row.activationB * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#8888a8]">{(row.activationB * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="py-3 px-4 text-xs text-[#8888a8]">{row.insight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
