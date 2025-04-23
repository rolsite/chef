/* eslint-disable curly */
import { useEffect, useCallback, useState } from 'react';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import type { CoreMessage, FilePart, ToolCallPart, TextPart } from 'ai';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { useDebugPrompt } from '~/hooks/useDebugPrompt';

type DebugPromptViewProps = {
  chatInitialId: string;
  onClose: () => void;
};

type DebugPromptData = {
  url: string | null;
  finishReason: string;
  modelId: string;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  inputTokensUncached: number;
  outputTokens: number;
  prompt?: CoreMessage[];
};

type UserPromptGroup = {
  promptAndResponses: DebugPromptData[];
  summary: {
    triggeringUserMessage: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    modelId: string;
  };
};

type LlmPromptAndResponseProps = {
  data: DebugPromptData;
};

function isTextPart(part: unknown): part is TextPart {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'text';
}

function isFilePart(part: unknown): part is FilePart {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'file';
}

function isToolCallPart(part: unknown): part is ToolCallPart {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'tool-call';
}

function getMessageCharCount(message: CoreMessage): number {
  if (typeof message.content === 'string') return message.content.length;
  if (Array.isArray(message.content)) {
    return message.content.reduce((sum, part) => {
      if (isTextPart(part)) return sum + part.text.length;
      if (isFilePart(part) && typeof part.data === 'string') return sum + part.data.length;
      if (isToolCallPart(part)) {
        // Include tool name, id, and stringified args
        return sum + part.toolName.length + part.toolCallId.length + JSON.stringify(part.args).length;
      }
      // For tool results, include the result content too
      if (part.type === 'tool-result') {
        return sum + part.toolName.length + part.toolCallId.length + JSON.stringify(part.result).length;
      }
      return sum;
    }, 0);
  }
  return 0;
}

function estimateTokenCount(charCount: number, totalChars: number, totalTokens: number): number {
  if (totalChars === 0) return 0;
  return Math.round((charCount / totalChars) * totalTokens);
}

function findLastAssistantMessage(prompt: CoreMessage[]): string {
  // Look through messages in reverse order to find the last assistant message
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message.role === 'assistant') {
      const preview = getMessagePreview(message.content);
      // Get first line and add ellipsis if there are more lines
      const lines = preview.split('\n').filter((line) => line.trim().length);
      if (lines.length > 1) {
        return lines[0] + '...';
      }
      return preview;
    }
  }
  return 'No assistant message';
}

