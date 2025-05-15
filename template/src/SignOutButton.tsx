"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import "./styles/buttons.css";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button className="btn btn-ghost btn-md" onClick={() => void signOut()}>
      Sign out
    </button>
  );
}
