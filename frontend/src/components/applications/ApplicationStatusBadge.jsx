import { getApplicationStatusMeta } from "../../utils/applicationOptions";

export default function ApplicationStatusBadge({ status }) {
  const meta = getApplicationStatusMeta(status);
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${meta.classes}`}>{meta.label}</span>;
}
