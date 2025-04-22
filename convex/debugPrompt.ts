import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { CoreMessage } from "ai";
import type { QueryCtx } from "./_generated/server";

async function getChatByInitialId(ctx: QueryCtx, initialId: string) {
  const chatByInitialId = await ctx.db
    .query("chats")
    .withIndex("byInitialId", (q: any) => q.eq("initialId", initialId))
    .unique();
  if (!chatByInitialId) {
    throw new Error(`No corresponding chat found for initial ID ${initialId}`);
  }
  return chatByInitialId;
}

// This debug-only endpoint is not authenticated
export const storeRawPrompt = mutation({
  args: {
    chatInitialId: v.string(),
    finishReason: v.string(),
    modelId: v.optional(v.any()),
    coreMessages: v.array(v.any()),
    cacheCreationInputTokens: v.number(),
    cacheReadInputTokens: v.number(),
    inputTokensUncached: v.number(),
    outputTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const {
      chatInitialId,
      coreMessages,
      cacheCreationInputTokens,
      cacheReadInputTokens,
      inputTokensUncached,
      outputTokens,
      finishReason,
      modelId,
    } = args;
    const chat = await getChatByInitialId(ctx, chatInitialId);
    await ctx.db.insert("debugChatPrompts", {
      chatId: chat._id,
      prompt: coreMessages as CoreMessage[],
      finishReason,
      modelId,
      cacheCreationInputTokens,
      cacheReadInputTokens,
      inputTokensUncached,
      outputTokens,
    });
  },
});

export const show = query({
  args: {
    chatInitialId: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await getChatByInitialId(ctx, args.chatInitialId);

    // Get all debug prompts for this chat
    const debugPrompts = await ctx.db
      .query("debugChatPrompts")
      .withIndex("byChatId", (q) => q.eq("chatId", chat._id))
      .collect();

    return debugPrompts;
  },
});
