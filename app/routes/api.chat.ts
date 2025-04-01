import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { type Messages } from '~/lib/.server/llm/stream-text';
import { createScopedLogger } from '~/utils/logger';
import { convertToCoreMessages, createDataStream, streamText, type DataStreamWriter } from 'ai';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import { createSummary } from '~/lib/.server/llm/create-summary';
import type { FileMap } from '~/lib/.server/llm/constants';
import { WORK_DIR } from '~/utils/constants';
import { anthropic } from '@ai-sdk/anthropic';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import { createFilesContext } from '~/lib/.server/llm/utils';

const logger = createScopedLogger('api.chat2');

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

type RequestProgress = {
  counter: number,
  cumulativeUsage: { completionTokens: number, promptTokens: number, totalTokens: number },
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, files, promptId, convex } = await request.json<{
    messages: Messages;
    files: any;
    promptId?: string;
    convex?: {
      isConnected: boolean;
      projectToken: string | undefined;
    };
  }>()
  const progress: RequestProgress = {
    counter: 1,
    cumulativeUsage: {
      completionTokens: 0,
      promptTokens: 0,
      totalTokens: 0,
    },
  };
  try {
    const totalMessageContent = messages.reduce((acc, message) => acc + message.content, '');
    logger.debug(`Total message length: ${totalMessageContent.split(' ').length}, words`);

    const dataStream = createDataStream({
      async execute(dataStream) {
        const filePaths = getFilePaths(files || {});

        let messageSliceId = 0;
        let summary: string | undefined = undefined;
        let filteredFiles: FileMap | undefined = undefined;
        if (messages.length > 3) {
          messageSliceId = messages.length - 3;
          summary = await generateChatSummary(
            dataStream,
            messages,
            context.cloudflare?.env,
            promptId,
            progress
          );

          if (filePaths.length > 0) {
            filteredFiles = await determineFilesToRead(
              dataStream,
              files,
              messages,
              context.cloudflare?.env,
              promptId,
              summary,
              progress
            );
          }
        }

        dataStream.writeData({
          type: 'progress',
          label: 'response',
          status: 'in-progress',
          order: progress.counter++,
          message: 'Generating Response',
        } satisfies ProgressAnnotation);

        const systemPrompt = buildSystemPrompt(
          getFilePaths(files || {}),
          filteredFiles,
          summary,
        );
        const userMessages = buildUserMessages(
          messages,
          files && filteredFiles && summary && messageSliceId,
        );
        const result = streamText({
          model: anthropic("claude-3-5-sonnet-20241022"),
          system: systemPrompt,
          maxTokens: 8192,
          messages: userMessages,
          toolChoice: 'none',
          onFinish: async ({ usage }) => {
            logger.debug('usage', JSON.stringify(usage));
            if (usage) {
              progress.cumulativeUsage.completionTokens += usage.completionTokens || 0;
              progress.cumulativeUsage.promptTokens += usage.promptTokens || 0;
              progress.cumulativeUsage.totalTokens += usage.totalTokens || 0;
            }

            dataStream.writeMessageAnnotation({
              type: 'usage',
              value: {
                completionTokens: progress.cumulativeUsage.completionTokens,
                promptTokens: progress.cumulativeUsage.promptTokens,
                totalTokens: progress.cumulativeUsage.totalTokens,
              },
            });
            dataStream.writeData({
              type: 'progress',
              label: 'response',
              status: 'complete',
              order: progress.counter++,
              message: 'Response Generated',
            } satisfies ProgressAnnotation);
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        });
        const logErrors = async () => {
          for await (const part of result.fullStream) {
            if (part.type === 'error') {
              const error: any = part.error;
              logger.error(`${error}`);
              return;
            }
          }
        };
        void logErrors();
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error: any) => `Custom error: ${error.message}`,
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

async function generateChatSummary(
  dataStream: DataStreamWriter,
  messages: Messages,
  env: Env | undefined,
  promptId: string | undefined,
  progress: RequestProgress,
) {
  logger.debug('Generating Chat Summary');
  dataStream.writeData({
    type: 'progress',
    label: 'summary',
    status: 'in-progress',
    order: progress.counter++,
    message: 'Analysing Request',
  } satisfies ProgressAnnotation);

  // Create a summary of the chat
  console.log(`Messages count: ${messages.length}`);

  const summary = await createSummary({
    messages: [...messages],
    env: env,
    apiKeys: undefined,
    providerSettings: undefined,
    promptId: promptId,
    onFinish(resp) {
      if (resp.usage) {
        logger.debug('createSummary token usage', JSON.stringify(resp.usage));
        progress.cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
        progress.cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
        progress.cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
      }
    },
  });

  dataStream.writeData({
    type: 'progress',
    label: 'summary',
    status: 'complete',
    order: progress.counter++,
    message: 'Analysis Complete',
  } satisfies ProgressAnnotation);

  dataStream.writeMessageAnnotation({
    type: 'chatSummary',
    summary,
    chatId: messages.slice(-1)?.[0]?.id,
  } as ContextAnnotation);

  return summary;
}

async function determineFilesToRead(
  dataStream: DataStreamWriter,
  files: FileMap,
  messages: Messages,
  env: Env | undefined,
  promptId: string | undefined,
  summary: string,
  progress: RequestProgress,
) {
  logger.debug('Updating Context Buffer');
  dataStream.writeData({
    type: 'progress',
    label: 'context',
    status: 'in-progress',
    order: progress.counter++,
    message: 'Determining Files to Read',
  } satisfies ProgressAnnotation);

  const filteredFiles = await selectContext({
    messages: [...messages],
    env: env,
    apiKeys: undefined,
    files: files,
    providerSettings: undefined,
    promptId: promptId,
    summary: summary,
    onFinish(resp) {
      if (resp.usage) {
        logger.debug('selectContext token usage', JSON.stringify(resp.usage));
        progress.cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
        progress.cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
        progress.cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
      }
    },
  });

  if (filteredFiles) {
    logger.debug(`files in context : ${JSON.stringify(Object.keys(filteredFiles))}`);
  }

  dataStream.writeMessageAnnotation({
    type: 'codeContext',
    files: Object.keys(filteredFiles).map((key) => {
      let path = key;

      if (path.startsWith(WORK_DIR)) {
        path = path.replace(WORK_DIR, '');
      }

      return path;
    }),
  } as ContextAnnotation);

  dataStream.writeData({
    type: 'progress',
    label: 'context',
    status: 'complete',
    order: progress.counter++,
    message: 'Code Files Selected',
  } satisfies ProgressAnnotation);

  return filteredFiles;
}

function buildSystemPrompt(filePaths: string[], contextFiles: FileMap | undefined, summary: string | undefined) {
  let systemPrompt = getSystemPrompt(WORK_DIR);
  if (filePaths && contextFiles) {
    const codeContext = createFilesContext(contextFiles, true);
    systemPrompt = `${systemPrompt}
      Below are all the files present in the project:
      ---
      ${filePaths.join('\n')}
      ---

      Below is the artifact containing the context loaded into context buffer for you to have knowledge of and might need changes to fullfill current user request.
      CONTEXT BUFFER:
      ---
      ${codeContext}
      ---
      `;
  }

  if (summary) {
    systemPrompt = `${systemPrompt}
      below is the chat history till now
CHAT SUMMARY:
---
${summary}
---
      `;
  }

  return systemPrompt;
}

function buildUserMessages(
  messages: Messages,
  messageSliceId: number | undefined,
) {
  let processedMessages = messages.map((message) => {
    if (message.role === 'user') {
      return message;
    } else if (message.role == 'assistant') {
      let content = message.content;
      content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, '');
      content = content.replace(/<think>.*?<\/think>/s, '');
      return { ...message, content };
    }
    return message;
  });
  if (messageSliceId) {
    processedMessages = processedMessages.slice(messageSliceId);
  } else {
    const lastMessage = processedMessages.pop();
    if (lastMessage) {
      processedMessages = [lastMessage];
    }
  }
  return convertToCoreMessages(processedMessages);

}