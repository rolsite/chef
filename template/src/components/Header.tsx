import { motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "@/SignOutButton";

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({ isDark, onToggleTheme }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 flex justify-between items-center border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
      >
        Chef
      </motion.h2>
      <div className="flex items-center gap-4">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        <SignOutButton />
      </div>
    </header>
  );
}
