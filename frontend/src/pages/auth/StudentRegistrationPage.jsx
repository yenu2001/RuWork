import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import PasswordField from "../../components/common/PasswordField";
import SelectField from "../../components/common/SelectField";
import RegistrationSection from "../../components/auth/RegistrationSection";
import AuthShell from "../../components/layout/AuthShell";
import { authService } from "../../services/authService";
import { getApiError } from "../../utils/apiError";
import { getPasswordError, isRuhunaEmail, normalizeEmail, UNIVERSITY_NAME } from "../../utils/validation";

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  dateOfBirth: "",
  gender: "",
  faculty: "",
  fieldOfStudy: "",
  yearOfStudy: "",
  password: "",
  confirmPassword: ""
};

const genderOptions = [
  { value: "", label: "Select gender" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Prefer not to say", label: "Prefer not to say" }
];

const yearOptions = [
  { value: "", label: "Select year" },
  ...["1st Year", "2nd Year", "3rd Year", "4th Year", "Final Year"].map((year) => ({ value: year, label: year }))
];

export default function StudentRegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const next = {};
    ["firstName", "lastName", "phoneNumber", "dateOfBirth", "gender", "faculty", "fieldOfStudy", "yearOfStudy"].forEach((field) => {
      if (!form[field].trim()) next[field] = "This field is required.";
    });
    if (!isRuhunaEmail(form.email)) next.email = "Use your official University of Ruhuna email ending exactly in @ruh.ac.lk.";
    const passwordError = getPasswordError(form.password);
    if (passwordError) next.password = passwordError;
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setRequestError("");
    setIsSubmitting(true);
    const email = normalizeEmail(form.email);
    const { confirmPassword: _confirmPassword, ...payload } = form;
    payload.email = email;
    payload.university = UNIVERSITY_NAME;
    try {
      const response = await authService.registerStudent(payload);
      navigate("/account/verify-email", { replace: true, state: { email, accountType: "student", message: response.message } });
    } catch (error) {
      const apiError = getApiError(error, "Student registration failed. Please try again.");
      if (apiError.code === "VERIFICATION_EMAIL_NOT_SENT") {
        navigate("/account/verify-email", { replace: true, state: { email, accountType: "student", message: apiError.message, deliveryFailed: true } });
      } else {
        setRequestError(apiError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell eyebrow="Student registration" title="Create your student profile" description="Use your official University of Ruhuna details. Email verification and Admin approval are both required before login access." wide>
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        {requestError && <Alert>{requestError}</Alert>}
        <RegistrationSection number="1" title="Personal information">
          <FormField id="student-first-name" label="First name" autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} error={errors.firstName} disabled={isSubmitting} />
          <FormField id="student-last-name" label="Last name" autoComplete="family-name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} error={errors.lastName} disabled={isSubmitting} />
          <FormField id="student-email" label="University email" type="email" autoComplete="email" placeholder="name@ruh.ac.lk" value={form.email} onChange={(event) => update("email", event.target.value)} error={errors.email} helper="Use your official University of Ruhuna email address (@ruh.ac.lk)." disabled={isSubmitting} />
          <FormField id="student-phone" label="Phone number" type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} error={errors.phoneNumber} disabled={isSubmitting} />
          <FormField id="student-birth-date" label="Date of birth" type="date" autoComplete="bday" max={new Date().toISOString().split("T")[0]} value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} error={errors.dateOfBirth} disabled={isSubmitting} />
          <SelectField id="student-gender" label="Gender" options={genderOptions} value={form.gender} onChange={(event) => update("gender", event.target.value)} error={errors.gender} disabled={isSubmitting} />
        </RegistrationSection>

        <RegistrationSection number="2" title="Academic information" description="RuWork is currently limited to students of the University of Ruhuna.">
          <FormField id="student-university" label="University" value={UNIVERSITY_NAME} readOnly helper="This value is fixed and cannot be changed." />
          <FormField id="student-faculty" label="Faculty" placeholder="e.g. Faculty of Science" value={form.faculty} onChange={(event) => update("faculty", event.target.value)} error={errors.faculty} disabled={isSubmitting} />
          <FormField id="student-field" label="Field of study" placeholder="e.g. Computer Science" value={form.fieldOfStudy} onChange={(event) => update("fieldOfStudy", event.target.value)} error={errors.fieldOfStudy} disabled={isSubmitting} />
          <SelectField id="student-year" label="Year of study" options={yearOptions} value={form.yearOfStudy} onChange={(event) => update("yearOfStudy", event.target.value)} error={errors.yearOfStudy} disabled={isSubmitting} />
        </RegistrationSection>

        <RegistrationSection number="3" title="Account security" description="The backend requires 8 characters, one uppercase letter, and one number.">
          <PasswordField id="student-password" label="Password" autoComplete="new-password" value={form.password} onChange={(event) => update("password", event.target.value)} error={errors.password} helper="At least 8 characters, including one uppercase letter and one number." disabled={isSubmitting} />
          <PasswordField id="student-confirm-password" label="Confirm password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} error={errors.confirmPassword} disabled={isSubmitting} />
        </RegistrationSection>

        <Alert tone="info">Submitting creates a pending account. You must verify your email, and an Admin must approve the registration before you can log in.</Alert>
        <Button type="submit" isLoading={isSubmitting} className="min-h-13 w-full sm:ml-auto sm:w-auto sm:min-w-56">Create student account</Button>
      </form>
      <p className="mt-7 text-center text-sm text-ink-600">Already registered? <Link to="/login/student" className="font-bold text-brand-700 underline-offset-4 hover:underline">Student login</Link></p>
    </AuthShell>
  );
}
