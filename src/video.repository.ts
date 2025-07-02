/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from './model/video.schema';
import { CustomEsService } from './elasticsearch/elasticsearch.service';
import { RedisCacheService } from './redis/redis.service';
@Injectable()
export class VideoRepository {
  constructor(
    @InjectModel(Video.name) private readonly videoModel: Model<VideoDocument>,
    private readonly esService: CustomEsService,
    private readonly redisService: RedisCacheService,
  ) {}

  async findAll(): Promise<Video[]> {
    const result = await this.esService?.search('videos', {
      query: { match_all: {} },
    });

    console.log(result);
    const videos = result?.hits.hits.map((hit) => hit._source as Video);
    const cached = await this.redisService.set(
      'videos',
      JSON.stringify(videos),
    );
    console.log(cached);
    return videos;
  }

  async findById(id: string): Promise<Video | null> {
    const cached = await this.redisService.get(`video:${id}`);
    if (cached) {
      console.log(cached);
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

  async findByTitle(title: string): Promise<Video | null> {
    const cached = await this.redisService.get('videos: ${title');
    if (cached) {
      console.log(cached);
      return JSON.parse(cached);
    }
    const result = await this.esService.search('videos', {
      query: { match: { title } },
    });
    if (result) {
      await this.redisService.set(`video:${title}`, JSON.stringify(result), 60);
      return result.hits.hits[0]._source as Video;
    }

    return null;
  }

  async create(video: Partial<Video>): Promise<Video> {
    const newVideo = new this.videoModel(video);

    const esData = {
      id: newVideo.id,
      title: newVideo.title,
      description: newVideo.description,
      url: newVideo.url,
      tags: newVideo.tags,
      owner: newVideo.owner,
    };
    await this.esService.index('videos', newVideo.id, esData);
    const cached = await this.redisService.set(
      `video:${newVideo.id}`,
      JSON.stringify(newVideo),
    );
    console.log(cached);
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

  async updateById(id: string, update: Partial<Video>): Promise<Video | null> {
    const video = await this.findById(id);
    if (!video) {
      return null;
    }
    const updateWithoutId = { ...update };
    delete updateWithoutId.id;
    await this.esService.update('videos', id, updateWithoutId);
    await this.redisService.delete(`video:${id}`);
    return this.videoModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }
}
