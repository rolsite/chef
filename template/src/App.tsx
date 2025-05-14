import { Toaster } from "sonner";
import { Header } from "./components/Header";
import { Content } from "./components/Content";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header />
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
