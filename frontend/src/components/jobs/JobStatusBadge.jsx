import { getJobStatusLabel } from "../../utils/jobOptions";

const tones = {
  open: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-200 text-slate-700",
  closed: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-800"
};

export default function JobStatusBadge({ job, status: suppliedStatus, isArchived = false }) {
  const resolvedJob = job || { status: suppliedStatus, archivedAt: isArchived ? new Date().toISOString() : null };
  const status = resolvedJob.availabilityStatus || resolvedJob.status;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[status] || tones.draft}`}>{getJobStatusLabel(resolvedJob)}</span>;
}
