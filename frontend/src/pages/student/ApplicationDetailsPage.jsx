import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, FileText, MessageCircle, WalletCards } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import PaymentInformationCard from "../../components/common/PaymentInformationCard";
import Spinner from "../../components/common/Spinner";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import StudentApplicationActions from "../../components/applications/StudentApplicationActions";
import StudentReviewActions from "../../components/reviews/StudentReviewActions";
import AppHeader from "../../components/layout/AppHeader";
import { applicationService } from "../../services/applicationService";
import { getApiError } from "../../utils/apiError";
import { formatApprovedApplicationPrice, formatOriginalApplicationPrice } from "../../utils/applicationOptions";
import { formatJobDate } from "../../utils/jobOptions";

export default function ApplicationDetailsPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: "loading", application: null, error: "" });

  useEffect(() => {
    let active = true;
    applicationService.getMyApplication(id)
      .then((application) => { if (active) setState({ status: "success", application, error: "" }); })
      .catch((error) => { if (active) setState({ status: "error", application: null, error: getApiError(error).message }); });
    return () => { active = false; };
  }, [id]);

  function updateApplication(application) {
    setState((current) => ({ ...current, application: { ...current.application, ...application, job: current.application.job } }));
  }

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      {state.status === "loading" && <Spinner label="Loading Application details…" />}
      {state.status === "error" && <main className="page-container py-16"><Alert>{state.error}</Alert><Button as={Link} to="/student/applications" variant="secondary" className="mt-5">Back to My Applications</Button></main>}
      {state.status === "success" && <ApplicationDetailsContent application={state.application} onUpdated={updateApplication} />}
    </div>
  );
}

export function ApplicationDetailsContent({ application, onUpdated }) {
  return (
    <main className="page-container py-8 sm:py-12">
      <Link to="/student/applications" className="inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"><ArrowLeft className="size-4" aria-hidden="true" />Back to My Applications</Link>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <section className="surface-card p-6 sm:p-8"><ApplicationStatusBadge status={application.status} /><h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-ink-950">{application.job?.jobTitle || "Archived Job"}</h1><p className="mt-2 text-lg font-semibold text-ink-600">{application.job?.companyName || "Provider"}</p><div className="mt-6 flex flex-wrap gap-5 border-t border-slate-200 pt-5 text-sm text-ink-600"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-brand-600" aria-hidden="true" />Submitted {formatJobDate(application.appliedAt)}</span>{application.job?.isArchived && <span>Job post archived</span>}</div></section>
          <section className="surface-card p-6 sm:p-8"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><FileText className="size-5" aria-hidden="true" /></span><h2 className="mt-4 text-xl font-extrabold text-ink-950">Your Application</h2><p className="mt-3 whitespace-pre-line leading-7 text-ink-600">{application.applicationNote}</p></section>
          {(application.declineReason || application.cancellationReason) && <section className="surface-card p-6 sm:p-8"><h2 className="text-xl font-extrabold text-ink-950">Status details</h2>{application.declineReason && <p className="mt-3 text-ink-600"><strong className="text-ink-800">Provider response:</strong> {application.declineReason}</p>}{application.cancellationReason && <p className="mt-3 text-ink-600"><strong className="text-ink-800">Cancellation reason:</strong> {application.cancellationReason}</p>}</section>}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="surface-card p-6"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><WalletCards className="size-5" aria-hidden="true" /></span><h2 className="mt-4 font-extrabold text-ink-950">Agreed pricing</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-ink-600">Original {application.budgetType === "hourly" ? "hourly rate" : "fixed budget"}</dt><dd className="mt-1 font-extrabold text-ink-950">{formatOriginalApplicationPrice(application)}</dd></div><div className="border-t border-slate-200 pt-3"><dt className="text-ink-600">Provider-approved {application.budgetType === "hourly" ? "rate" : "budget"}</dt><dd className="mt-1 font-extrabold text-brand-700">{formatApprovedApplicationPrice(application)}</dd></div></dl></section>
          <PaymentInformationCard singular />
          <Button as={Link} to={`/student/messages/${application.id}`} variant="secondary" className="w-full"><MessageCircle className="size-4" aria-hidden="true" />Message Job Provider</Button>
          <StudentApplicationActions application={application} onUpdated={onUpdated} />
          <StudentReviewActions application={application} />
        </aside>
      </div>
    </main>
  );
}
