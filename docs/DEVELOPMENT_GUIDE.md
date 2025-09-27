# Guia de Desenvolvimento - Chef

Este guia fornece instruções abrangentes para desenvolvedores que desejam contribuir para o projeto Chef, desde o setup inicial até práticas avançadas de desenvolvimento e deploy.

## Visão Geral

Chef é uma aplicação web inovadora que permite executar projetos de software em containers diretamente no navegador usando WebContainers. Desenvolvido pela Convex, combina tecnologias modernas para oferecer uma experiência de desenvolvimento única.

## Pré-requisitos

Antes de começar, certifique-se de ter:

- **Node.js 20+** (recomendado usar nvm para gerenciar versões)
- **pnpm** instalado globalmente (`npm install -g pnpm`)
- **Git** configurado
- **Conta Convex** para desenvolvimento
- **Vercel CLI** (para deploy previews)

## Setup Inicial

### 1. Clone o Repositório

```bash
git clone https://github.com/rolsite/chef.git
cd chef
```

### 2. Configurar Node.js

```bash
nvm install 20
nvm use 20
```

### 3. Instalar Dependências

```bash
pnpm install
```

### 4. Configurar Variáveis de Ambiente

```bash
# Baixar variáveis de ambiente do Vercel
npx vercel env pull

# Adicionar variável específica para desenvolvimento
echo 'VITE_CONVEX_URL=placeholder' >> .env.local
```

### 5. Configurar Convex

```bash
# Conectar ao projeto Convex existente
npx convex dev --configure existing --team convex --project chef --once
```

## Desenvolvimento Local

### Iniciando os Servidores

1. **Terminal 1 - Frontend:**
```bash
pnpm run dev
```

2. **Terminal 2 - Backend Convex:**
```bash
npx convex dev
```

3. **Acesse:** http://127.0.0.1:5173

### Notas Importantes

- Use `127.0.0.1` ao invés de `localhost` (configurado especificamente no WorkOS)
- Recarregue a página após alguns segundos para ativar o hot-reload
- Mantenha ambos os servidores rodando simultaneamente

## Fluxo de Trabalho

### 1. Criar uma Branch

```bash
git checkout main
git pull
git checkout -b feature/nova-funcionalidade
```

### 2. Desenvolvimento

- Faça mudanças incrementais e testáveis
- Use TypeScript estrito
- Siga os padrões definidos em `.cursor/rules/chef_project_rules.mdc`
- Teste localmente antes de commitar

### 3. Commits

```bash
# Stage mudanças
git add .

# Commit com mensagem descritiva
git commit -m "feat: adicionar nova funcionalidade X

- Implementa Y
- Melhora Z
- Resolve issue #123"
```

### 4. Preparar para PR

```bash
# Verificar e corrigir linting
pnpm run lint:fix

# Executar testes
pnpm run test

# Verificar tipos
pnpm run typecheck
```

### 5. Submeter PR

- Use "Merge when ready" quando estiver pronto
- Deploy previews são criados automaticamente
- Teste no ambiente de preview
- Peça review de colegas

## Estrutura do Projeto

### Frontend (`app/`)

```
app/
├── components/        # Componentes React reutilizáveis
│   ├── chat/         # Componentes relacionados ao chat
│   ├── workbench/    # Interface de trabalho
│   └── ui/          # Componentes básicos da UI
├── lib/             # Utilitários e configurações
│   ├── hooks/       # Custom hooks
│   └── common/      # Tipos e constantes compartilhadas
└── utils/           # Funções auxiliares
```

### Backend (`convex/`)

```
convex/
├── schema.ts        # Definição do banco de dados
├── messages.ts      # Operações relacionadas a mensagens
├── sessions.ts      # Gerenciamento de sessões
└── http.ts         # Endpoints HTTP
```

## Padrões de Código

### TypeScript

```typescript
// ✅ Bom
interface User {
  id: Id<'users'>;
  name: string;
  email: string;
}

// ❌ Evitar
type User = {
  id: string;  // Use Id<'users'> ao invés de string
  name: string;
  email: string;
}
```

### React Components

```typescript
// ✅ Bom
interface MyComponentProps {
  userId: Id<'users'>;
  onUpdate: (user: User) => void;
  isLoading?: boolean;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  userId,
  onUpdate,
  isLoading = false,
}) => {
  // Component logic
};
```

### Convex Functions

```typescript
// ✅ Bom
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    // Validação e lógica
    return await ctx.db.insert('users', {
      name: args.name,
      email: args.email,
    });
  },
});
```

## Debugging e Desenvolvimento

### Variáveis Globais Disponíveis

