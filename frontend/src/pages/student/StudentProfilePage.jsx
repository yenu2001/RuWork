import { useEffect, useState } from "react";
import { GraduationCap, Save } from "lucide-react";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import SelectField from "../../components/common/SelectField";
import Spinner from "../../components/common/Spinner";
import AppHeader from "../../components/layout/AppHeader";
import AccountStatusBadge from "../../components/workspace/AccountStatusBadge";
import useToast from "../../hooks/useToast";
import { profileService } from "../../services/profileService";
import { getApiError } from "../../utils/apiError";
import { JOB_SUITABLE_YEARS } from "../../utils/jobOptions";

const genderOptions = ["Male", "Female", "Prefer not to say"].map((value) => ({ value, label: value }));
const yearOptions = JOB_SUITABLE_YEARS.filter((value) => value !== "Any Year").map((value) => ({ value, label: value }));

export default function StudentProfilePage() {
  const { showToast } = useToast();
  const [state, setState] = useState({ status: "loading", profile: null, error: "", saving: false });
  useEffect(() => {
    let active = true;
    profileService.getStudentProfile()
      .then((profile) => active && setState({ status: "success", profile, error: "", saving: false }))
      .catch((error) => active && setState({ status: "error", profile: null, error: getApiError(error).message, saving: false }));
    return () => { active = false; };
  }, []);
  function update(field, value) { setState((current) => ({ ...current, profile: { ...current.profile, [field]: value } })); }
  async function submit(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "" }));
    const { firstName, lastName, phoneNumber, dateOfBirth, gender, faculty, fieldOfStudy, yearOfStudy } = state.profile;
    try {
      const data = await profileService.updateStudentProfile({ firstName, lastName, phoneNumber, dateOfBirth, gender, faculty, fieldOfStudy, yearOfStudy });
      setState({ status: "success", profile: data.profile, error: "", saving: false });
      showToast(data.message, "success");
    } catch (error) { setState((current) => ({ ...current, saving: false, error: getApiError(error).message })); }
  }
  return <div className="min-h-screen bg-surface"><AppHeader /><main className="page-container py-9 sm:py-12"><span className="eyebrow"><GraduationCap className="size-3.5" aria-hidden="true" />Student profile</span><h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-ink-950">Your Profile</h1><p className="mt-3 text-ink-600">Keep your academic and contact information current.</p>
    {state.status === "loading" && <Spinner label="Loading your profile…" />}
    {state.status === "error" && !state.profile && <div className="surface-card mt-8 p-6"><Alert>{state.error}</Alert></div>}
    {state.profile && <ProfileForm profile={state.profile} error={state.error} saving={state.saving} update={update} submit={submit} />}
  </main></div>;
}

export function ProfileForm({ profile, error, saving, update, submit }) {
  const date = profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split("T")[0] : "";
  return <form onSubmit={submit} className="surface-card mt-8 p-6 sm:p-8"><div className="flex flex-wrap gap-2"><AccountStatusBadge type="email" value={profile.isEmailVerified} /><AccountStatusBadge type="account" value={profile.accountStatus} /></div>{error && <div className="mt-5"><Alert>{error}</Alert></div>}
    <div className="mt-7 grid gap-5 sm:grid-cols-2"><FormField id="student-first-name" label="First name" value={profile.firstName} onChange={(event) => update("firstName", event.target.value)} required /><FormField id="student-last-name" label="Last name" value={profile.lastName} onChange={(event) => update("lastName", event.target.value)} required /><FormField id="student-email" label="Official University email" value={profile.email} readOnly helper="Email changes require a separate verification process and are unavailable here." /><FormField id="student-university" label="University" value={profile.university} readOnly /><FormField id="student-phone" label="Phone number" value={profile.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} required /><FormField id="student-date" label="Date of birth" type="date" value={date} onChange={(event) => update("dateOfBirth", event.target.value)} required /><SelectField id="student-gender" label="Gender" value={profile.gender} onChange={(event) => update("gender", event.target.value)} options={genderOptions} /><FormField id="student-faculty" label="Faculty" value={profile.faculty || ""} onChange={(event) => update("faculty", event.target.value)} /><FormField id="student-field" label="Field of study" value={profile.fieldOfStudy} onChange={(event) => update("fieldOfStudy", event.target.value)} required /><SelectField id="student-year" label="Year of study" value={profile.yearOfStudy} onChange={(event) => update("yearOfStudy", event.target.value)} options={yearOptions} /></div>
    <div className="mt-7 flex justify-end"><Button type="submit" isLoading={saving}><Save className="size-4" aria-hidden="true" />Save Profile</Button></div>
  </form>;
}
