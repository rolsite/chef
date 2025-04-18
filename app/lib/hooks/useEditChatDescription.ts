import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useConvex } from 'convex/react';
import { useCallback } from 'react';
import { toast } from 'sonner';

export function useEditChatDescription(): (args: {
  chatId: string;
  sessionId: Id<'sessions'>;
  description: string;
}) => Promise<string | null> {
  const convex = useConvex();
  return useCallback(
    async ({ chatId, sessionId, description }: { chatId: string; sessionId: Id<'sessions'>; description: string }) => {
      if (!isValidDescription(description)) {
        return null;
      }

      const trimmedDescription = description.trim();
      try {
        await convex.mutation(api.messages.setDescription, { id: chatId, sessionId, description: trimmedDescription });
        toast.success('Chat description updated successfully');
        return trimmedDescription;
      } catch (error) {
        toast.error('Failed to update chat description: ' + (error as Error).message);
        return null;
      }
    },
    [convex],
  );
}

export function isValidDescription(desc: string): boolean {
  const trimmedDesc = desc.trim();

  const lengthValid = trimmedDesc.length > 0 && trimmedDesc.length <= 100;

  // Allow letters, numbers, spaces, and common punctuation but exclude characters that could cause issues
  const characterValid = /^[a-zA-Z0-9\s\-_.,!?()[\]{}'"]+$/.test(trimmedDesc);

  if (!lengthValid) {
    toast.error('Description must be between 1 and 100 characters.');
    return false;
  }

  if (!characterValid) {
    toast.error('Description can only contain letters, numbers, spaces, and basic punctuation.');
    return false;
  }

  return true;
}
