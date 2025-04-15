import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { useAuth0 } from '@auth0/auth0-react';
import { ExitIcon, ExternalLinkIcon, PersonIcon } from '@radix-ui/react-icons';
import { Sheet } from '@ui/Sheet';
import { Button } from '@ui/Button';

export function ProfileCard() {
  const profile = useStore(profileStore);
  const { logout } = useAuth0();
  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };
  return (
    <Sheet>
      <h2 className="mb-4">Profile</h2>
      <div className="flex items-center gap-4">
        <div className="size-20 min-w-20 overflow-hidden rounded-full">
          {profile?.avatar ? (
            <img src={profile.avatar} alt={profile?.username || 'User'} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center">
              <PersonIcon className="size-8" />
            </div>
          )}
        </div>
        <div>
          <h3>{profile?.username || 'User'}</h3>
          {profile?.email && <p className="text-sm text-content-secondary">{profile.email}</p>}
          <div className="mt-2 flex flex-col gap-2">
            <a
              href="https://dashboard.convex.dev/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-content-link hover:underline"
            >
              <ExternalLinkIcon />
              Manage your profile on the Convex Dashboard
            </a>
            <Button
              onClick={handleLogout}
              variant="unstyled"
              className="flex items-center gap-1 text-sm text-content-link hover:underline"
            >
              <ExitIcon />
              Log out
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
