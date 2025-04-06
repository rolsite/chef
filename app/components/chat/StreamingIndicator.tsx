import { useStore } from '@nanostores/react';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import type { ActionState, ActionStatus } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';

interface StreamingIndicatorProps {
  streamStatus: 'streaming' | 'submitted' | 'ready' | 'error';
  numMessages: number;
  currentError?: Error;
}

export default function StreamingIndicator(props: StreamingIndicatorProps) {
  const toolStatus = useCurrentToolStatus();

  let streamStatus = props.streamStatus;
  if (Object.values(toolStatus).some((status) => status === 'running' || status === 'pending')) {
    streamStatus = 'streaming';
  }

  if (streamStatus === "ready" && props.numMessages === 0) {
    return null;
  }
  let icon;
  let message;
  switch (streamStatus) {
    case "submitted":
    case 'streaming':
      icon = <div className="i-svg-spinners:90-ring-with-bg"></div>;
      message = 'Cooking...';
      break;
    case 'error':
      icon = <div className="i-ph:warning text-yellow-500"></div>;
      message = 'The model hit an error. Try sending your message again?';
      break;
    case "ready":
      icon = <div className="i-ph:check"></div>;
      message = 'Response Generated';
      break;
  }
  return (
    <AnimatePresence>
      <div
        className={classNames(
          'bg-bolt-elements-background-depth-2',
          'border border-bolt-elements-borderColor',
          'rounded-lg relative w-full max-w-chat mx-auto z-prompt',
        )}
      >
        <div
          className={classNames(
            'bg-bolt-elements-item-backgroundAccent',
            'p-2 rounded-lg text-bolt-elements-item-contentAccent',
            'flex',
          )}
        >
          <div className="flex-1">
            <AnimatePresence>
              <motion.div
                className="actions"
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: '0px' }}
                transition={{ duration: 0.15 }}
              >
                <motion.div
                  className={classNames('flex text-sm gap-3')}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="flex items-center gap-1.5 ">
                    <div>
                      {icon}
                    </div>
                    {message}
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}

function useCurrentToolStatus() {
  const artifacts = useStore(workbenchStore.artifacts);
  const [toolStatus, setToolStatus] = useState<Record<string, ActionStatus>>({});
  useEffect(() => {
    const subs: (() => void)[] = [];
    const handleActionMap = (actionsMap: Record<string, ActionState>) => {
      for (const [id, action] of Object.entries(actionsMap)) {
        setToolStatus((prev) => {
          if (prev[id] !== action.status) {
            return { ...prev, [id]: action.status };
          }
          return prev;
        });
      }
    }
    for (const artifactState of Object.values(artifacts)) {
      subs.push(artifactState.runner.actions.subscribe(handleActionMap));
    }
    return () => {
      for (const sub of subs) {
        sub();
      }
    };
  }, [artifacts, toolStatus, setToolStatus]);
  return toolStatus;
}
