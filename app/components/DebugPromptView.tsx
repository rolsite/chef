/* eslint-disable curly */
import { useEffect, useCallback, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import type { CoreMessage, FilePart, ToolCallPart, TextPart } from 'ai';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

type DebugPromptViewProps = {
  chatInitialId: string;
  onClose: () => void;
};

type LlmPromptAndResponseProps = {
  data: (typeof api.debugPrompt.show)['_returnType'][number];
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

function LlmPromptAndResponse({ data }: LlmPromptAndResponseProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const totalInputTokens = data.cacheCreationInputTokens + data.cacheReadInputTokens + data.inputTokensUncached;

  // Calculate character counts and token estimates
  const inputMessages = data.prompt.filter((m) => m.role === 'system' || m.role === 'user' || m.role === 'tool');
  const outputMessages = data.prompt.filter((m) => m.role === 'assistant');

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

  return (
    <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer rounded border p-4 dark:border-gray-700">
      <div className="mb-2 flex items-center gap-2">
        <div className="text-gray-500">
          {isExpanded ? <ChevronDownIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
        </div>
        <div className="flex flex-1 justify-between text-sm text-gray-500 dark:text-gray-400">
          <div>
            {totalInputTokens}
            {data.cacheReadInputTokens ? ` (${totalInputTokens - data.cacheReadInputTokens} uncached)` : ''} input
          </div>
          <div>{data.outputTokens} output</div>
          <div>finish: {data.finishReason}</div>
          <div>model: {data.modelId}</div>
          {!!(data.cacheCreationInputTokens || data.cacheReadInputTokens) && (
            <>
              <div>Created cached input tokens: {data.cacheCreationInputTokens}</div>
            </>
          )}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        {isExpanded && (
          <div className="mt-4 space-y-1">
            {data.prompt.map((message, idx) => (
              <CoreMessageView key={idx} message={message} getTokenEstimate={getTokenEstimate} />
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

function CoreMessageView({ message, getTokenEstimate }: CoreMessageViewProps) {
  const [isExpanded, setIsExpanded] = useState(message.role !== 'system');

  const roleColors = {
    system: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    user: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
    assistant: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    tool: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  } as const;

  const roleColor = roleColors[message.role as keyof typeof roleColors] || roleColors.user;
  const preview = getMessagePreview(message.content);
  const tokenEstimate = getTokenEstimate(message);

  return (
    <div className={`rounded border px-4 py-1 ${roleColor}`} onClick={() => setIsExpanded(!isExpanded)}>
      {!isExpanded ? (
        <div className="flex cursor-pointer items-center gap-2">
          <div className="text-gray-500">
            <ChevronRightIcon className="size-5" />
          </div>
          <div className="font-medium capitalize">{message.role}</div>
          <div className="text-xs text-gray-500" title="token estimate is approximate">
            {tokenEstimate} tokens~
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
              {tokenEstimate} tokens~
            </div>
          </div>
          <div>
            <div className="mt-2 cursor-default" onClick={(e) => e.stopPropagation()}>
              <MessageContentView content={message.content} showRawJson />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function DebugPromptView({ chatInitialId, onClose }: DebugPromptViewProps) {
  const debugData = useQuery(api.debugPrompt.show, { chatInitialId });

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

  if (!debugData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-[90vw] overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
        <h2 className="mb-4 text-xl font-semibold">Debug Prompt View</h2>
        <div className="space-y-4 overflow-auto">
          {debugData.map((promptAndResponse, index) => (
            <LlmPromptAndResponse key={index} data={promptAndResponse} />
          ))}
        </div>
      </div>
    </div>
  );
}
