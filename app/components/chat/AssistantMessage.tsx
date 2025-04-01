import { memo } from 'react';
import { Markdown } from './Markdown';
import type { Message, ToolInvocation } from 'ai';
import { ToolCallBatch } from './ToolCall';

interface AssistantMessageProps {
  messageId: string;
  content: string;
  parts: Message['parts'];
}

export const AssistantMessage = memo(({ messageId, content, parts }: AssistantMessageProps) => {
  console.log('parts', parts);
  if (!parts || !parts.some((part) => part.type === 'tool-invocation')) {
    return (
      <div className="overflow-hidden w-full">
        <Markdown html>{content}</Markdown>
      </div>
    );
  }
  const children: React.ReactNode[] = [];
  let toolBatch: ToolInvocation[] = [];
  for (const part of parts) {
    if (part.type === 'tool-invocation') {
      toolBatch.push(part.toolInvocation);
      continue;
    }
    if (part.type !== 'text') {
      continue;
    }
    if (toolBatch.length > 0) {
      const toolCallIds = toolBatch.map((tool) => tool.toolCallId).join(',');
      children.push(<ToolCallBatch key={children.length} messageId={messageId} toolCallIds={toolCallIds} />);
      toolBatch = [];
    }
    children.push(<Markdown key={children.length} html>{part.text}</Markdown>);
  }
  if (toolBatch.length > 0) {
    const toolCallIds = toolBatch.map((tool) => tool.toolCallId).join(',');
    children.push(<ToolCallBatch key={children.length} messageId={messageId} toolCallIds={toolCallIds} />);
  }
  return (
    <div className="overflow-hidden w-full">
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
});

