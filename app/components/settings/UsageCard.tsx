import { useStore } from '@nanostores/react';
import { useConvex } from 'convex/react';
import { useEffect, useState } from 'react';
import { useSelectedTeamSlug } from '~/lib/stores/convexTeams';
import { convexTeamsStore } from '~/lib/stores/convexTeams';
import { VITE_PROVISION_HOST } from '~/components/chat/Chat';
import { getConvexAuthToken } from '~/lib/stores/sessionId';
import { getTokenUsage, renderTokenCount } from '~/lib/convexUsage';
import { TeamSelector } from '~/components/convex/TeamSelector';
import { Sheet } from '@ui/Sheet';
import { ProgressBar } from '@ui/ProgressBar';
import { Loading } from '@ui/Loading';

export function UsageCard() {
  const convex = useConvex();

  const teams = useStore(convexTeamsStore);
  useEffect(() => {
    if (teams && !selectedTeamSlug) {
      setSelectedTeamSlug(teams[0]?.slug);
    }
  }, [teams]);
  const [selectedTeamSlug, setSelectedTeamSlug] = useState(useSelectedTeamSlug() ?? teams?.[0]?.slug ?? null);

  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [tokenUsage, setTokenUsage] = useState<{ tokensUsed?: number; tokensQuota?: number }>({});
  useEffect(() => {
    async function fetchTokenUsage() {
      if (!selectedTeamSlug) {
        return;
      }
      setIsLoadingUsage(true);
      try {
        const token = getConvexAuthToken(convex);
        if (token) {
          const usage = await getTokenUsage(VITE_PROVISION_HOST, token, selectedTeamSlug);
          if (usage.status === 'success') {
            setTokenUsage(usage);
          } else {
            console.error('Failed to fetch token usage:', usage.httpStatus, usage.httpBody);
          }
        }
      } catch (error) {
        console.error('Failed to fetch token usage:', error);
      } finally {
        setIsLoadingUsage(false);
      }
    }
    void fetchTokenUsage();
  }, [selectedTeamSlug, convex]);

  return (
    <Sheet>
      <div className="mb-4 flex items-center justify-between">
        <h2>Chef Usage</h2>
        <div className="ml-auto">
          <TeamSelector selectedTeamSlug={selectedTeamSlug} setSelectedTeamSlug={setSelectedTeamSlug} />
        </div>
      </div>
      <p className="mb-1 text-sm text-content-secondary">Your Convex team comes with tokens included for Chef.</p>
      <p className="mb-1 text-sm text-content-secondary">
        On paid Convex subscriptions, additional usage will be subject to metered billing.
      </p>
      <p className="mb-4 text-sm text-content-secondary">
        On free plans, Chef will not be usable once you hit the limit for the current billing period.
      </p>
      <div className="space-y-4">
        <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <ProgressBar
            className="transition-all duration-300"
            fraction={tokenUsage.tokensQuota ? (tokenUsage.tokensUsed || 0) / tokenUsage.tokensQuota : 0}
            ariaLabel="Chef Usage"
            variant="solid"
          />
        </div>
        <p className="text-sm text-content-secondary">
          {isLoadingUsage ? (
            <Loading className="h-5 w-64" />
          ) : (
            <span>
              {`${renderTokenCount(tokenUsage.tokensUsed || 0)} / ${renderTokenCount(tokenUsage.tokensQuota || 0)} included tokens used this billing period.`}
            </span>
          )}
        </p>
      </div>
    </Sheet>
  );
}
