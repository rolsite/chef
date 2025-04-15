import { useConvex } from 'convex/react';
import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { toast } from 'sonner';
import { EyeNoneIcon, EyeOpenIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@ui/Button';
import { Sheet } from '@ui/Sheet';
import { TextInput } from '@ui/TextInput';
import { Loading } from '@ui/Loading';

export function ApiKeyCard() {
  const convex = useConvex();
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [alwaysUseKey, setAlwaysUseKey] = useState(false);

  const apiKey = useQuery(api.apiKeys.apiKeyForCurrentMember);
  useEffect(() => {
    if (apiKey) {
      setAnthropicKey(apiKey.value || '');
      setOpenaiKey(apiKey.openai || '');
      setAlwaysUseKey(apiKey.preference === 'always');
      setIsDirty(false);
    }
  }, [apiKey]);

  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');

  const handleSaveApiKey = async () => {
    setIsSaving(true);
    try {
      await convex.mutation(api.apiKeys.setApiKeyForCurrentMember, {
        apiKey: {
          preference: alwaysUseKey ? 'always' : 'quotaExhausted',
          value: anthropicKey,
          openai: openaiKey,
        },
      });
      toast.success('API key saved successfully');
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOpenaiApiKey = async () => {
    try {
      await convex.mutation(api.apiKeys.deleteOpenaiApiKeyForCurrentMember);
      toast.success('OpenAI API key removed successfully');
      setOpenaiKey('');
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to remove OpenAI API key:', error);
      toast.error('Failed to remove OpenAI API key');
    }
  };

  const handleDeleteAnthropicApiKey = async () => {
    try {
      await convex.mutation(api.apiKeys.deleteAnthropicApiKeyForCurrentMember);
      toast.success('Anthropic API key removed successfully');
      setAnthropicKey('');
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to remove Anthropic API key:', error);
      toast.error('Failed to remove Anthropic API key');
    }
  };

  return (
    <Sheet>
      <h2 className="mb-2">API Keys</h2>

      <p className="mb-4 text-sm text-content-secondary">
        Chef uses different model providers to generate code. You can use your own API keys to cook with Chef.
      </p>
      <div className="space-y-4">
        <div>
          <div>
            <label htmlFor="anthropic-key" className="mb-1 block text-lg font-medium text-content-secondary">
              Anthropic API Key
            </label>
            <p className="mb-4 text-sm text-content-secondary">
              See instructions for generating an Anthropic API key{' '}
              <a
                href="https://docs.anthropic.com/en/api/getting-started#accessing-the-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                here
              </a>
              .
            </p>
            <ApiKeyInput
              isLoading={apiKey === undefined}
              id="anthropic-key"
              value={anthropicKey}
              onChange={(value) => {
                setAnthropicKey(value);
                setIsDirty(true);
              }}
              handleDelete={handleDeleteAnthropicApiKey}
            />

            <label htmlFor="openai-key" className="mb-1 mt-4 block text-lg font-medium text-content-secondary">
              OpenAI API Key
            </label>
            <p className="mb-4 text-sm text-content-secondary">
              See instructions for generating an OpenAI API key{' '}
              <a
                href="https://platform.openai.com/docs/api-reference/introduction"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                here
              </a>
              .
            </p>
            <ApiKeyInput
              isLoading={apiKey === undefined}
              id="openai-key"
              value={openaiKey}
              onChange={(value) => {
                setOpenaiKey(value);
                setIsDirty(true);
              }}
              handleDelete={handleDeleteOpenaiApiKey}
            />

            <AlwaysUseKeyCheckbox
              isLoading={apiKey === undefined}
              disabled={anthropicKey === '' && openaiKey === ''}
              value={alwaysUseKey}
              onChange={(value) => {
                setAlwaysUseKey(value);
                setIsDirty(true);
              }}
            />
            <div className="mt-4 flex items-center gap-2">
              <Button onClick={handleSaveApiKey} disabled={apiKey === undefined || isSaving || !isDirty}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function ApiKeyInput(props: {
  isLoading: boolean;
  id: string;
  value: string;
  onChange: (value: string) => void;
  handleDelete: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  if (props.isLoading) {
    return <Loading className="h-[34px] w-60" />;
  }
  return (
    <div className="flex items-center gap-4">
      <div className="w-[30rem] max-w-full">
        <TextInput
          labelHidden
          type={showKey ? 'text' : 'password'}
          action={() => {
            setShowKey(!showKey);
            return;
          }}
          Icon={showKey ? EyeNoneIcon : EyeOpenIcon}
          id={props.id}
          value={props.value}
          onChange={(e) => {
            props.onChange(e.target.value);
          }}
          placeholder="xxxxxx"
        />
      </div>
      {props.value && (
        <Button type="button" onClick={props.handleDelete} variant="danger">
          Remove key
        </Button>
      )}
    </div>
  );
}

function AlwaysUseKeyCheckbox(props: {
  isLoading: boolean;
  disabled: boolean;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  if (props.isLoading) {
    return <Loading className="mt-4 h-6 w-64" />;
  }
  return (
    <div className="mt-4 flex items-center gap-2">
      <input
        type="checkbox"
        id="always-use-key"
        checked={props.value}
        onChange={(e) => {
          props.onChange(e.target.checked);
        }}
        disabled={props.disabled}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label htmlFor="always-use-key" className="text-sm text-content-secondary">
        Always use my API keys
      </label>
      <Button
        variant="neutral"
        icon={<QuestionMarkCircledIcon />}
        inline
        size="xs"
        tip="When unchecked, your API key will only be used if you've run out of tokens built into your Convex plan"
      />
    </div>
  );
}
