import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { makePartId, workbenchStore } from '~/lib/stores/workbench';
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

function processMessage(message: Message): Record<number, string> {
  if (!message.parts) {
    console.error('message has no parts', message);
    return { 0: message.content };
  }
  const result: Record<number, string> = {};
  const artifactId = `toolArtifact-${message.id}`;
  let createdArtifact = false;
  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i];
    switch (part.type) {
      case 'text': {
        result[i] = part.text;
        break;
      }
      case 'tool-invocation': {
        const { toolInvocation } = part;
        if (!createdArtifact) {
          workbenchStore.addArtifact({
            id: artifactId,
            partId: makePartId(message.id, i),
            title: 'Agentic Coding',
          });
          createdArtifact = true;
        }
        const data = {
          artifactId,
          partId: makePartId(message.id, i),
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
        break;
      }
      case 'step-start': {
        continue;
      }
      default: {
        logger.warn('unknown part type', JSON.stringify(part));
        break;
      }
    }
  }
  return result;
}

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: { content: string; parts: Message['parts'] } }>(
    {},
  );

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let reset = false;

    if (import.meta.env.DEV && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    for (const [index, message] of messages.entries()) {
      if (message.role === 'assistant' || message.role === 'user') {
        const parts = message.parts;
        if (!parts) {
          const parsedContent = messageParser.parse(makePartId(message.id, 0), message.content);
          setParsedMessages((prevParsed) => {
            const newContent = reset ? parsedContent : (prevParsed[index]?.content || '') + parsedContent;
            return { ...prevParsed, [index]: { content: newContent, parts: message.parts } };
          });
          continue;
        }
        const content = processMessage(message);
        const parsedParts = Object.entries(content).map(([partIndex, partContent]) => {
          return {
            partContent: messageParser.parse(makePartId(message.id, parseInt(partIndex)), partContent),
            partIndex: parseInt(partIndex),
          };
        });
        const orderedParts = parsedParts.sort((a, b) => a.partIndex - b.partIndex);
        const newParsedContent = orderedParts.map((part) => part.partContent).join('\n');
        setParsedMessages((prevParsed) => {
          const newContent = reset ? newParsedContent : (prevParsed[index]?.content || '') + newParsedContent;
          const newParts = parts.map((part, index) => {
            const parsedPart = orderedParts.find((p) => p.partIndex === index);
            if (parsedPart) {
              return { type: 'text' as const, text: parsedPart.partContent };
            }
            return part;
          });
          return { ...prevParsed, [index]: { content: newContent, parts: newParts } };
        });
      }
    }
  }, []);

  return { parsedMessages, parseMessages };
}
