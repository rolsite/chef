import { ConvexError, v } from "convex/values";
import { mutation, internalMutation, internalAction, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const PROVISION_HOST = process.env.PROVISION_HOST || "https://api.convex.dev";
const CONVEX_TEAM_ID = 4916;
const ONE_HOUR_MS = 60 * 60 * 1000;

export async function assertIsConvexAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
  }

  const member = await ctx.db
    .query("convexMembers")
    .withIndex("byTokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!member) {
    throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
  }

  const adminStatus = await ctx.db
    .query("convexAdmins")
    .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", member._id))
    .unique();

  if (!adminStatus?.wasAdmin) {
    throw new ConvexError({ code: "NotAuthorized", message: "Not a Convex admin" });
  }

  return { member, adminStatus };
}

export const updateAdminStatus = internalMutation({
  args: {
    memberId: v.id("convexMembers"),
    wasAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("convexAdmins")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", args.memberId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        wasAdmin: args.wasAdmin,
        lastCheckedForAdminStatus: Date.now(),
      });
    } else {
      await ctx.db.insert("convexAdmins", {
        convexMemberId: args.memberId,
        wasAdmin: args.wasAdmin,
        lastCheckedForAdminStatus: Date.now(),
      });
    }
  },
});

export const checkIsConvexAdminInternal = internalAction({
  args: {
    token: v.string(),
    memberId: v.id("convexMembers"),
  },
  handler: async (ctx, args): Promise<void> => {
    try {
      const response = await fetch(`${PROVISION_HOST}/api/dashboard/teams`, {
        headers: {
          Authorization: `Bearer ${args.token}`,
        },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to fetch teams: ${response.statusText}: ${body}`);
      }
      const teams = (await response.json()) as { id: number; slug: number }[];
      const isAdmin = teams.some((team) => team.id === CONVEX_TEAM_ID);

      await ctx.runMutation(internal.admin.updateAdminStatus, {
        memberId: args.memberId,
        wasAdmin: isAdmin,
      });
    } catch (error) {
      console.error("Error checking Convex admin status:", error);
      throw new ConvexError({
        code: "Internal",
        message: "Failed to verify admin status",
      });
    }
  },
});

export const requestAdminCheck = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const member = await ctx.db
      .query("convexMembers")
      .withIndex("byTokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!member) {
      throw new ConvexError({ code: "NotAuthorized", message: "Unauthorized" });
    }

    const adminStatus = await ctx.db
      .query("convexAdmins")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", member._id))
      .unique();

    // Check if we need to rate limit
    if (adminStatus?.lastCheckedForAdminStatus) {
      const timeSinceLastCheck = Date.now() - adminStatus.lastCheckedForAdminStatus;
      if (timeSinceLastCheck < ONE_HOUR_MS) {
        throw new Error(
          `Please wait ${Math.ceil((ONE_HOUR_MS - timeSinceLastCheck) / 1000 / 60)} minutes before checking again`,
        );
      }
    }

    await ctx.scheduler.runAfter(0, internal.admin.checkIsConvexAdminInternal, {
      token: args.token,
      memberId: member._id,
    });
  },
});

export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const member = await ctx.db
      .query("convexMembers")
      .withIndex("byTokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!member) {
      return false;
    }

    const adminStatus = await ctx.db
      .query("convexAdmins")
      .withIndex("byConvexMemberId", (q) => q.eq("convexMemberId", member._id))
      .unique();

    return adminStatus?.wasAdmin ?? false;
  },
});