function LlmPromptAndResponse({ data }: LlmPromptAndResponseProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const totalInputTokens = data.cacheCreationInputTokens + data.cacheReadInputTokens + data.inputTokensUncached;

  // Calculate character counts and token estimates
  const inputMessages = data.prompt?.filter((m) => m.role === 'system' || m.role === 'user' || m.role === 'tool') ?? [];
  const outputMessages = data.prompt?.filter((m) => m.role === 'assistant') ?? [];

  const totalInputChars = inputMessages.reduce((sum, msg) => sum + getMessageCharCount(msg), 0);
  const totalOutputChars = outputMessages.reduce((sum, msg) => sum + getMessageCharCount(msg), 0);

  const getTokenEstimate = (message: CoreMessage) => {
    const charCount = getMessageCharCount(message);
    if (message.role === 'assistant') {
      return estimateTokenCount(charCount, totalOutputChars, data.outputTokens);
    } else {
      return estimateTokenCount(charCount, totalInputChars, totalInputTokens);
    }
  };

  const lastAssistantMessage = data.prompt ? findLastAssistantMessage(data.prompt) : 'Loading...';

  return (
    <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer rounded border p-4 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <div className="text-gray-500">
          {isExpanded ? <ChevronDownIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="font-medium text-gray-900 dark:text-gray-100">{lastAssistantMessage}</div>
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <div>
              {totalInputTokens}
              {data.cacheReadInputTokens ? ` (${totalInputTokens - data.cacheReadInputTokens} uncached)` : ''} input
            </div>
            <div>{data.outputTokens} output</div>
            <div>finish: {data.finishReason}</div>
            <div>model: {data.modelId}</div>
            {!!data.cacheCreationInputTokens && (
              <>
                <div>Created cached input tokens: {data.cacheCreationInputTokens}</div>
              </>
            )}
          </div>
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        {isExpanded && data.prompt && (
          <div className="mt-4 space-y-1">
            {data.prompt.map((message, idx) => (
              <CoreMessageView
                key={idx}
                message={message}
                getTokenEstimate={getTokenEstimate}
                totalInputTokens={totalInputTokens}
                totalOutputTokens={data.outputTokens}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type CoreMessageViewProps = {
  message: CoreMessage;
  getTokenEstimate: (message: CoreMessage) => number;
  totalInputTokens: number;
  totalOutputTokens: number;
};

function getMessagePreview(content: CoreMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (isTextPart(part)) {
          return part.text;
        }
        if (isFilePart(part) && typeof part.data === 'string') {
          return part.data;
        }
        return '';
      })
      .join(' ');
  }
  return '';
}

type MessageContentViewProps = {
  content: CoreMessage['content'];
  showRawJson?: boolean;
};

function MessageContentView({ content, showRawJson = false }: MessageContentViewProps) {
  const [isJsonVisible, setIsJsonVisible] = useState(false);

  if (typeof content === 'string') {
    return <div className="whitespace-pre-wrap text-sm">{content}</div>;
  }

  if (!Array.isArray(content)) {
    return <JsonView data={content} />;
  }

  return (
    <div className="space-y-2">
      <div className="cursor-default space-y-2">
        {content.map((part, idx) => {
          if (isTextPart(part)) {
            return (
              <div key={idx} className="rounded bg-white/50 p-2 dark:bg-black/5">
                <div className="text-xs font-medium text-gray-500">text</div>
                <div className="whitespace-pre-wrap text-sm">{part.text}</div>
              </div>
            );
          }

          if (isFilePart(part)) {
            const fileData = typeof part.data === 'string' ? part.data : '[Binary Data]';
            return (
              <div key={idx} className="rounded bg-purple-50 p-2 dark:bg-purple-900/10">
                <div className="text-xs font-medium text-purple-500">file: {part.filename || part.mimeType}</div>
                <div className="whitespace-pre-wrap font-mono text-sm">{fileData}</div>
              </div>
            );
          }

          if (isToolCallPart(part)) {
            return (
              <div key={idx} className="rounded bg-yellow-50 p-2 dark:bg-yellow-900/10">
                <div className="text-xs font-medium text-yellow-600">tool call: {part.toolName}</div>
                <div className="mt-1">
                  <JsonView data={part} />
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="rounded bg-gray-50 p-2 dark:bg-gray-900/10">
              <div className="text-xs font-medium text-gray-500">{part.type}</div>
              {typeof part === 'object' && part !== null && <JsonView data={part as object} />}
            </div>
          );
        })}
      </div>
      {showRawJson && (
        <>
          <button
            onClick={() => setIsJsonVisible(!isJsonVisible)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isJsonVisible ? 'Hide' : 'Show'} raw JSON
          </button>
          {isJsonVisible && (
            <div className="rounded border border-gray-200 p-2 dark:border-gray-700">
              <JsonView data={content} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CoreMessageView({ message, getTokenEstimate, totalInputTokens, totalOutputTokens }: CoreMessageViewProps) {
  const [isExpanded, setIsExpanded] = useState(message.role === 'user');

  const roleColors = {
    system: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    user: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
    assistant: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    tool: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  } as const;

  const roleColor = roleColors[message.role as keyof typeof roleColors] || roleColors.user;
  const preview = getMessagePreview(message.content);
  const tokenEstimate = getTokenEstimate(message);
  const totalTokens = message.role === 'assistant' ? totalOutputTokens : totalInputTokens;
  const percentage = totalTokens ? Math.round((tokenEstimate / totalTokens) * 100) : 0;

  return (
    <div className={`rounded border px-4 py-1 ${roleColor}`} onClick={() => setIsExpanded(!isExpanded)}>
      {!isExpanded ? (
        <div className="flex cursor-pointer items-center gap-2">
          <div className="text-gray-500">
            <ChevronRightIcon className="size-5" />
          </div>
          <div className="font-medium capitalize">{message.role}</div>
          <div className="text-xs text-gray-500" title="token estimate is approximate">
            {tokenEstimate} tokens ({percentage}%)
          </div>
          <div className="flex-1 truncate text-sm text-gray-600 dark:text-gray-300">{preview}</div>
        </div>
      ) : (
        <>
          <div className="flex cursor-pointer items-center gap-2">
            <div className="text-gray-500">
              <ChevronDownIcon className="size-5" />
            </div>
            <div className="font-medium capitalize">{message.role}</div>
            <div className="text-xs text-gray-500" title="Token estimate is approximate">
              {tokenEstimate} tokens ({percentage}%)
            </div>
          </div>
          <div>
            <div className="mt-2 cursor-default" onClick={(e) => e.stopPropagation()}>
              <MessageContentView content={message.content} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function findTriggeringUserMessage(promptAndResponses: DebugPromptData[]): string {
  // Look through all prompt and responses in reverse order
  for (let i = promptAndResponses.length - 1; i >= 0; i--) {
    const promptAndResponse = promptAndResponses[i];
    // Look through messages in reverse order to find the last user message
    if (promptAndResponse.prompt) {
      for (let j = promptAndResponse.prompt.length - 1; j >= 0; j--) {
        const message = promptAndResponse.prompt[j];
        if (message.role === 'user') {
          return getMessagePreview(message.content);
        }
      }
    }
  }
  return 'No user message found';
}

function groupIntoUserPrompts(data: DebugPromptData[]): UserPromptGroup[] {
  const groups: UserPromptGroup[] = [];
  let currentGroup: DebugPromptData[] = [];

  data.forEach((item, index) => {
    currentGroup.push(item);

    // If this item has a finish reason other than tool-call, or if it's the last item,
    // we end the current group and start a new one
    if (item.finishReason !== 'tool-calls' || index === data.length - 1) {
      if (currentGroup.length > 0) {
        const totalInputTokens = currentGroup.reduce(
          (sum, item) => sum + item.cacheCreationInputTokens + item.cacheReadInputTokens + item.inputTokensUncached,
          0,
        );
        const totalOutputTokens = currentGroup.reduce((sum, item) => sum + item.outputTokens, 0);

        groups.push({
          promptAndResponses: [...currentGroup],
          summary: {
            triggeringUserMessage: findTriggeringUserMessage(currentGroup),
            totalInputTokens,
            totalOutputTokens,
            modelId: currentGroup[0].modelId,
          },
        });
        currentGroup = [];
      }
    }
  });

  return groups;
}

function UserPrompt({ group }: { group: UserPromptGroup }) {
  return (
    <div className="space-y-2 rounded-lg border-2 border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-4 border-b border-gray-200 pb-2 dark:border-gray-700">
        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {group.summary.triggeringUserMessage}
        </div>
        <div className="mt-1 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div>Model: {group.summary.modelId}</div>
          <div>Input tokens: {group.summary.totalInputTokens}</div>
          <div>Output tokens: {group.summary.totalOutputTokens}</div>
        </div>
      </div>
      {group.promptAndResponses.map((promptAndResponse, index) => (
        <LlmPromptAndResponse key={index} data={promptAndResponse} />
      ))}
    </div>
  );
}

export default function DebugPromptView({ chatInitialId, onClose }: DebugPromptViewProps) {
  const { data, isPending, error } = useDebugPrompt(chatInitialId);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleEscape]);

  if (isPending) {
    return null;
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative max-h-[90vh] w-[90vw] overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <div className="text-center text-red-500">{error.toString()}</div>
        </div>
      </div>
    );
  }

  const userPromptGroups = groupIntoUserPrompts(data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-[90vw] overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Debug Prompt View</h2>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Chat ID: {chatInitialId}</div>
          </div>
          <a
            href={`/admin/prompt-debug?id=${encodeURIComponent(chatInitialId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Open in Debug Page
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
        <div className="space-y-4 overflow-auto">
          {userPromptGroups.map((group, index) => (
            <UserPrompt key={index} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
}
