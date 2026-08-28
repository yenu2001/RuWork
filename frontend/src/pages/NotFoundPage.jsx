import { Link } from "react-router-dom";
import Button from "../components/common/Button";
import Logo from "../components/common/Logo";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5 py-12">
      <div className="text-center">
        <Logo className="justify-center" />
        <p className="mt-10 text-sm font-extrabold tracking-[0.2em] text-brand-600">404</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-ink-950">Page not found</h1>
        <p className="mt-4 text-ink-600">The RuWork page you requested does not exist.</p>
        <Button as={Link} to="/" className="mt-7">Back to home</Button>
      </div>
    </main>
  );
}
