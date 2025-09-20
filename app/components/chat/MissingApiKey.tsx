import { useState } from 'react';
import { Button } from '@ui/Button';
import { TextInput } from '@ui/TextInput';
import { useConvex } from 'convex/react';
import { toast } from 'sonner';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { captureException } from '@sentry/remix';
import { type ModelProvider, displayModelProviderName } from './ModelSelector';

export interface MissingApiKeyProps {
  provider: ModelProvider;
  requireKey: boolean;
  resetDisableChatMessage: () => void;
}

export function MissingApiKey({ provider, requireKey, resetDisableChatMessage }: MissingApiKeyProps) {
  const [isAdding, setIsAdding] = useState(requireKey);
  const [isSaving, setIsSaving] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const convex = useConvex();

  const handleSaveKey = async () => {
    try {
      setIsSaving(true);

      // Get the current API key data
      const apiKey = await convex.query(api.apiKeys.apiKeyForCurrentMember);

      const apiKeyMutation: Doc<'convexMembers'>['apiKey'] = {
        preference: apiKey?.preference || ('quotaExhausted' as 'always' | 'quotaExhausted'),
        openrouter: newKeyValue.trim(),
      };

      await convex.mutation(api.apiKeys.setApiKeyForCurrentMember, {
        apiKey: apiKeyMutation,
      });

      toast.success(`${displayModelProviderName(provider)} API key saved`);
      setIsAdding(false);
      setNewKeyValue('');
      resetDisableChatMessage();
    } catch (error) {
      captureException(error as Error);
      toast.error(`Failed to save ${displayModelProviderName(provider)} API key`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdding) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 text-lg font-medium">
          {requireKey ? (
            <>
              You need an <span className="font-semibold">{displayModelProviderName(provider)}</span> API key to continue.
            </>
          ) : (
            <>
              You haven't added an <span className="font-semibold">{displayModelProviderName(provider)}</span> API key yet. You may choose to
              add one to ensure uninterrupted access to{' '}
              <span className="font-semibold">{displayModelProviderName(provider)}</span>.
            </>
          )}
        </div>
        <div className="mb-6 text-sm text-gray-600">
          Get your API key from{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            OpenRouter
          </a>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="mb-4"
        >
          Add {displayModelProviderName(provider)} API key
        </Button>
        {!requireKey && (
          <Button
            variant="neutral"
            onClick={resetDisableChatMessage}
            className="text-sm"
          >
            Continue without API key
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-6 text-center">
        <h3 className="mb-2 text-lg font-medium">
          Add {displayModelProviderName(provider)} API Key
        </h3>
        <p className="text-sm text-gray-600">
          Enter your OpenRouter API key to access all available models
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="relative">
          <TextInput
            id="api-key-input"
            type={showKey ? 'text' : 'password'}
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            placeholder={`Enter your ${displayModelProviderName(provider)} API key`}
            className="w-full pr-20"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSaveKey}
            disabled={!newKeyValue.trim() || isSaving}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : 'Save API Key'}
          </Button>
          <Button
            variant="neutral"
            onClick={() => {
              setIsAdding(false);
              setNewKeyValue('');
            }}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}