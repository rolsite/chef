"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

interface SignInFormProps {
  onFlowChange: (flow: "signIn" | "signUp") => void;
}

export function SignInForm({ onFlowChange }: SignInFormProps) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  const handleFlowChange = (newFlow: "signIn" | "signUp") => {
    setFlow(newFlow);
    onFlowChange(newFlow);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.target as HTMLFormElement);
        formData.set("flow", flow);
        void signIn("password", formData).catch((_error) => {
          const toastTitle =
            flow === "signIn"
              ? "Could not sign in, did you mean to sign up?"
              : "Could not sign up, did you mean to sign in?";
          toast.error(toastTitle);
          setSubmitting(false);
        });
      }}
    >
      <div className="space-y-3">
        <input
          className="input"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="input"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
      </div>

      <button
        className="btn-primary w-full py-3"
        type="submit"
        disabled={submitting}
      >
        {submitting ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-[spin_0.8s_linear_infinite]"></div>
            <span>Processing...</span>
          </div>
        ) : flow === "signIn" ? (
          "Sign in"
        ) : (
          "Create account"
        )}
      </button>

      <div className="text-center caption">
        <span>
          {flow === "signIn"
            ? "Don't have an account? "
            : "Already have an account? "}
        </span>
        <button
          type="button"
          className="text-indigo-600 hover:text-indigo-700 font-medium focus:outline-none focus:underline"
          onClick={() =>
            handleFlowChange(flow === "signIn" ? "signUp" : "signIn")
          }
        >
          {flow === "signIn" ? "Sign up" : "Sign in"}
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white caption">or</span>
        </div>
      </div>

      <button
        className="btn-secondary w-full py-3"
        onClick={() => void signIn("anonymous")}
      >
        Continue as Guest
      </button>
    </form>
  );
}
