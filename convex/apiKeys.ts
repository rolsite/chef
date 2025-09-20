import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { apiKeyValidator } from "./schema";
import { getMemberByConvexMemberIdQuery } from "./sessions";

export const apiKeyForCurrentMember = query({
  args: {},
  returns: v.union(v.null(), apiKeyValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();

    return existingMember?.apiKey;
  },
});

export const setApiKeyForCurrentMember = mutation({
  args: {
    apiKey: apiKeyValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();

    if (!existingMember) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    await ctx.db.patch(existingMember._id, { apiKey: args.apiKey });
  },
});

export const deleteApiKeyForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();

    if (!existingMember) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    await ctx.db.patch(existingMember._id, { apiKey: undefined });
  },
});

export const deleteOpenrouterApiKeyForCurrentMember = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const existingMember = await getMemberByConvexMemberIdQuery(ctx, identity).first();

    if (!existingMember) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }
    if (!existingMember.apiKey) {
      return;
    }
    await ctx.db.patch(existingMember._id, {
      apiKey: {
        ...existingMember.apiKey,
        openrouter: undefined,
      },
    });
  },
});

export const validateOpenrouterApiKey = action({
  args: {
    apiKey: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.status === 200;
    } catch (error) {
      console.error("Error validating OpenRouter API key:", error);
      return false;
    }
  },
});

export const hasEnvironmentOpenRouterKey = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    // Check if OPENROUTER_API_KEY environment variable is set
    return !!process.env.OPENROUTER_API_KEY;
  },
});