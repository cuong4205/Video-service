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

  async getTopVideos(
    limit: number = 10,
  ): Promise<Array<{ videoId: string; viewCount: number }>> {
    const key = 'video:leaderboard';
    const results = await this.redisClient.zrevrange(
      key,
      0,
      limit - 1,
      'WITHSCORES',
    );

    const leaderboard: Array<{ videoId: string; viewCount: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        videoId: results[i],
        viewCount: parseInt(results[i + 1]),
      });
    }

    return leaderboard;
  }

  // Lấy rank của một video cụ thể
  async getVideoRank(videoId: string): Promise<number | null> {
    const key = 'video:leaderboard';
    const rank = await this.redisClient.zrevrank(key, videoId);
    return rank !== null ? rank + 1 : null; // +1 vì rank bắt đầu từ 0
  }

  // Lấy view count của một video
  async getVideoViewCount(videoId: string): Promise<number> {
    const key = 'video:leaderboard';
    const score = await this.redisClient.zscore(key, videoId);
    return score ? parseInt(score) : 0;
  }

  async getTotalVideosInLeaderboard(): Promise<number> {
    const key = 'video:leaderboard';
    return await this.redisClient.zcard(key);
  }

  // Batch update nhiều videos cùng lúc
  async batchIncrementViewCount(
    updates: Array<{ videoId: string; increment: number }>,
  ): Promise<void> {
    const key = 'video:leaderboard';
    const pipeline = this.redisClient.pipeline();

    updates.forEach(({ videoId, increment }) => {
      pipeline.zincrby(key, increment, videoId);
    });

    await pipeline.exec();
  }

  // Leaderboard theo thời gian (daily, weekly, monthly)
  async incrementViewCountWithTime(
    videoId: string,
    increment: number = 1,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const thisWeek = this.getWeekKey();
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const pipeline = this.redisClient.pipeline();
    pipeline.zincrby('video:leaderboard', increment, videoId); // All time
    pipeline.zincrby(`video:leaderboard:daily:${today}`, increment, videoId);
    pipeline.zincrby(
      `video:leaderboard:weekly:${thisWeek}`,
      increment,
      videoId,
    );
    pipeline.zincrby(
      `video:leaderboard:monthly:${thisMonth}`,
      increment,
      videoId,
    );

    await pipeline.exec();
  }

  // Lấy leaderboard theo thời gian
  async getTimeBasedLeaderboard(
    timeType: 'daily' | 'weekly' | 'monthly' | 'all',
    limit: number = 10,
    date?: string,
  ): Promise<Array<{ videoId: string; viewCount: number }>> {
    let key = 'video:leaderboard';

    if (timeType !== 'all') {
      const dateKey = date || this.getCurrentDateKey(timeType);
      key = `video:leaderboard:${timeType}:${dateKey}`;
    }

    const results = await this.redisClient.zrevrange(
      key,
      0,
      limit - 1,
      'WITHSCORES',
    );

    const leaderboard: Array<{ videoId: string; viewCount: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        videoId: results[i],
        viewCount: parseInt(results[i + 1]),
      });
    }

    return leaderboard;
  }

  // Lấy khóa tuần hiện tại theo định dạng yyyy-Www
  private getWeekKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  // tính số tuần dựa trên ngày
  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // Lấy khóa ngày hiện tại theo định dạng yyyy-MM-dd
  private getCurrentDateKey(timeType: 'daily' | 'weekly' | 'monthly'): string {
    const now = new Date();
    switch (timeType) {
      case 'daily':
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'weekly':
        return this.getWeekKey();
      case 'monthly':
        return now.toISOString().slice(0, 7); // YYYY-MM
      default:
        return '';
    }
  }

  // Cleanup expired time-based leaderboards
  async cleanupExpiredLeaderboards(): Promise<void> {
    const pipeline = this.redisClient.pipeline();

    // Xóa daily leaderboards cũ hơn 7 ngày
    for (let i = 7; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      pipeline.del(`video:leaderboard:daily:${dateKey}`);
    }

    // Xóa weekly leaderboards cũ hơn 8 tuần
    for (let i = 8; i < 20; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      const weekKey = this.getWeekKey();
      pipeline.del(`video:leaderboard:weekly:${weekKey}`);
    }

    await pipeline.exec();
  }
}
