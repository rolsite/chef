import type { EntryContext } from '@vercel/remix';
import { RemixServer } from '@remix-run/react';
import { handleRequest } from '@vercel/remix';

export default async function (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  // Set COOP and COEP headers for isolation
  responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
  responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
  
  let remixServer = <RemixServer context={remixContext} url={request.url} />;
  return handleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixServer,
  );
}
