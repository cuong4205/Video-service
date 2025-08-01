/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from './model/video.schema';
import { CustomEsService } from './elasticsearch/elasticsearch.service';
import { RedisCacheService } from './redis/redis.service';
import { VideoProducer } from './kafka/video.producer';

@Injectable()
export class VideoRepository {
  constructor(
    @InjectModel(Video.name) private readonly videoModel: Model<VideoDocument>,
    private readonly esService: CustomEsService,
    private readonly redisService: RedisCacheService,
    private readonly videoProducer: VideoProducer,
  ) {}

  private async clearVideoCache(id: string): Promise<void> {
    await Promise.allSettled([
      this.redisService.delete(`video:${id}`),
      this.redisService.delete('videos'), // Clear list cache
    ]);
  }

  async findAll(): Promise<Video[]> {
    const cached = await this.redisService.get('videos');
    if (cached) {
      console.log('Cache exists, no need 4 database');
      return JSON.parse(cached);
    }

    const result = await this.esService?.search('videos', {
      query: { match_all: {} },
    });

    console.log('from es');
    const videos = result?.hits.hits.map((hit) => hit._source as Video);
    await this.redisService.set('videos', JSON.stringify(videos));
    console.log('set cache successfully');
    return videos;
  }

  async findById(id: string): Promise<Video | null> {
    const cached = await this.redisService.get(`video:${id}`);
    if (cached) {
      console.log('get from cache');
      return JSON.parse(cached);
    }
    const result = await this.esService.get('videos', id);
    if (result.found) {
      await this.redisService.set(
        `video:${id}`,
        JSON.stringify(result._source),
        60,
      );
      return result._source as Video;
    }
    return null;
  }

  async search(query: string): Promise<Video[] | null> {
    // Fixed: Corrected template literal syntax
    const cached = await this.redisService.get(`videos:${query}`);
    if (cached) {
      console.log('Read data from cache');
      return JSON.parse(cached);
    }
    const result = await this.esService.search('videos', {
      query: {
        multi_match: {
          query,
          fields: ['title', 'description'],
          type: 'phrase',
          operator: 'OR', // or 'OR' depending on your requirements
        },
      },
      size: 3,
    });
    if (result) {
      await this.redisService.set(
        `videos:${query}`,
        JSON.stringify(result.hits.hits[0]._source),
        60,
      );
      console.log('set cache');
      const videos = result.hits.hits.map((hit) => hit._source) as Video[];
      return videos;
    }
    return null;
  }

  async upload(video: Partial<Video>): Promise<Video> {
    const newVideo = new this.videoModel(video);

    await this.esService.index('videos', newVideo.id, video);
    await this.clearVideoCache(newVideo.id);
    return newVideo.save();
  }

  async deleteByTitle(title: string): Promise<Video> {
    const deleted = await this.videoModel
      .findOneAndDelete({ title: new RegExp(title, 'i') })
      .lean()
      .exec();
    if (deleted) {
      await this.esService.delete('videos', deleted.id);
      await this.redisService.delete(`video:${deleted.id}`);
    }
    return deleted as Video;
  }

  async findByOwner(ownerId: string): Promise<Video[]> {
    const result = await this.esService.search('videos', {
      query: { match: { owner: ownerId } },
    });
    return result.hits.hits.map((hit) => hit._source as Video);
  }

  // Fixed: Corrected updateById method
  async updateById(id: string, update: Partial<Video>): Promise<Video | null> {
    const video = await this.findById(id);
    if (!video) {
      return null;
    }

    try {
      // Update Elasticsearch
      await this.esService.update('videos', id, update);

      // Update MongoDB with the same data
      const updatedVideo = await this.videoModel
        .findOneAndUpdate({ id }, update, { new: true })
        .exec();

      // Clear cache after successful update
      await this.redisService.delete(`video:${id}`);

      return updatedVideo;
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  }

  async increaseView(videoId: string): Promise<any> {
    await this.videoModel.updateOne(
      { id: videoId },
      { $inc: { viewCount: 1 } },
    );
  }

  // Fixed: Corrected addComment method
  async addComment(id: string, comment: string): Promise<void> {
    try {
      // Update Elasticsearch
      await this.esService.update('videos', id, {
        script: {
          source: 'ctx._source.comments.add(params.comment)',
          params: { comment },
        },
      });

      // Update MongoDB with correct syntax
      await this.videoModel.updateOne({ id }, { $push: { comments: comment } });

      // Clear cache after successful update
      await this.redisService.delete(`video:${id}`);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async getTopVideo(
    limit: number = 10,
  ): Promise<Array<{ videoId: string; viewCount: number }>> {
    return this.redisService.getTopVideos(limit);
  }

  async getTimeBasedLeaderboard(
    timeType: 'daily' | 'weekly' | 'monthly' | 'all',
    limit: number = 10,
    date?: string,
  ): Promise<Array<{ videoId: string; viewCount: number }>> {
    return this.redisService.getTimeBasedLeaderboard(timeType, limit, date);
  }
}
