import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertIsConvexAdmin } from "./admin";

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

export const storeDebugPrompt = internalMutation({
  args: {
    chatInitialId: v.string(),
    storageId: v.id("_storage"),
    finishReason: v.string(),
    modelId: v.optional(v.string()),
    cacheCreationInputTokens: v.number(),
    cacheReadInputTokens: v.number(),
    inputTokensUncached: v.number(),
    outputTokens: v.number(),
  },
  handler: async (ctx, args) => {
    const {
      chatInitialId,
      storageId,
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
      storageId,
      finishReason,
      modelId: modelId ?? "",
      cacheCreationInputTokens,
      cacheReadInputTokens,
      inputTokensUncached,
      outputTokens,
    });
  },
});

export const deleteDebugPrompt = internalMutation({
  args: {
    id: v.id("debugChatPrompts"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) {
      return;
    }
    await ctx.storage.delete(record.storageId);
    await ctx.db.delete(args.id);
  },
});

export const deleteAllDebugPrompts = mutation({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("debugChatPrompts").collect();

    for (let i = 0; i < records.length; i += 10) {
      const chunk = records.slice(i, i + 10);
      await Promise.all(
        chunk.map((record) => ctx.runMutation(internal.debugPrompt.deleteDebugPrompt, { id: record._id })),
      );
    }
  },
});

export const show = query({
  args: {
    chatInitialId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertIsConvexAdmin(ctx);

    const chat = await getChatByInitialId(ctx, args.chatInitialId);

    const debugPrompts = await ctx.db
      .query("debugChatPrompts")
      .withIndex("byChatId", (q) => q.eq("chatId", chat._id))
      .collect();

    const promptsWithUrls = await Promise.all(
      debugPrompts.map(async (prompt) => ({
        ...prompt,
        url: await ctx.storage.getUrl(prompt.storageId),
      })),
    );

    return promptsWithUrls;
  },
});
