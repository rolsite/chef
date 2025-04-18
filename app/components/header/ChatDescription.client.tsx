import { useEditChatDescription } from '~/lib/hooks/useEditChatDescription';
import { CheckIcon, Pencil1Icon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { TextInput } from '@ui/TextInput';
import { useQuery } from 'convex/react';
import { useChatId } from '~/lib/stores/chatId';
import { api } from '@convex/_generated/api';
import { useConvexSessionId } from '~/lib/stores/sessionId';
import { useState } from 'react';

export function ChatDescription() {
  const chatId = useChatId();
  const sessionId = useConvexSessionId();
  const chatInfo = useQuery(api.messages.get, { id: chatId, sessionId });
  const [editing, setEditing] = useState(false);
  const editDescription = useEditChatDescription();
  const [newDescription, setNewDescription] = useState(chatInfo?.description ?? '');
  const isLoading = chatInfo === undefined || chatInfo === null || chatInfo.description === undefined;
  if (isLoading) {
    // Don't render this until the description is loaded
    return null;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    editDescription({
      chatId,
      sessionId,
      description: newDescription,
    }).then((result) => {
      setEditing(false);
      if (result !== null) {
        setNewDescription(result);
      }
    });
  };
  const description = editing ? newDescription : (chatInfo?.description ?? 'New chat…');

  return (
    <div className="flex items-center justify-center">
      {editing ? (
        <form onSubmit={handleSubmit} className="flex items-center justify-center">
          <TextInput
            labelHidden
            autoFocus
            className="mr-2"
            id="chat-description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            onBlur={() => {
              setEditing(false);
              setNewDescription(chatInfo?.description ?? '');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
          />
          <Button variant="neutral" type="submit" icon={<CheckIcon />} inline size="xs" tip="Save title" />
        </form>
      ) : (
        <>
          <span className="mr-1 max-w-64 truncate">{description}</span>
          <Button
            variant="neutral"
            onClick={() => {
              setEditing(true);
              setNewDescription(chatInfo?.description ?? '');
            }}
            icon={<Pencil1Icon />}
            inline
            size="xs"
            tip="Rename chat"
          />
        </>
      )}
    </div>
  );
}
