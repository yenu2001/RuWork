import { useEffect, useState } from "react";
import { Building2, Save } from "lucide-react";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import TextareaField from "../../components/common/TextareaField";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import AccountStatusBadge from "../../components/workspace/AccountStatusBadge";
import RatingSummary from "../../components/reviews/RatingSummary";
import useToast from "../../hooks/useToast";
import { profileService } from "../../services/profileService";
import { getApiError } from "../../utils/apiError";

export default function CompanyProfilePage() {
  const { showToast } = useToast();
  const [state, setState] = useState({ status: "loading", profile: null, error: "", saving: false });
  useEffect(() => {
    let active = true;
    profileService.getProviderProfile()
      .then((profile) => active && setState({ status: "success", profile, error: "", saving: false }))
      .catch((error) => active && setState({ status: "error", profile: null, error: getApiError(error).message, saving: false }));
    return () => { active = false; };
  }, []);
  function update(field, value) { setState((current) => ({ ...current, profile: { ...current.profile, [field]: value } })); }
  async function submit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "" }));
    const { companyName, companyAddress, phoneNumber, companySize, industry, companyWebsite, companyDescription, firstName, lastName } = state.profile;
    try { const data = await profileService.updateProviderProfile({ companyName, companyAddress, phoneNumber, companySize, industry, companyWebsite, companyDescription, firstName, lastName }); setState({ status: "success", profile: data.profile, error: "", saving: false }); showToast(data.message, "success"); }
    catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); }
  }
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><Building2 className="size-3.5" aria-hidden="true" />Provider profile</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Company Profile</h1><p className="mt-3 max-w-2xl text-ink-600">This current public company identity is used consistently across every owned Job.</p>{state.status === "loading" && <Spinner label="Loading Company Profile…" />}{state.status === "error" && !state.profile && <div className="surface-card mt-8 p-6"><Alert>{state.error}</Alert></div>}{state.profile && <CompanyProfileForm profile={state.profile} update={update} submit={submit} saving={state.saving} error={state.error} />}</main></div>;
}

export function CompanyProfileForm({ profile, update, submit, saving, error }) {
  return <form onSubmit={submit} className="surface-card mt-8 p-6 sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex flex-wrap gap-2"><AccountStatusBadge type="email" value={profile.isEmailVerified} /><AccountStatusBadge type="account" value={profile.accountStatus} /></div><RatingSummary averageRating={profile.averageRating} reviewCount={profile.reviewCount || 0} label="Overall Provider rating" align="right" /></div>{error && <div className="mt-5"><Alert>{error}</Alert></div>}<div className="mt-7 grid gap-5 sm:grid-cols-2"><FormField id="company-name" label="Company name" value={profile.companyName} onChange={(event) => update("companyName", event.target.value)} required helper="Changing this name updates all existing and future Job displays." /><FormField id="company-email" label="Company email" value={profile.companyEmail} readOnly helper="Email changes require reverification and are unavailable here." /><FormField id="company-phone" label="Phone / contact number" value={profile.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} required /><FormField id="company-size" label="Company size" value={profile.companySize} onChange={(event) => update("companySize", event.target.value)} required /><FormField id="company-industry" label="Industry" value={profile.industry} onChange={(event) => update("industry", event.target.value)} required /><FormField id="company-website" label="Company website (optional)" type="url" value={profile.companyWebsite || ""} onChange={(event) => update("companyWebsite", event.target.value)} /><FormField id="contact-first-name" label="Primary contact first name" value={profile.firstName} onChange={(event) => update("firstName", event.target.value)} required /><FormField id="contact-last-name" label="Primary contact last name" value={profile.lastName} onChange={(event) => update("lastName", event.target.value)} required /><FormField id="company-address" label="Company address" value={profile.companyAddress} onChange={(event) => update("companyAddress", event.target.value)} required className="sm:col-span-2" /><TextareaField id="company-description" label="Company description" value={profile.companyDescription} onChange={(event) => update("companyDescription", event.target.value)} maxLength={300} required className="sm:col-span-2" /></div><div className="mt-7 flex justify-end"><Button type="submit" isLoading={saving}><Save className="size-4" aria-hidden="true" />Save Company Profile</Button></div></form>;
}
