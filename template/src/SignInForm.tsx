'use client';
import { useAuthActions } from '@convex-dev/auth/react';
import { useState } from 'react';
import { toast } from './hooks/use-toast';

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);

  const handleSignInOrSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.target as HTMLFormElement);
    try {
      formData.set('flow', 'signIn');
      await signIn('password', formData);
    } catch (_error) {
      try {
        formData.set('flow', 'signUp');
        await signIn('password', formData);
      } catch (_error) {
        const toastTitle = 'Could not sign in';
        toast({ title: toastTitle, variant: 'destructive' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void handleSignInOrSignUp(e);
        }}
      >
        <input className="input-field" type="text" name="username" placeholder="Username" required />
        <input className="input-field" type="password" name="password" placeholder="Password" required />
        <button className="auth-button" type="submit" disabled={submitting}>
          {'Sign in'}
        </button>
      </form>
      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow" />
        <span className="mx-4 text-slate-400 ">or</span>
        <hr className="my-4 grow" />
      </div>
      <button
        className="auth-button"
        onClick={() => {
          void signIn('anonymous');
        }}
      >
        Sign in anonymously
      </button>
    </div>
  );
}
