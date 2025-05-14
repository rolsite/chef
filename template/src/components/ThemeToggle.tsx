import { SunIcon, MoonIcon } from "@radix-ui/react-icons";

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <SunIcon className="w-5 h-5 text-slate-200" />
      ) : (
        <MoonIcon className="w-5 h-5 text-slate-700" />
      )}
    </button>
  );
}
