import { Controller, OnModuleInit } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { VideoRepository } from 'src/video.repository';

@Controller()
export class VideoConsumer implements OnModuleInit {
  constructor(private readonly videoRepository: VideoRepository) {}

  onModuleInit() {
    console.log('VideoConsumer initialized');
  }

  @EventPattern('video.viewed')
  async handleVideoViewed(@Payload() data: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { videoId } = data;
    console.log('Received video.viewed event:', data);
    await this.videoRepository.increaseView(videoId);
  }
}
