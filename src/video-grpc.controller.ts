import { Controller, Body } from '@nestjs/common';
import { VideoService } from './video.service';
import { Video } from './model/video.schema';
import { NotFoundException } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

/* todo: Handle not found exception
 */
@Controller('videos')
export class VideoGrpcController {
  constructor(private readonly videoService: VideoService) {}

  @GrpcMethod('VideoService', 'FindVideosByOwnerId')
  async findVideosByOwnerId(request: {
    id: string;
  }): Promise<{ videos: Video[] }> {
    const result = await this.videoService.findVideosByOwnerId(request);
    console.log(result);
    if (!result) {
      throw new NotFoundException('Videos not found');
    }
    return result;
  }

  @GrpcMethod('VideoService', 'AddComment')
  async addComment(request: { id: string; comment: string }): Promise<any> {
    return await this.videoService.addComment(request.id, request.comment);
  }

  @GrpcMethod('VideoService', 'FindAll')
  async findAll(): Promise<{ videos: Video[] }> {
    return await this.videoService.findAll();
  }
}
