import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import RatingSummary from "../../components/reviews/RatingSummary";
import ReviewCard from "../../components/reviews/ReviewCard";
import { reviewService } from "../../services/reviewService";
import { getApiError } from "../../utils/apiError";

export default function ProviderReviewsPage() {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", summary: null, reviews: [], pagination: null, error: "" });
  useEffect(() => {
    let active = true;
    reviewService.getProviderReviews({ page, limit: 12 })
      .then((data) => active && setState({ status: "success", summary: data.summary, reviews: data.reviews, pagination: data.pagination, error: "" }))
      .catch((error) => active && setState({ status: "error", summary: null, reviews: [], pagination: null, error: getApiError(error).message }));
    return () => { active = false; };
  }, [page]);

  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12">
    <span className="eyebrow"><MessageSquareText className="size-3.5" aria-hidden="true" />Provider workspace</span>
    <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Reviews</h1>
    <p className="mt-3 max-w-2xl text-ink-600">Verified Student feedback from completed engagements across your Jobs.</p>
    {state.status === "loading" ? <Spinner label="Loading Provider Reviews…" /> : null}
    {state.status === "error" ? <div className="surface-card mt-8 p-6"><Alert>{state.error}</Alert></div> : null}
    {state.status === "success" ? <>
      <section className="surface-card mt-8 p-6 sm:p-8"><RatingSummary averageRating={state.summary.averageRating} reviewCount={state.summary.reviewCount} label="Overall Provider rating" /></section>
      {state.reviews.length ? <div className="mt-6 grid gap-4">{state.reviews.map((review) => <ReviewCard key={review.id} review={review} showJob />)}</div> : <div className="surface-card mt-6 p-10 text-center"><h2 className="text-xl font-extrabold text-ink-950">No ratings yet</h2><p className="mt-2 text-sm text-ink-600">Reviews will appear after Students review completed engagements.</p></div>}
      {state.pagination?.pages > 1 ? <nav className="mt-8 flex justify-center gap-3" aria-label="Provider Reviews pagination"><Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="self-center text-sm font-semibold text-ink-600">Page {page} of {state.pagination.pages}</span><Button variant="secondary" disabled={page >= state.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</Button></nav> : null}
    </> : null}
  </main></div>;
}
