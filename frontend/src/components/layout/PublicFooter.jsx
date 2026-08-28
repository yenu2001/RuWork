import Logo from "../common/Logo";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="page-container flex flex-col gap-5 py-8 text-sm text-ink-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Logo />
          <p className="mt-3">Connecting University of Ruhuna talent with flexible opportunities.</p>
        </div>
        <p>© {new Date().getFullYear()} RuWork. University project.</p>
      </div>
    </footer>
  );
}
