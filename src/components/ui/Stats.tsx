interface StatsProps {
  stats?: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  };
}

export default function Stats({
  stats = { total: 0, passed: 0, failed: 0, pending: 0 },
}: StatsProps) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide select-none font-sans">
      <div className="text-pure-white font-bold">
        <span>Total: </span>
        <span>{stats.total}</span>
      </div>

      <span className="text-pure-white/40 font-normal">|</span>

      <div className="text-stat-green font-bold">
        <span>Passed: </span>
        <span>{stats.passed}</span>
      </div>

      <span className="text-pure-white/40 font-normal">|</span>

      <div className="text-stat-red font-bold">
        <span>Failed: </span>
        <span>{stats.failed}</span>
      </div>

      <span className="text-pure-white/40 font-normal">|</span>

      <div className="text-stat-yellow font-bold">
        <span>Pending: </span>
        <span>{stats.pending}</span>
      </div>
    </div>
  );
}
