import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Migration to convert existing API keys to OpenRouter format
export const migrateToOpenRouter = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const members = await ctx.db.query("convexMembers").collect();
    
    let migratedCount = 0;
    
    for (const member of members) {
      if (member.apiKey) {
        // If they have the old API key structure, migrate to new format
        // Note: This assumes the old structure had these fields before migration
        const oldApiKey = member.apiKey as any; // Cast to any to access old properties
        const hasAnyKey = oldApiKey.value || oldApiKey.openai || oldApiKey.xai || oldApiKey.google;
        
        if (hasAnyKey) {
          await ctx.db.patch(member._id, {
            apiKey: {
              preference: member.apiKey.preference,
              openrouter: undefined, // They'll need to set this up manually
            }
          });
          migratedCount++;
        }
      }
    }
    
    console.log(`Migrated ${migratedCount} members to OpenRouter format`);
  },
});
