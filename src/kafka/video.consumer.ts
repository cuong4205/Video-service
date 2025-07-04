import { Injectable } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { VideoRepository } from 'src/video.repository';

@Injectable()
export class VideoConsumer {
  constructor(private readonly videoRepository: VideoRepository) {}

  @EventPattern('video.viewed')
  async handleVideoViewed(@Payload() data: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { videoId } = data;
    await this.videoRepository.increaseView(videoId);
  }
}
