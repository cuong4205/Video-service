import { Controller, Body } from '@nestjs/common';
import { VideoService } from './video.service';
import { Video } from './model/video.schema';
import { NotFoundException } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { UploadVideoDto } from './model/upload-video-dto';

/* todo: Handle not found exception
 */
@Controller('videos')
export class VideoGrpcController {
  constructor(private readonly videoService: VideoService) {}

  @GrpcMethod('VideoService', 'UploadVideo')
  async uploadVideo(uploadVideoDto: {
    id: string;
    title: string;
    description: string;
    url: string;
    ageConstraint: number;
    tags: string[];
  }): Promise<{ video: Video }> {
    try {
      return await this.videoService.create(uploadVideoDto);
    } catch (error) {
      console.log(error);
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

  @GrpcMethod('VideoService', 'TestGrpc')
  testGrpc(request: { message: string }): void {
    this.videoService.testGrpc(request.message);
  }
}
