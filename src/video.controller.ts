import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Put,
  Param,
  Res,
  Headers,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { Video } from './model/video.schema';
import { NotFoundException } from '@nestjs/common';
import { StreamService } from './stream/stream.service';
import { Response } from 'express';
import { JwtRemoteAuthGuard } from './jwt-remote-auth.guard';

/* todo: Handle not found exception
 */
@Controller('videos')
export class VideoController {
  constructor(
    private videoService: VideoService,
    private streamService: StreamService,
  ) {}

  @UseGuards(JwtRemoteAuthGuard)
  @Get('all')
  async findAll(): Promise<{ videos: Video[] }> {
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
  async findVideoByUser(@Query('id') id: string): Promise<{ videos: Video[] }> {
    try {
      return await this.videoService.findVideosByOwnerId({ id });
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Videos not found');
    }
  }

  @UseGuards(JwtRemoteAuthGuard)
  @Post('upload')
  async uploadVideo(
    @Body() video: Video,
    @Request()
    req: Request & { user: { id: string; email: string; age: number } },
  ): Promise<{ video: Video }> {
    if (req.user.age < video.ageConstraint)
      throw new BadRequestException('Age constraint not met');

    try {
      return await this.videoService.upload(video);
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
      throw new BadRequestException('Comment not added');
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
      console.log(error);
      throw new NotFoundException('Video not found');
    }
  }

  @Put('update')
  async updateVideo(@Body() videoDto: Video): Promise<any> {
    try {
      return await this.videoService.updateById(videoDto.id, videoDto);
    } catch (error) {
      console.log(error);
      throw new NotFoundException('Video not updated');
    }
  }

  @Get('find/owner')
  async findVideosByOwnerId(
    @Query('id') id: string,
  ): Promise<{ videos: Video[] }> {
    try {
      return await this.videoService.findVideosByOwnerId({ id });
    } catch (error) {
      console.log(id);
      console.log(error);
      throw new NotFoundException('Videos not found');
    }
  }

  @Get('find/user')
  async findUserById(@Query('id') id: string): Promise<any> {
    try {
      return await this.videoService.findUserById({ id });
      console.log('success');
    } catch (error) {
      console.log(error);
      throw new NotFoundException('User not found');
    }
  }

  @Get(':id/stream')
  async streamVideo(@Param('id') id: string, @Res() res: Response) {
    try {
      const streamOptions = {};

      const streamResult = await this.videoService.streamVideoById(
        id,
        streamOptions,
      );

      res.set({
        'Content-Type': streamResult.contentType, // ví dụ: video/mp4
        'Content-Length': streamResult.contentLength,
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${streamResult.start}-${streamResult.end}/${streamResult.totalSize}`,
        'Content-Disposition': 'inline', // để trình duyệt phát video
      });

      streamResult.stream.getStream().pipe(res);
    } catch (error) {
      console.error('Error streaming video:', error);
    }
  }

  @Get('leaderboard')
  async getTopVideo(@Query('limit') limit: number): Promise<any> {
    try {
      return await this.videoService.getTopVideo(limit);
    } catch (error) {
      console.log('Something went wrong with the process', error);
    }
  }

  @Get('leaderboard/:timeType')
  async getTimeBasedLeaderboard(
    @Param('timeType') timeType: 'daily' | 'weekly' | 'monthly' | 'all',
    @Query('limit') limit: number,
    @Query('date') date: string,
  ): Promise<any> {
    try {
      return await this.videoService.getTimeBasedLeaderboard(
        timeType,
        limit,
        date,
      );
    } catch (error) {
      console.log('Something went wrong with the process', error);
    }
  }
}
