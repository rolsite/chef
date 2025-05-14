import { Toaster } from "sonner";
import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Content } from "./components/Content";

export default function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDark(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header isDark={isDark} onToggleTheme={toggleDarkMode} />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm mx-auto">
          <Content />
        </div>
      </main>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: `rgb(var(--color-toast-background))`,
            color: `rgb(var(--color-toast-text))`,
            border: `1px solid rgb(var(--color-toast-border))`,
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            fontFamily: "var(--font-family)",
            borderRadius: "0.75rem",
          },
        }}
      />
    </div>
  );
}
