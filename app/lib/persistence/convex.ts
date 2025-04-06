import type { AppLoadContext } from '@remix-run/node';

export function getConvexUrlInLoader(context: AppLoadContext): string {
  // TODO standardize
  // Might be bundled in or in an `.env.local`
  const convexUrl = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL!;
  return convexUrl;
}

export function getConvexOAuthClientIdInLoader(context: AppLoadContext): string {
  const convexUrl = process.env.CONVEX_OAUTH_CLIENT_ID!;
  return convexUrl;
}

export function getFlexAuthModeInLoader(context: AppLoadContext): 'InviteCode' | 'ConvexOAuth' {
  const authMode = process.env.FLEX_AUTH_MODE;

  if (authMode === 'InviteCode') {
    return 'InviteCode';
  }
  if (authMode === 'ConvexOAuth') {
    return 'ConvexOAuth';
  }
  console.error(`FLEX_AUTH_MODE has unexpected value: ${authMode}, defaulting to ConvexOAuth`);
  return 'ConvexOAuth';
}

export const CONVEX_INVITE_CODE_QUERY_PARAM = 'cvx-code';
