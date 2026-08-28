import { LoaderCircle } from "lucide-react";

export default function Spinner({ label = "Loading RuWork" }) {
  return (
    <div className="grid min-h-[45vh] place-items-center px-5" role="status">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <LoaderCircle className="size-7 animate-spin" aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-semibold text-ink-600">{label}</p>
      </div>
    </div>
  );
}
