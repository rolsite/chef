import type { Message } from 'ai';
import { memo } from 'react';
import { Toaster } from 'sonner';
import { useStore } from '@nanostores/react';
import { description } from '~/lib/persistence';
import { useChatHistoryConvex } from '~/lib/persistence';
import { FlexAuthWrapper } from '~/components/chat/FlexAuthWrapper';
import { ChatContainer } from './ChatContainer.client';
import { useConvexSessionIdOrNullOrLoading } from '~/lib/stores/convex';
import { useChatIdOrNull } from '~/lib/stores/chat';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { renderLogger } from '~/utils/logger';

interface IChatMetadata {
  gitUrl: string;
  gitBranch?: string;
  netlifySiteId?: string;
}

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[], metadata?: IChatMetadata) => Promise<void>;
  initializeChat: (teamSlug: string) => Promise<void>;
  description?: string;
  projectInfo?:
    | {
        kind: 'connected';
        projectSlug: string;
        teamSlug: string;
        deploymentUrl: string;
        deploymentName: string;
        adminKey: string;
      }
    | {
        kind: 'connecting';
      }
    | null;
}

const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, initializeChat, projectInfo }: ChatProps) => {
    return (
      <ChatContainer
        description={description}
        initialMessages={initialMessages}
        storeMessageHistory={storeMessageHistory}
        initializeChat={initializeChat}
        projectInfo={projectInfo}
      />
    );
  },
);
ChatImpl.displayName = 'ChatImpl';

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, initializeChat } = useChatHistoryConvex();
  const title = useStore(description);

  const sessionId = useConvexSessionIdOrNullOrLoading();
  const chatId = useChatIdOrNull();
  const projectInfo = useQuery(
    api.convexProjects.loadConnectedConvexProjectCredentials,
    sessionId && chatId
      ? {
          sessionId,
          chatId,
        }
      : 'skip',
  );

  return (
    <>
      <FlexAuthWrapper>
        {ready && (
          <ChatImpl
            description={title}
            initialMessages={initialMessages}
            storeMessageHistory={storeMessageHistory}
            importChat={importChat}
            initializeChat={initializeChat}
            projectInfo={projectInfo}
          />
        )}
      </FlexAuthWrapper>
      <Toaster position="bottom-right" closeButton richColors />
    </>
  );
}
