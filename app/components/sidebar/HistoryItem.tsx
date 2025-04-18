import { useParams } from '@remix-run/react';
import { classNames } from '~/utils/classNames';
import { type ChatHistoryItem } from '~/types/ChatHistoryItem';
import { useEditChatDescription } from '~/lib/hooks/useEditChatDescription';
import { CheckIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { TextInput } from '@ui/TextInput';
import { useState } from 'react';
import { useConvexSessionId } from '~/lib/stores/sessionId';
interface HistoryItemProps {
  item: ChatHistoryItem;
  handleDeleteClick: (item: ChatHistoryItem) => void;
}

export function HistoryItem({ item, handleDeleteClick }: HistoryItemProps) {
  const { id: urlId } = useParams();
  const sessionId = useConvexSessionId();
  const isActiveChat = urlId === item.id;
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState<string | undefined>(item.description);

  const editDescription = useEditChatDescription();

  // Chats get a description from the first message, so have a fallback so
  // they render reasonably
  const description = newDescription ?? item.description ?? 'New chat…';

  const handleSaveDescription = (
    e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    editDescription({
      chatId: item.id,
      sessionId,
      description: newDescription ?? '',
    }).then((result) => {
      setEditingDescription(false);
      if (result !== null) {
        setNewDescription(result);
      }
    });
  };

  return (
    <div
      className={classNames(
        'group rounded text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-[var(--bolt-elements-sidebar-active-item-background)] overflow-hidden flex justify-between items-center px-3 py-2 transition-colors',
        { 'text-gray-900 dark:text-white bg-[var(--bolt-elements-sidebar-active-item-background)]': isActiveChat },
      )}
    >
      {editingDescription ? (
        <form onSubmit={handleSaveDescription} className="flex flex-1 items-center gap-2">
          <TextInput
            labelHidden
            id="description"
            className="-ml-1.5 -mt-1.5"
            autoFocus
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            onBlur={() => {
              setEditingDescription(false);
              setNewDescription(item.description ?? '');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveDescription(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
          />
          <Button
            type="submit"
            variant="neutral"
            icon={<CheckIcon />}
            size="xs"
            inline
            onClick={handleSaveDescription}
          />
        </form>
      ) : (
        <a href={`/chat/${item.urlId ?? item.initialId}`} className="relative flex w-full truncate">
          <span className="truncate pr-24">{description}</span>
          <div
            className={classNames(
              {
                'bg-[var(--bolt-elements-sidebar-active-item-background)]': isActiveChat,
                'bg-[var(--bolt-elements-sidebar-background)]': !isActiveChat,
              },
              'absolute right-0 top-0 bottom-0 flex items-center group-hover:bg-[var(--bolt-elements-sidebar-active-item-background)] px-2 transition-colors',
            )}
          >
            <div className="flex items-center gap-2.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-gray-500">
              <ChatActionButton
                toolTipContent="Rename"
                icon={<Pencil1Icon />}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setEditingDescription(true);
                }}
              />
              <ChatActionButton
                toolTipContent="Delete"
                icon={<TrashIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleDeleteClick(item);
                }}
              />
            </div>
          </div>
        </a>
      )}
    </div>
  );
}

const ChatActionButton = ({
  toolTipContent,
  icon,
  className,
  onClick,
}: {
  toolTipContent: string;
  icon: React.ReactNode;
  className?: string;
  onClick: (e: React.MouseEvent) => void;
}) => {
  return (
    <Button
      variant="neutral"
      icon={icon}
      inline
      size="xs"
      tip={toolTipContent}
      className={className}
      onClick={onClick}
    />
  );
};
