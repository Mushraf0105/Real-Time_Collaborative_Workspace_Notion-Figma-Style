import { createRequire } from 'module';
import prisma from '../db/prisma.js';
import { redisBus } from '../redis/redisBus.js';

const require = createRequire(import.meta.url);
const Y = require('yjs');

// Debounce map for saving document state
const saveTimeouts = new Map();

export const customPersistence = {
  /**
   * Called when a doc is loaded in y-websocket
   */
  bindState: async (docName, ydoc) => {
    try {
      // 1. Fetch persisted state from DB
      const dbDoc = await prisma.document.findUnique({
        where: { id: docName },
      });

      if (dbDoc && dbDoc.yjsState) {
        try {
          Y.applyUpdate(ydoc, new Uint8Array(dbDoc.yjsState), 'database-init');
          console.log(`[CRDT Persistence] Rehydrated document ${docName} from DB (${dbDoc.yjsState.length} bytes)`);
        } catch (e) {
          console.error(`[CRDT Persistence] Error applying stored state for ${docName}:`, e);
        }
      }

      // 2. Subscribe to Redis for cross-node replication
      const redisChannel = `collab:doc:${docName}`;
      const onRedisMessage = (payload) => {
        if (!payload || !payload.update) return;
        try {
          const update = Buffer.from(payload.update, 'base64');
          // Apply update with origin 'redis' so we don't re-publish it back to Redis!
          Y.applyUpdate(ydoc, new Uint8Array(update), 'redis');
        } catch (err) {
          console.error(`[Redis Sync] Error applying incoming Redis update for ${docName}:`, err);
        }
      };

      redisBus.subscribeChannel(redisChannel, onRedisMessage);

      // 3. Listen to local document updates
      ydoc.on('update', (update, origin) => {
        // If the update came from a local client (not from redis or initial db load)
        if (origin !== 'redis' && origin !== 'database-init') {
          // Broadcast to Redis for other server instances
          redisBus.publishUpdate(redisChannel, {
            docName,
            update: Buffer.from(update).toString('base64'),
            timestamp: Date.now(),
          });
        }

        // Debounced persistence to DB (every 2 seconds after last keystroke)
        if (saveTimeouts.has(docName)) {
          clearTimeout(saveTimeouts.get(docName));
        }

        const timer = setTimeout(async () => {
          try {
            const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
            await prisma.document.update({
              where: { id: docName },
              data: {
                yjsState: state,
                updatedAt: new Date(),
              },
            });
            // console.log(`[CRDT Persistence] Saved state snapshot for ${docName}`);
          } catch (err) {
            // Document might not exist in DB yet if created ad-hoc
          }
          saveTimeouts.delete(docName);
        }, 2000);

        saveTimeouts.set(docName, timer);
      });

      // Cleanup on destroy
      ydoc.on('destroy', () => {
        redisBus.unsubscribeChannel(redisChannel, onRedisMessage);
        if (saveTimeouts.has(docName)) {
          clearTimeout(saveTimeouts.get(docName));
          saveTimeouts.delete(docName);
        }
      });

    } catch (err) {
      console.error(`[CRDT Persistence] Error binding document ${docName}:`, err);
    }
  },

  writeState: async (docName, ydoc) => {
    try {
      const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
      await prisma.document.update({
        where: { id: docName },
        data: {
          yjsState: state,
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      // Ignore
    }
  },
};
