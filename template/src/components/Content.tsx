import { SignInForm } from "@/SignInForm";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

export function Content() {
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
            className="body dark:text-slate-300"
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
          className="card dark:bg-slate-800 dark:border-slate-700"
        >
          <SignInForm />
        </motion.div>
      </Unauthenticated>
    </motion.div>
  );
}
