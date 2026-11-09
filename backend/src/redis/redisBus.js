import { EventEmitter } from 'events';
import Redis from 'ioredis';

class RedisSyncBus extends EventEmitter {
  constructor() {
    super();
    this.isRedisConnected = false;
    this.publisher = null;
    this.subscriber = null;
    this.subscribedChannels = new Set();

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    this.initRedis(redisUrl);
  }

  initRedis(url) {
    try {
      this.publisher = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('ℹ️ [RedisBus] Redis unavailable — operating in in-memory synchronization mode.');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        }
      });

      this.subscriber = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
      });

      this.publisher.connect()
        .then(() => this.subscriber.connect())
        .then(() => {
          this.isRedisConnected = true;
          console.log('✅ [RedisBus] Connected to Redis for multi-instance horizontal scaling!');

          this.subscriber.on('message', (channel, message) => {
            try {
              const payload = JSON.parse(message);
              // Broadcast locally to any listeners that didn't originate this message
              this.emit(channel, payload);
            } catch (err) {
              console.error('[RedisBus] Failed to parse message on channel', channel, err);
            }
          });

          // Resubscribe to existing channels
          for (const ch of this.subscribedChannels) {
            this.subscriber.subscribe(ch);
          }
        })
        .catch(() => {
          this.isRedisConnected = false;
          console.log('ℹ️ [RedisBus] Running in in-memory event bus mode (zero-config local dev).');
        });

      this.publisher.on('error', () => {
        this.isRedisConnected = false;
      });
      this.subscriber.on('error', () => {
        this.isRedisConnected = false;
      });

    } catch (err) {
      this.isRedisConnected = false;
      console.log('ℹ️ [RedisBus] Initialized in-memory fallback bus.');
    }
  }

  async publishUpdate(channel, payload) {
    if (this.isRedisConnected && this.publisher) {
      try {
        await this.publisher.publish(channel, JSON.stringify(payload));
      } catch (err) {
        // Fallback to local
        this.emit(channel, payload);
      }
    } else {
      // Local emit
      this.emit(channel, payload);
    }
  }

  subscribeChannel(channel, callback) {
    this.subscribedChannels.add(channel);
    this.on(channel, callback);

    if (this.isRedisConnected && this.subscriber) {
      this.subscriber.subscribe(channel).catch(() => {});
    }
  }

  unsubscribeChannel(channel, callback) {
    this.removeListener(channel, callback);
    if (this.listenerCount(channel) === 0) {
      this.subscribedChannels.delete(channel);
      if (this.isRedisConnected && this.subscriber) {
        this.subscriber.unsubscribe(channel).catch(() => {});
      }
    }
  }
}

export const redisBus = new RedisSyncBus();

