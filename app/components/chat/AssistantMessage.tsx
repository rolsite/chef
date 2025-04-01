import { memo } from 'react';
import { Markdown } from './Markdown';
import type { Message, UIMessage } from 'ai';
import { Artifact } from './Artifact';

interface AssistantMessageProps {
  messageId: string;
  content: string;
  parts: Message["parts"];
}

export const AssistantMessage = memo(({ messageId, content, parts }: AssistantMessageProps) => {
  console.log('parts', parts);
  if (parts && parts.some(part => part.type === 'tool-invocation')) {
    const text = parts.filter(part => part.type === 'text').map(part => part.text).join('\n');
    return (
      <div className="overflow-hidden w-full">
        <div className="flex flex-col gap-2">
          <Markdown html>{text}</Markdown>
          <Artifact messageId={messageId} />
        </div>
      </div>
    );
  } else {
    return (
      <div className="overflow-hidden w-full">
        <Markdown html>{content}</Markdown>
      </div>
    );
  }
});