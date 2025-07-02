import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';

@Injectable()
export class RedisCacheService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis.Redis,
  ) {
    this.redisClient.on('connect', () => {
      console.log('[Redis] Connected for caching');
    });

    this.redisClient.on('error', (err) => {
      console.error('[Redis] Error:', err);
    });
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, serialized);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const raw = await this.redisClient.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}
