import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import { useQuery } from "convex/react";

/**
 * This component automatically logs in the user via anonymous auth if they are not already logged in.
 * This is useful for development, but feel free to remove it for production.
 */
export function AutoLoginWrapper({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const user = useQuery(api.auth.loggedInUser);
  const { signIn } = useAuthActions();
  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (user === null) {
      void signIn("anonymous");
    }
  }, [signIn, user, enabled]);
  if (!enabled) {
    return <>{children}</>;
  }
  if (user === null) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-2xl font-bold">Signing in...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  if (user === undefined) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-2xl font-bold">Loading...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  return <>{children}</>;
}
