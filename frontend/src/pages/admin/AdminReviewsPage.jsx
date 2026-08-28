import { useEffect, useState } from "react";
import { Eye, EyeOff, Search, ShieldAlert } from "lucide-react";
import AdminPagination from "../../components/admin/AdminPagination";
import ModerationBadge from "../../components/admin/ModerationBadge";
import ModerationDialog from "../../components/admin/ModerationDialog";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import SelectField from "../../components/common/SelectField";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import ReviewCard from "../../components/reviews/ReviewCard";
import useToast from "../../hooks/useToast";
import { adminService } from "../../services/adminService";
import { reviewService } from "../../services/reviewService";
import { getApiError } from "../../utils/apiError";

const ratingOptions = [{ value: "", label: "All ratings" }, ...[5, 4, 3, 2, 1].map((rating) => ({ value: String(rating), label: `${rating} stars` }))];
const moderationOptions = [{ value: "all", label: "All moderation states" }, { value: "active", label: "Visible" }, { value: "hidden", label: "Hidden" }];

export default function AdminReviewsPage() {
  const { showToast } = useToast();
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState({ q: "", rating: "", moderationStatus: "all" });
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [state, setState] = useState({ status: "loading", reviews: [], pagination: null, error: "", saving: false });
  useEffect(() => { let active = true; reviewService.getAdminReviews({ ...filters, page, limit: 20 }).then((data) => active && setState({ status: "success", reviews: data.reviews, pagination: data.pagination, error: "", saving: false })).catch((error) => active && setState({ status: "error", reviews: [], pagination: null, error: getApiError(error).message, saving: false })); return () => { active = false; }; }, [filters, page]);
  function changeFilter(key, value) { setPage(1); setFilters((current) => ({ ...current, [key]: value })); }
  function search(event) { event.preventDefault(); changeFilter("q", draftSearch.trim()); }
  async function moderate(reason) { const status = target.action === "hide" ? "hidden" : "active"; setState((current) => ({ ...current, saving: true, error: "" })); try { const data = await adminService.moderateReview(target.review.id, status, reason); setState((current) => ({ ...current, saving: false, reviews: current.reviews.map((review) => review.id === data.review.id ? data.review : review) })); setTarget(null); showToast(data.message, "success"); } catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); } }
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><ShieldAlert className="size-3.5" aria-hidden="true" />Admin moderation</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Review Moderation</h1><p className="mt-3 max-w-2xl text-ink-600">Reversibly hide inappropriate Reviews while preserving engagement history and recalculating public ratings.</p><form onSubmit={search} className="surface-card mt-8 grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_190px_auto] xl:items-end"><FormField id="admin-review-search" label="Search comments" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} maxLength={80} /><SelectField id="admin-review-rating" label="Rating" value={filters.rating} onChange={(event) => changeFilter("rating", event.target.value)} options={ratingOptions} /><SelectField id="admin-review-moderation" label="Moderation" value={filters.moderationStatus} onChange={(event) => changeFilter("moderationStatus", event.target.value)} options={moderationOptions} /><Button type="submit"><Search className="size-4" aria-hidden="true" />Search</Button></form>{state.error ? <div className="mt-5"><Alert>{state.error}</Alert></div> : null}{state.status === "loading" ? <Spinner label="Loading Reviews…" /> : null}{state.status === "success" && state.reviews.length === 0 ? <div className="surface-card mt-6 p-10 text-center"><h2 className="text-xl font-extrabold text-ink-950">No matching Reviews</h2><p className="mt-2 text-sm text-ink-600">No Review matches the current moderation filters.</p></div> : null}{state.status === "success" && state.reviews.length ? <div className="mt-6 grid gap-4">{state.reviews.map((review) => { const hidden = review.moderationStatus === "hidden"; return <div key={review.id} className="relative"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><ModerationBadge status={review.moderationStatus} content />{review.moderationReason ? <span className="text-xs font-semibold text-red-700">Reason: {review.moderationReason}</span> : null}</div><ReviewCard review={review} showJob actions={<Button variant={hidden ? "primary" : "danger"} onClick={() => setTarget({ action: hidden ? "restore" : "hide", review })}>{hidden ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}{hidden ? "Restore" : "Hide"}</Button>} /></div>; })}</div> : null}<AdminPagination pagination={state.pagination} page={page} onPage={setPage} label="Admin Reviews" /></main><ModerationDialog target={target && { ...target, label: "this Review" }} onClose={() => setTarget(null)} onConfirm={moderate} saving={state.saving} /></div>;
}
