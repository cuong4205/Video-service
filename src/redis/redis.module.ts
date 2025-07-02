// src/video/redis/redis.module.ts
import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisCacheService } from './redis.service';

@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
        });
      },
    },
    RedisCacheService,
  ],
  exports: [RedisCacheService],
})
export class RedisModule {}
