import { TextAlignLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { initialIdStore } from '~/lib/stores/chatId';
import { lazy, Suspense, useState } from 'react';
import { useStore } from '@nanostores/react';

// Import eagerly in dev to avoid a reload, lazily in prod for bundle size.
const DebugPromptView = import.meta.env.DEV
  ? (await import('../../components/DebugPromptView')).default
  : lazy(() => import('../../components/DebugPromptView'));

export function PromptDebugButton() {
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const [showDebugView, setShowDebugView] = useState(false);
  const chatInitialId = useStore(initialIdStore);

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setShowDebugView(true)} variant="neutral" size="xs">
        <TextAlignLeftIcon />
      </Button>
      {showDebugView && chatInitialId && (
        <Suspense fallback={<div>Loading debug view...</div>}>
          <DebugPromptView chatInitialId={chatInitialId} onClose={() => setShowDebugView(false)} />
        </Suspense>
      )}
    </>
  );
}
