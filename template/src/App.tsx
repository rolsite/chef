import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Chef
        </h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Cook with Chef
        </h1>
        <Authenticated>
          <p className="text-xl text-slate-600 font-medium">
            Welcome back,{" "}
            <span className="text-indigo-600">
              {loggedInUser?.email ?? "friend"}
            </span>
            !
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-slate-600 font-medium">
            Sign in to get started
          </p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
