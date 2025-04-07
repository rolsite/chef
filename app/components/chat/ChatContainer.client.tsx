import type { Message } from 'ai';
import { useRef, useState } from 'react';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { useMessageParser } from '~/lib/hooks/useMessageParser';
import { useSnapScroll } from '~/lib/hooks/useSnapScroll';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { useStore } from '@nanostores/react';
import { BaseChat } from './BaseChat';
import { streamingState } from '~/lib/stores/streaming';
import { useCurrentToolStatus } from '~/lib/hooks/useCurrentToolStatus';

interface ChatContainerProps {
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  description?: string;
  initialMessages: Message[];
  initializeChat: (teamSlug: string) => Promise<void>;
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

export function ChatContainer({
  description,
  initialMessages,
  initializeChat,
  projectInfo,
  storeMessageHistory,
}: ChatContainerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const actionAlert = useStore(workbenchStore.alert);
  const { showChat } = useStore(chatStore);
  const [animationScope] = useAnimate();

  const {
    messages,
    status,
    input,
    handleInputChange,
    setInput,
    stop,
    append,
    error,
    data: chatData,
  } = useChat({
    initialMessages,
    api: '/api/chat',
  });

  const { parsedMessages } = useMessageParser();
  const [messageRef, scrollRef] = useSnapScroll();

  const abort = () => {
    stop();
    chatStore.setKey('aborted', true);
    workbenchStore.abortAllActions();
  };

  const sendMessage = async (_event: React.UIEvent, teamSlug: string, messageInput?: string) => {
    const messageContent = messageInput || input;
    if (!messageContent?.trim()) {
      return;
    }

    if (status === 'streaming' || status === 'submitted') {
      abort();
      return;
    }

    await initializeChat(teamSlug);
    setChatStarted(true);

    append({
      role: 'user',
      content: messageContent,
      parts: [
        {
          type: 'text',
          text: messageContent,
        },
        ...imageDataList.map((imageData) => ({
          type: 'file' as const,
          mimeType: 'image/png',
          data: imageData,
        })),
      ],
    });

    setInput('');
    setUploadedFiles([]);
    setImageDataList([]);
    textareaRef.current?.blur();
  };

  const toolStatus = useCurrentToolStatus();

  return (
    <BaseChat
      ref={animationScope}
      textareaRef={textareaRef}
      input={input}
      showChat={showChat}
      chatStarted={chatStarted}
      streamStatus={status}
      onStreamingChange={(streaming) => {
        streamingState.set(streaming);
      }}
      sendMessage={sendMessage}
      messageRef={messageRef}
      scrollRef={scrollRef}
      handleInputChange={handleInputChange}
      handleStop={abort}
      description={description}
      toolStatus={toolStatus}
      messages={messages.map((message, i) => {
        if (message.role === 'user') {
          return message;
        }
        return {
          ...message,
          content: parsedMessages[i]?.content || '',
          parts: parsedMessages[i]?.parts || [],
        };
      })}
      uploadedFiles={uploadedFiles}
      setUploadedFiles={setUploadedFiles}
      imageDataList={imageDataList}
      setImageDataList={setImageDataList}
      actionAlert={actionAlert}
      clearAlert={() => workbenchStore.clearAlert()}
      data={chatData}
      currentError={error}
      projectInfo={projectInfo}
    />
  );
}
