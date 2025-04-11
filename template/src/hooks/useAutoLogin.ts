import { useAuthActions } from '@convex-dev/auth/react';
import { useEffect } from 'react';
import { api } from '../../convex/_generated/api';
import { useQuery } from 'convex/react';

/**
 * This component automatically logs in the user via anonymous auth if they are not already logged in.
 * This is useful for development, but feel free to remove it for production.
 */
export const useAutoLogin = (enabled: boolean = true) => {
  const user = useQuery(api.auth.loggedInUser);
  const { signIn } = useAuthActions();
  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (user === null) {
      void signIn('anonymous');
    }
  }, [signIn, user, enabled]);
};
