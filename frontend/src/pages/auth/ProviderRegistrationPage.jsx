import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Button from "../../components/common/Button";
import FormField from "../../components/common/FormField";
import PasswordField from "../../components/common/PasswordField";
import SelectField from "../../components/common/SelectField";
import TextareaField from "../../components/common/TextareaField";
import RegistrationSection from "../../components/auth/RegistrationSection";
import AuthShell from "../../components/layout/AuthShell";
import { authService } from "../../services/authService";
import { getApiError } from "../../utils/apiError";
import { getPasswordError, isBasicEmail, isValidOptionalUrl, normalizeEmail } from "../../utils/validation";

const initialForm = {
  companyName: "",
  companyEmail: "",
  phoneNumber: "",
  companyAddress: "",
  companySize: "",
  industry: "",
  companyWebsite: "",
  companyDescription: "",
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: ""
};

const companySizes = [
  { value: "", label: "Select company size" },
  ...["1-10 employees", "11-50 employees", "51-200 employees", "201-500 employees", "501+ employees"].map((size) => ({ value: size, label: size }))
];

export default function ProviderRegistrationPage() {
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
    ["companyName", "phoneNumber", "companyAddress", "companySize", "industry", "companyDescription", "firstName", "lastName"].forEach((field) => {
      if (!form[field].trim()) next[field] = "This field is required.";
    });
    if (!isBasicEmail(form.companyEmail)) next.companyEmail = "Enter a valid company email address.";
    if (!isValidOptionalUrl(form.companyWebsite)) next.companyWebsite = "Use a complete http:// or https:// website address.";
    if (form.companyDescription.length > 300) next.companyDescription = "Company description must not exceed 300 characters.";
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
    const companyEmail = normalizeEmail(form.companyEmail);
    const { confirmPassword: _confirmPassword, ...payload } = form;
    payload.companyEmail = companyEmail;
    try {
      const response = await authService.registerJobProvider(payload);
      navigate("/account/verify-email", { replace: true, state: { email: companyEmail, accountType: "jobProvider", message: response.message } });
    } catch (error) {
      const apiError = getApiError(error, "Job Provider registration failed. Please try again.");
      if (apiError.code === "VERIFICATION_EMAIL_NOT_SENT") {
        navigate("/account/verify-email", { replace: true, state: { email: companyEmail, accountType: "jobProvider", message: apiError.message, deliveryFailed: true } });
      } else {
        setRequestError(apiError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell eyebrow="Job Provider registration" title="Create your company profile" description="Tell RuWork about your company and primary contact. Company email verification and Admin approval are required before login access." wide>
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        {requestError && <Alert>{requestError}</Alert>}
        <RegistrationSection number="1" title="Company information">
          <FormField id="provider-company-name" label="Company name" autoComplete="organization" value={form.companyName} onChange={(event) => update("companyName", event.target.value)} error={errors.companyName} disabled={isSubmitting} />
          <FormField id="provider-company-email" label="Company email" type="email" autoComplete="email" placeholder="name@company.com" value={form.companyEmail} onChange={(event) => update("companyEmail", event.target.value)} error={errors.companyEmail} helper="Provider emails are not restricted to @ruh.ac.lk." disabled={isSubmitting} />
          <FormField id="provider-phone" label="Phone number" type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} error={errors.phoneNumber} disabled={isSubmitting} />
          <SelectField id="provider-company-size" label="Company size" options={companySizes} value={form.companySize} onChange={(event) => update("companySize", event.target.value)} error={errors.companySize} disabled={isSubmitting} />
          <FormField id="provider-industry" label="Industry" placeholder="e.g. Information Technology" value={form.industry} onChange={(event) => update("industry", event.target.value)} error={errors.industry} disabled={isSubmitting} />
          <FormField id="provider-website" label="Company website (optional)" type="url" autoComplete="url" placeholder="https://company.example" value={form.companyWebsite} onChange={(event) => update("companyWebsite", event.target.value)} error={errors.companyWebsite} disabled={isSubmitting} />
          <TextareaField id="provider-address" label="Company address" autoComplete="street-address" value={form.companyAddress} onChange={(event) => update("companyAddress", event.target.value)} error={errors.companyAddress} disabled={isSubmitting} className="sm:col-span-2" />
          <TextareaField id="provider-description" label="Company description" maxLength={300} value={form.companyDescription} onChange={(event) => update("companyDescription", event.target.value)} error={errors.companyDescription} helper={`${form.companyDescription.length}/300 characters`} disabled={isSubmitting} className="sm:col-span-2" />
        </RegistrationSection>

        <RegistrationSection number="2" title="Primary contact">
          <FormField id="provider-first-name" label="First name" autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} error={errors.firstName} disabled={isSubmitting} />
          <FormField id="provider-last-name" label="Last name" autoComplete="family-name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} error={errors.lastName} disabled={isSubmitting} />
        </RegistrationSection>

        <RegistrationSection number="3" title="Account security" description="The backend requires 8 characters, one uppercase letter, and one number.">
          <PasswordField id="provider-password" label="Password" autoComplete="new-password" value={form.password} onChange={(event) => update("password", event.target.value)} error={errors.password} helper="At least 8 characters, including one uppercase letter and one number." disabled={isSubmitting} />
          <PasswordField id="provider-confirm-password" label="Confirm password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} error={errors.confirmPassword} disabled={isSubmitting} />
        </RegistrationSection>

        <Alert tone="info">Submitting creates a pending account. Verify the company email, then wait for Admin approval before logging in.</Alert>
        <Button type="submit" isLoading={isSubmitting} className="min-h-13 w-full sm:ml-auto sm:w-auto sm:min-w-56">Create provider account</Button>
      </form>
      <p className="mt-7 text-center text-sm text-ink-600">Already registered? <Link to="/login/provider" className="font-bold text-brand-700 underline-offset-4 hover:underline">Job Provider login</Link></p>
    </AuthShell>
  );
}
