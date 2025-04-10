import { ConvexError, v } from 'convex/values';
import { action, internalMutation, internalQuery, mutation, type DatabaseReader } from './_generated/server';
import { getChatByIdOrUrlIdEnsuringAccess } from './messages';

import { startProvisionConvexProjectHelper } from './convexProjects';
import { internal } from './_generated/api';

export const createLink = action({
  args: {
    sessionId: v.id('sessions'),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runQuery(internal.share.getChatDetailsForSharing, args);

    // Clone the file
    const blob = await ctx.storage.get(result.snapshotId);
    if (!blob) {
      throw new Error('Snapshot not found');
    }

    const clonedSnapshotId = await ctx.storage.store(blob);

    const { code } = await ctx.runMutation(internal.share.doCreate, {
      clonedSnapshotId,
    });

    return { code };
  },
});

export const getChatDetailsForSharing = internalQuery({
  args: {
    sessionId: v.id('sessions'),
    id: v.string(),
  },
  handler: async (ctx, { sessionId, id }) => {
    const chat = await getChatByIdOrUrlIdEnsuringAccess(ctx, { id, sessionId });
    if (!chat) {
      throw new ConvexError('Chat not found');
    }

    if (!chat.snapshotId) {
      throw new ConvexError('Your project has never been saved.');
    }

    const lastMessage = await ctx.db
      .query('chatMessages')
      .withIndex('byChatId', (q) => q.eq('chatId', chat._id))
      .order('desc')
      .first();
    const lastMessageRank = lastMessage ? lastMessage.rank : 0;

    return {
      snapshotId: chat.snapshotId,
      description: chat.description,
      lastMessageRank,
    };
  },
});

export const doCreate = internalMutation({
  args: {
    chatId: v.id('chats'),
    lastMessageRank: v.number(),
    clonedSnapshotId: v.id('_storage'),
    description: v.string(),
  },
  handler: async (ctx, { chatId, lastMessageRank, clonedSnapshotId, description }) => {
    const code = await generateUniqueCode(ctx.db);

    await ctx.db.insert('shares', {
      chatId,
      snapshotId: clonedSnapshotId,
      code,
      lastMessageRank,
      description,
    });

    return { code };
  },
});

async function generateUniqueCode(db: DatabaseReader) {
  const code = crypto.randomUUID().replace(/-/g, '').substring(0, 6);
  const existing = await db
    .query('shares')
    .withIndex('byCode', (q) => q.eq('code', code))
    .first();
  if (existing) {
    return generateUniqueCode(db);
  }
  return code;
}

export const clone = mutation({
  args: {
    shareCode: v.string(),
    sessionId: v.id('sessions'),
    projectInitParams: v.object({
      teamSlug: v.string(),
      auth0AccessToken: v.string(),
    }),
  },
  returns: v.object({
    id: v.string(),
    description: v.optional(v.string()),
  }),
  handler: async (ctx, { shareCode, sessionId, projectInitParams }) => {
    const getShare = await ctx.db
      .query('shares')
      .withIndex('byCode', (q) => q.eq('code', shareCode))
      .first();
    if (!getShare) {
      throw new ConvexError('Invalid share link');
    }

    const parentChat = await ctx.db.get(getShare.chatId);
    if (!parentChat) {
      throw new Error('Parent chat not found');
    }
    const chatId = crypto.randomUUID();
    const clonedChat = {
      creatorId: sessionId,
      initialId: chatId,
      description: parentChat.description,
      timestamp: new Date().toISOString(),
      snapshotId: parentChat.snapshotId,
    };
    const clonedChatId = await ctx.db.insert('chats', clonedChat);

    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('byChatId', (q) => q.eq('chatId', parentChat._id).lte('rank', getShare.lastMessageRank))
      .collect();

    await startProvisionConvexProjectHelper(ctx, {
      sessionId,
      chatId: clonedChat.initialId,
      projectInitParams,
    });
    for (const message of messages) {
      await ctx.db.insert('chatMessages', {
        chatId: clonedChatId,
        content: message.content,
        rank: message.rank,
      });
    }

    return {
      id: chatId,
      description: parentChat.description,
    };
  },
});
