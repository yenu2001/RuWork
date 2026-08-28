export default function JobCardSkeleton() {
  return (
    <div className="surface-card animate-pulse p-6" role="status" aria-label="Loading Job">
      <div className="h-5 w-2/5 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/4 rounded bg-slate-200" />
      <div className="mt-7 h-4 w-3/5 rounded bg-slate-200" />
      <div className="mt-6 flex gap-2"><span className="h-7 w-20 rounded-full bg-slate-200" /><span className="h-7 w-24 rounded-full bg-slate-200" /></div>
      <span className="sr-only">Loading Job results</span>
    </div>
  );
}
