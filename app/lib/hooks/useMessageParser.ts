import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { makePartId } from '../stores/Artifacts';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useMessageParser');

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data) => {
      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      // we only add shell actions when when the close tag got parsed because only then we have the content
      if (data.action.type === 'file') {
        workbenchStore.addAction(data);
      }
    },
    onActionClose: (data) => {
      if (data.action.type !== 'file') {
        workbenchStore.addAction(data);
      }
      workbenchStore.runAction(data);
    },
    onActionStream: (data) => {
      workbenchStore.runAction(data, true);
    },
  },
});

function processMessage(message: Message): Message {
  if (message.role === "user") {
    return message;
  }
  if (!message.parts) {
    throw new Error('Message has no parts');
  }
  console.log('message', message);
  const parsedParts = [];
  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i];
    const partId = makePartId(message.id, i);
    switch (part.type) {
      case 'text': {
        messageParser.reset();
        parsedParts.push({
          type: 'text' as const,
          text: messageParser.parse(partId, part.text),
        });
        break;
      }
      case 'tool-invocation': {
        const { toolInvocation } = part;
        workbenchStore.addArtifact({
          id: partId,
          partId,
          title: 'Editing files...',
        });
        const data = {
          artifactId: partId,
          partId,
          actionId: toolInvocation.toolCallId,
          action: {
            type: 'toolUse' as const,
            toolName: toolInvocation.toolName,
            content: JSON.stringify(toolInvocation),
          },
        };
        workbenchStore.addAction(data);
        if (toolInvocation.state === 'call' || toolInvocation.state === 'result') {
          workbenchStore.runAction(data);
        }
        parsedParts.push({
          type: 'tool-invocation' as const,
          toolInvocation,
        });
        break;
      }
      default: {
        parsedParts.push(part);
      }
    }
  }
  return {
    ...message,
    parts: parsedParts,
  }
}

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<Message[]>([]);

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let reset = false;

    if (import.meta.env.DEV && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    const processedMessages: Message[] = [];
    for (const message of messages) {
      processedMessages.push(processMessage(message));
    }
    setParsedMessages(processedMessages);
  }, []);

  return { parsedMessages, parseMessages };
}
