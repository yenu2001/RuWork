import { useEffect, useState } from "react";
import { Star, Trash2 } from "lucide-react";
import Alert from "../common/Alert";
import Button from "../common/Button";
import Modal from "../common/Modal";
import Spinner from "../common/Spinner";
import TextareaField from "../common/TextareaField";
import useToast from "../../hooks/useToast";
import { reviewService } from "../../services/reviewService";
import { getApiError } from "../../utils/apiError";
import ReviewCard from "./ReviewCard";
import StarRatingInput from "./StarRatingInput";

export default function StudentReviewActions({ application }) {
  const eligible = application.status === "completed";
  const { showToast } = useToast();
  const [dialog, setDialog] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState({ status: eligible ? "loading" : "idle", review: null, error: "", saving: false });

  useEffect(() => {
    if (!eligible) return undefined;
    let active = true;
    reviewService.getMyReviewForApplication(application.id)
      .then((review) => active && setState({ status: "ready", review, error: "", saving: false }))
      .catch((error) => active && setState({ status: "error", review: null, error: getApiError(error).message, saving: false }));
    return () => { active = false; };
  }, [application.id, eligible]);

  if (!eligible) return null;

  async function submit(event) {
    event.preventDefault();
    if (!rating) return setState((current) => ({ ...current, error: "Choose a rating from 1 to 5 stars" }));
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const data = await reviewService.createReview({ applicationId: application.id, rating, comment });
      setState({ status: "ready", review: data.review, error: "", saving: false });
      setDialog("");
      showToast(data.message, "success");
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: getApiError(error).message }));
    }
  }

  async function remove() {
    setState((current) => ({ ...current, saving: true, error: "" }));
    try {
      const data = await reviewService.deleteMyReview(state.review.id);
      setState({ status: "ready", review: null, error: "", saving: false });
      setDialog("");
      setRating(0);
      setComment("");
      showToast(data.message, "success");
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: getApiError(error).message }));
    }
  }

  if (state.status === "loading") return <div className="surface-card p-5"><Spinner label="Checking Review eligibility…" /></div>;
  return <section className="surface-card p-5">
    <h2 className="font-extrabold text-ink-950">Your Review</h2>
    <p className="mt-2 text-sm leading-6 text-ink-600">This completed engagement is eligible for one active Review.</p>
    {state.error && !dialog ? <div className="mt-4"><Alert>{state.error}</Alert></div> : null}
    {state.review ? <div className="mt-4"><ReviewCard review={state.review} actions={<Button variant="danger" onClick={() => setDialog("delete")}><Trash2 className="size-4" aria-hidden="true" />Delete Review</Button>} /></div> : <Button className="mt-5 w-full" onClick={() => { setState((current) => ({ ...current, error: "" })); setDialog("create"); }}><Star className="size-4" aria-hidden="true" />Leave a Review</Button>}
    <Modal isOpen={dialog === "create"} onClose={() => !state.saving && setDialog("")} eyebrow="Completed engagement" title="Leave a Review" description={`${application.job?.jobTitle || "This Job"} · ${application.job?.companyName || "Job Provider"}`}>
      <form onSubmit={submit}><StarRatingInput value={rating} onChange={(value) => { setRating(value); setState((current) => ({ ...current, error: "" })); }} error={state.error && !rating ? state.error : ""} /><TextareaField id={`review-comment-${application.id}`} label="Review comment (optional)" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} helper="Share concise, factual feedback about the completed work." className="mt-5" />{state.error && rating ? <div className="mt-4"><Alert>{state.error}</Alert></div> : null}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="secondary" onClick={() => setDialog("")} disabled={state.saving}>Cancel</Button><Button type="submit" isLoading={state.saving}>Submit Review</Button></div></form>
    </Modal>
    <Modal isOpen={dialog === "delete"} onClose={() => !state.saving && setDialog("")} eyebrow="Delete Review" title="Delete your Review?" description="The Review will be removed and both Job and Provider ratings will be recalculated. You may leave another Review later."><div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setDialog("")} disabled={state.saving}>Cancel</Button><Button variant="danger" onClick={remove} isLoading={state.saving}>Delete Review</Button></div></Modal>
  </section>;
}
