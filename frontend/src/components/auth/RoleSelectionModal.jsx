import { Building2, GraduationCap, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Modal from "../common/Modal";

const accountRoles = [
  {
    label: "Student / Job Seeker",
    description: "Find flexible work alongside your studies.",
    loginPath: "/login/student",
    registerPath: "/register/student",
    icon: GraduationCap
  },
  {
    label: "Job Provider",
    description: "Connect with skilled University of Ruhuna students.",
    loginPath: "/login/provider",
    registerPath: "/register/provider",
    icon: Building2
  }
];

const adminRole = {
  label: "Admin",
  description: "Secure access for RuWork administrators.",
  loginPath: "/admin/login",
  icon: ShieldCheck
};

export default function RoleSelectionModal({ mode, isOpen, onClose, onSwitchMode }) {
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const roles = isLogin ? [...accountRoles, adminRole] : accountRoles;

  function chooseRole(role) {
    navigate(isLogin ? role.loginPath : role.registerPath);
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLogin ? "Log in to RuWork" : "Create your RuWork account"}
      description={isLogin ? "Choose how you want to continue." : "Choose the account that fits you."}
    >
      <div className="grid gap-3">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <button
              type="button"
              key={role.label}
              data-role-option={role.label}
              onClick={() => chooseRole(role)}
              className="group flex min-h-20 items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-bold text-ink-950">{role.label}</span>
                <span className="mt-0.5 block text-sm leading-5 text-ink-600">{role.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-ink-600">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button type="button" onClick={onSwitchMode} className="font-bold text-brand-700 underline-offset-4 hover:underline">
          {isLogin ? "Create Account" : "Log in"}
        </button>
      </p>
    </Modal>
  );
}
