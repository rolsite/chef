"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
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
      className="form-container"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitting(true);
        const formData = new FormData(e.target as HTMLFormElement);
        formData.set("flow", flow);
        void signIn("password", formData).catch((error) => {
          let toastTitle = "";
          if (error.message.includes("Invalid password")) {
            toastTitle = "Invalid password. Please try again.";
          } else {
            toastTitle =
              flow === "signIn"
                ? "Could not sign in, did you mean to sign up?"
                : "Could not sign up, did you mean to sign in?";
          }
          toast.error(toastTitle);
          setSubmitting(false);
        });
      }}
    >
      <div className="form-input-group">
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
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Processing...</span>
          </div>
        ) : flow === "signIn" ? (
          "Sign in"
        ) : (
          "Create account"
        )}
      </button>

      <div className="form-switch-text">
        <span>
          {flow === "signIn"
            ? "Don't have an account? "
            : "Already have an account? "}
        </span>
        <button
          type="button"
          className="form-switch-button"
          onClick={() =>
            handleFlowChange(flow === "signIn" ? "signUp" : "signIn")
          }
        >
          {flow === "signIn" ? "Sign up" : "Sign in"}
        </button>
      </div>

      <div className="divider">
        <div className="divider-line">
          <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
        </div>
        <div className="divider-content">
          <span className="divider-text">or</span>
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
