import { WalletCards } from "lucide-react";

export default function PaymentInformationCard({ singular = false }) {
  return (
    <section className="rounded-3xl border border-brand-200 bg-brand-50 p-6" aria-label="Payment Information">
      <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-700"><WalletCards className="size-5" aria-hidden="true" /></span>
      <h2 className="mt-4 font-extrabold text-brand-900">Payment Information</h2>
      <p className="mt-2 text-sm leading-6 text-brand-800">Payment{singular ? "" : "s"} {singular ? "is" : "are"} arranged directly between the student and the job provider using the provider&apos;s preferred payment method. RuWork does not process, collect, or hold payments.</p>
    </section>
  );
}
