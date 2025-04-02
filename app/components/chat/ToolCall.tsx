import { useStore } from '@nanostores/react';
import type { ToolInvocation } from 'ai';
import { AnimatePresence } from 'framer-motion';
import { motion } from 'framer-motion';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionState } from '~/lib/runtime/action-runner';
import { workbenchStore } from '~/lib/stores/workbench';
import { cubicEasingFn } from '~/utils/easings';
import { editorToolParameters } from '~/lib/runtime/editorTool';
import { bashToolParameters } from '~/lib/runtime/bashTool';
import { actionVariants } from './Artifact';
import { classNames } from '~/utils/classNames';
import { path } from '~/utils/path';
import { WORK_DIR } from '~/utils/constants';

export const ToolCall = memo((props: { messageId: string; toolCallId: string }) => {
  const { messageId, toolCallId } = props;
  const userToggledActions = useRef(false);
  const [showAction, setShowAction] = useState(false);

  const artifacts = useStore(workbenchStore.artifacts);
  const artifact = artifacts[messageId];

  const actions = useStore(artifact.runner.actions);
  const pair = Object.entries(actions).find(([actionId]) => actionId === toolCallId);
  if (!pair) {
    throw new Error(`ToolCall: action ${toolCallId} not found`);
  }
  const action = pair[1];

  const toggleActions = () => {
    userToggledActions.current = true;
    setShowAction(!showAction);
  };

  useEffect(() => {
    if (!showAction && !userToggledActions.current) {
      setShowAction(true);
    }
  }, []);

  const parsed: ToolInvocation = useMemo(() => JSON.parse(action.content), [action.content]);
  const title = toolTitle(parsed, action.status);
  const icon = statusIcon(action.status);

  return (
    <div className="artifact border border-bolt-elements-borderColor flex flex-col overflow-hidden rounded-lg w-full transition-border duration-150">
      <div className="flex">
        <button
          className="flex items-stretch bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover w-full overflow-hidden"
          onClick={() => {
            const showWorkbench = workbenchStore.showWorkbench.get();
            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
        >
          <div className="px-5 p-3.5 w-full text-left">
            <div className="flex items-center gap-1.5">
              {icon}
              <div className="w-full text-bolt-elements-textPrimary font-medium leading-5 text-sm">{title}</div>
            </div>
          </div>
        </button>
        <div className="bg-bolt-elements-artifacts-borderColor w-[1px]" />
        <AnimatePresence>
          {artifact.type !== 'bundled' && (
            <motion.button
              initial={{ width: 0 }}
              animate={{ width: 'auto' }}
              exit={{ width: 0 }}
              transition={{ duration: 0.15, ease: cubicEasingFn }}
              className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover"
              onClick={toggleActions}
            >
              <div className="p-4">
                <div className={showAction ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'}></div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showAction && (
          <motion.div
            className="actions"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: '0px' }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-bolt-elements-artifacts-borderColor h-[1px]" />
            <div className="p-5 text-left bg-bolt-elements-actions-background">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <ul className="list-none space-y-2.5">
                  <ToolUseContents action={action} invocation={parsed} />
                </ul>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const ToolUseContents = memo(({ action, invocation }: { action: ActionState, invocation: ToolInvocation }) => {
  // TODO: Make this pretty!
  return action.content;
});

function statusIcon(status: ActionState['status']) {
  let inner: React.ReactNode;
  let color: string;
  switch (status) {
    case 'running':
      inner = <div className="i-svg-spinners:90-ring-with-bg" />;
      color = 'text-bolt-elements-loader-progress';
      break;
    case 'pending':
      inner = <div className="i-ph:circle-duotone" />;
      color = 'text-bolt-elements-textTertiary';
      break;
    case 'complete':
      inner = <div className="i-ph:check" />;
      color = 'text-bolt-elements-icon-success';
      break;
    case 'failed':
      inner = <div className="i-ph:x" />;
      color = 'text-bolt-elements-icon-error';
      break;
    case 'aborted':
      inner = <div className="i-ph:x" />;
      color = 'text-bolt-elements-textSecondary';
      break;
    default:
      return null;
  }
  return <div className={classNames('text-lg', color)}>{inner}</div>
}

function toolTitle(invocation: ToolInvocation, status: ActionState['status']) {
  switch (invocation.toolName) {
    case 'str_replace_editor': {
      if (invocation.state === 'partial-call') {
        return `Editing file...`;
      } else {
        const args = editorToolParameters.parse(invocation.args);
        const p = path.relative(WORK_DIR, args.path);
        switch (args.command) {
          case 'str_replace': {
            return `Edit ${p}`;
          }
          case 'insert': {
            return `Insert into ${p}`;
          }
          case 'create': {
            return `Create ${p}`;
          }
          case 'view': {
            return `View ${p}`;
          }
          case "undo_edit": {
            return `Undo edit to ${p}`;
          }
        }
      }
    }
    case 'bash': {
      const args = bashToolParameters.parse(invocation.args);
      return `Run ${args.command}`;
    }
    default: {
      return invocation.toolName;
    }
  }
}
