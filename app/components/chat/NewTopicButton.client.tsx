import { Button } from '@ui/Button';
import React, { useCallback, useState } from 'react';
import { Spinner } from '@ui/Spinner';
import { BookOpenIcon } from '@heroicons/react/24/outline';

interface NewTopicButtonProps {
  disabled?: boolean;
}

export const NewTopicButton = React.memo(function EnhancePromptButton({ disabled }: NewTopicButtonProps) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const summarizeConversation = useCallback(async () => {
    setIsSummarizing(true);
    /**
     * - Make an LLM call (for free?) to summarize the conversation so far.
     * - Add a user message, but dont' actually send it? Or write some parts
     *   that are ready to be added as parts to the next user message.
     *
     * What's the data transformation we want to make here? How about the *only* thing that
     * happens is that we add a number somewhere.
     *
     * Then once the next chat message is submitted, that's the time to actually do the
     * and add additional parts onto the user message.
     *
     *
     */
    await new Promise((r) => setTimeout(r, 1000));
    setIsSummarizing(false);
  }, []);

  return (
    <Button
      variant="neutral"
      tip={'Summarize the conversation so far'}
      disabled={disabled}
      inline
      onClick={summarizeConversation}
    >
      <div className="text-lg">
        {!isSummarizing ? <BookOpenIcon className="size-4" /> : <Spinner className="size-4" />}
      </div>
    </Button>
  );
});
