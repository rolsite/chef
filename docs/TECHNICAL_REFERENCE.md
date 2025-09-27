# Referência Técnica - Chef

Este documento fornece uma referência técnica abrangente do projeto Chef, incluindo arquitetura, tecnologias, padrões de código e estrutura do sistema.

## Visão Geral da Arquitetura

### Arquitetura Geral
Chef é uma aplicação full-stack que combina:
- **Frontend React** com TypeScript para interface do usuário
- **Backend Convex** para persistência e lógica de negócio
- **WebContainers** para execução de código no navegador
- **Sistema de Chat AI** para interação com LLMs

### Fluxo de Dados
```
Usuário → Interface React → API Chat → LLM → WebContainer → Resultados
   ↓              ↓            ↓        ↓         ↓            ↓
Interface ← Convex DB ← Mensagens ← Processamento ← Execução ← Convex
```

## Tecnologias Principais

### Frontend
- **React 18+** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Framework de estilos
- **Framer Motion** - Animações
- **Monaco Editor** - Editor de código
- **@ai-sdk/react** - Integração com LLMs

### Backend
- **Convex** - Backend-as-a-service
  - Database em tempo real
  - Functions (queries, mutations, actions)
  - File storage
  - Autenticação integrada
- **OpenAI API** - Integração com GPT models
- **Anthropic API** - Integração com Claude
- **Google AI API** - Integração com Gemini
- **XAI API** - Integração com Grok

### Containerização
- **WebContainers** - Ambiente Linux no navegador
- **Docker** - Containerização para deploy
- **WebAssembly** - Execução de binários

## Estrutura do Banco de Dados

### Tabelas Principais

#### `sessions`
Gerencia sessões de usuário
```typescript
{
  memberId?: Id<'convexMembers'>;
}
```

#### `chats`
Armazena conversas e projetos
```typescript
{
  creatorId: Id<'sessions'>;
  initialId: string;
  urlId?: string;
  description?: string;
  convexProject?: {
    kind: 'connected' | 'connecting' | 'failed';
    projectSlug: string;
    teamSlug: string;
    deploymentUrl: string;
    deploymentName: string;
  };
}
```

#### `messages`
Mensagens do chat (armazenadas como arquivos)
```typescript
{
  chatId: Id<'chats'>;
  storageId: Id<'_storage'>;
  subchatIndex: number;
  lastMessageRank: number;
}
```

#### `convexMembers`
Membros da plataforma Convex
```typescript
{
  tokenIdentifier: string;
  apiKey?: {
    preference: 'always' | 'quotaExhausted';
    value?: string;    // Anthropic
    openai?: string;   // OpenAI
    xai?: string;      // XAI
    google?: string;   // Google
  };
}
```

### Índices Otimizados
- `byCreatorAndId` - Busca chats por criador e ID
- `byMemberId` - Busca sessões por membro
- `byTokenIdentifier` - Autenticação de membros
- `byChatId` - Mensagens por chat

## Sistema de Chat

### Arquitetura de Mensagens
- **Mensagens estruturadas** com parser customizado
- **Suporte a artifacts** (código executável)
- **Context management** para LLMs
- **Streaming de respostas** em tempo real

### Componentes Principais

#### `Chat.tsx`
Componente principal do chat que gerencia:
- Estado das mensagens
- Integração com LLMs
- Gerenciamento de contexto
- Controle de animações

#### `BaseChat.client.tsx`
Interface base do chat com:
- Renderização de mensagens
- Input de usuário
- Indicadores de streaming
- Controles de ação

#### `MessageParser`
Parser customizado para:
- Extração de código
- Identificação de artifacts
- Processamento de tool calls
- Formatação de saída

## Sistema de WebContainer

### Integração
```typescript
import { WebContainer } from '@webcontainer/api';

const webcontainer = await WebContainer.boot();
await webcontainer.mount(fileTree);
const process = await webcontainer.spawn('npm', ['install']);
```

### Funcionalidades
- **Execução de comandos** via API
- **File system mounting** para projetos
- **Process spawning** para npm, git, etc.
- **Streaming de output** para interface
- **Error handling** robusto

### Casos de Uso
- Instalação de dependências
- Execução de scripts
- Preview de aplicações
- Testes automatizados

## Sistema de Autenticação

### Fluxo de Autenticação
1. **WorkOS Integration** - Provedor OAuth
2. **Convex Members** - Mapeamento de usuários
3. **Session Management** - Controle de sessão
4. **Team Selection** - Escolha de equipe/projeto

