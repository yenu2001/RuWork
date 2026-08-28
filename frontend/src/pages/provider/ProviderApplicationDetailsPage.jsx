import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, FileText, GraduationCap, MessageCircle, WalletCards } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import PaymentInformationCard from "../../components/common/PaymentInformationCard";
import Spinner from "../../components/common/Spinner";
import ApplicationStatusBadge from "../../components/applications/ApplicationStatusBadge";
import ProviderApplicationActions from "../../components/applications/ProviderApplicationActions";
import AppHeader from "../../components/layout/AppHeader";
import { applicationService } from "../../services/applicationService";
import { getApiError } from "../../utils/apiError";
import { formatApprovedApplicationPrice, formatOriginalApplicationPrice } from "../../utils/applicationOptions";
import { formatJobDate } from "../../utils/jobOptions";

export default function ProviderApplicationDetailsPage() {
  const { id } = useParams();
  const [state, setState] = useState({ status: "loading", application: null, error: "" });

  useEffect(() => {
    let active = true;
    applicationService.getProviderApplication(id)
      .then((application) => { if (active) setState({ status: "success", application, error: "" }); })
      .catch((error) => { if (active) setState({ status: "error", application: null, error: getApiError(error).message }); });
    return () => { active = false; };
  }, [id]);

  function updateApplication(application) {
    setState((current) => ({ ...current, application: { ...current.application, ...application, student: current.application.student, job: current.application.job } }));
  }

  return (
    <div className="min-h-screen bg-surface"><AppHeader />{state.status === "loading" && <Spinner label="Loading applicant details…" />}{state.status === "error" && <main className="page-container py-16"><Alert>{state.error}</Alert><Button as={Link} to="/provider/jobs" variant="secondary" className="mt-5">Back to My Jobs</Button></main>}{state.status === "success" && <ProviderDetailsContent application={state.application} onUpdated={updateApplication} />}</div>
  );
}

export function ProviderDetailsContent({ application, onUpdated }) {
  const student = application.student;
  return (
    <main className="page-container py-8 sm:py-12">
      <Link to={`/provider/jobs/${application.job?.id}/applications`} className="inline-flex items-center gap-2 text-sm font-bold text-ink-600 hover:text-brand-700"><ArrowLeft className="size-4" aria-hidden="true" />Back to Applicants</Link>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <section className="surface-card p-6 sm:p-8"><ApplicationStatusBadge status={application.status} /><h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-ink-950">{student.firstName} {student.lastName}</h1><p className="mt-2 inline-flex items-center gap-2 font-semibold text-ink-600"><GraduationCap className="size-5 text-brand-600" aria-hidden="true" />{student.fieldOfStudy} · {student.yearOfStudy}{student.faculty ? ` · ${student.faculty}` : ""}</p><div className="mt-6 flex flex-wrap gap-5 border-t border-slate-200 pt-5 text-sm text-ink-600"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-brand-600" aria-hidden="true" />Applied {formatJobDate(application.appliedAt)}</span><span>{application.job?.jobTitle}</span></div></section>
          <section className="surface-card p-6 sm:p-8"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><FileText className="size-5" aria-hidden="true" /></span><h2 className="mt-4 text-xl font-extrabold text-ink-950">Application note</h2><p className="mt-3 whitespace-pre-line leading-7 text-ink-600">{application.applicationNote}</p></section>
          {(application.declineReason || application.cancellationReason) && <section className="surface-card p-6 sm:p-8"><h2 className="text-xl font-extrabold text-ink-950">Status details</h2>{application.declineReason && <p className="mt-3 text-ink-600"><strong>Decline reason:</strong> {application.declineReason}</p>}{application.cancellationReason && <p className="mt-3 text-ink-600"><strong>Student cancellation reason:</strong> {application.cancellationReason}</p>}</section>}
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="surface-card p-6"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><WalletCards className="size-5" aria-hidden="true" /></span><h2 className="mt-4 font-extrabold text-ink-950">Engagement pricing</h2><dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-ink-600">Original</dt><dd className="mt-1 font-extrabold text-ink-950">{formatOriginalApplicationPrice(application)}</dd></div><div className="border-t border-slate-200 pt-3"><dt className="text-ink-600">Final agreed</dt><dd className="mt-1 font-extrabold text-brand-700">{formatApprovedApplicationPrice(application)}</dd></div></dl></section>
          <Button as={Link} to={`/provider/messages/${application.id}`} variant="secondary" className="w-full"><MessageCircle className="size-4" aria-hidden="true" />Message Student</Button>
          <ProviderApplicationActions application={application} onUpdated={onUpdated} />
          <PaymentInformationCard singular />
          {application.status === "cancelled" && <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-800"><strong>Cancelled by the Student.</strong> This engagement cannot be completed or reviewed as completed work.</div>}
        </aside>
      </div>
    </main>
  );
}
