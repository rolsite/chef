import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import WithTooltip from './ui/Tooltip';
import { useFileUpdateCounter } from '~/lib/stores/fileUpdateCounter';

/**
 * Has the snapshot been persisted to the database (i.e. changes won't get blown away on reload)?
 *
 * Not to be confused with save buttons in the Editor component
 */
export function SnapshotSaveStatusIndicator() {
  const saveState = useStore(workbenchStore.backupState);

  const fileCounter = useFileUpdateCounter();

  if (!saveState.started) {
    return null;
  }
  let state: string;
  if (saveState.savedUpdateCounter !== fileCounter) {
    if (saveState.numFailures > 0) {
      state = 'error';
    } else {
      state = 'saving';
    }
  } else {
    state = 'saved';
  }

  return (
    <div className="flex items-center gap-1.5">
      {state === 'saved' && (
        <WithTooltip tooltip="Chat history and code changes have been saved." position="left">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--cvx-content-success)' }}>
            <div className="i-ph:check-circle text-lg" />
          </div>
        </WithTooltip>
      )}
      {state === 'saving' && (
        <WithTooltip tooltip="Saving chat history and code changes..." position="left">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--cvx-content-warning)' }}>
            <div className="i-ph:spinner-gap animate-spin text-lg" />
          </div>
        </WithTooltip>
      )}
      {state === 'error' && (
        <WithTooltip
          tooltip="Failed to save chat history and code changes. Your changes may be lost if you close the page."
          position="left"
        >
          <div className="flex items-center gap-1.5" style={{ color: 'var(--cvx-content-error)' }}>
            <div className="i-ph:warning-circle text-lg" />
          </div>
        </WithTooltip>
      )}
    </div>
  );
}