### Variáveis de Ambiente
```bash
VITE_WORKOS_CLIENT_ID=client_xxx
VITE_WORKOS_REDIRECT_URI=http://127.0.0.1:5173
VITE_WORKOS_API_HOSTNAME=apiauth.convex.dev
```

## Sistema de API Keys

### Estrutura
```typescript
{
  preference: 'always' | 'quotaExhausted';
  value?: string;    // Anthropic (Claude)
  openai?: string;   // OpenAI (GPT)
  xai?: string;      // XAI (Grok)
  google?: string;   // Google (Gemini)
}
```

### Lógica de Seleção
- **Auto**: Escolhe melhor modelo disponível
- **Específico**: Usa modelo selecionado
- **Fallback**: Usa chave pessoal se quota excedida

## Sistema de Arquivos e Storage

### Tipos de Storage
- **Convex Storage** - Arquivos de mensagens e snapshots
- **WebContainer FS** - Sistema de arquivos temporário
- **Local Storage** - Cache e preferências
- **Session Storage** - Dados de sessão

### Gerenciamento de Arquivos
```typescript
// Upload para Convex Storage
const uploadUrl = await ctx.storage.generateUploadUrl();
const response = await fetch(uploadUrl, {
  method: 'POST',
  body: file,
});

// Download
const downloadUrl = await ctx.storage.getUrl(fileId);
```

## Sistema de Models e Providers

### Providers Suportados
- **Anthropic**: Claude 3.5, 4
- **OpenAI**: GPT-4, GPT-4.1, GPT-5
- **Google**: Gemini 2.5 Pro
- **XAI**: Grok-3

### Seleção de Model
```typescript
const modelSelection: ModelSelection =
  'auto' | 'claude-4-sonnet' | 'gpt-4.1' | 'gemini-2.5-pro' | 'grok-3-mini';
```

### Configuração de Provider
```typescript
const providers: ProviderType[] = ['Anthropic', 'Bedrock', 'OpenAI'];
const modelProvider = providers[retries.numFailures % providers.length];
```

## Sistema de Context Management

### ChatContextManager
Gerencia o contexto enviado para LLMs:

```typescript
const contextManager = new ChatContextManager(
  () => workbenchStore.currentDocument.get(),
  () => workbenchStore.files.get(),
  () => workbenchStore.userWrites,
);
```

### Preparação de Contexto
```typescript
const { messages: preparedMessages, collapsedMessages } =
  contextManager.prepareContext(
    messages,
    maxSizeForModel(modelSelection, maxCollapsedMessagesSize),
    minCollapsedMessagesSize,
  );
```

## Sistema de Artifacts

### Definição
Artifacts são pedaços de código executável extraídos de mensagens:

```typescript
interface Artifact {
  id: string;
  title: string;
  language: string;
  content: string;
  isComplete: boolean;
}
```

### Processamento
1. **Extração** do conteúdo da mensagem
2. **Parsing** de linguagem e estrutura
3. **Execução** no WebContainer
4. **Preview** na interface

## Sistema de Workbench

### Componentes
- **EditorPanel** - Editor de código Monaco
- **Preview** - Preview da aplicação
- **Terminal** - Terminal integrado
- **FileTree** - Navegador de arquivos

### Estado Global
```typescript
const workbenchStore = {
  files: Map<string, File>,
  currentDocument: string,
  artifacts: Map<string, ArtifactState>,
  alert: Alert | null,
};
```

## Sistema de Mensagens e Parsing

### Estrutura de Mensagens
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parts: Part[];
  createdAt: Date;
}
```

### Part Types
- **text** - Texto simples
- **code** - Blocos de código
- **tool-invocation** - Chamadas de ferramentas
- **artifact** - Código executável

## Sistema de Tool Calls

### Execução de Ações
```typescript
const { result } = await workbenchStore.waitOnToolCall(toolCallId);
```

### Tipos de Tools
- **run_terminal_cmd** - Executa comandos
- **search_replace** - Modifica arquivos
- **list_dir** - Lista diretórios
- **read_file** - Lê arquivos
- **todo_write** - Gerencia TODOs

## Sistema de Snapshots

### Criação
```typescript
const snapshotId = await ctx.storage.storeBlob(snapshotData);
```

### Restauração
```typescript
const snapshot = await ctx.storage.getUrl(snapshotId);
await webcontainer.mount(snapshotFiles);
```

## Sistema de Deploy

### Deploy Previews
- **Vercel** para frontend
- **Convex** para backend
- **URLs automáticas** para cada PR

### Processo de Deploy
1. **Build** no Vercel
2. **Deploy** functions Convex
3. **Migração** schema se necessário
4. **Testes** automatizados

## Sistema de Monitoramento

### Error Tracking
- **Sentry** para erros em produção
- **Source maps** para debugging
- **Context** automático nas mensagens

### Logging
```typescript
const logger = createScopedLogger('ComponentName');
logger.debug('Debug message', data);
logger.error('Error message', error);
```

### Debug Global
```javascript
// Variáveis disponíveis no console
chefWebContainer     // Instância WebContainer
chefMessages        // Mensagens brutas
chefParsedMessages  // Mensagens parseadas
chefSetLogLevel('debug')  // Aumentar verbosidade
```

## Configuração de Desenvolvimento

### package.json Scripts
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx",
  "test": "vitest",
  "typecheck": "tsc --noEmit"
}
```

