import { type ActionFunctionArgs } from '@vercel/remix';
import { createScopedLogger } from 'chef-agent/utils/logger';
import { convexAgent } from '~/lib/.server/llm/convex-agent';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import type { LanguageModelUsage, Message, ProviderMetadata } from 'ai';
import { recordUsage } from '~/lib/.server/usage';
import { getEnv } from '~/lib/.server/env';
import type { PromptCharacterCounts } from 'chef-agent/ChatContextManager';

type Messages = Message[];

const logger = createScopedLogger('api.chat');

export type Tracer = ReturnType<typeof WebTracerProvider.prototype.getTracer>;

export async function chatAction({ request }: ActionFunctionArgs) {
  const AXIOM_API_TOKEN = getEnv('AXIOM_API_TOKEN');
  const AXIOM_API_URL = getEnv('AXIOM_API_URL');
  const AXIOM_DATASET_NAME = getEnv('AXIOM_DATASET_NAME');
  const PROVISION_HOST = getEnv('PROVISION_HOST') || 'https://api.convex.dev';

  let tracer: Tracer | null = null;
  if (AXIOM_API_TOKEN && AXIOM_API_URL && AXIOM_DATASET_NAME) {
    const exporter = new OTLPTraceExporter({
      url: AXIOM_API_URL,
      headers: {
        Authorization: `Bearer ${AXIOM_API_TOKEN}`,
        'X-Axiom-Dataset': AXIOM_DATASET_NAME,
      },
    });
    const provider = new WebTracerProvider({
      spanProcessors: [
        new BatchSpanProcessor(exporter, {
          // The maximum queue size. After the size is reached spans are dropped.
          maxQueueSize: 100,
          // The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
          maxExportBatchSize: 10,
          // The interval between two consecutive exports
          scheduledDelayMillis: 500,
          // How long the export can run before it is cancelled
          exportTimeoutMillis: 30000,
        }),
      ],
    });
    provider.register();
    tracer = provider.getTracer('ai');
    logger.info('✅ Axiom instrumentation registered!');
  } else {
    logger.warn('⚠️ AXIOM_API_TOKEN, AXIOM_API_URL, and AXIOM_DATASET_NAME not set, skipping Axiom instrumentation.');
  }

  const body = (await request.json()) as {
    messages: Messages;
    firstUserMessage: boolean;
    chatInitialId: string;
    token: string;
    teamSlug: string;
    deploymentName: string | undefined;
    modelChoice: string | undefined;
    userApiKey: string | undefined; // Now just the OpenRouter API key
    shouldDisableTools: boolean;
    recordRawPromptsForDebugging?: boolean;
    collapsedMessages: boolean;
    promptCharacterCounts?: PromptCharacterCounts;
    userId?: string;
    featureFlags: {
      enableResend?: boolean;
    };
  };
  const { messages, firstUserMessage, chatInitialId, deploymentName, token, teamSlug, recordRawPromptsForDebugging, userId } =
    body;

  // Sempre usa OpenRouter API key do ambiente - verificação de quotas obsoleta
  const userApiKey = body.userApiKey || getEnv('OPENROUTER_API_KEY');
  if (!userApiKey) {
    return new Response(
      JSON.stringify({ code: 'missing-api-key', error: 'OpenRouter API key required.' }),
      {
        status: 402,
      },
    );
  }
  logger.info(`Using OpenRouter (user API key: ${!!body.userApiKey})`);

  const recordUsageCb = async (
    lastMessage: Message | undefined,
    finalGeneration: { usage: LanguageModelUsage; providerMetadata?: ProviderMetadata },
  ) => {
    if (!userApiKey && getEnv('DISABLE_USAGE_REPORTING') !== '1') {
      await recordUsage(
        PROVISION_HOST,
        token,
        'OpenRouter',
        teamSlug,
        deploymentName,
        lastMessage,
        finalGeneration,
      );
    }
  };

  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Total message length: ${totalMessageContent.split(' ').length}, words`);

    const dataStream = await convexAgent({
      chatInitialId,
      firstUserMessage,
      messages,
      tracer,
      modelChoice: body.modelChoice || 'anthropic/claude-3.5-sonnet',
      userApiKey,
      shouldDisableTools: body.shouldDisableTools,
      recordUsageCb,
      recordRawPromptsForDebugging: !!recordRawPromptsForDebugging,
      collapsedMessages: body.collapsedMessages,
      promptCharacterCounts: body.promptCharacterCounts,
      userId,
      featureFlags: {
        enableResend: body.featureFlags.enableResend ?? false,
      },
    });

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    logger.error(error);

    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

