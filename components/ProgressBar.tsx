export default function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.round((current / total) * 100);
  return <div><div className="mb-2 flex justify-between text-sm font-medium text-slate-600"><span>{current} dari {total} soal</span><span>{percentage}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${percentage}%` }} /></div></div>;
}
