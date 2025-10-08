import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { captureException } from '@sentry/remix';
import { logger } from 'chef-agent/utils/logger';
import type { ProviderType } from '~/lib/common/annotations';
import { getEnv } from '~/lib/.server/env';
// workaround for Vercel environment from
// https://github.com/vercel/ai/issues/199#issuecomment-1605245593
import { fetch } from '~/lib/.server/fetch';
import { getOpenRouterProvider } from './openrouter-wrapper';

export type ModelProvider = 'OpenRouter';

type Provider = {
  maxTokens: number;
  model: LanguageModelV1;
};

export function getProvider(
  userApiKey: string | undefined,
  modelId: string, // OpenRouter model ID
  userId?: string, // User ID for tracking
): Provider {
  // Usar wrapper customizado quando houver userId
  if (userId) {
    return getOpenRouterProvider(userApiKey, modelId, userId);
  }

  // Provider OpenRouter simplificado
  const openrouter = createOpenAI({
    apiKey: userApiKey || getEnv('OPENROUTER_API_KEY'),
    baseURL: 'https://openrouter.ai/api/v1',
    fetch: fetch, // Fetch direto sem wrapper complexo
  });

  return {
    model: openrouter(modelId),
    maxTokens: 64000, // Default, could be dynamic based on model metadata
  };
}

