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

  // missing owner field
  @GrpcMethod('VideoService', 'UploadVideo')
  async uploadVideo(video: {
    id: string;
    title: string;
    description: string;
    filePath: string;
    tags: string[];
    owner: string;
    ageConstraint: number;
  }): Promise<{ video: Video }> {
    try {
      return await this.videoService.create(video);
    } catch (error) {
      console.log(error);
      console.log(video);
      throw new NotFoundException('Video not created');
    }
  }

  @GrpcMethod('VideoService', 'FindVideosByOwnerId')
  async findVideosByOwnerId(request: {
    id: string;
  }): Promise<{ videos: Video[] }> {
    console.log(request);
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
}
