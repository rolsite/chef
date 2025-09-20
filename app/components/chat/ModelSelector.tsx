import { Combobox } from '@ui/Combobox';
import { MagicWandIcon, ReloadIcon } from '@radix-ui/react-icons';
import type { ModelSelection } from '~/utils/constants';
import React, { useMemo, useState } from 'react';
import { Tooltip } from '@ui/Tooltip';
import { HandThumbUpIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useQuery, useAction } from 'convex/react';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { captureMessage } from '@sentry/remix';
import { toast } from 'sonner';

export type ModelProvider = 'openrouter';

export function displayModelProviderName(provider: ModelProvider) {
  switch (provider) {
    case 'openrouter':
      return 'OpenRouter';
    default: {
      const exhaustiveCheck: never = provider;
      throw new Error(`Unknown model provider: ${exhaustiveCheck}`);
    }
  }
}

function svgIcon(url: string) {
  return <img className="size-4" height="16" width="16" src={url} alt="" />;
}

export interface ModelSelectorProps {
  modelSelection: ModelSelection;
  setModelSelection: (modelSelection: ModelSelection) => void;
  size?: 'sm' | 'md';
}

const providerToIcon: Record<string, React.ReactNode> = {
  openrouter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

// Default model if none selected
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

export const ModelSelector = React.memo(function ModelSelector({
  modelSelection,
  setModelSelection,
  size = 'md',
}: ModelSelectorProps) {
  const apiKey = useQuery(api.apiKeys.apiKeyForCurrentMember);
  const models = useQuery(api.openrouter.getCachedModels, { limit: 500 });
  const refreshModels = useAction(api.openrouter.manualRefreshModels);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize models if not cached
  React.useEffect(() => {
    if (models && models.length === 0) {
      // Trigger model initialization
      fetch('/api/initialize-models', { method: 'POST' }).catch(console.error);
    }
  }, [models]);

  // Handle manual refresh
  const handleRefresh = async () => {
    console.log('🔄 Starting manual model refresh...');
    setIsRefreshing(true);
    try {
      console.log('📡 Calling refresh action...');
      await refreshModels();
      console.log('✅ Models refreshed successfully');
      toast.success('Models refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh models:', error);
      toast.error('Failed to refresh models');
    } finally {
      setIsRefreshing(false);
      console.log('🔄 Refresh process completed');
    }
  };

  const filteredModels = useMemo(() => {
    if (!models) return [];
    
    console.log(`📊 Total models loaded: ${models.length}`);
    let filtered = models;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = models.filter(model => 
        model.name.toLowerCase().includes(searchLower) ||
        model.modelId.toLowerCase().includes(searchLower) ||
        (model.description && model.description.toLowerCase().includes(searchLower))
      );
    }
    
    return filtered;
  }, [models, searchTerm]);

  // Set default model if none selected and models are available
  React.useEffect(() => {
    if (!modelSelection && models && models.length > 0) {
      const defaultModel = models.find(m => m.modelId === DEFAULT_MODEL) || models[0];
      setModelSelection(defaultModel.modelId);
    }
  }, [modelSelection, models, setModelSelection]);

  const selectedModel = models?.find(m => m.modelId === modelSelection);
  const hasApiKey = !!apiKey?.openrouter;
  const prefersAlwaysUseApiKey = apiKey?.preference === 'always';
  const canUseModel = hasApiKey || !prefersAlwaysUseApiKey;

  if (!models) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
        Loading models...
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Combobox
        searchPlaceholder="Search models..."
        label="Select model"
        options={filteredModels.map((model) => ({
          label: `${model.name} - $${model.pricing.prompt}/1M tokens`,
          value: model.modelId,
        }))}
        buttonClasses="w-fit"
        size={size}
        selectedOption={modelSelection}
        setSelectedOption={(option) => {
          if (!option) {
            throw new Error('Model selection set to null');
          }
          setModelSelection(option);
        }}
      Option={({ value, inButton }) => {
        const model = models.find(m => m.modelId === value);
        if (!model) {
          return null;
        }

        return (
          <div className={'flex items-center gap-2'}>
            {providerToIcon.openrouter}
            <div className="flex-1 min-w-0">
              <div className="max-w-48 truncate font-medium">{model.name}</div>
              {!inButton && (
                <div className="text-xs text-gray-500 truncate">
                  ${model.pricing.prompt}/1M prompt • ${model.pricing.completion}/1M completion
                </div>
              )}
            </div>

            {!inButton && (
              <div className="ml-auto flex gap-1">
                {model.modelId === DEFAULT_MODEL && (
                  <Tooltip
                    tip="This model is recommended for most use cases."
                    side="right"
                  >
                    <HandThumbUpIcon className="size-4 text-content-secondary" />
                  </Tooltip>
                )}
                {!canUseModel && (
                  <Tooltip
                    tip="You must set an OpenRouter API key to use this model."
                    side="right"
                  >
                    <KeyIcon className="size-4 text-content-secondary" />
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        );
      }}
    />
    
    <Tooltip tip="Refresh available models">
      <button
        onClick={() => {
          console.log('🖱️ Refresh button clicked!');
          handleRefresh();
        }}
        disabled={isRefreshing}
        className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Refresh models"
      >
        <ReloadIcon 
          className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} 
        />
      </button>
    </Tooltip>
  </div>
  );
});

export const keyForProvider = (apiKeys: Doc<'convexMembers'>['apiKey']) => {
  return apiKeys?.openrouter;
};