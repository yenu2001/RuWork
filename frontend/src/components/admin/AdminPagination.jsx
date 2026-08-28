import Button from "../common/Button";

export default function AdminPagination({ pagination, page, onPage, label }) {
  if (!pagination || pagination.pages <= 1) return null;
  return <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label={`${label} pagination`}><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button><span className="text-sm font-semibold text-ink-600">Page {page} of {pagination.pages}</span><Button variant="secondary" disabled={page >= pagination.pages} onClick={() => onPage(page + 1)}>Next</Button></nav>;
}
