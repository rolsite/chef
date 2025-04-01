import { useStore } from "@nanostores/react";
import type { ToolInvocation } from "ai";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import { computed } from "nanostores";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ActionState } from "~/lib/runtime/action-runner";
import { workbenchStore } from "~/lib/stores/workbench";
import { cubicEasingFn } from "~/utils/easings";
import { editorToolParameters } from "~/lib/runtime/editorTool";
import { bashToolParameters } from "~/lib/runtime/bashTool";
import { getIconColor } from "./Artifact";
import { actionVariants } from "./Artifact";
import { classNames } from "~/utils/classNames";

export const ToolCallBatch = memo((props: { messageId: string; toolCallIds: string }) => {
    const { messageId } = props;
    const toolCallIds = new Set(props.toolCallIds.split(','));

    const userToggledActions = useRef(false);
    const [showActions, setShowActions] = useState(false);
    const [allActionFinished, setAllActionFinished] = useState(false);

    const artifacts = useStore(workbenchStore.artifacts);
    const artifact = artifacts[messageId];

    const actions = useStore(
      computed(artifact.runner.actions, (actions) => {
        return Object.entries(actions)
          .filter(([actionId, action]) => toolCallIds.has(actionId))
          .map(([actionId, action]) => action);
      }),
    );

    const toggleActions = () => {
      userToggledActions.current = true;
      setShowActions(!showActions);
    };

    useEffect(() => {
      if (actions.length && !showActions && !userToggledActions.current) {
        setShowActions(true);
      }

      if (actions.length !== 0 && artifact.type === 'bundled') {
        const finished = !actions.find((action) => action.status !== 'complete');

        if (allActionFinished !== finished) {
          setAllActionFinished(finished);
        }
      }
    }, [actions]);

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
              <div className="w-full text-bolt-elements-textPrimary font-medium leading-5 text-sm">Tool use</div>
            </div>
          </button>
          <div className="bg-bolt-elements-artifacts-borderColor w-[1px]" />
          <AnimatePresence>
            {actions.length && artifact.type !== 'bundled' && (
              <motion.button
                initial={{ width: 0 }}
                animate={{ width: 'auto' }}
                exit={{ width: 0 }}
                transition={{ duration: 0.15, ease: cubicEasingFn }}
                className="bg-bolt-elements-artifacts-background hover:bg-bolt-elements-artifacts-backgroundHover"
                onClick={toggleActions}
              >
                <div className="p-4">
                  <div className={showActions ? 'i-ph:caret-up-bold' : 'i-ph:caret-down-bold'}></div>
                </div>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {artifact.type !== 'bundled' && showActions && actions.length > 0 && (
            <motion.div
              className="actions"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: '0px' }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-bolt-elements-artifacts-borderColor h-[1px]" />

              <div className="p-5 text-left bg-bolt-elements-actions-background">
                <ToolUseList actions={actions} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  });

  export const ToolUseList = memo(({ actions }: { actions: ActionState[] }) => {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
        <ul className="list-none space-y-2.5">
          {actions.map((action, index) => {
            return <ToolUseEntry action={action} key={index} />;
          })}
        </ul>
      </motion.div>
    );
  });

  export const ToolUseEntry = memo(({ action }: { action: ActionState }) => {
    const { status, type, content } = action;
    const icon = statusIcon(status);
    if (type !== 'toolUse') {
      console.error('ToolUseList: action is not a tool use', action);
      return null;
    }
    const parsed: ToolInvocation = useMemo(() => JSON.parse(content), [content]);

    let toolStatus: React.ReactNode;
    switch (parsed.toolName) {
      case "str_replace_editor": {
        switch (parsed.state) {
          case "partial-call": {
            toolStatus = `Starting file edit...`;
            break;
          }
          case "call": {
            const args = editorToolParameters.parse(parsed.args);
            toolStatus = `Editing ${args.path}...`;
            break;
          }
          case "result": {
            const args = editorToolParameters.parse(parsed.args);
            toolStatus = `File edit to ${args.path} complete.`;
            break;
          }
        }
        break;
      }
      case "bash": {
        switch (parsed.state) {
          case "partial-call": {
            toolStatus = `Starting command...`;
            break;
          }
          case "call": {
            const args = bashToolParameters.parse(parsed.args);
            toolStatus = `Running command ${args.command}...`;
            break;
          }
          case "result": {
            const args = bashToolParameters.parse(parsed.args);
            toolStatus = `Command ${args.command} complete.`;
            break;
          }
        }
        break;
      }
      default: {
        throw new Error(`Unknown tool name: ${parsed.toolName}`);
      }
    }
    return (
      <motion.li
        variants={actionVariants}
        initial="hidden"
        animate="visible"
        transition={{
          duration: 0.2,
          ease: cubicEasingFn,
        }}
      >
        <div className="flex items-center gap-1.5 text-sm">
          <div className={classNames('text-lg', getIconColor(action.status))}>{icon}</div>
          <div className="flex items-center w-full min-h-[28px]">
            <span className="flex-1">{toolStatus}</span>
          </div>
        </div>
      </motion.li>
    );
  });

  function statusIcon(status: ActionState['status']) {
    switch (status) {
      case 'running':
        return <div className="i-svg-spinners:90-ring-with-bg"></div>;
      case 'pending':
        return <div className="i-ph:circle-duotone"></div>;
      case 'complete':
        return <div className="i-ph:check"></div>;
      case 'failed':
      case 'aborted':
        return <div className="i-ph:x"></div>;
      default:
        return null;
    }
  }