### Configuração Vite
```typescript
export default defineConfig({
  plugins: [react(), convex()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  define: {
    global: 'globalThis',
  },
});
```

## Variáveis de Ambiente

### Desenvolvimento
```bash
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_WORKOS_CLIENT_ID=client_xxx
VITE_WORKOS_REDIRECT_URI=http://127.0.0.1:5173
```

### Produção
```bash
CONVEX_URL=https://your-project.convex.cloud
WORKOS_CLIENT_ID=client_xxx
WORKOS_REDIRECT_URI=https://chef.convex.dev
```

## Padrões de Código

### Imports
```typescript
// React e hooks
import { useState, useEffect, useCallback } from 'react';

// Convex
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

// Utils e stores
import { workbenchStore } from '~/lib/stores/workbench.client';
import { createScopedLogger } from '~/utils/logger';
```

### Componentes
```typescript
interface Props {
  userId: Id<'users'>;
  onUpdate: (user: User) => void;
  isLoading?: boolean;
}

export const ComponentName: React.FC<Props> = ({
  userId,
  onUpdate,
  isLoading = false,
}) => {
  // Lógica do componente
};
```

### Funções Convex
```typescript
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    return await ctx.db.insert('users', {
      name: args.name,
      email: args.email,
    });
  },
});
```

## Testes

### Estrutura de Testes
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Testes de Funções Convex
```typescript
import { test } from 'convex/test';

test('createUser', async () => {
  const userId = await createUser({ name: 'Test User' });
  expect(userId).toBeDefined();
});
```

## Performance

### Otimizações Implementadas
- **React.memo** para componentes
- **useMemo** para cálculos pesados
- **Code splitting** automático
- **Lazy loading** de componentes
- **Índices** otimizados no banco

### Métricas Monitoradas
- **Token usage** por request
- **Response time** das APIs
- **Bundle size** do frontend
- **Memory usage** do WebContainer

## Segurança

### Práticas Implementadas
- **Input validation** em todas as funções
- **Rate limiting** para APIs
- **CORS** configurado apropriadamente
- **HTTPS** obrigatório em produção
- **Secrets** em variáveis de ambiente

### Sanitização
- **XSS prevention** em mensagens
- **Path traversal** protection
- **Command injection** prevention
- **File type** validation

## Deploy e CI/CD

### Pipeline de Deploy
1. **Lint e typecheck** em PR
2. **Testes automatizados**
3. **Build** do frontend
4. **Deploy** para staging
5. **Evals** de qualidade
6. **Deploy** para produção

### Ambientes
- **Development**: `localhost:5173`
- **Staging**: `chef-staging.convex.dev`
- **Production**: `chef.convex.dev`

## Troubleshooting

### Problemas Comuns

#### WebContainer não inicia
```bash
// Verificar se há erros no console
console.log(chefWebContainer);

// Possível solução: recarregar página
window.location.reload();
```

#### Convex functions não atualizam
```bash
// Limpar cache do Convex
npx convex dashboard

// Redeploy das functions
npx convex deploy
```

#### Autenticação não funciona
```bash
// Verificar variáveis de ambiente
console.log(import.meta.env.VITE_WORKOS_CLIENT_ID);

// Verificar se está usando 127.0.0.1
console.log(window.location.hostname);
```

## Recursos Externos

### Documentação Oficial
- [Convex Documentation](https://docs.convex.dev)
- [WebContainer API](https://webcontainers.io/api)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

### Comunidade
- [Convex Discord](https://convex.dev/community)
- [GitHub Issues](https://github.com/rolsite/chef/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/convex)

---

Este documento será mantido atualizado conforme o projeto evolui. Última atualização: 2025