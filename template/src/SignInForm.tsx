"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

interface SignInFormProps {
  signInHeader?: string;
  signInText?: string;
  signUpHeader?: string;
  signUpText?: string;
}

export function SignInForm({
  signInHeader = "Welcome Back",
  signInText = "Enter your credentials to continue",
  signUpHeader = "Create Account",
  signUpText = "Join us to get started",
}: SignInFormProps) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <div className="text-center space-y-2 mb-6">
        <h2 className="h2 dark:text-slate-200">
          {flow === "signIn" ? signInHeader : signUpHeader}
        </h2>
        <p className="caption dark:text-slate-400">
          {flow === "signIn" ? signInText : signUpText}
        </p>
      </div>
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
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
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
    </>
  );
}
