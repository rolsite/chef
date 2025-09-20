import type { Doc } from '@convex/_generated/dataModel';
import { type ModelSelection } from '~/utils/constants';

export function hasApiKeySet(
  modelSelection: ModelSelection,
  apiKey?: Doc<'convexMembers'>['apiKey'] | null,
) {
  if (!apiKey) {
    return false;
  }
  return !!apiKey.openrouter?.trim();
}

export function hasAnyApiKeySet(apiKey?: Doc<'convexMembers'>['apiKey'] | null) {
  if (!apiKey) {
    return false;
  }
  return !!apiKey.openrouter?.trim();
}

// Check if OpenRouter API key is available either from user or environment
export function hasOpenRouterKeyAvailable(apiKey?: Doc<'convexMembers'>['apiKey'] | null): boolean {
  // First check if user has provided their own key
  if (apiKey?.openrouter?.trim()) {
    return true;
  }
  
  // Then check if environment variable is available (client-side check)
  // Note: This assumes the environment variable check will be done server-side
  // For client-side, we'll need to rely on the provider logic
  return false;
}

// Check if user specifically requires their own API key to be used
export function userRequiresOwnApiKey(apiKey?: Doc<'convexMembers'>['apiKey'] | null): boolean {
  return apiKey?.preference === 'always' && !hasApiKeySet('', apiKey);
}