```javascript
// No console do navegador
console.log(chefWebContainer);     // WebContainer instance
console.log(chefMessages);         // Mensagens brutas
console.log(chefParsedMessages);   // Mensagens parseadas
chefSetLogLevel('debug');          // Aumentar verbosidade dos logs
```

### Debug de WebContainer

```typescript
// Para debugar problemas com containers
const container = chefWebContainer;
if (container) {
  container.on('error', (error) => {
    console.error('WebContainer error:', error);
  });
}
```

### Logs e Monitoramento

```typescript
// Configurar nível de log
chefSetLogLevel('debug');

// Verificar status do Sentry
console.log('Sentry enabled:', chefSentryEnabled);
```

## Testes

### Executar Testes

```bash
# Todos os testes
pnpm run test

# Testes específicos
pnpm run test messages.test.ts

# Com coverage
pnpm run test:coverage
```

### Estrutura de Testes

```typescript
import { describe, it, expect } from 'vitest';

describe('User Management', () => {
  it('should create user successfully', async () => {
    const userId = await createUser({ name: 'Test User' });
    expect(userId).toBeDefined();
  });
});
```

## Deploy e Produção

### Ambiente de Staging

```bash
# Deploy para staging
git checkout main
git pull
git push origin main:staging

# Testar em: https://chef-staging.convex.dev
```

### Produção

```bash
# Deploy para produção
git checkout staging
git pull
git push origin staging:release

# Anunciar no Slack: #project-chef
```

### Deploy Previews

Deploy previews são criados automaticamente para cada PR:
- Acesse via link no PR
- Ou em: https://vercel.com/convex-dev/chef/deployments

## Autenticação e WorkOS

### Configuração

Certifique-se de ter as variáveis de ambiente:

```bash
VITE_WORKOS_CLIENT_ID=client_01K0YV0SNPRYJ5AV4AS0VG7T1J
VITE_WORKOS_REDIRECT_URI=http://127.0.0.1:5173
VITE_WORKOS_API_HOSTNAME=apiauth.convex.dev
```

### Fluxo de Auth

1. Usuário clica em "Sign In"
2. Redirecionamento para WorkOS
3. Usuário autentica com conta Convex
4. Retorno para Chef com token
5. Seleção de team/projeto

## WebContainers

### Conceitos Básicos

WebContainers fornecem um ambiente Linux completo no navegador:

```typescript
import { WebContainer } from '@webcontainer/api';

const webcontainer = await WebContainer.boot();
await webcontainer.mount(fileTree);
const process = await webcontainer.spawn('npm', ['install']);
```

### Boas Práticas

- Monte apenas arquivos necessários
- Use streaming para arquivos grandes
- Trate erros de container adequadamente
- Limpe recursos quando não necessários

## Performance

### Otimizações Frontend

```typescript
// Lazy loading de componentes
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Memoização de componentes
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* render */}</div>;
});
```

### Otimizações Backend

```typescript
// Use índices apropriados
.index('by_user_and_status', ['userId', 'status'])

// Pagine resultados grandes
.take(50)
```

## Monitoramento e Observabilidade

### Sentry

- Erros são capturados automaticamente
- Configure alerts para erros críticos
- Use breadcrumbs para contexto adicional

### Métricas Customizadas

```typescript
// Exemplo de métrica customizada
const startTime = Date.now();
// ... operação
const duration = Date.now() - startTime;
console.log(`Operation took ${duration}ms`);
```

## Contribuição

### Antes de Contribuir

1. Leia este guia completamente
2. Estude o código existente
3. Verifique issues abertas
4. Discuta grandes mudanças no Discord

### Durante o Desenvolvimento

1. Mantenha mudanças pequenas e focadas
2. Teste thoroughly
3. Atualize documentação quando necessário
4. Peça feedback early

### Após Implementar

1. Teste em staging
2. Verifique deploy preview
3. Monitore logs em produção
4. Esteja disponível para hotfixes se necessário

## Recursos Adicionais

### Documentação Convex
- [Documentação Oficial](https://docs.convex.dev)
- [Guia de Functions](https://docs.convex.dev/functions)
- [Schema e Queries](https://docs.convex.dev/database)

### WebContainers
- [Documentação WebContainer](https://webcontainers.io)
- [GitHub WebContainer](https://github.com/stackblitz/webcontainer-core)

### React e TypeScript
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://typescriptlang.org/docs)

### Comunidade
- [Discord Convex](https://convex.dev/community)
- [GitHub Issues](https://github.com/rolsite/chef/issues)

---

**Lembrete:** Este é um projeto em constante evolução. Mantenha-se atualizado com as mudanças e contribua para melhorar este guia.