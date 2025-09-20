import { useConvex } from 'convex/react';
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from 'sonner';
import { EyeNoneIcon, EyeOpenIcon, PlusIcon, QuestionMarkCircledIcon, TrashIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { TextInput } from '@ui/TextInput';
import { Checkbox } from '@ui/Checkbox';
import { Tooltip } from '@ui/Tooltip';
import { captureException } from '@sentry/remix';
import { Spinner } from '@ui/Spinner';
import { useDebounce } from '@uidotdev/usehooks';

export function ApiKeyCard() {
  const convex = useConvex();

  const apiKey = useQuery(api.apiKeys.apiKeyForCurrentMember);

  const handleAlwaysUseKeyChange = async (value: boolean) => {
    try {
      await convex.mutation(api.apiKeys.setApiKeyForCurrentMember, {
        apiKey: {
          preference: value ? 'always' : 'quotaExhausted',
          openrouter: apiKey?.openrouter,
        },
      });
      toast.success('Preference updated.', { id: value ? 'always' : 'quotaExhausted' });
    } catch (error) {
      captureException(error);
      toast.error('Failed to update preference');
    }
  };

  const hasAnyKey = apiKey && apiKey.openrouter;

  const validateOpenrouterApiKey = async (apiKey: string) => {
    return await convex.action(api.apiKeys.validateOpenrouterApiKey, {
      apiKey,
    });
  };

  if (apiKey === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">API Keys</h3>
        </div>
        <div className="space-y-4">
          <div className="h-[78px] w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">API Keys</h3>
      </div>

      <div className="space-y-4">
        <ApiKeyItem
          label="OpenRouter"
          description={
            <span>
              Get your API key from{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline hover:text-blue-800"
              >
                OpenRouter
              </a>
              . This gives you access to all available models.
            </span>
          }
          isLoading={apiKey === undefined}
          keyType="openrouter"
          value={apiKey?.openrouter || ''}
          onValidate={validateOpenrouterApiKey}
        />
      </div>

      {hasAnyKey && (
        <div className="mt-6 space-y-4 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="always-use-key"
              checked={apiKey?.preference === 'always'}
              onChange={(e) => handleAlwaysUseKeyChange((e.target as HTMLInputElement).checked)}
            />
            <label htmlFor="always-use-key" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Always use my API key
            </label>
            <Tooltip tip="If enabled, your API key will always be used instead of our provided quota. If disabled, your API key will only be used when our quota is exhausted.">
              <QuestionMarkCircledIcon className="h-4 w-4 text-gray-400" />
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

type KeyType = 'openrouter';

function ApiKeyItem({
  label,
  description,
  isLoading,
  keyType,
  value,
  onValidate,
}: {
  label: string;
  description: React.ReactNode;
  isLoading: boolean;
  keyType: KeyType;
  value: string;
  onValidate: (key: string) => Promise<boolean>;
}) {
  const convex = useConvex();
  const [showKey, setShowKey] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debounce key input for validation (300ms delay)
  const debouncedKeyValue = useDebounce(newKeyValue, 300);

  // Validation function that runs when the debounced value changes
  useEffect(() => {
    const validateKey = async () => {
      // Skip validation for empty values
      if (!debouncedKeyValue.trim()) {
        setValidationError(null);
        return;
      }

      setValidationError(null);

      try {
        const isValidResult = await onValidate(debouncedKeyValue);

        if (!isValidResult) {
          setValidationError(
            `This API key appears to be invalid. Please check the instructions for generating an API key.`,
          );
        }
      } catch (error) {
        captureException(error);
        setValidationError(`Error validating API key.`);
      }
    };

    // Only run validation if there's actually something to validate
    if (debouncedKeyValue.trim()) {
      validateKey();
    }
  }, [debouncedKeyValue, convex, onValidate]);

  if (isLoading) {
    return <div className="h-[78px] w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  const hasKey = !!value;

  const handleRemoveKey = async () => {
    try {
      await convex.mutation(api.apiKeys.deleteOpenrouterApiKeyForCurrentMember);
      toast.success(`${label} API key removed`);
    } catch (error) {
      captureException(error);
      toast.error(`Failed to remove ${label} API key`);
    }
  };

  const handleSaveKey = async () => {
    if (validationError) return;

    try {
      setIsSaving(true);
      const apiKey = await convex.query(api.apiKeys.apiKeyForCurrentMember);

      await convex.mutation(api.apiKeys.setApiKeyForCurrentMember, {
        apiKey: {
          preference: apiKey?.preference || 'quotaExhausted',
          openrouter: newKeyValue.trim(),
        },
      });

      toast.success(`${label} API key saved`);
      setIsAdding(false);
      setNewKeyValue('');
    } catch (error) {
      captureException(error);
      toast.error(`Failed to save ${label} API key`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isAdding) {
    return (
      <div className="rounded-lg border p-4">
        <div className="mb-4">
          <h4 className="font-medium">{label}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <TextInput
              id={`${keyType}-api-key`}
              type={showKey ? 'text' : 'password'}
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder={`Enter your ${label} API key`}
              className={`w-full pr-20 ${validationError ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
            >
              {showKey ? <EyeNoneIcon className="h-4 w-4" /> : <EyeOpenIcon className="h-4 w-4" />}
            </button>
          </div>
          {validationError && <p className="text-sm text-red-600">{validationError}</p>}
          <div className="flex gap-2">
            <Button
              onClick={handleSaveKey}
              disabled={!newKeyValue.trim() || isSaving || !!validationError}
              size="sm"
            >
              {isSaving ? <Spinner className="h-4 w-4" /> : 'Save'}
            </Button>
            <Button
              variant="neutral"
              onClick={() => {
                setIsAdding(false);
                setNewKeyValue('');
                setValidationError(null);
              }}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium">{label}</h4>
          <p className="text-sm text-gray-600">{description}</p>
          {hasKey && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-green-600">✓ API key configured</span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {showKey ? <EyeNoneIcon className="h-4 w-4" /> : <EyeOpenIcon className="h-4 w-4" />}
              </button>
              {showKey && (
                <span className="font-mono text-xs text-gray-500">
                  {value.slice(0, 8)}...{value.slice(-4)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {hasKey ? (
            <Button variant="neutral" size="sm" onClick={handleRemoveKey}>
              <TrashIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="neutral" size="sm" onClick={() => setIsAdding(true)}>
              <PlusIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}