import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { motion } from "framer-motion";
import { useState } from "react";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-3 sm:p-4 flex justify-between items-center border-b border-slate-200/50 shadow-sm">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
        >
          Chef
        </motion.h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm mx-auto">
          <Content />
        </div>
      </main>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "white",
            color: "#1e293b",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontFamily: "var(--font-family)",
            borderRadius: "0.75rem",
          },
        }}
      />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-[spin_0.8s_linear_infinite]"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="section"
    >
      <div className="text-center space-y-4">
        <motion.h1
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
          className="h1 mb-4"
        >
          Cook with Chef
        </motion.h1>
        <Authenticated>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="body"
          >
            Welcome back, {loggedInUser?.email ?? "friend"}! 👋
          </motion.p>
        </Authenticated>
      </div>

      <Unauthenticated>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="text-center space-y-2 mb-6">
            <h2 className="h2">
              {flow === "signIn" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="caption">
              {flow === "signIn"
                ? "Enter your credentials to continue"
                : "Join us to get started"}
            </p>
          </div>
          <SignInForm onFlowChange={setFlow} />
        </motion.div>
      </Unauthenticated>
    </motion.div>
  );
}
