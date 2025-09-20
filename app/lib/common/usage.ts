import type { LanguageModelUsage, Message, ProviderMetadata } from 'ai';
import { type ProviderType, type Usage, type UsageAnnotation, parseAnnotations } from '~/lib/common/annotations';
import { captureMessage } from '@sentry/remix';

export function usageFromGeneration(generation: {
  usage: LanguageModelUsage;
  providerMetadata?: ProviderMetadata;
}): Usage {
  const bedrockUsage = generation.providerMetadata?.bedrock?.usage as any;
  return {
    completionTokens: generation.usage.completionTokens,
    promptTokens: generation.usage.promptTokens,
    totalTokens: generation.usage.totalTokens,
    providerMetadata: generation.providerMetadata,
    anthropicCacheCreationInputTokens: Number(generation.providerMetadata?.anthropic?.cacheCreationInputTokens ?? 0),
    anthropicCacheReadInputTokens: Number(generation.providerMetadata?.anthropic?.cacheReadInputTokens ?? 0),
    openaiCachedPromptTokens: Number(generation.providerMetadata?.openai?.cachedPromptTokens ?? 0),
    xaiCachedPromptTokens: Number(generation.providerMetadata?.xai?.cachedPromptTokens ?? 0),
    googleCachedContentTokenCount: Number(generation.providerMetadata?.google?.cachedContentTokenCount ?? 0),
    googleThoughtsTokenCount: Number(generation.providerMetadata?.google?.thoughtsTokenCount ?? 0),
    bedrockCacheWriteInputTokens: Number(bedrockUsage?.cacheWriteInputTokens ?? 0),
    bedrockCacheReadInputTokens: Number(bedrockUsage?.cacheReadInputTokens ?? 0),
  };
}

export function initializeUsage(): Usage {
  return {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
    anthropicCacheCreationInputTokens: 0,
    anthropicCacheReadInputTokens: 0,
    openaiCachedPromptTokens: 0,
    xaiCachedPromptTokens: 0,
    googleCachedContentTokenCount: 0,
    googleThoughtsTokenCount: 0,
    bedrockCacheWriteInputTokens: 0,
    bedrockCacheReadInputTokens: 0,
  };
}

export function getFailedToolCalls(message: Message): Set<string> {
  const failedToolCalls: Set<string> = new Set();
  for (const part of message.parts ?? []) {
    if (part.type !== 'tool-invocation') {
      continue;
    }
    if (part.toolInvocation.state === 'result' && part.toolInvocation.result.startsWith('Error:')) {
      failedToolCalls.add(part.toolInvocation.toolCallId);
    }
  }
  return failedToolCalls;
}

export function calculateTotalUsage(args: {
  startUsage: Usage | null;
  usageAnnotationsForToolCalls: Record<string, UsageAnnotation | null>;
}): { totalRawUsage: Usage; totalUsageBilledFor: Usage } {
  const { startUsage, usageAnnotationsForToolCalls } = args;
  const totalRawUsage = startUsage ? JSON.parse(JSON.stringify(startUsage)) : initializeUsage();
  const totalUsageBilledFor = startUsage ? JSON.parse(JSON.stringify(startUsage)) : initializeUsage();
  for (const payload of Object.values(usageAnnotationsForToolCalls)) {
    if (!payload) {
      continue;
    }
    addUsage(totalRawUsage, payload);
    addUsage(totalUsageBilledFor, payload);
  }
  return {
    totalRawUsage,
    totalUsageBilledFor,
  };
}

export async function calculateTotalBilledUsageForMessage(
  lastMessage: Message | undefined,
  finalGeneration: { usage: LanguageModelUsage; providerMetadata?: ProviderMetadata },
): Promise<Usage> {
  const { usageForToolCall } = parseAnnotations(lastMessage?.annotations ?? []);
  // If there's an annotation for the final part, start with an empty usage, otherwise, create a
  // usage object from the passed in final generation.
  const startUsage = usageForToolCall.final ? initializeUsage() : usageFromGeneration(finalGeneration);
  const { totalUsageBilledFor } = calculateTotalUsage({
    startUsage,
    usageAnnotationsForToolCalls: usageForToolCall,
  });
  return totalUsageBilledFor;
}

function addUsage(totalUsage: Usage, payload: UsageAnnotation) {
  totalUsage.completionTokens += payload.completionTokens;
  totalUsage.promptTokens += payload.promptTokens;
  totalUsage.totalTokens += payload.totalTokens;
  totalUsage.anthropicCacheCreationInputTokens += payload.providerMetadata?.anthropic?.cacheCreationInputTokens ?? 0;
  totalUsage.anthropicCacheReadInputTokens += payload.providerMetadata?.anthropic?.cacheReadInputTokens ?? 0;
  totalUsage.openaiCachedPromptTokens += payload.providerMetadata?.openai?.cachedPromptTokens ?? 0;
  totalUsage.xaiCachedPromptTokens += payload.providerMetadata?.xai?.cachedPromptTokens ?? 0;
  totalUsage.googleCachedContentTokenCount += payload.providerMetadata?.google?.cachedContentTokenCount ?? 0;
  totalUsage.bedrockCacheWriteInputTokens += payload.providerMetadata?.bedrock?.usage?.cacheWriteInputTokens ?? 0;
  totalUsage.bedrockCacheReadInputTokens += payload.providerMetadata?.bedrock?.usage?.cacheReadInputTokens ?? 0;
}

export type ChefTokenBreakdown = {
  completionTokens: {
    anthropic: number;
    openai: number;
    xai: number;
    google: number;
    bedrock: number;
  };
  promptTokens: {
    anthropic: { uncached: number; cached: number };
    openai: { uncached: number; cached: number };
    xai: { uncached: number; cached: number };
    google: { uncached: number; cached: number };
    bedrock: { uncached: number; cached: number };
  };
};

// TODO this these wrong
// Based on how the final generation came from (which may not be the provided used for the other generations came from)
// https://www.notion.so/convex-dev/Chef-Pricing-1cfb57ff32ab80f5aa2ecf3420523e2f
export function calculateChefTokens(totalUsage: Usage, provider?: ProviderType) {
  let chefTokens = 0;
  const breakdown = {
    completionTokens: {
      anthropic: 0,
      openai: 0,
      xai: 0,
      google: 0,
      bedrock: 0,
    },
    promptTokens: {
      anthropic: {
        uncached: 0,
        cached: 0,
      },
      openai: {
        uncached: 0,
        cached: 0,
      },
      xai: {
        uncached: 0,
        cached: 0,
      },
      google: {
        uncached: 0,
        cached: 0,
      },
      bedrock: {
        uncached: 0,
        cached: 0,
      },
    },
  };
  if (provider === 'OpenRouter') {
    // OpenRouter pricing varies by model, using default rates
    const openrouterCompletionTokens = totalUsage.completionTokens * 100;
    chefTokens += openrouterCompletionTokens;
    breakdown.completionTokens.openai = openrouterCompletionTokens; // Reuse openai field
    const openrouterPromptTokens = totalUsage.promptTokens * 20;
    chefTokens += openrouterPromptTokens;
    breakdown.promptTokens.openai.uncached = openrouterPromptTokens; // Reuse openai field
  } else {
    captureMessage('WARNING: Unknown provider. Not recording usage. Giving away for free.', {
      level: 'error',
      tags: {
        provider,
      },
    });
  }

  return {
    chefTokens,
    breakdown,
  };
}
