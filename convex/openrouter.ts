import { ConvexError, v } from "convex/values";
import { action, internalAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Fetch available models from OpenRouter API
export const fetchAvailableModels = action({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch OpenRouter models:", response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching OpenRouter models:", error);
      return [];
    }
  },
});

// Update cached models in database
export const updateCachedModels = internalMutation({
  args: {
    models: v.array(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Clear existing models
    const existingModels = await ctx.db.query("openrouterModels").collect();
    for (const model of existingModels) {
      await ctx.db.delete(model._id);
    }

    // Insert new models
    const now = Date.now();
    for (const model of args.models) {
      // Safely extract fields with fallbacks
      await ctx.db.insert("openrouterModels", {
        modelId: model.id || '',
        name: model.name || '',
        description: model.description || undefined,
        pricing: {
          prompt: model.pricing?.prompt || '0',
          completion: model.pricing?.completion || '0',
        },
        contextLength: model.context_length || 0,
        maxCompletionTokens: model.top_provider?.max_completion_tokens || undefined,
        isModerated: model.top_provider?.is_moderated || false,
        lastUpdated: now,
      });
    }
  },
});

// Public action for manual refresh
export const manualRefreshModels = action({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }
    
    // Fetch models directly since we can't call public actions from internal actions
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch OpenRouter models:", response.status, response.statusText);
        throw new ConvexError({ code: "BadRequest", message: "Failed to fetch models from OpenRouter" });
      }

      const data = await response.json();
      const models = data.data || [];
      
      if (models.length > 0) {
        await ctx.runMutation(internal.openrouter.updateCachedModels, { models });
      }
    } catch (error) {
      console.error("Error fetching OpenRouter models:", error);
      throw new ConvexError({ code: "InternalServerError", message: "Failed to refresh models" });
    }
  },
});

// Scheduled action to refresh models periodically
export const refreshModels = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // Fetch models directly since we can't call public actions from internal actions
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch OpenRouter models:", response.status, response.statusText);
        return;
      }

      const data = await response.json();
      const models = data.data || [];
      
      if (models.length > 0) {
        await ctx.runMutation(internal.openrouter.updateCachedModels, { models });
      }
    } catch (error) {
      console.error("Error fetching OpenRouter models:", error);
    }
  },
});

// Query cached models for UI
export const getCachedModels = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("openrouterModels"),
    _creationTime: v.number(),
    modelId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    pricing: v.object({
      prompt: v.string(),
      completion: v.string(),
    }),
    contextLength: v.number(),
    maxCompletionTokens: v.optional(v.number()),
    isModerated: v.boolean(),
    lastUpdated: v.number(),
  })),
  handler: async (ctx, args) => {
    let query = ctx.db.query("openrouterModels");
    
    let models = await query.collect();
    
    // Filter by search term if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      models = models.filter(model => 
        model.name.toLowerCase().includes(searchLower) ||
        model.modelId.toLowerCase().includes(searchLower) ||
        (model.description && model.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by name
    models.sort((a, b) => a.name.localeCompare(b.name));
    
    // Apply limit if provided
    if (args.limit) {
      models = models.slice(0, args.limit);
    }
    
    return models;
  },
});

// Get a specific model by ID
export const getModelById = query({
  args: { modelId: v.string() },
  returns: v.union(v.null(), v.object({
    _id: v.id("openrouterModels"),
    _creationTime: v.number(),
    modelId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    pricing: v.object({
      prompt: v.string(),
      completion: v.string(),
    }),
    contextLength: v.number(),
    maxCompletionTokens: v.optional(v.number()),
    isModerated: v.boolean(),
    lastUpdated: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("openrouterModels")
      .withIndex("byModelId", (q) => q.eq("modelId", args.modelId))
      .unique();
  },
});

// Initialize models on first run
export const initializeModels = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingModels = await ctx.db.query("openrouterModels").first();
    if (!existingModels) {
      // Schedule the refresh to happen asynchronously
      await ctx.scheduler.runAfter(0, internal.openrouter.refreshModels);
    }
  },
});

// Validate OpenRouter API key
export const validateOpenrouterApiKey = action({
  args: {
    apiKey: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
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
