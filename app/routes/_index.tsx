import { type LoaderFunctionArgs, type MetaFunction } from '@vercel/remix';
import { ClientOnly } from 'remix-utils/client-only';
import { WrappedBaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { SafariWarning } from '~/components/SafariWarning';
import { getFlexAuthModeInLoader } from '~/lib/persistence/convex';

export const meta: MetaFunction = () => {
  return [
    { title: 'Chef' },
    { name: 'description', content: 'Cook up something hot with Chef, the full-stack AI coding agent from Convex' },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const url = new URL(args.request.url);
  const code = url.searchParams.get('code');
  const flexAuthMode = getFlexAuthModeInLoader(args.context);
  return Response.json({ code, flexAuthMode });
};

/**
 * Landing page component for Bolt
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <Header />
      <ClientOnly fallback={<WrappedBaseChat />}>{() => <Chat />}</ClientOnly>
      <ClientOnly>{() => <SafariWarning />}</ClientOnly>
    </div>
  );
}
