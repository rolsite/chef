import { convertToCoreMessages, streamText as _streamText, type Message } from 'ai';
import { MAX_TOKENS, type FileMap } from './constants';
import { getSystemPrompt } from '~/lib/common/prompts/bolt';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROVIDER_LIST } from '~/utils/constants';
import type { IProviderSetting } from '~/types/model';
import { LLMManager } from '~/lib/modules/llm/manager';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { getFilePaths } from './select-context';

export type Messages = Message[];

interface StreamingOptions extends Omit<Parameters<typeof _streamText>[0], 'model'> {
  convexProjectConnected: boolean;
  convexProjectToken: string | null;
}

const logger = createScopedLogger('stream-text');
