import { useEffect, useState } from "react";
import Alert from "../common/Alert";
import Button from "../common/Button";
import Spinner from "../common/Spinner";
import { reviewService } from "../../services/reviewService";
import { getApiError } from "../../utils/apiError";
import RatingSummary from "./RatingSummary";
import ReviewCard from "./ReviewCard";

export default function JobReviewsSection({ job }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", reviews: [], pagination: null, error: "" });
  useEffect(() => {
    let active = true;
    reviewService.getJobReviews(job.id, { page, limit: 10 })
      .then((data) => active && setState({ status: "success", reviews: data.reviews, pagination: data.pagination, error: "" }))
      .catch((error) => active && setState({ status: "error", reviews: [], pagination: null, error: getApiError(error).message }));
    return () => { active = false; };
  }, [job.id, page]);

  return <section className="surface-card p-6 sm:p-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-xl font-extrabold text-ink-950">Reviews &amp; Ratings</h2><p className="mt-1 text-sm text-ink-600">Verified feedback from completed engagements for this Job.</p></div>
      <RatingSummary averageRating={job.averageRating} reviewCount={job.reviewCount} label="Job rating" align="right" />
    </div>
    {state.status === "loading" ? <Spinner label="Loading Job Reviews…" /> : null}
    {state.status === "error" ? <div className="mt-5"><Alert>{state.error}</Alert></div> : null}
    {state.status === "success" && state.reviews.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center"><p className="font-semibold text-ink-800">No reviews yet.</p><p className="mt-1 text-sm text-ink-600">Completed engagements can be reviewed by their Student.</p></div> : null}
    {state.status === "success" && state.reviews.length > 0 ? <div className="mt-6 grid gap-4">{state.reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : null}
    {state.status === "success" && state.pagination?.pages > 1 ? <nav className="mt-6 flex items-center justify-center gap-3" aria-label="Job Reviews pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm font-semibold text-ink-600">Page {page} of {state.pagination.pages}</span><Button variant="secondary" disabled={page >= state.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav> : null}
  </section>;
}
