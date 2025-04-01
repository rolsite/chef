import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useMessageParser');

const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.debug('onArtifactOpen', data);
      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data) => {
      logger.debug('onArtifactClose', data);
      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      logger.debug('onActionOpen', data.action);
      // we only add shell actions when when the close tag got parsed because only then we have the content
      if (data.action.type === 'file') {
        workbenchStore.addAction(data);
      }
    },
    onActionClose: (data) => {
      logger.debug('onActionClose', data.action);
      if (data.action.type !== 'file') {
        workbenchStore.addAction(data);
      }
      workbenchStore.runAction(data);
    },
    onActionStream: (data) => {
      logger.debug('onActionStream', data.action);
      workbenchStore.runAction(data, true);
    },
  },
});

type OpenArtifact = {
  artifactId: string,
}

function toBoltMarkdown(message: Message) {
  if (!message.parts) {
    return message.content;
  }
  const result = [];

  let nextArtifactId = 0;
  let openArtifact: null | OpenArtifact = null;

  const startArtifact = () => {
    openArtifact = {
      artifactId: `toolArtifact-${message.id}-${nextArtifactId++}`,
    };
    result.push(`<boltArtifact id="${openArtifact.artifactId}" title="Agentic Coding">`);
  }
  const endArtifact = () => {
    result.push(`</boltArtifact>`);
    openArtifact = null;
  }

  for (const part of message.parts) {
    switch (part.type) {
      case 'text': {
        if (openArtifact) {
          endArtifact();
        }
        result.push(part.text);
        break;
      }
      case 'tool-invocation': {
        const { toolInvocation } = part;
        if (toolInvocation.state === "partial-call") {
          continue;
        }
        if (!openArtifact) {
          startArtifact();
        }
        result.push(`<boltAction type="toolUse" toolName="${toolInvocation.toolName}">${JSON.stringify(toolInvocation)}</boltAction>`);
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

  if (openArtifact) {
    endArtifact();
  }

  return result.join('\n');
}

export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<string[]>([]);

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let reset = false;

    if (import.meta.env.DEV && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    for (const [index, message] of messages.entries()) {
      if (message.role === 'assistant' || message.role === 'user') {
        const newParsedContent = messageParser.parse(message.id, toBoltMarkdown(message));
        setParsedMessages((prevParsed) => {
          const newParsed = [...prevParsed];
          if (reset) {
            newParsed[index] = newParsedContent;
          } else {
            newParsed[index] = (prevParsed[index] || '') + newParsedContent;
          }
          return newParsed;
        })
      }
    }
  }, []);

  return { parsedMessages, parseMessages };
}
