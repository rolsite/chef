import { createOpenAI } from '@ai-sdk/openai';
import { wrapLanguageModel, type LanguageModelV1 } from 'ai';
import { getEnv } from '~/lib/.server/env';

// Função para modificar o corpo da requisição e adicionar user parameter
function modifyRequestBody(init?: RequestInit, userId?: string): RequestInit | undefined {
  if (!init || !userId) {
    return init;
  }

  // Criar uma cópia do init para não modificar o original
  const modifiedInit = { ...init };

  if (init.body && typeof init.body === 'string') {
    try {
      const bodyObj = JSON.parse(init.body);

      // Adicionar user parameter no nível raiz do JSON
      bodyObj.user = userId;

      modifiedInit.body = JSON.stringify(bodyObj);

      // Garantir que o Content-Type está correto
      if (!modifiedInit.headers) {
        modifiedInit.headers = {};
      }

      const headers = new Headers(modifiedInit.headers);
      headers.set('Content-Type', 'application/json');
      modifiedInit.headers = headers;

      return modifiedInit;
    } catch (error) {
      return init;
    }
  }

  return init;
}

/**
 * Wrapper customizado para OpenRouter que garante o parâmetro user seja enviado
 * Resolve o problema de tracking de usuários na API OpenRouter
 */
export function createOpenRouterWithUser(
  apiKey: string,
  userId?: string,
  fetchImpl?: typeof fetch,
) {
  // Criar fetch wrapper para capturar e modificar requisições
  const loggingFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Modificar o corpo da requisição para adicionar user parameter
    const modifiedInit = modifyRequestBody(init, userId);

    // Fazer a requisição com o corpo modificado
    const response = await (fetchImpl || fetch)(input, modifiedInit || init);

    return response;
  };

  // Criar provider OpenAI base
  const baseOpenAI = createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    fetch: loggingFetch,
  });

  // Retornar função que cria modelo com wrapper
  return (modelId: string): LanguageModelV1 => {
    const baseModel = baseOpenAI(modelId);

    // Se não houver userId, retornar modelo base sem wrapper
    if (!userId) {
      return baseModel;
    }

    // Criar wrapper que intercepta chamadas
    return wrapLanguageModel({
      model: baseModel,
      middleware: {
        transformParams: async ({ type, params }) => {
          return {
            ...params,
            user: userId, // Adicionar user parameter para OpenRouter
          };
        },
      },
    });
  };
}

/**
 * Provider OpenRouter com tracking de usuário integrado
 * Mantém mesma interface da SDK ai mas garante user parameter
 */
export function getOpenRouterProvider(
  userApiKey: string | undefined,
  modelId: string,
  userId?: string,
) {
  const apiKey = userApiKey || getEnv('OPENROUTER_API_KEY');

  if (!apiKey) {
    throw new Error('OpenRouter API key is required');
  }

  // Usar wrapper customizado se houver userId
  if (userId) {
    const createModel = createOpenRouterWithUser(apiKey, userId);
    const model = createModel(modelId);
    return {
      model,
      maxTokens: 64000,
    };
  }
  // Fallback para provider padrão sem user tracking
  const openrouter = createOpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  return {
    model: openrouter(modelId),
    maxTokens: 64000,
  };
}