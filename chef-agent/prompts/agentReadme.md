# Convex Components

Convex Components package up code and data in a sandbox that allows you to confidently and quickly add new features to your backend.

Convex Components are like mini self-contained Convex backends, and installing them is always safe. They can't read your app's tables or call your app's functions unless you pass them in explicitly.

Each component is installed as its own independent library from NPM. You also need to add a `convex.config.ts` file that includes the component.

ALWAYS prefer using a component for a feature than writing the code yourself.

# Convex Agent Component

For AI chat apps or AI agents, use the Convex agent component.
The Convex agent component is an AI Agent framework built on Convex.

## Installation

Install the component package:

```ts
npm install @convex-dev/agent
```

You must create a `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use` before you can use the component's functions.

```ts
// convex/convex.config.ts
import { defineApp } from 'convex/server';
import agent from '@convex-dev/agent/convex.config';

const app = defineApp();
app.use(agent);

export default app;
```

## Usage

### Configuring the agent

```ts
import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Agent, createTool } from "@convex-dev/agent";
import { components } from "./_generated/api";

// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  // The chat completions model to use for the agent.
  chat: openai.chat("gpt-4o-mini"),
  // Embedding model to power vector search of message history (RAG).
  textEmbedding: openai.embedding("text-embedding-3-small"),
  // The default system prompt if not overriden.
  instructions: "You are a helpful assistant.",
  tools: {
    // Standard AI SDK tool
    myTool: tool({ description, parameters, execute: () => {}}),
    // Convex tool
    myConvexTool: createTool({
      description: "My Convex tool",
      args: z.object({...}),
      handler: async (ctx, args) => {
        return "Hello, world!";
      },
    }),
  },
});
```

Example usage:

```ts
// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  chat: openai.chat('gpt-4o-mini'),
  textEmbedding: openai.embedding('text-embedding-3-small'),
  instructions: 'You are a helpful assistant.',
  tools: { accountLookup, fileTicket, sendEmail },
});

// Use the agent from within a normal action:
export const createThread = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    // Start a new thread for the user.
    const { threadId, thread } = await supportAgent.createThread(ctx);
    // Creates a user message with the prompt, and an assistant reply message.
    const result = await thread.generateText({ prompt });
    return { threadId, text: result.text };
  },
});

// Pick up where you left off, with the same or a different agent:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    // Continue a thread, picking up where you left off.
    const { thread } = await anotherAgent.continueThread(ctx, { threadId });
    // This includes previous message history from the thread automatically.
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});

// Or use it within a workflow, specific to a user:
export const { generateText: getSupport } = supportAgent.asActions({ maxSteps: 10 });

const workflow = new WorkflowManager(components.workflow);

export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
  handler: async (step, { prompt, userId, threadId }) => {
    const suggestion = await step.runAction(internal.example.getSupport, {
      threadId,
      userId,
      prompt,
    });
    const polished = await step.runAction(internal.example.adaptSuggestionForUser, {
      userId,
      suggestion,
    });
    await step.runMutation(internal.example.sendUserMessage, {
      userId,
      message: polished.message,
    });
  },
});
```

### Starting a thread

You can start a thread from either an action or a mutation.
If it's in an action, you can also start sending messages.
The threadId allows you to resume later and maintain message history.
If you specify a userId, the thread will be associated with that user and messages will be saved to the user's history.
You can also search the user's history for relevant messages in this thread.

```ts
// Use the agent from within a normal action:
export const createThread = action({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (ctx, { prompt, userId }): Promise<{ threadId: string; initialResponse: string }> => {
    // Start a new thread for the user.
+   const { threadId, thread } = await supportAgent.createThread(ctx, { userId });
    const result = await thread.generateText({ prompt });
    return { threadId, initialResponse: result.text };
  },
});
```

### Continuing a thread

If you specify a userId too, you can search the user's history for relevant messages
to include in the prompt context.

```ts
// Pick up where you left off:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }): Promise<string> => {
    // This includes previous message history from the thread automatically.
+   const { thread } = await supportAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
```

### Sending a message with configurable message history context

You can customize what history is included per-message via `contextOptions`.
See the [configuring the agent](#configuring-the-agent) section for details.

```ts
const result = await thread.generateText({ prompt }, { contextOptions });
```

### Creating a tool with Convex context

There are two ways to create a tool that has access to the Convex context.

1. Use the `createTool` function, which is a wrapper around the AI SDK's `tool` function.

```ts
export const ideaSearch = createTool({
  description: 'Search for ideas in the database',
  args: z.object({ query: z.string() }),
  handler: async (ctx, args): Promise<Array<Idea>> => {
    // ctx has userId, threadId, messageId, runQuery, runMutation, and runAction
    const ideas = await ctx.runQuery(api.ideas.searchIdeas, { query: args.query });
    console.log('found ideas', ideas);
    return ideas;
  },
});
```

2. Define tools at runtime in a context with the variables you want to use.

```ts
async function createTool(ctx: ActionCtx, teamId: Id<"teams">) {
  const myTool = tool({
    description: "My tool",
    parameters: z.object({...}),
    execute: async (args, options) => {
      return await ctx.runQuery(internal.foo.bar, args);
    },
  });
}
```

You can provide tools at different times:

- Agent contructor: (`new Agent(components.agent, { tools: {...} })`)
- Creating a thread: `createThread(ctx, { tools: {...} })`
- Continuing a thread: `continueThread(ctx, { tools: {...} })`
- On thread functions: `thread.generateText({ tools: {...} })`
- Outside of a thread: `supportAgent.generateText(ctx, {}, { tools: {...} })`

Specifying tools at each layer will overwrite the defaults.
The tools will be `args.tools ?? thread.tools ?? agent.options.tools`.
This allows you to create tools in a context that is convenient.

## Troubleshooting

### Circular dependencies

Having the return value of workflows depend on other Convex functions can lead to circular dependencies due to the
`internal.foo.bar` way of specifying functions. The way to fix this is to explicitly type the return value of the
workflow. When in doubt, add return types to more `handler` functions, like this:

```diff
 export const supportAgentWorkflow = workflow.define({
   args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
+  handler: async (step, { prompt, userId, threadId }): Promise<string> => {
     // ...
   },
 });

 // And regular functions too:
 export const myFunction = action({
   args: { prompt: v.string() },
+  handler: async (ctx, { prompt }): Promise<string> => {
     // ...
   },
 });
```

<!-- END: Include on https://convex.dev/components -->
