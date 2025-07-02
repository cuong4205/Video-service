import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { VideoService } from './video.service';
import { Video } from './model/video.schema';
import { UploadVideoDto } from './model/upload-video-dto';
import { NotFoundException } from '@nestjs/common';

/* todo: Handle not found exception
 */
@Controller('videos')
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Get('all')
  async findAll(): Promise<Video[]> {
    try {
      return await this.videoService.findAll();
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Videos not found');
    }
  }

  @Get('findById')
  async findById(@Query('id') id: string): Promise<Video> {
    try {
      return await this.videoService.findById(id);
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Video not found');
    }
  }

  @Get('findByTitle')
  async findByTitle(@Query('title') title: string): Promise<Video | null> {
    const result = await this.videoService.findByTitle(title);
    try {
      return result;
    } catch (error) {
      console.log(result);
      console.log(error);
      throw new NotFoundException('Video not found');
    }
  }

  @Get('find/user')
  async findVideoByUser(@Query('id') id: string): Promise<Video[]> {
    try {
      return await this.videoService.findVideosByOwnerIdGrpc({ id });
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Videos not found');
    }
  }

  @Post('upload')
  async uploadVideo(@Body() uploadVideoDto: UploadVideoDto): Promise<Video> {
    try {
      return await this.videoService.create(uploadVideoDto);
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Video not created');
    }
  }

  @Get('comment')
  async addComment(@Query('id') id: string, @Query('comment') comment: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await this.videoService.addComment(id, comment);
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Comment not added');
    }
  }

  @Delete('delete')
  async deleteVideo(@Query('title') title: string): Promise<Video> {
    const deleted = await this.videoService.deleteByTitle(title);
    try {
      if (!deleted) {
        throw new NotFoundException('Video not found');
      }
      return deleted;
    } catch (error) {
      console.log(deleted);
      console.log(error);
      throw new NotFoundException('Video not found');
    }
  }

  @Get('find/owner')
  async findVideosByOwnerId(@Query('id') id: string): Promise<Video[]> {
    try {
      return await this.videoService.findVideosByOwnerIdGrpc({ id });
    } catch (error) {
      console.log(id);
      console.log(error);
      throw new NotFoundException('Videos not found');
    }
  }

  @Get('find/user')
  async findUserById(@Query('id') id: string): Promise<any> {
    try {
      console.log('success');
      return await this.videoService.findUserById(id);
    } catch (error) {
      console.log(error);
      throw new NotFoundException('User not found');
    }
  }
}
