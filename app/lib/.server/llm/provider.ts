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

  // Fallback para provider padrão sem user tracking
  const openrouter = createOpenAI({
    apiKey: userApiKey || getEnv('OPENROUTER_API_KEY'),
    baseURL: 'https://openrouter.ai/api/v1',
    fetch: userApiKey ? userKeyApiFetch() : fetch,
  });

  return {
    model: openrouter(modelId),
    maxTokens: 8192, // Default, could be dynamic based on model metadata
  };
}

const userKeyApiFetch = () => {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const result = await fetch(input, init);

    if (result.status === 401) {
      const text = await result.text();
      console.error('[Provider Fetch] 401 Unauthorized:', text);
      throw new Error(JSON.stringify({ error: 'Invalid OpenRouter API key', details: text }));
    }
    if (result.status === 413) {
      const text = await result.text();
      console.error('[Provider Fetch] 413 Payload Too Large:', text);
      throw new Error(
        JSON.stringify({
          error: 'Request exceeds the maximum allowed number of bytes.',
          details: text,
        }),
      );
    }
    if (result.status === 429) {
      const text = await result.text();
      console.error('[Provider Fetch] 429 Rate Limited:', text);
      throw new Error(
        JSON.stringify({
          error: 'OpenRouter is rate limiting your requests',
          details: text,
        }),
      );
    }
    if (result.status === 529) {
      const text = await result.text();
      console.error('[Provider Fetch] 529 Overloaded:', text);
      throw new Error(
        JSON.stringify({
          error: 'OpenRouter API is temporarily overloaded',
          details: text,
        }),
      );
    }
    if (!result.ok) {
      const text = await result.text();
      console.error('[Provider Fetch] Other error:', result.status, result.statusText, text);
      throw new Error(
        JSON.stringify({
          error: `OpenRouter returned an error (${result.status} ${result.statusText}) when using your provided API key: ${text}`,
          details: text,
        }),
      );
    }

    return result;
  };
};